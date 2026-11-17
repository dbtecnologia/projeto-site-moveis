const { createClient } = require('@supabase/supabase-js');

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

function createServerClient(req) {
  const config = getSupabaseConfig();
  if (!config) return null;

  const headers = {};
  if (req?.headers?.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers },
  });
}

module.exports = { createServerClient, getSupabaseConfig };
