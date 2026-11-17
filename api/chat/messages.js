const { createServerClient, getSupabaseConfig } = require('../../lib/supabase-server');

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const client = createServerClient(req);
  if (!client || !getSupabaseConfig()) return res.status(503).json({ error: 'supabase_not_configured' });

  const userResult = await client.auth.getUser();
  if (userResult.error || !userResult.data.user) return res.status(401).json({ error: 'authentication_required' });
  const user = userResult.data.user;
  const profileResult = await client.from('profiles').select('role').eq('id', user.id).single();
  const role = profileResult.data?.role || 'customer';
  const threadId = req.query?.threadId || (typeof req.body === 'object' ? req.body.threadId : null);

  if (req.method === 'GET') {
    if (!threadId) {
      const { data, error } = await client.from('chat_threads').select('id,customer_id,subject,status,last_message_at,created_at').order('last_message_at', { ascending: false });
      if (error) return res.status(400).json({ error: 'threads_query_failed', detail: error.message });
      return res.status(200).json({ threads: data || [] });
    }
    const { data, error } = await client.from('chat_messages').select('id,thread_id,sender_id,sender_role,body,attachments,read_at,created_at').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (error) return res.status(400).json({ error: 'messages_query_failed', detail: error.message });
    return res.status(200).json({ messages: data || [] });
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (_error) { return res.status(400).json({ error: 'invalid_json' }); }
  const message = String(body.body || '').trim();
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter(item => item && item.type === 'image' && typeof item.url === 'string' && /^https?:\/\//.test(item.url)).slice(0, 4)
    : [];
  if (body.image && typeof body.image === 'string' && /^https?:\/\//.test(body.image)) attachments.push({ type: 'image', url: body.image });
  if ((!message && !attachments.length) || message.length > 4000) return res.status(400).json({ error: 'message_length_invalid' });

  let activeThreadId = threadId;
  if (!activeThreadId) {
    if (role !== 'customer') return res.status(400).json({ error: 'thread_id_required' });
    const threadResult = await client.from('chat_threads').insert({ customer_id: user.id, subject: body.subject || 'Dúvida sobre meu pedido', status: 'waiting_admin' }).select('id').single();
    if (threadResult.error) return res.status(400).json({ error: 'thread_create_failed', detail: threadResult.error.message });
    activeThreadId = threadResult.data.id;
  }

  const messageResult = await client.from('chat_messages').insert({ thread_id: activeThreadId, sender_id: user.id, sender_role: role, body: message, attachments }).select('id,thread_id,sender_id,sender_role,body,attachments,created_at').single();
  if (messageResult.error) return res.status(400).json({ error: 'message_create_failed', detail: messageResult.error.message });
  await client.from('chat_threads').update({ last_message_at: new Date().toISOString(), status: role === 'admin' ? 'waiting_customer' : 'waiting_admin' }).eq('id', activeThreadId);
  return res.status(201).json({ message: messageResult.data, threadId: activeThreadId });
};
