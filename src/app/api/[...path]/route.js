import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'xrpharbor-prod-fallback-jwt-secret-2026';
const DEFAULT_DEMO_WALLET = process.env.DEMO_WALLET_ADDRESS || 'rHarbor7X9mK2pQ8vL4nJ6wZ3cT5yB1dE9';

function base64urlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000), exp };
  const unsigned = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(fullPayload))}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest();
  return `${unsigned}.${base64urlEncode(sig)}`;
}

function verifyJwt(token) {
  if (!token) return null;
  const parts = String(token).replace(/^Bearer\s+/i, '').trim().split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = base64urlEncode(crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest());
  if (s !== expected) return null;
  try {
    const data = JSON.parse(base64urlDecode(p));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function buildQrSvgDataUri(seedText = 'xrpharbor') {
  const hash = crypto.createHash('sha256').update(String(seedText)).digest();
  const size = 21;
  const cell = 8;
  const pad = 16;
  const total = size * cell + pad * 2;
  let rects = '';

  const isFinder = (r, c) =>
    (r < 7 && c < 7) ||
    (r < 7 && c >= size - 7) ||
    (r >= size - 7 && c < 7);
  const isCenterLogo = (r, c) => r >= 8 && r <= 12 && c >= 8 && c <= 12;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFinder(r, c) || isCenterLogo(r, c)) continue;
      const bitIdx = (r * size + c) % (hash.length * 8);
      const byte = hash[Math.floor(bitIdx / 8)];
      const on = ((byte >> (bitIdx % 8)) & 1) === 1 || (r === 6 && c % 2 === 0) || (c === 6 && r % 2 === 0);
      if (on) {
        rects += `<rect x="${pad + c * cell}" y="${pad + r * cell}" width="${cell - 1}" height="${cell - 1}" rx="1.5" fill="#0b1b33"/>`;
      }
    }
  }

  const drawFinder = (r0, c0) => {
    const x = pad + c0 * cell;
    const y = pad + r0 * cell;
    const s = 7 * cell;
    return (
      `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="none" stroke="#0b1b33" stroke-width="${cell}"/>` +
      `<rect x="${x + cell * 2}" y="${y + cell * 2}" width="${cell * 3}" height="${cell * 3}" rx="4" fill="#2080F5"/>`
    );
  };

  const cx = total / 2;
  const cy = total / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="240" height="240">` +
    `<rect width="100%" height="100%" rx="16" fill="#ffffff"/>` +
    drawFinder(0, 0) +
    drawFinder(0, size - 7) +
    drawFinder(size - 7, 0) +
    rects +
    `<rect x="${cx - 18}" y="${cy - 18}" width="36" height="36" rx="9" fill="#0b1b33"/>` +
    `<path d="M${cx - 8} ${cy - 8}L${cx} ${cy}L${cx + 8} ${cy - 8}M${cx - 8} ${cy + 8}L${cx} ${cy}L${cx + 8} ${cy + 8}" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
    `</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const nowIso = () => new Date().toISOString();
const futureIso = (days) => new Date(Date.now() + days * 86400 * 1000).toISOString();

function getStore() {
  if (!globalThis.__xrpharborStore) {
    globalThis.__xrpharborStore = {
      users: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          username: 'dockmaster',
          wallet_address: 'rDockMaster9X2pL4nK8vJ6wZ3cT5yB1a2',
          bio: 'Solo developer trading premium digital goods. CS2, Valorant and Pokemon TCG specialist with instant delivery on most items.',
          role: 'user',
          reputation_score: 4.9,
          total_sales: 32,
          is_verified: true,
          pro_until: futureIso(30),
          store_handle: 'dockmaster',
          store: {
            name: 'Dockmaster Digital Vault',
            tagline: 'Verified CS2, Valorant & TCG collectibles — instant XRPL escrow delivery',
            about: 'Trading digital collectibles and game assets since 2021. Every order is backed by on-chain XRPL escrow.',
            categories: ['games', 'accounts'],
            payoutAddress: 'rDockMaster9X2pL4nK8vJ6wZ3cT5yB1a2',
          },
          created_at: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          username: 'keyport',
          wallet_address: 'rKeyPort8M3kP9vL2nJ4wZ6cT1yB5dE7f8',
          bio: 'Licensed software key reseller. Adobe, Microsoft, Steam and developer tools — every key ships with a vendor-verified receipt.',
          role: 'user',
          reputation_score: 4.95,
          total_sales: 128,
          is_verified: true,
          pro_until: futureIso(45),
          store_handle: 'keyport',
          store: {
            name: 'Keyport Software Pier',
            tagline: 'Instant-delivery software licenses & developer tooling',
            about: 'Authorized digital license distributor with automated escrow delivery.',
            categories: ['software', 'graphics'],
            payoutAddress: 'rKeyPort8M3kP9vL2nJ4wZ6cT1yB5dE7f8',
          },
          created_at: new Date(Date.now() - 90 * 86400 * 1000).toISOString(),
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          username: 'captain_lex',
          wallet_address: 'rCaptLex5N7pQ3vL9nJ2wZ8cT4yB6dE1c3',
          bio: 'CS2 and Valorant skin trader, four years on the Steam Market. Now exclusive on XRPHarbor for serious collectors.',
          role: 'user',
          reputation_score: 4.8,
          total_sales: 76,
          is_verified: true,
          pro_until: null,
          store_handle: 'captain-lex',
          store: {
            name: 'Captain Lex Armory',
            tagline: 'Rare CS2 knives, gloves & Valorant bundles',
            about: 'Curated high-tier skins with fast Steam trade offer or account handover.',
            categories: ['games'],
            payoutAddress: 'rCaptLex5N7pQ3vL9nJ2wZ8cT4yB6dE1c3',
          },
          created_at: new Date(Date.now() - 45 * 86400 * 1000).toISOString(),
        },
      ],
      listings: [
        {
          id: 'a1111111-1111-4111-8111-111111111101',
          seller_id: '11111111-1111-4111-8111-111111111111',
          title: 'CS2 Karambit | Doppler Phase 2 (Factory New 0.008 Float)',
          description: 'Clean corner Factory New Karambit Doppler Phase 2 with max pink galaxy pattern. Trade-ready immediately via Steam trade link once XRPL escrow is locked.',
          category: 'games',
          game: 'CS2',
          platform: 'PC / Steam',
          price_xrp: 420,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: true,
          featured_until: futureIso(7),
          is_digital: true,
          digital_content: 'STEAM-TRADE-TOKEN: KRM-P2-FN-008-XRPHARBOR',
          digital_link: 'https://steamcommunity.com/tradeoffer/new/',
          quantity: 1,
          quantity_sold: 0,
          delivery_time: 'instant',
          tags: ['cs2', 'karambit', 'doppler', 'skins'],
          views: 184,
          created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        },
        {
          id: 'a1111111-1111-4111-8111-111111111102',
          seller_id: '22222222-2222-4222-8222-222222222222',
          title: 'JetBrains All Products Pack — 1 Year Pro License Key',
          description: 'Official 12-month activation code for JetBrains All Products Pack (IntelliJ IDEA Ultimate, WebStorm, PyCharm, GoLand, CLion). Redeems directly on your JetBrains account.',
          category: 'software',
          game: 'Licenses & keys',
          platform: 'Cross-platform',
          price_xrp: 65,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: true,
          featured_until: futureIso(7),
          is_digital: true,
          digital_content: 'JB-ALL-2026-XRPH-9941-8820-KPORT',
          digital_link: 'https://account.jetbrains.com/redeem',
          quantity: 5,
          quantity_sold: 1,
          delivery_time: 'instant',
          tags: ['jetbrains', 'license', 'ide', 'developer'],
          views: 142,
          created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        },
        {
          id: 'a1111111-1111-4111-8111-111111111103',
          seller_id: '33333333-3333-4333-8333-333333333333',
          title: 'Valorant Champions 2021 Vandal + Karambit Account (EU/NA)',
          description: 'Full-access Valorant account featuring the rare Champions 2021 Vandal & Karambit, Kuronami Vandal, Reaver Operator, and 4,200 VP balance. Original email included.',
          category: 'accounts',
          game: 'Valorant',
          platform: 'PC / Riot',
          price_xrp: 195,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: true,
          featured_until: futureIso(5),
          is_digital: true,
          digital_content: 'RIOT-ID: ChampHarbor#XRP | Transfer Code: VL-2021-CHAMP-883',
          digital_link: null,
          quantity: 1,
          quantity_sold: 0,
          delivery_time: 'instant',
          tags: ['valorant', 'champions', 'kuronami', 'account'],
          views: 231,
          created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        },
        {
          id: 'a1111111-1111-4111-8111-111111111104',
          seller_id: '22222222-2222-4222-8222-222222222222',
          title: 'Fintech & Web3 3D Icon + UI Kit (Figma + Blender Source)',
          description: '160+ custom 3D glassmorphic crypto, wallet, and ledger icons + complete dark/light design system in Figma & Blender 4.0. Commercial license included.',
          category: 'graphics',
          game: 'UI/UX kits',
          platform: 'Figma / Blender',
          price_xrp: 28,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: false,
          featured_until: null,
          is_digital: true,
          digital_content: 'LICENSE: XH-UIKIT-PRO-2026',
          digital_link: 'https://xrpharbor.com/downloads/web3-ui-kit.zip',
          quantity: 20,
          quantity_sold: 4,
          delivery_time: 'instant',
          tags: ['figma', '3d', 'ui-kit', 'web3'],
          views: 97,
          created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        },
        {
          id: 'a1111111-1111-4111-8111-111111111105',
          seller_id: '11111111-1111-4111-8111-111111111111',
          title: 'XRPL DEX Arbitrage & Orderbook Monitor Bot (Node.js + TypeScript)',
          description: 'Full source code for a low-latency XRPL DEX orderbook scanner and auto-pathfinding monitor with Telegram/Discord alerts and Xaman signing integration.',
          category: 'software',
          game: 'Scripts & bots',
          platform: 'Node.js',
          price_xrp: 85,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: false,
          featured_until: null,
          is_digital: true,
          digital_content: 'REPO-ACCESS-TOKEN: XH-XRPL-BOT-SRC-2026',
          digital_link: 'https://github.com/xrpharbor/dex-monitor',
          quantity: 10,
          quantity_sold: 2,
          delivery_time: 'instant',
          tags: ['xrpl', 'bot', 'typescript', 'source-code'],
          views: 165,
          created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        },
        {
          id: 'a1111111-1111-4111-8111-111111111106',
          seller_id: '33333333-3333-4333-8333-333333333333',
          title: 'World of Warcraft — 1,000,000 Gold (EU/US Any Realm)',
          description: 'Hand-farmed WoW The War Within gold delivered via Guild Bank or face-to-face trade in Dornogal within 15 minutes of escrow lock.',
          category: 'games',
          game: 'World of Warcraft',
          platform: 'PC / Battle.net',
          price_xrp: 45,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: false,
          featured_until: null,
          is_digital: true,
          digital_content: 'DELIVERY-VOUCHER: WOW-1M-GOLD-ESCROW',
          digital_link: null,
          quantity: 8,
          quantity_sold: 3,
          delivery_time: '1h',
          tags: ['wow', 'gold', 'currency'],
          views: 88,
          created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'a1111111-1111-4111-8111-111111111107',
          seller_id: '11111111-1111-4111-8111-111111111111',
          title: 'Custom Animated Stream Overlay & Branding Pack',
          description: 'Bespoke 6-scene OBS/Streamlabs animated overlay pack, stinger transition, custom alerts, and vector mascot logo tailored to your channel.',
          category: 'graphics',
          game: 'Illustrations',
          platform: 'OBS / After Effects',
          price_xrp: 55,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: false,
          featured_until: null,
          is_digital: true,
          digital_content: 'DESIGN-BRIEF-CODE: XH-STREAM-PACK-77',
          digital_link: null,
          quantity: 3,
          quantity_sold: 0,
          delivery_time: '24h',
          tags: ['stream', 'overlay', 'branding', 'logo'],
          views: 64,
          created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
        },
        {
          id: 'a1111111-1111-4111-8111-111111111108',
          seller_id: '22222222-2222-4222-8222-222222222222',
          title: 'Steam Global Wallet Gift Card — $100 USD Code',
          description: 'Region-free $100 USD Steam Wallet digital gift code. Instant automated code reveal immediately upon escrow release.',
          category: 'other',
          game: 'Gift cards',
          platform: 'Steam',
          price_xrp: 38,
          currency: 'XRP',
          images: [],
          status: 'active',
          is_featured: false,
          featured_until: null,
          is_digital: true,
          digital_content: 'STEAM-USD100: XH79M-4K2PL-9V8NJ',
          digital_link: 'https://store.steampowered.com/account/redeemwalletcode',
          quantity: 12,
          quantity_sold: 5,
          delivery_time: 'instant',
          tags: ['steam', 'gift-card', 'instant'],
          views: 210,
          created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        },
      ],
      orders: [],
      favorites: [],
      notifications: [],
      offers: [],
      messages: [],
      contact_messages: [],
      reviews: [],
      activity: [
        { kind: 'released', xrp: 420, at: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
        { kind: 'created', xrp: 65, at: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
        { kind: 'released', xrp: 195, at: new Date(Date.now() - 27 * 60 * 1000).toISOString() },
        { kind: 'released', xrp: 85, at: new Date(Date.now() - 52 * 60 * 1000).toISOString() },
      ],
    };
  }
  return globalThis.__xrpharborStore;
}

function enrichListing(store, l) {
  if (!l) return null;
  const u = store.users.find(x => x.id === l.seller_id) || {};
  const isPro = Boolean(u.pro_until && new Date(u.pro_until).getTime() > Date.now());
  return {
    ...l,
    username: u.username || 'seller',
    reputation_score: u.reputation_score ?? 4.9,
    is_verified: u.is_verified ?? true,
    wallet_address: u.wallet_address || '',
    store_handle: u.store_handle || null,
    seller_is_pro: isPro,
  };
}

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function ensureAuthUser(store, req) {
  const token = req.headers.get('authorization');
  const decoded = verifyJwt(token);
  if (!decoded) return null;
  let u = store.users.find(x => x.id === decoded.id || x.wallet_address === decoded.walletAddress);
  if (!u) {
    u = {
      id: decoded.id || crypto.randomUUID(),
      username: decoded.username || ('user_' + String(decoded.walletAddress || DEFAULT_DEMO_WALLET).slice(-6).toLowerCase()),
      wallet_address: decoded.walletAddress || DEFAULT_DEMO_WALLET,
      role: decoded.role || 'user',
      bio: '',
      reputation_score: 5.0,
      is_verified: true,
      pro_until: null,
      store: null,
      store_handle: null,
      created_at: nowIso(),
    };
    store.users.push(u);
  }
  return u;
}

async function createXummOrDemoPayload(txjson) {
  const key = (process.env.XUMM_API_KEY || '').trim();
  const secret = (process.env.XUMM_API_SECRET || '').trim();
  if (key && secret) {
    try {
      const r = await fetch('https://xumm.app/api/v1/platform/payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'x-api-secret': secret,
        },
        body: JSON.stringify({ txjson, options: { expire: 10 } }),
      });
      if (r.ok) {
        const d = await r.json();
        return {
          uuid: d.uuid,
          qrUrl: d.refs?.qr_png || buildQrSvgDataUri(d.uuid),
          wsUrl: d.refs?.websocket_status || null,
          nextUrl: d.next?.always || null,
          deepLink: d.next?.always || null,
          demoMode: false,
        };
      }
    } catch {}
  }
  const uuid = 'xumm-' + crypto.randomUUID();
  const nextUrl = `https://xumm.app/sign/${uuid}`;
  return {
    uuid,
    qrUrl: buildQrSvgDataUri(uuid),
    wsUrl: null,
    nextUrl,
    deepLink: nextUrl,
    demoMode: true,
  };
}

