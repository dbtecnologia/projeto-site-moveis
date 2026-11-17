const { createServerClient, getSupabaseConfig } = require('../lib/supabase-server');
const fallbackCatalog = require('../lib/catalog-fallback');

function normalizeProduct(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku || '',
    category: row.categories?.name || 'Móveis',
    price: Number(row.base_price),
    old: row.compare_at_price ? `R$ ${Number(row.compare_at_price).toFixed(2).replace('.', ',')}` : '',
    discount: row.compare_at_price && row.base_price
      ? `-${Math.round((1 - Number(row.base_price) / Number(row.compare_at_price)) * 100)}%`
      : '',
    pix: row.pix_discount ? `R$ ${(Number(row.base_price) * (1 - Number(row.pix_discount))).toFixed(2).replace('.', ',')} no PIX` : '',
    installments: Number(row.installment_count || 12),
    installmentInterest: Number(row.installment_interest || 0),
    image: row.image_url || fallbackCatalog[0].image,
    badge: row.featured ? 'Destaque' : '',
  };
}

module.exports = async function handler(req, res) {
  const client = createServerClient(req);
  if (req.method === 'GET') {
    if (!client || !getSupabaseConfig()) return res.status(200).json({ source: 'fallback', products: fallbackCatalog });

    const { data, error } = await client
      .from('products')
      .select('id,name,sku,base_price,compare_at_price,pix_discount,installment_count,installment_interest,image_url,featured,categories(name)')
      .eq('active', true)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('catalog_query_failed', error);
      return res.status(200).json({ source: 'fallback', warning: 'catalog_unavailable', products: fallbackCatalog });
    }
    return res.status(200).json({ source: 'supabase', products: (data || []).map(normalizeProduct) });
  }
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!client || !getSupabaseConfig()) return res.status(503).json({ error: 'supabase_not_configured' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (req.method === 'POST') {
      const product = {
        name: body.name,
        slug: body.slug || String(body.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: body.sku || null,
        description: body.description || null,
        base_price: Number(body.base_price),
        compare_at_price: body.compare_at_price ? Number(body.compare_at_price) : null,
        pix_discount: body.pix_discount == null ? 0.05 : Number(body.pix_discount),
        installment_count: body.installment_count == null ? 12 : Number(body.installment_count),
        installment_interest: body.installment_interest == null ? 0 : Number(body.installment_interest),
        image_url: body.image_url || null,
        featured: Boolean(body.featured),
        active: body.active !== false,
      };
      if (!product.name || !Number.isFinite(product.base_price) || product.base_price < 0) return res.status(400).json({ error: 'product_name_and_price_required' });
      const { data, error } = await client.from('products').insert(product).select().single();
      if (error) return res.status(400).json({ error: 'product_create_failed', detail: error.message });
      return res.status(201).json({ product: data });
    }
    if (!body.id) return res.status(400).json({ error: 'product_id_required' });
    if (req.method === 'DELETE') {
      const { error } = await client.from('products').update({ active: false }).eq('id', body.id);
      if (error) return res.status(400).json({ error: 'product_archive_failed', detail: error.message });
      return res.status(204).end();
    }
    const { id, ...changes } = body;
    if (changes.base_price != null) changes.base_price = Number(changes.base_price);
    if (changes.compare_at_price != null) changes.compare_at_price = Number(changes.compare_at_price);
    if (changes.pix_discount != null) changes.pix_discount = Number(changes.pix_discount);
    if (changes.installment_count != null) changes.installment_count = Number(changes.installment_count);
    if (changes.installment_interest != null) changes.installment_interest = Number(changes.installment_interest);
    const { data, error } = await client.from('products').update(changes).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: 'product_update_failed', detail: error.message });
    return res.status(200).json({ product: data });
  } catch (_error) {
    return res.status(400).json({ error: 'invalid_json' });
  }
};
