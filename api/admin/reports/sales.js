const { createServerClient, getSupabaseConfig } = require('../../../lib/supabase-server');

function nextDay(date) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const start = String(req.query?.start || '1900-01-01');
  const end = String(req.query?.end || '2999-12-31');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return res.status(400).json({ error: 'invalid_date_range' });
  const client = createServerClient(req);
  if (!client || !getSupabaseConfig()) return res.status(503).json({ error: 'supabase_not_configured' });

  const { data, error } = await client
    .from('orders')
    .select('id,created_at,total,payment_provider,order_items(product_name_snapshot,quantity,total)')
    .gte('created_at', `${start}T00:00:00Z`)
    .lt('created_at', nextDay(end))
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: true });
  if (error) return res.status(error.code === '42501' ? 403 : 400).json({ error: 'sales_report_failed', detail: error.message });

  const rows = (data || []).flatMap(order => {
    const items = order.order_items || [];
    if (!items.length) return [{ date: order.created_at.slice(0, 10), order: order.id, product: 'Pedido sem item detalhado', quantity: 1, payment: order.payment_provider || 'Não informado', total: Number(order.total || 0) }];
    return items.map(item => ({ date: order.created_at.slice(0, 10), order: order.id, product: item.product_name_snapshot, quantity: item.quantity, payment: order.payment_provider || 'Não informado', total: Number(item.total || 0) }));
  });

  if (req.query?.format === 'csv') {
    const content = '\uFEFF' + [['Data', 'Pedido', 'Produto', 'Quantidade', 'Pagamento', 'Total'], ...rows.map(row => [row.date, row.order, row.product, row.quantity, row.payment, row.total.toFixed(2)])].map(row => row.map(csvEscape).join(';')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="montai-relatorio-vendas.csv"');
    return res.status(200).send(content);
  }
  return res.status(200).json({ start, end, rows });
};
