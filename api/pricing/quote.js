const { createServerClient, getSupabaseConfig } = require('../../lib/supabase-server');
const fallbackCatalog = require('../../lib/catalog-fallback');

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = value => Math.round(value * 100) / 100;

function applyRule(total, rule, context) {
  const conditions = rule.conditions || {};
  if (conditions.material && conditions.material !== context.material) return total;
  if (conditions.finish && conditions.finish !== context.finish) return total;
  if (conditions.minQuantity && context.quantity < number(conditions.minQuantity)) return total;
  if (conditions.maxQuantity && context.quantity > number(conditions.maxQuantity)) return total;

  const action = rule.action || {};
  if (action.type === 'percentage') return total * (1 + number(action.value) / 100);
  if (action.type === 'fixed') return total + number(action.value);
  return total;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (_error) {
    return res.status(400).json({ error: 'invalid_json' });
  }
  const configuration = body.configuration || {};
  const quantity = Math.max(1, Math.floor(number(configuration.quantity, 1)));
  const client = createServerClient(req);
  let basePrice = number(body.basePrice);
  let product = null;
  let rules = [];

  if (client && getSupabaseConfig() && body.productId) {
    const productResult = await client.from('products').select('id,name,base_price').eq('id', body.productId).eq('active', true).single();
    if (productResult.error || !productResult.data) return res.status(404).json({ error: 'product_not_found' });
    product = productResult.data;
    basePrice = number(product.base_price);

    const rulesResult = await client
      .from('pricing_rules')
      .select('conditions,action,priority')
      .eq('active', true)
      .or(`scope_product_id.is.null,scope_product_id.eq.${body.productId}`)
      .order('priority', { ascending: true });
    if (!rulesResult.error) rules = rulesResult.data || [];
  }

  if (basePrice <= 0) return res.status(400).json({ error: 'base_price_required' });

  let total = basePrice;
  if (configuration.width && configuration.depth && configuration.height) {
    const volume = (number(configuration.width) * number(configuration.depth) * number(configuration.height)) / 1000000;
    total += volume * 180;
  }
  total *= quantity;

  const context = { ...configuration, quantity };
  for (const rule of rules) total = applyRule(total, rule, context);

  const pixDiscount = Math.max(0, Math.min(1, number(body.pixDiscount, 0.05)));
  const pixTotal = round(total * (1 - pixDiscount));
  return res.status(200).json({
    source: product ? 'supabase' : 'fallback',
    product: product ? { id: product.id, name: product.name } : null,
    currency: 'BRL',
    subtotal: round(total),
    discount: round(total - pixTotal),
    total: round(total),
    pixTotal,
    quantity,
    rulesApplied: rules.length,
  });
};
