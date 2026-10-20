export default async function handler(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { username } = body;
  const cleanUser = (username || '').replace('@', '').trim();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (!cleanUser) return res.status(400).json({ error: 'Username required' });

  try {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const r = await fetch(`https://www.snapchat.com/add/${cleanUser}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    const text = await r.text();
    const m = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    let profile = { found: false };
    if (m) {
      try {
        const nd = JSON.parse(m[1]);
        const sd = nd.props?.pageProps?.snapchatUserInfo || {};
        profile = { found: !!(sd.displayName || sd.bitmojiAvatar), ...sd };
      } catch {}
    }
    return res.json({ username: cleanUser, profile });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
