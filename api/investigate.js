const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchPage(url, ua = UA) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(10000), redirect: 'follow' });
    return { status: r.status, text: await r.text() };
  } catch { return { status: 0, text: '' }; }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const username = (body.username || '').replace('@', '').trim();
  if (!username) return res.status(400).json({ error: 'Username required' });

  // Snapchat profile
  const { status, text } = await fetchPage(`https://www.snapchat.com/add/${username}`);
  const nextMatch = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let profile = { found: false, username };
  
  if (nextMatch) {
    try {
      const nd = JSON.parse(nextMatch[1]);
      const pp = nd.props?.pageProps || {};
      const sd = pp.snapchatUserInfo || pp.userProfile || {};
      if (sd.displayName || sd.bitmojiAvatar) {
        profile = {
          found: true, username,
          displayName: sd.displayName || null,
          bitmojiAvatar: sd.bitmojiAvatar || null,
          snapcode: `https://snapcodes.storage.googleapis.com/png/${username}_320.png`,
          category: sd.category || null,
          verified: sd.verified || false,
          createdAt: sd.createdAt || null
        };
      }
    } catch {}
  }

  // Cross-platform
  const PLATFORMS = [
    { name: 'Instagram', url: `https://www.instagram.com/${username}/`, check: (s, t) => s === 200 && !t.includes('Sorry') },
    { name: 'TikTok', url: `https://www.tiktok.com/@${username}`, check: (s) => s === 200 },
    { name: 'X (Twitter)', url: `https://x.com/${username}`, check: (s) => s === 200 },
    { name: 'YouTube', url: `https://www.youtube.com/@${username}`, check: (s, t) => s === 200 && t.includes('channel') },
    { name: 'GitHub', url: `https://github.com/${username}`, check: (s) => s === 200 },
    { name: 'Reddit', url: `https://www.reddit.com/user/${username}/about.json`, check: (s) => s === 200 },
    { name: 'Twitch', url: `https://www.twitch.tv/${username}`, check: (s, t) => s === 200 && !t.includes('Sorry') },
    { name: 'Pinterest', url: `https://www.pinterest.com/${username}/`, check: (s) => s === 200 },
    { name: 'Steam', url: `https://steamcommunity.com/id/${username}`, check: (s, t) => s === 200 && !t.includes('could not be found') },
    { name: 'SoundCloud', url: `https://soundcloud.com/${username}`, check: (s) => s === 200 },
    { name: 'Telegram', url: `https://t.me/${username}`, check: (s, t) => s === 200 && !t.includes('you can contact') },
    { name: 'Medium', url: `https://medium.com/@${username}`, check: (s) => s === 200 },
    { name: 'Threads', url: `https://www.threads.net/@${username}`, check: (s) => s === 200 },
    { name: 'Kick', url: `https://kick.com/${username}`, check: (s) => s === 200 },
    { name: 'Spotify', url: `https://open.spotify.com/user/${username}`, check: (s) => s === 200 },
  ];

  const platformResults = await Promise.all(
    PLATFORMS.map(async p => {
      const { status, text } = await fetchPage(p.url);
      return { platform: p.name, found: p.check(status, text), url: p.url };
    })
  );

  // Wayback
  let wayback = null;
  try {
    const wb = await fetch(`https://archive.org/wayback/available?url=snapchat.com/add/${username}`, { signal: AbortSignal.timeout(5000) });
    const wbd = await wb.json();
    if (wbd.archived_snapshots?.closest) wayback = wbd.archived_snapshots.closest;
  } catch {}

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.json({
    username,
    snapchatProfile: profile,
    platforms: platformResults,
    platformCount: platformResults.filter(p => p.found).length,
    wayback,
    exposureScore: Math.min(100, platformResults.filter(p => p.found).length * 6 + (profile.found ? 15 : 0))
  });
}