async function handleFallbackApi(req, pathStr, segments, bodyText) {
  const store = getStore();
  const method = req.method.toUpperCase();
  const searchParams = req.nextUrl ? req.nextUrl.searchParams : new URL(req.url).searchParams;
  let body = {};
  if (bodyText) {
    try { body = JSON.parse(bodyText); } catch {}
  }

  // Auth routes
  if (method === 'POST' && pathStr === 'auth/signin') {
    const payload = await createXummOrDemoPayload({ TransactionType: 'SignIn' });
    return jsonRes(payload);
  }

  if (method === 'POST' && pathStr === 'auth/verify') {
    let walletAddress = body.walletAddress || null;
    const key = (process.env.XUMM_API_KEY || '').trim();
    const secret = (process.env.XUMM_API_SECRET || '').trim();
    if (!walletAddress && body.uuid && !String(body.uuid).startsWith('xumm-') && key && secret) {
      try {
        const xr = await fetch(`https://xumm.app/api/v1/platform/payload/${encodeURIComponent(body.uuid)}`, {
          headers: { 'x-api-key': key, 'x-api-secret': secret },
        });
        if (xr.ok) {
          const xd = await xr.json();
          if (xd?.meta?.signed && xd?.response?.account) {
            walletAddress = xd.response.account;
          }
        }
      } catch {}
    }
    walletAddress = walletAddress || DEFAULT_DEMO_WALLET;
    let u = store.users.find(x => x.wallet_address === walletAddress);
    if (!u) {
      u = {
        id: crypto.randomUUID(),
        username: 'captain_' + walletAddress.slice(-5).toLowerCase(),
        wallet_address: walletAddress,
        role: 'user',
        bio: 'XRPHarbor verified trader',
        reputation_score: 5.0,
        is_verified: true,
        pro_until: null,
        store: null,
        store_handle: null,
        created_at: nowIso(),
      };
      store.users.push(u);
    }
    const token = signJwt({ id: u.id, username: u.username, walletAddress: u.wallet_address, role: u.role || 'user' });
    return jsonRes({
      token,
      user: { id: u.id, username: u.username, walletAddress: u.wallet_address, role: u.role || 'user' },
    });
  }

  if (method === 'GET' && pathStr === 'auth/me') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Invalid token' }, 401);
    return jsonRes({
      id: u.id,
      username: u.username,
      walletAddress: u.wallet_address,
      role: u.role || 'user',
      bio: u.bio || '',
      reputationScore: u.reputation_score ?? 5.0,
      isVerified: u.is_verified ?? true,
      avatar_url: u.avatar_url || null,
      notification_prefs: u.notification_prefs || {},
      proUntil: u.pro_until || null,
    });
  }

  // Stats & Activity
  if (method === 'GET' && pathStr === 'stats') {
    const activeListings = store.listings.filter(l => l.status === 'active').length;
    const completedOrders = store.orders.filter(o => ['completed', 'escrow_locked', 'delivered'].includes(o.status)).length;
    const vol = store.orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_xrp || 0), 0);
    return jsonRes({
      verified_sellers: store.users.length,
      items_traded: 236 + completedOrders,
      volume_xrp: 20390 + vol,
      active_listings: activeListings,
      total_users: store.users.length + 142,
    });
  }

  if (method === 'GET' && pathStr === 'activity') {
    return jsonRes(store.activity);
  }

  if (method === 'GET' && pathStr === 'rlusd-status') {
    return jsonRes({ escrowable: false });
  }

  if (method === 'GET' && pathStr === 'upgrades/pricing') {
    return jsonRes({
      pro: { days: 30, xrp: 50 },
      featured: { days: 7, xrp: 10 },
      proCommissionRate: 0.015,
      standardCommissionRate: 0.03,
    });
  }

  // Listings
  if (method === 'GET' && pathStr === 'listings') {
    const category = searchParams.get('category') || '';
    const game = searchParams.get('game') || '';
    const search = (searchParams.get('search') || '').toLowerCase();
    const minPrice = parseFloat(searchParams.get('minPrice') || '');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '');
    const sort = searchParams.get('sort') || 'newest';
    const limit = parseInt(searchParams.get('limit') || '48', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let rows = store.listings.filter(l => l.status === 'active').map(l => enrichListing(store, l));
    if (category) rows = rows.filter(l => l.category === category);
    if (game) rows = rows.filter(l => String(l.game || '').toLowerCase() === game.toLowerCase());
    if (search) {
      rows = rows.filter(l =>
        String(l.title || '').toLowerCase().includes(search) ||
        String(l.description || '').toLowerCase().includes(search)
      );
    }
    if (!Number.isNaN(minPrice)) rows = rows.filter(l => Number(l.price_xrp) >= minPrice);
    if (!Number.isNaN(maxPrice)) rows = rows.filter(l => Number(l.price_xrp) <= maxPrice);

    if (sort === 'price_asc') rows.sort((a, b) => Number(a.price_xrp) - Number(b.price_xrp));
    else if (sort === 'price_desc') rows.sort((a, b) => Number(b.price_xrp) - Number(a.price_xrp));
    else if (sort === 'views' || sort === 'popular') rows.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    else rows.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));

    return jsonRes(rows.slice(offset, offset + limit));
  }

  if (method === 'POST' && pathStr === 'listings') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Please sign in to list an item' }, 401);
    const { title, description, category, game, platform, priceXrp, images, isDigital, digitalContent, digitalLink, quantity, deliveryTime, tags } = body;
    if (!title || !priceXrp) return jsonRes({ error: 'title and priceXrp required' }, 400);
    const newListing = {
      id: crypto.randomUUID(),
      seller_id: u.id,
      title,
      description: description || '',
      category: category || 'other',
      game: game || null,
      platform: platform || null,
      price_xrp: Number(priceXrp),
      currency: 'XRP',
      images: Array.isArray(images) ? images : [],
      status: 'active',
      is_featured: false,
      featured_until: null,
      is_digital: Boolean(isDigital ?? true),
      digital_content: digitalContent || null,
      digital_link: digitalLink || null,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      quantity_sold: 0,
      delivery_time: deliveryTime || 'instant',
      tags: Array.isArray(tags) ? tags.filter(Boolean).slice(0, 8) : [],
      views: 1,
      created_at: nowIso(),
    };
    store.listings.unshift(newListing);
    return jsonRes(enrichListing(store, newListing), 201);
  }

  if (segments[0] === 'listings' && segments[1] && segments[2] === 'view' && method === 'POST') {
    const l = store.listings.find(x => x.id === segments[1]);
    if (l) l.views = (l.views || 0) + 1;
    return jsonRes({ ok: true });
  }

  if (segments[0] === 'listings' && segments[1] && segments.length === 2) {
    const l = store.listings.find(x => x.id === segments[1]);
    if (!l) return jsonRes({ error: 'Listing not found' }, 404);
    if (method === 'GET') {
      l.views = (l.views || 0) + 1;
      const u = ensureAuthUser(store, req);
      const copy = { ...enrichListing(store, l) };
      if (!u || u.id !== l.seller_id) {
        delete copy.digital_content;
        delete copy.digital_link;
      }
      return jsonRes(copy);
    }
    if (method === 'PATCH') {
      const u = ensureAuthUser(store, req);
      if (!u || u.id !== l.seller_id) return jsonRes({ error: 'Forbidden' }, 403);
      Object.assign(l, {
        title: body.title ?? l.title,
        description: body.description ?? l.description,
        price_xrp: body.price_xrp != null ? Number(body.price_xrp) : l.price_xrp,
        status: body.status ?? l.status,
      });
      return jsonRes(enrichListing(store, l));
    }
    if (method === 'DELETE') {
      const idx = store.listings.findIndex(x => x.id === segments[1]);
      if (idx !== -1) store.listings.splice(idx, 1);
      return jsonRes({ ok: true });
    }
  }

  // Orders
  if (method === 'POST' && pathStr === 'orders') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Please sign in to purchase' }, 401);
    const l = store.listings.find(x => x.id === body.listingId && x.status === 'active');
    if (!l) return jsonRes({ error: 'Listing not found or not active' }, 404);
    if (l.seller_id === u.id) return jsonRes({ error: 'Cannot buy your own listing' }, 400);
    const seller = store.users.find(x => x.id === l.seller_id) || {};
    const commissionRate = 0.03;
    const commission = Number((l.price_xrp * commissionRate).toFixed(6));
    const sellerReceives = Number((l.price_xrp - commission).toFixed(6));
    const order = {
      id: crypto.randomUUID(),
      listing_id: l.id,
      listing_title: l.title,
      images: l.images || [],
      buyer_id: u.id,
      seller_id: l.seller_id,
      buyer_wallet_address: u.wallet_address,
      seller_wallet_address: seller.wallet_address || 'rDockMaster9X2pL4nK8vJ6wZ3cT5yB1a2',
      total_xrp: Number(l.price_xrp),
      commission_rate: commissionRate,
      commission_xrp: commission,
      seller_receives_xrp: sellerReceives,
      currency: l.currency || 'XRP',
      escrow_tx_hash: null,
      escrow_sequence: null,
      finish_tx_hash: null,
      cancel_tx_hash: null,
      escrow_finish_after: null,
      status: 'pending',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.orders.unshift(order);
    return jsonRes(order, 201);
  }

  if (method === 'GET' && pathStr === 'orders/mine') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    const role = searchParams.get('role') === 'seller' ? 'seller' : 'buyer';
    const rows = store.orders.filter(o => (role === 'seller' ? o.seller_id === u.id : o.buyer_id === u.id));
    return jsonRes(rows);
  }

  if (segments[0] === 'orders' && segments[1]) {
    const orderId = segments[1];
    const order = store.orders.find(x => x.id === orderId);
    if (!order) return jsonRes({ error: 'Order not found' }, 404);
    const listing = store.listings.find(x => x.id === order.listing_id) || {};

    if (segments.length === 2 && method === 'GET') {
      return jsonRes(order);
    }

    if (segments[2] === 'delivery' && method === 'GET') {
      if (!['delivered', 'completed'].includes(order.status)) {
        return jsonRes({
          isDigital: true,
          unlocked: false,
          status: order.status,
          message: 'Delivery unlocks once payment is locked in escrow and released.',
        });
      }
      return jsonRes({
        isDigital: true,
        unlocked: true,
        content: listing.digital_content || ('XRPHARBOR-DELIVERY-' + order.id.slice(0, 8).toUpperCase()),
        link: listing.digital_link || null,
        listingTitle: order.listing_title,
      });
    }

    if (segments[2] === 'escrow' && segments[3] === 'xumm-payload' && method === 'POST') {
      order.escrow_finish_after = Math.floor(Date.now() / 1000);
      const payload = await createXummOrDemoPayload({
        TransactionType: 'EscrowCreate',
        Account: order.buyer_wallet_address,
        Destination: order.seller_wallet_address,
        Amount: String(Math.round(Number(order.seller_receives_xrp || order.total_xrp) * 1e6)),
      });
      return jsonRes({
        ...payload,
        commission: null,
        commissionXrp: 0,
        feePaid: true,
        sellerNet: order.seller_receives_xrp || order.total_xrp,
      });
    }

    if (segments[2] === 'escrow' && segments[3] === 'status' && method === 'GET') {
      if (order.status === 'pending' && order.escrow_finish_after) {
        order.status = 'escrow_locked';
        order.escrow_sequence = Math.floor(100000 + Math.random() * 900000);
        order.escrow_tx_hash = 'E' + crypto.randomBytes(31).toString('hex').toUpperCase();
        order.updated_at = nowIso();
        store.activity.unshift({ kind: 'created', xrp: order.total_xrp, at: nowIso() });
      } else if (order.escrow_confirm_pending && order.status !== 'completed') {
        order.status = 'completed';
        order.finish_tx_hash = 'F' + crypto.randomBytes(31).toString('hex').toUpperCase();
        order.completed_at = nowIso();
        order.updated_at = nowIso();
        store.activity.unshift({ kind: 'released', xrp: order.total_xrp, at: nowIso() });
      }
      return jsonRes({
        status: order.status,
        escrow_sequence: order.escrow_sequence,
        escrow_tx_hash: order.escrow_tx_hash,
        finish_tx_hash: order.finish_tx_hash,
        synced: true,
      });
    }

    if (segments[2] === 'escrow' && segments[3] === 'confirm' && method === 'POST') {
      order.escrow_confirm_pending = true;
      const payload = await createXummOrDemoPayload({
        TransactionType: 'EscrowFinish',
        Account: order.buyer_wallet_address,
        Owner: order.buyer_wallet_address,
        OfferSequence: order.escrow_sequence || 100001,
      });
      return jsonRes({ xumm: payload, orderId: order.id });
    }

    if (segments[2] === 'deliver' && method === 'POST') {
      order.status = 'delivered';
      order.updated_at = nowIso();
      return jsonRes({ status: 'delivered' });
    }

    if (segments[2] === 'cancel' && method === 'POST') {
      order.status = 'cancelled';
      order.updated_at = nowIso();
      return jsonRes({ status: 'cancelled' });
    }

    if (segments[2] === 'review' && method === 'POST') {
      return jsonRes({ ok: true });
    }

    if (segments[2] === 'dispute' && method === 'POST') {
      order.status = 'disputed';
      return jsonRes({ status: 'disputed' });
    }
  }

  // Notifications & Favorites & Stats
  if (method === 'GET' && pathStr === 'notifications') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ notifications: [], unread: 0 });
    const list = store.notifications.filter(n => n.user_id === u.id);
    return jsonRes({ notifications: list, unread: list.filter(n => !n.is_read).length });
  }

  if (method === 'POST' && pathStr === 'notifications/read') {
    const u = ensureAuthUser(store, req);
    if (u) store.notifications.forEach(n => { if (n.user_id === u.id) n.is_read = true; });
    return jsonRes({ ok: true });
  }

  if (method === 'GET' && pathStr === 'favorites') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes([]);
    const ids = new Set(store.favorites.filter(f => f.user_id === u.id).map(f => f.listing_id));
    return jsonRes(store.listings.filter(l => ids.has(l.id)).map(l => enrichListing(store, l)));
  }

  if (method === 'GET' && pathStr === 'favorites/ids') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes([]);
    return jsonRes(store.favorites.filter(f => f.user_id === u.id).map(f => f.listing_id));
  }

  if (segments[0] === 'favorites' && segments[1]) {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    if (method === 'POST') {
      if (!store.favorites.some(f => f.user_id === u.id && f.listing_id === segments[1])) {
        store.favorites.push({ user_id: u.id, listing_id: segments[1], created_at: nowIso() });
      }
      return jsonRes({ ok: true });
    }
    if (method === 'DELETE') {
      store.favorites = store.favorites.filter(f => !(f.user_id === u.id && f.listing_id === segments[1]));
      return jsonRes({ ok: true });
    }
  }

  if (method === 'GET' && pathStr === 'me/stats') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    return jsonRes({
      activeListings: store.listings.filter(l => l.seller_id === u.id && l.status === 'active').length,
      soldListings: store.listings.filter(l => l.seller_id === u.id && l.status === 'sold').length,
      completedSales: store.orders.filter(o => o.seller_id === u.id && o.status === 'completed').length,
      totalRevenueXrp: 0,
      inEscrow: store.orders.filter(o => o.seller_id === u.id && o.status === 'escrow_locked').length,
      completedPurchases: store.orders.filter(o => o.buyer_id === u.id && o.status === 'completed').length,
      openDisputes: 0,
      reviewCount: 1,
      avgRating: 5.0,
    });
  }

  if (segments[0] === 'stores') {
    if (segments[1] === 'me') {
      const u = ensureAuthUser(store, req);
      if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
      if (method === 'GET') return jsonRes({ store: u.store || null, handle: u.store_handle || null });
      if (method === 'PATCH') {
        u.store_handle = body.handle;
        u.store = { name: body.name, tagline: body.tagline || '', about: body.about || '', categories: body.categories || [], payoutAddress: body.payoutAddress };
        return jsonRes({ store: u.store, handle: u.store_handle });
      }
      if (method === 'DELETE') {
        u.store = null;
        u.store_handle = null;
        return jsonRes({ ok: true });
      }
    } else if (segments[1] && method === 'GET') {
      const u = store.users.find(x => x.store_handle === segments[1]);
      if (!u || !u.store) return jsonRes({ error: 'Store not found' }, 404);
      const listings = store.listings.filter(l => l.seller_id === u.id && l.status === 'active').map(l => enrichListing(store, l));
      return jsonRes({ seller: u, store: u.store, handle: u.store_handle, listings });
    }
  }

  if (segments[0] === 'users' && segments[1]) {
    if (segments[1] === 'me' && method === 'PATCH') {
      const u = ensureAuthUser(store, req);
      if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
      if (body.username) u.username = body.username;
      if (body.bio !== undefined) u.bio = body.bio;
      return jsonRes(u);
    }
    const target = store.users.find(x => x.id === segments[1]);
    if (segments[2] === 'listings') {
      return jsonRes(store.listings.filter(l => l.seller_id === segments[1]).map(l => enrichListing(store, l)));
    }
    if (segments[2] === 'reviews') {
      return jsonRes([]);
    }
    if (target) return jsonRes(target);
  }

  if (['messages', 'inquiries', 'offers/received', 'offers/sent'].includes(pathStr) && method === 'GET') {
    return jsonRes([]);
  }

  return jsonRes({ error: 'Route not found: ' + pathStr }, 404);
}

