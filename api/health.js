const { getSupabaseConfig } = require('../lib/supabase-server');

module.exports = async function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'montai-moveis',
    backend: getSupabaseConfig() ? 'supabase-configured' : 'frontend-fallback',
    timestamp: new Date().toISOString(),
  });
};
