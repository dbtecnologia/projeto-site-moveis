const { createServerClient, getSupabaseConfig } = require('../../lib/supabase-server');
const fallback = require('../../lib/cms-fallback');

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', req.method === 'GET' ? 's-maxage=60, stale-while-revalidate=300' : 'no-store');
  if (req.method === 'GET') {
    const client = createServerClient(req);
    if (!client || !getSupabaseConfig()) return res.status(200).json({ source: 'fallback', offers: fallback.offers });
    const { data, error } = await client.from('site_offers').select('*').eq('active', true).order('sort_order', { ascending: true });
    if (error) return res.status(200).json({ source: 'fallback', warning: 'offers_unavailable', offers: fallback.offers });
    return res.status(200).json({ source: 'supabase', offers: data || [] });
  }

  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const client = createServerClient(req);
  if (!client || !getSupabaseConfig()) return res.status(503).json({ error: 'supabase_not_configured' });
  try {
    const payload = bodyOf(req);
    if (req.method === 'POST') {
      const { data, error } = await client.from('site_offers').insert(payload).select().single();
      if (error) return res.status(400).json({ error: 'offer_create_failed', detail: error.message });
      return res.status(201).json({ offer: data });
    }
    if (!payload.id) return res.status(400).json({ error: 'offer_id_required' });
    if (req.method === 'DELETE') {
      const { error } = await client.from('site_offers').delete().eq('id', payload.id);
      if (error) return res.status(400).json({ error: 'offer_delete_failed', detail: error.message });
      return res.status(204).end();
    }
    const { id, ...changes } = payload;
    const { data, error } = await client.from('site_offers').update(changes).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: 'offer_update_failed', detail: error.message });
    return res.status(200).json({ offer: data });
  } catch (_error) {
    return res.status(400).json({ error: 'invalid_json' });
  }
};