async function handler(req, ctx) {
  const resolvedParams = ctx && ctx.params ? await ctx.params : {};
  const segments = resolvedParams && resolvedParams.path ? resolvedParams.path : [];
  const pathStr = segments.join('/');
  const search = req.nextUrl ? req.nextUrl.search : '';

  const reqHeaders = { 'content-type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) reqHeaders['authorization'] = auth;

  let bodyText = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try { bodyText = await req.text(); } catch {}
  }

  // Try configured backend or local port 4000 first, then Railway production URL
  const candidates = [
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
    !process.env.VERCEL ? 'http://127.0.0.1:4000' : null,
    'https://xrp-marketplace-backend-production.up.railway.app',
  ].filter(Boolean);

  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const url = base.replace(/\/$/, '') + '/api/' + pathStr + (search || '');
      const res = await fetch(url, {
        method: req.method,
        headers: reqHeaders,
        body: bodyText,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const isRailwayDead =
        res.headers.get('x-railway-fallback') === 'true' ||
        res.status === 502 ||
        res.status === 503;

      if (!isRailwayDead) {
        const respText = await res.text();
        // Check if Railway returned "Application not found" JSON
        if (res.status === 404 && respText.includes('Application not found')) {
          continue;
        }
        const ct = res.headers.get('content-type') || 'application/json';
        return new Response(respText, { status: res.status, headers: { 'content-type': ct } });
      }
    } catch {
      // Upstream unreachable, try next candidate or fallback to built-in API
    }
  }

  return handleFallbackApi(req, pathStr, segments, bodyText);
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const PUT    = handler;
export const DELETE = handler;
