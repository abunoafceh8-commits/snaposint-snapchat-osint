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
    const platforms = [
      { name: 'Instagram', url: `https://www.instagram.com/${cleanUser}/` },
      { name: 'TikTok', url: `https://www.tiktok.com/@${cleanUser}` },
      { name: 'X', url: `https://x.com/${cleanUser}` },
      { name: 'GitHub', url: `https://github.com/${cleanUser}` },
      { name: 'YouTube', url: `https://www.youtube.com/@${cleanUser}` },
    ];
    const results = await Promise.all(platforms.map(async p => {
      try { const r = await fetch(p.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) }); return { ...p, found: r.status === 200 }; } catch { return { ...p, found: false }; }
    }));
    return res.json({ username: cleanUser, platforms: results });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
