import crypto from 'crypto';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET is not set - deriving runtime JWT secret. Set JWT_SECRET in your environment.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.createHash('sha256').update(process.env.DATABASE_URL || process.env.XUMM_API_SECRET || os.hostname() + '-xrpharbor-runtime-key').digest('hex');
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

function svgToDataUri(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
}

const LISTING_IMAGES = {
  karambit: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85',
  jetbrains: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=85',
  valorant: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=900&q=85',
  uikit: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=85',
  dexbot: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=900&q=85',
  wowgold: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=900&q=85',
  stream: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=900&q=85',
  steam: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=900&q=85',
};

const _UNUSED_SVG_IMAGES = {
  karambit: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#090d1a"/>
          <stop offset="50%" stop-color="#1e1035"/>
          <stop offset="100%" stop-color="#3b0a45"/>
        </linearGradient>
        <radialGradient id="glow1" cx="55%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#ec4899" stop-opacity="0.45"/>
          <stop offset="60%" stop-color="#8b5cf6" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#090d1a" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="blade1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f43f5e"/>
          <stop offset="40%" stop-color="#ec4899"/>
          <stop offset="75%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
        <linearGradient id="handle1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg1)"/>
      <circle cx="440" cy="280" r="260" fill="url(#glow1)"/>
      <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
        <line x1="0" y1="150" x2="800" y2="150"/><line x1="0" y1="300" x2="800" y2="300"/><line x1="0" y1="450" x2="800" y2="450"/>
        <line x1="200" y1="0" x2="200" y2="600"/><line x1="400" y1="0" x2="400" y2="600"/><line x1="600" y1="0" x2="600" y2="600"/>
      </g>
      <!-- Karambit Silhouette & Galaxy Doppler Blade -->
      <g transform="translate(390, 290) rotate(-18)">
        <!-- Curved Doppler Blade -->
        <path d="M-30,-20 C40,-140 180,-165 255,-75 C175,-95 85,-45 25,25 Z" fill="url(#blade1)" stroke="#f9a8d4" stroke-width="2"/>
        <path d="M-15,-12 C45,-110 155,-135 225,-72" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3" stroke-linecap="round"/>
        <!-- Ergonomic Handle -->
        <path d="M-35,-22 L28,28 C5,75 -45,115 -105,130 C-125,110 -120,75 -95,45 C-75,20 -55,-2 -35,-22 Z" fill="url(#handle1)" stroke="#475569" stroke-width="2.5"/>
        <!-- Handle Grips -->
        <line x1="-25" y1="10" x2="-5" y2="30" stroke="#ec4899" stroke-width="3" stroke-linecap="round"/>
        <line x1="-48" y1="35" x2="-26" y2="55" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>
        <line x1="-72" y1="60" x2="-50" y2="80" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <!-- Finger Ring -->
        <circle cx="-122" cy="138" r="34" fill="none" stroke="#64748b" stroke-width="12"/>
        <circle cx="-122" cy="138" r="34" fill="none" stroke="#f472b6" stroke-width="2"/>
      </g>
      <!-- Bottom Info Bar -->
      <rect x="40" y="485" width="720" height="72" rx="14" fill="rgba(15,23,42,0.78)" stroke="rgba(236,72,153,0.35)" stroke-width="1.5"/>
      <text x="68" y="518" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="22" font-weight="700">★ Karambit | Doppler Phase 2</text>
      <text x="68" y="542" fill="#f472b6" font-family="monospace" font-size="15" font-weight="600">FACTORY NEW • FLOAT 0.0084 • MAX PINK GALAXY</text>
      <rect x="615" y="503" width="120" height="36" rx="8" fill="rgba(236,72,153,0.2)" stroke="#ec4899"/>
      <text x="675" y="526" text-anchor="middle" fill="#fbcfe8" font-family="monospace" font-size="14" font-weight="700">CS2 SKIN</text>
    </svg>
  `),

  jetbrains: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="jbBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b0f19"/>
          <stop offset="55%" stop-color="#1a1033"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="jbGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff318c"/>
          <stop offset="50%" stop-color="#ff7700"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#jbBg)"/>
      <circle cx="620" cy="140" r="220" fill="#ff318c" fill-opacity="0.14"/>
      <circle cx="180" cy="420" r="220" fill="#ff7700" fill-opacity="0.12"/>
      <!-- Code Editor Card -->
      <rect x="90" y="75" width="620" height="370" rx="18" fill="#111827" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
      <circle cx="122" cy="105" r="7" fill="#ef4444"/>
      <circle cx="144" cy="105" r="7" fill="#f59e0b"/>
      <circle cx="166" cy="105" r="7" fill="#10b981"/>
      <text x="200" y="110" fill="#94a3b8" font-family="monospace" font-size="14">jetbrains-all-products-pro.license</text>
      <line x1="90" y1="128" x2="710" y2="128" stroke="rgba(255,255,255,0.08)"/>
      <!-- JetBrains Brand Monogram Box -->
      <rect x="135" y="165" width="160" height="160" rx="24" fill="url(#jbGrad)"/>
      <rect x="150" y="180" width="130" height="130" rx="14" fill="#0b0f19"/>
      <text x="172" y="242" fill="#ffffff" font-family="system-ui,sans-serif" font-size="44" font-weight="900">JB</text>
      <rect x="172" y="275" width="64" height="8" rx="4" fill="url(#jbGrad)"/>
      <!-- IDE Badges -->
      <g font-family="monospace" font-size="15" font-weight="700">
        <rect x="330" y="168" width="160" height="42" rx="10" fill="#1e293b" stroke="#ff318c"/>
        <text x="410" y="194" text-anchor="middle" fill="#f8fafc">IntelliJ IDEA</text>
        <rect x="505" y="168" width="160" height="42" rx="10" fill="#1e293b" stroke="#38bdf8"/>
        <text x="585" y="194" text-anchor="middle" fill="#f8fafc">WebStorm</text>
        <rect x="330" y="224" width="160" height="42" rx="10" fill="#1e293b" stroke="#10b981"/>
        <text x="410" y="250" text-anchor="middle" fill="#f8fafc">PyCharm Pro</text>
        <rect x="505" y="224" width="160" height="42" rx="10" fill="#1e293b" stroke="#a855f7"/>
        <text x="585" y="250" text-anchor="middle" fill="#f8fafc">GoLand &amp; CLion</text>
      </g>
      <rect x="330" y="284" width="335" height="42" rx="10" fill="rgba(16,185,129,0.14)" stroke="#10b981"/>
      <text x="497" y="310" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="15" font-weight="700">✓ 10 IDEs + ReSharper • 1 YEAR PRO</text>
      <text x="400" y="515" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="24" font-weight="700">JetBrains All Products Pack — 1 Year Pro</text>
      <text x="400" y="545" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="15">OFFICIAL ACTIVATION KEY • MAC / WIN / LINUX</text>
    </svg>
  `),

  valorant: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="valBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f0c08"/>
          <stop offset="50%" stop-color="#1f1710"/>
          <stop offset="100%" stop-color="#2d1215"/>
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fde047"/>
          <stop offset="50%" stop-color="#eab308"/>
          <stop offset="100%" stop-color="#ca8a04"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#valBg)"/>
      <!-- Champions Gold Chevron Backdrop -->
      <polygon points="400,65 570,260 400,455 230,260" fill="none" stroke="url(#goldGrad)" stroke-width="5" opacity="0.55"/>
      <polygon points="400,105 530,260 400,415 270,260" fill="rgba(234,179,8,0.08)" stroke="#ef4444" stroke-width="2"/>
      <!-- Valorant V Emblem + Rifle Silhouette -->
      <path d="M335,175 L385,295 L415,295 L335,130 Z" fill="url(#goldGrad)"/>
      <path d="M465,130 L405,250 L450,250 L465,220 Z" fill="#ef4444"/>
      <!-- Tactical Rifle Barrel & Body -->
      <g transform="translate(155, 295)">
        <rect x="60" y="16" width="330" height="22" rx="4" fill="#1e293b" stroke="url(#goldGrad)" stroke-width="2.5"/>
        <rect x="390" y="21" width="115" height="9" rx="3" fill="#eab308"/>
        <polygon points="60,16 15,58 85,58 115,38" fill="#0f172a" stroke="url(#goldGrad)" stroke-width="2"/>
        <polygon points="215,38 195,88 235,88 255,38" fill="#ef4444" stroke="url(#goldGrad)" stroke-width="2"/>
        <rect x="145" y="4" width="95" height="12" rx="4" fill="url(#goldGrad)"/>
      </g>
      <!-- Bottom Banner -->
      <rect x="45" y="475" width="710" height="80" rx="14" fill="rgba(15,12,8,0.85)" stroke="url(#goldGrad)" stroke-width="2"/>
      <text x="75" y="512" fill="#fef08a" font-family="system-ui,sans-serif" font-size="22" font-weight="800">VALORANT CHAMPIONS 2021 BUNDLE</text>
      <text x="75" y="538" fill="#fca5a5" font-family="monospace" font-size="15" font-weight="600">CHAMPIONS VANDAL + KARAMBIT + KURONAMI + 4,200 VP</text>
      <rect x="600" y="497" width="125" height="36" rx="8" fill="url(#goldGrad)"/>
      <text x="662" y="520" text-anchor="middle" fill="#0f0c08" font-family="monospace" font-size="14" font-weight="800">FULL ACCESS</text>
    </svg>
  `),

  uikit: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="uiBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f0728"/>
          <stop offset="50%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="cube1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#6366f1"/>
        </linearGradient>
        <linearGradient id="cube2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f472b6"/>
          <stop offset="100%" stop-color="#9333ea"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#uiBg)"/>
      <circle cx="400" cy="250" r="230" fill="#6366f1" fill-opacity="0.18"/>
      <!-- 3D Glassmorphic Floating Cards -->
      <rect x="130" y="100" width="240" height="160" rx="24" fill="url(#cube1)" opacity="0.9" stroke="#bae6fd" stroke-width="2"/>
      <circle cx="195" cy="165" r="32" fill="rgba(255,255,255,0.25)"/>
      <text x="195" y="175" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="26" font-weight="800">✕</text>
      <rect x="245" y="145" width="95" height="14" rx="7" fill="rgba(255,255,255,0.8)"/>
      <rect x="245" y="170" width="65" height="12" rx="6" fill="rgba(255,255,255,0.45)"/>

      <rect x="420" y="115" width="250" height="165" rx="24" fill="url(#cube2)" opacity="0.9" stroke="#fbcfe8" stroke-width="2"/>
      <polygon points="545,145 595,195 545,245 495,195" fill="rgba(255,255,255,0.28)" stroke="#fff" stroke-width="2"/>

      <rect x="250" y="235" width="300" height="185" rx="26" fill="rgba(15,23,42,0.88)" stroke="#818cf8" stroke-width="2.5"/>
      <text x="400" y="305" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="30" font-weight="800">160+ 3D ICONS</text>
      <text x="400" y="340" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="700">FIGMA + BLENDER 4.0 SOURCE</text>
      <rect x="310" y="362" width="180" height="32" rx="16" fill="#4f46e5"/>
      <text x="400" y="383" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="13" font-weight="700">WEB3 &amp; FINTECH KIT</text>

      <text x="400" y="515" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="24" font-weight="700">Fintech &amp; Web3 3D Icon + UI Design System</text>
      <text x="400" y="545" text-anchor="middle" fill="#a5b4fc" font-family="monospace" font-size="15">COMMERCIAL LICENSE • GLASSMORPHIC VECTOR &amp; 3D ASSETS</text>
    </svg>
  `),

  dexbot: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="800" height="600" fill="#06101e"/>
      <!-- Terminal Window -->
      <rect x="65" y="55" width="670" height="400" rx="16" fill="#0b192c" stroke="#1e3a5f" stroke-width="2"/>
      <rect x="65" y="55" width="670" height="42" rx="16" fill="#0f2440"/>
      <circle cx="95" cy="76" r="6" fill="#ef4444"/>
      <circle cx="115" cy="76" r="6" fill="#f59e0b"/>
      <circle cx="135" cy="76" r="6" fill="#10b981"/>
      <text x="165" y="81" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="700">xrpl-dex-arbitrage-bot — wss://xrplcluster.com [CONNECTED]</text>
      <!-- Candlesticks & Orderbook Depth -->
      <g transform="translate(95, 125)">
        <line x1="40" y1="30" x2="40" y2="140" stroke="#10b981" stroke-width="3"/>
        <rect x="28" y="55" width="24" height="55" rx="3" fill="#10b981"/>
        <line x1="95" y1="50" x2="95" y2="165" stroke="#ef4444" stroke-width="3"/>
        <rect x="83" y="70" width="24" height="60" rx="3" fill="#ef4444"/>
        <line x1="150" y1="20" x2="150" y2="135" stroke="#10b981" stroke-width="3"/>
        <rect x="138" y="40" width="24" height="65" rx="3" fill="#10b981"/>
        <line x1="205" y1="10" x2="205" y2="110" stroke="#10b981" stroke-width="3"/>
        <rect x="193" y="25" width="24" height="55" rx="3" fill="#10b981"/>
        <polyline points="20,150 85,115 150,85 220,40 295,60 360,15" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
      </g>
      <!-- Live Telemetry Box -->
      <rect x="470" y="125" width="235" height="175" rx="12" fill="#071324" stroke="#10b981" stroke-width="1.5"/>
      <text x="490" y="155" fill="#10b981" font-family="monospace" font-size="14" font-weight="700">● ARB SPREAD: +2.84%</text>
      <text x="490" y="185" fill="#cbd5e1" font-family="monospace" font-size="13">PAIR: XRP / RLUSD</text>
      <text x="490" y="212" fill="#cbd5e1" font-family="monospace" font-size="13">LATENCY: 14ms</text>
      <text x="490" y="239" fill="#38bdf8" font-family="monospace" font-size="13">PATHFINDING: AUTO</text>
      <text x="490" y="268" fill="#fde047" font-family="monospace" font-size="13">ALERTS: TG + DISCORD</text>
      <!-- Bottom Console Logs -->
      <rect x="95" y="325" width="610" height="100" rx="10" fill="#060d18" stroke="#1e293b"/>
      <text x="115" y="355" fill="#34d399" font-family="monospace" font-size="14">[12:04:19] Ledger #91844210 closed • Best ask 2.412 XRP • Spread +2.84%</text>
      <text x="115" y="382" fill="#38bdf8" font-family="monospace" font-size="14">[12:04:20] Auto-path routed via XRPL OfferCreate (tesSUCCESS)</text>
      <text x="115" y="408" fill="#94a3b8" font-family="monospace" font-size="14">Full TypeScript + Node.js Source Code Included</text>
      <text x="400" y="512" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="24" font-weight="700">XRPL DEX Arbitrage &amp; Orderbook Monitor Bot</text>
      <text x="400" y="542" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="15">NODE.JS + TYPESCRIPT • FULL SOURCE CODE &amp; DOCS</text>
    </svg>
  `),

  wowgold: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <radialGradient id="wowBg" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stop-color="#451a03"/>
          <stop offset="55%" stop-color="#1c1008"/>
          <stop offset="100%" stop-color="#0c0a09"/>
        </radialGradient>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="45%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#wowBg)"/>
      <!-- Glowing Ornate Crest -->
      <circle cx="400" cy="235" r="155" fill="rgba(245,158,11,0.12)" stroke="url(#coinGrad)" stroke-width="4"/>
      <circle cx="400" cy="235" r="132" fill="none" stroke="#fde047" stroke-width="1.5" stroke-dasharray="10 6"/>
      <!-- Stacked Gold Coins Illustration -->
      <g transform="translate(400, 235)">
        <circle cx="-65" cy="30" r="54" fill="url(#coinGrad)" stroke="#fef08a" stroke-width="3"/>
        <circle cx="65" cy="30" r="54" fill="url(#coinGrad)" stroke="#fef08a" stroke-width="3"/>
        <circle cx="0" cy="-10" r="68" fill="url(#coinGrad)" stroke="#ffffff" stroke-width="3.5"/>
        <text x="0" y="12" text-anchor="middle" fill="#451a03" font-family="serif" font-size="56" font-weight="900">W</text>
      </g>
      <!-- Banner -->
      <rect x="75" y="435" width="650" height="115" rx="16" fill="rgba(28,16,8,0.9)" stroke="url(#coinGrad)" stroke-width="2.5"/>
      <text x="400" y="480" text-anchor="middle" fill="#fef08a" font-family="system-ui,sans-serif" font-size="30" font-weight="800">1,000,000 WOW GOLD</text>
      <text x="400" y="512" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="16" font-weight="700">THE WAR WITHIN • EU &amp; US ALL REALMS • 15 MIN DELIVERY</text>
      <text x="400" y="536" text-anchor="middle" fill="#d6d3d1" font-family="sans-serif" font-size="13">Hand-farmed stock • Guild Bank or Trade Delivery</text>
    </svg>
  `),

  stream: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="stBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#090514"/>
          <stop offset="50%" stop-color="#1e0b36"/>
          <stop offset="100%" stop-color="#081c2e"/>
        </linearGradient>
        <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#06b6d4"/>
          <stop offset="50%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#ec4899"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#stBg)"/>
      <!-- Stream Preview Monitor Frame -->
      <rect x="85" y="65" width="630" height="370" rx="18" fill="#0f172a" stroke="url(#neon)" stroke-width="4"/>
      <!-- Top Live Alert Pill -->
      <rect x="295" y="88" width="210" height="36" rx="18" fill="url(#neon)"/>
      <text x="400" y="111" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="15" font-weight="800">★ NEW SUBSCRIBER! ★</text>
      <!-- Facecam Frame + Gameplay Area -->
      <rect x="115" y="145" width="175" height="130" rx="12" fill="#1e1b4b" stroke="#06b6d4" stroke-width="3"/>
      <text x="202" y="215" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="15" font-weight="700">WEBCAM 60FPS</text>
      <!-- Chat Box -->
      <rect x="115" y="290" width="175" height="115" rx="12" fill="#111827" stroke="#a855f7" stroke-width="2"/>
      <text x="135" y="320" fill="#c084fc" font-family="monospace" font-size="12">CHAT OVERLAY</text>
      <rect x="135" y="335" width="120" height="8" rx="4" fill="#334155"/>
      <rect x="135" y="352" width="95" height="8" rx="4" fill="#334155"/>
      <rect x="135" y="369" width="135" height="8" rx="4" fill="#334155"/>
      <!-- Main Scene Preview -->
      <rect x="310" y="145" width="375" height="260" rx="14" fill="#131c31" stroke="#ec4899" stroke-width="2.5"/>
      <text x="497" y="260" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="28" font-weight="800">6 ANIMATED SCENES</text>
      <text x="497" y="295" text-anchor="middle" fill="#f472b6" font-family="monospace" font-size="15" font-weight="700">+ STINGER TRANSITION &amp; LOGO</text>

      <text x="400" y="505" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="24" font-weight="700">Custom Animated Stream Overlay &amp; Branding Pack</text>
      <text x="400" y="538" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="15">OBS STUDIO / STREAMLABS / AFTER EFFECTS SOURCE</text>
    </svg>
  `),

  steam: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <defs>
        <linearGradient id="stmBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0a1424"/>
          <stop offset="50%" stop-color="#172a45"/>
          <stop offset="100%" stop-color="#0b172a"/>
        </linearGradient>
        <linearGradient id="stmCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1b2838"/>
          <stop offset="55%" stop-color="#2a475e"/>
          <stop offset="100%" stop-color="#1b2838"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#stmBg)"/>
      <circle cx="400" cy="250" r="240" fill="#38bdf8" fill-opacity="0.12"/>
      <!-- Steam Gift Card Mockup -->
      <rect x="135" y="80" width="530" height="330" rx="26" fill="url(#stmCard)" stroke="#66c0f4" stroke-width="3"/>
      <rect x="135" y="135" width="530" height="55" fill="rgba(102,192,244,0.15)"/>
      <!-- Steam Piston Emblem -->
      <circle cx="220" cy="265" r="52" fill="#0f172a" stroke="#66c0f4" stroke-width="5"/>
      <circle cx="220" cy="265" r="20" fill="#66c0f4"/>
      <circle cx="275" cy="220" r="18" fill="#66c0f4"/>
      <line x1="220" y1="265" x2="275" y2="220" stroke="#66c0f4" stroke-width="12" stroke-linecap="round"/>
      <!-- Value & Details -->
      <text x="175" y="170" fill="#ffffff" font-family="system-ui,sans-serif" font-size="24" font-weight="800" letter-spacing="2">STEAM WALLET CODE</text>
      <text x="625" y="275" text-anchor="end" fill="#ffffff" font-family="system-ui,sans-serif" font-size="68" font-weight="900">$100</text>
      <text x="625" y="310" text-anchor="end" fill="#66c0f4" font-family="monospace" font-size="18" font-weight="700">GLOBAL USD GIFT CARD</text>
      <rect x="335" y="335" width="290" height="40" rx="10" fill="rgba(16,185,129,0.2)" stroke="#10b981"/>
      <text x="480" y="360" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="14" font-weight="700">⚡ INSTANT CODE REVEAL</text>

      <text x="400" y="495" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="24" font-weight="700">Steam Global Wallet Gift Card — $100 USD</text>
      <text x="400" y="530" text-anchor="middle" fill="#66c0f4" font-family="monospace" font-size="15">REGION-FREE DIGITAL CODE • AUTOMATED ESCROW DELIVERY</text>
    </svg>
  `),
};

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
          images: [LISTING_IMAGES.karambit],
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
          images: [LISTING_IMAGES.jetbrains],
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
          images: [LISTING_IMAGES.valorant],
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
          images: [LISTING_IMAGES.uikit],
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
          images: [LISTING_IMAGES.dexbot],
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
          images: [LISTING_IMAGES.wowgold],
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
          images: [LISTING_IMAGES.stream],
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
          images: [LISTING_IMAGES.steam],
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
      upgrade_payments: [],
      usedTxHashes: new Set(),
      issuedSignInUuids: new Map(),
      consumedSignInUuids: new Map(),
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

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const XRPL_CLASSIC_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const XRPL_XADDR_RE = /^[XT][1-9A-HJ-NP-Za-km-z]{46}$/;

function hasPrototypePollution(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some(item => hasPrototypePollution(item, seen));
  }
  const ownNames = Object.getOwnPropertyNames(value);
  for (const key of ownNames) {
    if (DANGEROUS_KEYS.has(key)) return true;
    if (value[key] && typeof value[key] === 'object' && hasPrototypePollution(value[key], seen)) return true;
  }
  return false;
}

function stripPrototypePollution(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (value[i] && typeof value[i] === 'object') {
        value[i] = stripPrototypePollution(value[i], seen);
      }
    }
    return value;
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete value[key];
    } else if (value[key] && typeof value[key] === 'object') {
      value[key] = stripPrototypePollution(value[key], seen);
    }
  }
  return value;
}

function isValidUuid(val) {
  return typeof val === 'string' && UUID_RE.test(val.trim());
}

function isValidWalletAddress(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return XRPL_CLASSIC_RE.test(trimmed) || XRPL_XADDR_RE.test(trimmed);
}

function validatePositiveAmount(val, max = 100000000) {
  if (val === null || val === undefined || typeof val === 'boolean' || typeof val === 'object') return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  return Number.isFinite(num) && num > 0 && num >= 0.000001 && num <= max;
}

function sanitizeString(val, maxLen = 1000) {
  if (typeof val !== 'string') return '';
  const cleaned = val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  return maxLen > 0 ? cleaned.slice(0, maxLen) : cleaned;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const POLYGLOT_SCAN_BYTES = 4096;
const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};
const POLYGLOT_RE = /<\s*script\b|javascript\s*:|<\?php|<\s*svg\b|\bonerror\s*=|\bonload\s*=/i;

function detectImageMagicBytes(buffer) {
  if (!buffer) return null;
  const buf = Buffer.isBuffer(buffer)
    ? buffer
    : buffer instanceof Uint8Array
      ? Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : null;

  if (!buf || buf.length < 3) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // GIF: 47 49 46 38 37 61 (GIF87a) or 47 49 46 38 39 61 (GIF89a)
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WEBP: bytes 0..3 === 'RIFF' (52 49 46 46) and bytes 8..11 === 'WEBP' (57 45 42 50)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

function validateUploadedImage(input, opts = {}) {
  const maxBytes = typeof opts.maxBytes === 'number' && opts.maxBytes > 0 ? opts.maxBytes : MAX_IMAGE_BYTES;

  let buf = null;
  if (Buffer.isBuffer(input)) {
    buf = input;
  } else if (input instanceof Uint8Array) {
    buf = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return { valid: false, ok: false, error: 'Image payload is empty' };
    }

    let rawBase64 = trimmed;
    if (/^data:/i.test(trimmed)) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx === -1) {
        return { valid: false, ok: false, error: 'Malformed data URI' };
      }
      const header = trimmed.slice(0, commaIdx);
      if (/image\/svg|text\/html|application\/xhtml|application\/javascript|text\/javascript/i.test(header)) {
        return { valid: false, ok: false, error: 'SVG and HTML uploads are not permitted' };
      }
      if (!/;base64$/i.test(header)) {
        return { valid: false, ok: false, error: 'Data URI must be base64-encoded' };
      }
      rawBase64 = trimmed.slice(commaIdx + 1).trim();
    }

    const compactBase64 = rawBase64.replace(/\s+/g, '');
    if (!compactBase64 || compactBase64.length === 0) {
      return { valid: false, ok: false, error: 'Decoded image is empty' };
    }
    if (!/^[A-Za-z0-9+/=_-]+$/.test(compactBase64)) {
      return { valid: false, ok: false, error: 'Invalid base64 encoding' };
    }

    const normalizedBase64 = compactBase64.replace(/-/g, '+').replace(/_/g, '/');
    buf = Buffer.from(normalizedBase64, 'base64');
  } else {
    return { valid: false, ok: false, error: 'Image input must be a Buffer or base64 string' };
  }

  if (!buf || buf.length === 0) {
    return { valid: false, ok: false, error: 'Decoded image is empty' };
  }

  if (buf.length > maxBytes) {
    return { valid: false, ok: false, error: 'Image exceeds maximum allowed size (5 MB)' };
  }

  const mimeType = detectImageMagicBytes(buf);
  if (!mimeType) {
    return {
      valid: false,
      ok: false,
      error: 'Invalid or unsupported image magic bytes (only PNG, JPEG, GIF, and WEBP are allowed)',
    };
  }

  const headSlice = buf.subarray(0, Math.min(buf.length, POLYGLOT_SCAN_BYTES)).toString('latin1');
  const tailSlice =
    buf.length > POLYGLOT_SCAN_BYTES
      ? buf.subarray(Math.max(0, buf.length - POLYGLOT_SCAN_BYTES)).toString('latin1')
      : '';
  const combinedScan = headSlice + '\n' + tailSlice;

  if (POLYGLOT_RE.test(combinedScan)) {
    return {
      valid: false,
      ok: false,
      error: 'Rejected image containing embedded script or polyglot payload',
    };
  }

  const extension = MIME_TO_EXT[mimeType] || 'bin';
  const uuid = crypto.randomUUID();
  const safeFilename = `${uuid}.${extension}`;

  return {
    valid: true,
    ok: true,
    mimeType,
    extension,
    safeFilename,
    uuid,
    size: buf.length,
    cleanBase64: buf.toString('base64'),
  };
}

function sanitizeArchivePath(entryInput) {
  if (entryInput && typeof entryInput === 'object') {
    const isSymlink =
      entryInput.isSymbolicLink === true ||
      (typeof entryInput.isSymbolicLink === 'function' && entryInput.isSymbolicLink()) ||
      /symlink|symbolic|link/i.test(String(entryInput.type || '')) ||
      Boolean(entryInput.linkname) ||
      (typeof entryInput.mode === 'number' && (entryInput.mode & 0o170000) === 0o120000);

    if (isSymlink) {
      return { valid: false, ok: false, error: 'Symbolic links are not permitted in archives' };
    }

    const extractedPath =
      entryInput.path ?? entryInput.name ?? entryInput.fileName ?? entryInput.entryName ?? '';
    return sanitizeArchivePath(extractedPath);
  }

  if (typeof entryInput !== 'string' || entryInput.length === 0) {
    return { valid: false, ok: false, error: 'Archive entry path must be a non-empty string' };
  }
  if (entryInput.length > 1024) {
    return { valid: false, ok: false, error: 'Archive entry path exceeds maximum length' };
  }
  if (entryInput.includes('\0') || /%00/i.test(entryInput)) {
    return { valid: false, ok: false, error: 'Archive entry path contains null byte' };
  }
  if (/^[\/\\]/.test(entryInput)) {
    return { valid: false, ok: false, error: 'Archive entry path must not be absolute' };
  }
  if (/^[a-zA-Z]:/.test(entryInput) || entryInput.includes(':')) {
    return { valid: false, ok: false, error: 'Archive entry path must not contain drive prefixes' };
  }
  if (
    /(?:^|[\/\\])\.\.(?:[\/\\]|$)/.test(entryInput) ||
    /\.\.[\/\\]|[\/\\]\.\./.test(entryInput) ||
    /%2e%2e/i.test(entryInput)
  ) {
    return { valid: false, ok: false, error: 'Zip-Slip path traversal detected in archive entry' };
  }

  const unified = entryInput.replace(/\\/g, '/').replace(/\/+$/g, '');
  if (!unified) {
    return { valid: false, ok: false, error: 'Archive entry path is empty after normalization' };
  }
  const segments = unified.split('/');
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..') {
      return { valid: false, ok: false, error: 'Unsafe segment in archive entry path' };
    }
  }

  return { valid: true, ok: true, safePath: segments.join('/') };
}

function validateArchiveEntries(entries) {
  if (!Array.isArray(entries)) {
    return { valid: false, ok: false, error: 'Archive entries must be an array' };
  }
  const safePaths = [];
  for (let i = 0; i < entries.length; i++) {
    const check = sanitizeArchivePath(entries[i]);
    if (!check.valid) {
      return { valid: false, ok: false, error: check.error, index: i };
    }
    safePaths.push(check.safePath);
  }
  return { valid: true, ok: true, safePaths };
}

function validateListingPayload(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 2) {
      return { valid: false, error: 'Title is required and must be at least 2 characters' };
    }
    if (body.title.trim().length > 120) {
      return { valid: false, error: 'Title must not exceed 120 characters' };
    }
  }
  const hasPrice = body.priceXrp !== undefined || body.price_xrp !== undefined;
  const rawPrice = body.priceXrp !== undefined ? body.priceXrp : body.price_xrp;
  if (!partial || hasPrice) {
    if (!validatePositiveAmount(rawPrice)) {
      return { valid: false, error: 'priceXrp must be a valid positive number' };
    }
  }
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.length > 5000) {
      return { valid: false, error: 'Description must be a string up to 5000 characters' };
    }
  }
  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== '') {
    const q = Number(body.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 100000) {
      return { valid: false, error: 'Quantity must be an integer between 1 and 100,000' };
    }
  }
  if (body.status !== undefined && body.status !== null) {
    if (!['active', 'paused', 'sold', 'removed'].includes(body.status)) {
      return { valid: false, error: 'Invalid listing status' };
    }
  }
  return { valid: true };
}

function enrichListing(store, l, viewerUser = null) {
  if (!l) return null;
  const u = store.users.find(x => x.id === l.seller_id) || {};
  const isPro = Boolean(u.pro_until && new Date(u.pro_until).getTime() > Date.now());
  const copy = {
    ...l,
    username: u.username || 'seller',
    reputation_score: u.reputation_score ?? 4.9,
    is_verified: u.is_verified ?? true,
    wallet_address: u.wallet_address || '',
    store_handle: u.store_handle || null,
    seller_is_pro: isPro,
  };
  const isOwnerOrAdmin = viewerUser && (viewerUser.id === l.seller_id || viewerUser.role === 'admin');
  if (!isOwnerOrAdmin) {
    delete copy.digital_content;
    delete copy.digital_link;
  }
  return copy;
}

const CONTENT_SECURITY_POLICY =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' data: blob: https://xumm.app https://*.xaman.app https://i.ibb.co https://images.unsplash.com https://api.dicebear.com https://challenges.cloudflare.com; " +
  "connect-src 'self' https://api.coinbase.com https://api.exchange.coinbase.com wss://ws-feed.exchange.coinbase.com https://api.binance.com wss://stream.binance.com:9443 wss://stream.binance.com https://api.kraken.com https://api.coingecko.com https://xrpharbor.com https://*.xrpharbor.com https://xrp-marketplace-backend-production.up.railway.app wss://xrp-marketplace-backend-production.up.railway.app https://xumm.app wss://xumm.app https://*.xaman.app wss://*.xaman.app wss://*.xrpl.org https://*.xrpl.org wss://s1.ripple.com https://s1.ripple.com wss://s2.ripple.com https://s2.ripple.com wss://xrplcluster.com https://xrplcluster.com; " +
  "frame-src 'self' https://xumm.app https://*.xaman.app https://challenges.cloudflare.com blob:; " +
  "worker-src 'self' blob:; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "frame-ancestors 'self'";

const SECURITY_RESPONSE_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Vary': 'Origin',
};

const ALLOWED_ORIGINS = new Set(
  [
    'https://xrpharbor.com',
    'https://www.xrpharbor.com',
    'https://xrp-marketplace-frontend.vercel.app',
    process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*'
      ? process.env.FRONTEND_URL.trim().replace(/\/$/, '')
      : null,
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : []),
  ].filter(Boolean)
);

function getRequestOrigin(req) {
  if (!req || !req.headers) return '';
  const raw =
    typeof req.headers.get === 'function'
      ? req.headers.get('origin')
      : req.headers.origin;
  return typeof raw === 'string' ? raw.trim().replace(/\/$/, '') : '';
}

function isAllowedOrigin(origin) {
  return Boolean(origin && ALLOWED_ORIGINS.has(origin));
}

function getCorsHeaders(req) {
  const origin = getRequestOrigin(req);
  if (isAllowedOrigin(origin)) {
    return {
      'Vary': 'Origin',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };
  }
  return {
    'Vary': 'Origin',
  };
}

function withSecurityAndCorsHeaders(resp, req) {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(SECURITY_RESPONSE_HEADERS)) {
    headers.set(k, v);
  }
  const origin = getRequestOrigin(req);
  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    headers.delete('Access-Control-Allow-Origin');
    headers.delete('Access-Control-Allow-Credentials');
  }
  headers.set('Vary', 'Origin');
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  });
}

function jsonRes(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      ...SECURITY_RESPONSE_HEADERS,
      ...extraHeaders,
    },
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

const SIGNIN_UUID_TTL_MS = 5 * 60 * 1000; // 5-minute expiration window

function registerSignInUuid(store, uuid, createdAt = Date.now()) {
  if (!uuid || typeof uuid !== 'string') return;
  const norm = uuid.trim();
  if (!store.issuedSignInUuids) store.issuedSignInUuids = new Map();
  if (!store.consumedSignInUuids) store.consumedSignInUuids = new Map();
  store.issuedSignInUuids.set(norm, { createdAt, consumed: false });
}

function verifyAndConsumeSignInUuid(store, uuid, ttlMs = SIGNIN_UUID_TTL_MS) {
  if (!uuid || typeof uuid !== 'string' || !uuid.trim() || uuid.trim().length > 128) {
    return { ok: false, valid: false, error: 'Valid payload uuid is required' };
  }
  const norm = uuid.trim();
  if (!store.issuedSignInUuids) store.issuedSignInUuids = new Map();
  if (!store.consumedSignInUuids) store.consumedSignInUuids = new Map();
  const now = Date.now();

  if (store.consumedSignInUuids.has(norm)) {
    return {
      ok: false,
      valid: false,
      replay: true,
      error: 'Sign-in payload UUID has already been used (replay rejected)',
    };
  }
  const entry = store.issuedSignInUuids.get(norm);
  if (entry && entry.consumed) {
    return {
      ok: false,
      valid: false,
      replay: true,
      error: 'Sign-in payload UUID has already been used (replay rejected)',
    };
  }
  const createdAt = entry ? entry.createdAt : now;
  if (now - createdAt > ttlMs) {
    return {
      ok: false,
      valid: false,
      expired: true,
      error: 'Sign-in payload UUID has expired (5-minute window exceeded)',
    };
  }
  store.consumedSignInUuids.set(norm, now);
  store.issuedSignInUuids.set(norm, { createdAt, consumed: true, consumedAt: now });
  return { ok: true, valid: true, uuid: norm, consumedAt: now };
}

async function createXummOrDemoPayload(txjson) {
  const key = (process.env.XUMM_API_KEY || '').trim();
  const secret = (process.env.XUMM_API_SECRET || '').trim();
  const isSignIn = txjson && txjson.TransactionType === 'SignIn';
  if (key && secret) {
    try {
      const r = await fetch('https://xumm.app/api/v1/platform/payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'x-api-secret': secret,
        },
        body: JSON.stringify({ txjson, options: { expire: isSignIn ? 5 : 10 } }),
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
    if (/"(__proto__|constructor|prototype)"\s*:/.test(bodyText)) {
      return jsonRes({ error: 'Invalid input: prototype pollution keys are not allowed' }, 400);
    }
    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonRes({ error: 'Malformed JSON payload' }, 400);
    }
    if (hasPrototypePollution(body)) {
      stripPrototypePollution(body);
      return jsonRes({ error: 'Invalid input: prototype pollution keys are not allowed' }, 400);
    }
    stripPrototypePollution(body);
  }
  for (const [k] of searchParams.entries()) {
    if (DANGEROUS_KEYS.has(k)) {
      return jsonRes({ error: 'Invalid query parameter' }, 400);
    }
  }

  // Auth routes
  if (method === 'POST' && pathStr === 'auth/signin') {
    const payload = await createXummOrDemoPayload({ TransactionType: 'SignIn' });
    registerSignInUuid(store, payload.uuid, Date.now());
    return jsonRes(payload);
  }

  if (method === 'POST' && pathStr === 'auth/verify') {
    const rawUuid = body.uuid;
    if (!rawUuid || typeof rawUuid !== 'string' || rawUuid.trim().length === 0 || rawUuid.length > 128) {
      return jsonRes({ error: 'Valid payload uuid is required' }, 400);
    }
    const cleanUuid = rawUuid.trim();
    const consumeCheck = verifyAndConsumeSignInUuid(store, cleanUuid, SIGNIN_UUID_TTL_MS);
    if (!consumeCheck.ok) {
      return jsonRes({
        error: consumeCheck.error,
        replay: Boolean(consumeCheck.replay),
        expired: Boolean(consumeCheck.expired),
      }, 400);
    }

    let walletAddress = null;
    const key = (process.env.XUMM_API_KEY || '').trim();
    const secret = (process.env.XUMM_API_SECRET || '').trim();
    if (!String(cleanUuid).startsWith('xumm-') && key && secret) {
      try {
        const xr = await fetch(`https://xumm.app/api/v1/platform/payload/${encodeURIComponent(cleanUuid)}`, {
          headers: { 'x-api-key': key, 'x-api-secret': secret },
        });
        if (xr.ok) {
          const xd = await xr.json();
          if (xd?.meta?.signed && xd?.response?.account) {
            walletAddress = xd.response.account;
          } else {
            return jsonRes({ error: 'Not signed yet' }, 400);
          }
        }
      } catch {}
    }
    walletAddress = walletAddress || DEFAULT_DEMO_WALLET;
    if (!isValidWalletAddress(walletAddress)) {
      return jsonRes({ error: 'Invalid wallet address' }, 400);
    }
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

  // Admin routes
  if (segments[0] === 'admin' || (segments[0] === 'disputes' && segments[2] === 'resolve')) {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    if (u.role !== 'admin') return jsonRes({ error: 'Admin only' }, 403);
    if (pathStr === 'admin/stats' && method === 'GET') {
      return jsonRes({
        totalUsers: store.users.length,
        activeListings: store.listings.filter(l => l.status === 'active').length,
        completedOrders: store.orders.filter(o => o.status === 'completed').length,
        totalRevenue: 0,
      });
    }
    if (pathStr === 'admin/users' && method === 'GET') return jsonRes(store.users);
    if (pathStr === 'admin/disputes' && method === 'GET') return jsonRes([]);
    if (pathStr === 'admin/reports' && method === 'GET') return jsonRes([]);
    return jsonRes({ ok: true });
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

  if (method === 'POST' && (pathStr === 'upgrades/payload' || pathStr === 'upgrades/checkout')) {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    const kind = body.kind;
    const pricing = {
      pro: { days: 30, xrp: parseFloat(process.env.PRO_PRICE_XRP || '50') },
      featured: { days: parseInt(process.env.FEATURED_DAYS || '7', 10), xrp: parseFloat(process.env.FEATURED_PRICE_XRP || '10') },
    };
    if (!kind || typeof kind !== 'string' || !Object.prototype.hasOwnProperty.call(pricing, kind)) {
      return jsonRes({ error: 'Invalid upgrade kind' }, 400);
    }
    if (kind === 'featured') {
      if (!isValidUuid(body.listingId)) return jsonRes({ error: 'Valid listingId required' }, 400);
      const l = store.listings.find(x => x.id === body.listingId);
      if (!l) return jsonRes({ error: 'Listing not found' }, 404);
      if (l.seller_id !== u.id) return jsonRes({ error: 'Not your listing' }, 403);
    }
    // Server-side price authority: xrp and days strictly come from server pricing table, never body
    const { xrp, days } = pricing[kind];
    const paymentId = crypto.randomUUID();
    if (!store.upgrade_payments) store.upgrade_payments = [];
    store.upgrade_payments.unshift({
      id: paymentId,
      user_id: u.id,
      kind,
      listing_id: body.listingId || null,
      amount_xrp: xrp,
      days,
      status: 'pending',
      tx_hash: null,
      created_at: nowIso(),
    });
    const payload = await createXummOrDemoPayload({
      TransactionType: 'Payment',
      Account: u.wallet_address,
      Destination: process.env.PLATFORM_WALLET_ADDRESS || DEFAULT_DEMO_WALLET,
      Amount: String(Math.round(xrp * 1000000)),
      Memos: [{ Memo: { MemoData: Buffer.from(`upgrade:${kind}:${paymentId}`).toString('hex').toUpperCase() } }],
    });
    return jsonRes({ ...payload, paymentId, amountXrp: xrp, days });
  }

  if (segments[0] === 'upgrades' && segments[1] && segments[2] === 'verify' && method === 'POST') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    if (!isValidUuid(segments[1])) return jsonRes({ error: 'Invalid paymentId' }, 400);
    const p = (store.upgrade_payments || []).find(x => x.id === segments[1]);
    if (!p) return jsonRes({ error: 'Not found' }, 404);
    if (p.user_id !== u.id) return jsonRes({ error: 'Forbidden' }, 403);
    if (p.status === 'confirmed') return jsonRes({ ok: true, alreadyApplied: true });
    const txHash = body.txHash ? String(body.txHash).trim().toUpperCase() : ('U' + crypto.randomBytes(31).toString('hex').toUpperCase());
    if (store.usedTxHashes && store.usedTxHashes.has(txHash)) {
      return jsonRes({ error: 'Duplicate transaction hash (replay attack blocked)' }, 400);
    }
    if (store.usedTxHashes) store.usedTxHashes.add(txHash);
    p.status = 'confirmed';
    p.tx_hash = txHash;
    if (p.kind === 'pro') {
      u.pro_until = futureIso(p.days);
    } else if (p.kind === 'featured' && p.listing_id) {
      const l = store.listings.find(x => x.id === p.listing_id);
      if (l) {
        l.is_featured = true;
        l.featured_until = futureIso(p.days);
      }
    }
    return jsonRes({ ok: true, kind: p.kind, days: p.days, txHash });
  }

  // Listings
  if (method === 'GET' && pathStr === 'listings') {
    const category = searchParams.get('category') || '';
    const game = searchParams.get('game') || '';
    const search = (searchParams.get('search') || '').toLowerCase();
    const rawMinPrice = searchParams.get('minPrice');
    const rawMaxPrice = searchParams.get('maxPrice');
    if (rawMinPrice !== null && rawMinPrice !== '' && (!Number.isFinite(Number(rawMinPrice)) || Number(rawMinPrice) < 0)) {
      return jsonRes({ error: 'minPrice must be a non-negative number' }, 400);
    }
    if (rawMaxPrice !== null && rawMaxPrice !== '' && (!Number.isFinite(Number(rawMaxPrice)) || Number(rawMaxPrice) < 0)) {
      return jsonRes({ error: 'maxPrice must be a non-negative number' }, 400);
    }
    const minPrice = parseFloat(rawMinPrice || '');
    const maxPrice = parseFloat(rawMaxPrice || '');
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '48', 10) || 48));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

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
    const check = validateListingPayload(body, false);
    if (!check.valid) return jsonRes({ error: check.error }, 400);
    const { title, description, category, game, platform, priceXrp, price_xrp, images, isDigital, digitalContent, digitalLink, quantity, deliveryTime, tags } = body;
    const finalPrice = Number(priceXrp !== undefined ? priceXrp : price_xrp);
    const newListing = {
      id: crypto.randomUUID(),
      seller_id: u.id,
      title: sanitizeString(title, 120),
      description: description ? sanitizeString(description, 5000) : '',
      category: category ? sanitizeString(category, 30) : 'other',
      game: game ? sanitizeString(game, 60) : null,
      platform: platform ? sanitizeString(platform, 30) : null,
      price_xrp: finalPrice,
      currency: 'XRP',
      images: Array.isArray(images) ? images.slice(0, 10) : [],
      status: 'active',
      is_featured: false,
      featured_until: null,
      is_digital: Boolean(isDigital ?? true),
      digital_content: digitalContent ? sanitizeString(String(digitalContent), 10000) : null,
      digital_link: digitalLink ? sanitizeString(String(digitalLink), 1000) : null,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
      quantity_sold: 0,
      delivery_time: deliveryTime ? sanitizeString(String(deliveryTime), 40) : 'instant',
      tags: Array.isArray(tags) ? tags.filter(Boolean).slice(0, 8).map(t => sanitizeString(String(t), 40)) : [],
      views: 1,
      created_at: nowIso(),
    };
    store.listings.unshift(newListing);
    return jsonRes(enrichListing(store, newListing, u), 201);
  }

  if (segments[0] === 'listings' && segments[1] && segments[2] === 'view' && method === 'POST') {
    if (!isValidUuid(segments[1])) return jsonRes({ error: 'Invalid listing ID' }, 400);
    const l = store.listings.find(x => x.id === segments[1]);
    if (l) l.views = (l.views || 0) + 1;
    return jsonRes({ ok: true });
  }

  if (segments[0] === 'listings' && segments[1] && segments.length === 2) {
    if (!isValidUuid(segments[1])) return jsonRes({ error: 'Invalid listing ID' }, 400);
    const l = store.listings.find(x => x.id === segments[1]);
    if (!l) return jsonRes({ error: 'Listing not found' }, 404);
    if (method === 'GET') {
      l.views = (l.views || 0) + 1;
      const u = ensureAuthUser(store, req);
      return jsonRes(enrichListing(store, l, u));
    }
    if (method === 'PATCH') {
      const u = ensureAuthUser(store, req);
      if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
      if (u.id !== l.seller_id && u.role !== 'admin') return jsonRes({ error: 'Forbidden' }, 403);
      const check = validateListingPayload(body, true);
      if (!check.valid) return jsonRes({ error: check.error }, 400);
      const nextPrice = body.price_xrp !== undefined ? body.price_xrp : body.priceXrp;
      Object.assign(l, {
        title: body.title !== undefined ? sanitizeString(body.title, 120) : l.title,
        description: body.description !== undefined ? sanitizeString(body.description, 5000) : l.description,
        price_xrp: nextPrice !== undefined ? Number(nextPrice) : l.price_xrp,
        status: body.status ?? l.status,
      });
      return jsonRes(enrichListing(store, l, u));
    }
    if (method === 'DELETE') {
      const u = ensureAuthUser(store, req);
      if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
      if (u.id !== l.seller_id && u.role !== 'admin') return jsonRes({ error: 'Forbidden' }, 403);
      const idx = store.listings.findIndex(x => x.id === segments[1]);
      if (idx !== -1) store.listings.splice(idx, 1);
      return jsonRes({ ok: true });
    }
  }

  // Orders
  if (method === 'POST' && pathStr === 'orders') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Please sign in to purchase' }, 401);
    const listingId = body.listingId !== undefined ? body.listingId : body.listing_id;
    if (!isValidUuid(listingId)) return jsonRes({ error: 'Valid listingId (UUID) is required' }, 400);
    const l = store.listings.find(x => x.id === listingId && x.status === 'active');
    if (!l) return jsonRes({ error: 'Listing not found or not active' }, 404);
    if (l.seller_id === u.id) return jsonRes({ error: 'Cannot buy your own listing' }, 400);
    if (l.quantity != null && l.quantity_sold != null && l.quantity_sold >= l.quantity) {
      return jsonRes({ error: 'This item is sold out' }, 400);
    }
    // Server-side price authority: compute total_xrp, commission_rate, commission_xrp, and seller_receives_xrp
    // strictly from stored listing and seller records (never from client request body).
    const seller = store.users.find(x => x.id === l.seller_id) || {};
    const sellerIsPro = Boolean(seller.pro_until && new Date(seller.pro_until).getTime() > Date.now());
    const commissionRate = sellerIsPro
      ? parseFloat(process.env.COMMISSION_RATE_PRO || '0.015')
      : parseFloat(process.env.COMMISSION_RATE || '0.03');
    const authoritativePriceXrp = Number(Number(l.price_xrp).toFixed(6));
    const commission = Number((authoritativePriceXrp * commissionRate).toFixed(6));
    const sellerReceives = Number((authoritativePriceXrp - commission).toFixed(6));
    const order = {
      id: crypto.randomUUID(),
      listing_id: l.id,
      listing_title: l.title,
      images: l.images || [],
      buyer_id: u.id,
      seller_id: l.seller_id,
      buyer_wallet_address: u.wallet_address,
      seller_wallet_address: seller.wallet_address || 'rDockMaster9X2pL4nK8vJ6wZ3cT5yB1a2',
      total_xrp: authoritativePriceXrp,
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
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    const orderId = segments[1];
    if (!isValidUuid(orderId)) return jsonRes({ error: 'Invalid order ID' }, 400);
    const order = store.orders.find(x => x.id === orderId);
    if (!order) return jsonRes({ error: 'Order not found' }, 404);
    const listing = store.listings.find(x => x.id === order.listing_id) || {};
    const isBuyer = u.id === order.buyer_id;
    const isSeller = u.id === order.seller_id;
    const isAdmin = u.role === 'admin';

    if (segments.length === 2 && method === 'GET') {
      if (!isBuyer && !isSeller && !isAdmin) return jsonRes({ error: 'Forbidden' }, 403);
      return jsonRes(order);
    }

    if (segments[2] === 'delivery' && method === 'GET') {
      if (!isBuyer && !isAdmin) return jsonRes({ error: 'Only the buyer can access delivery' }, 403);
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
      if (!isBuyer) return jsonRes({ error: 'Forbidden' }, 403);
      if (!['pending', 'accepted', 'awaiting_payment'].includes(order.status)) {
        return jsonRes({ error: 'Order is not awaiting payment' }, 400);
      }
      // Server-side price authority: compute sellerNet and commission strictly from stored order/listing
      const authoritativeTotal = Number(Number(order.total_xrp != null ? order.total_xrp : listing.price_xrp).toFixed(6));
      const authoritativeRate = Number(order.commission_rate != null ? order.commission_rate : 0.03);
      const commission = Number(Number(order.commission_xrp != null ? order.commission_xrp : (authoritativeTotal * authoritativeRate)).toFixed(6));
      const sellerNet = Number(Number(order.seller_receives_xrp != null ? order.seller_receives_xrp : (authoritativeTotal - commission)).toFixed(6));
      order.escrow_finish_after = Math.floor(Date.now() / 1000);
      const payload = await createXummOrDemoPayload({
        TransactionType: 'EscrowCreate',
        Account: order.buyer_wallet_address,
        Destination: order.seller_wallet_address,
        Amount: String(Math.round(sellerNet * 1e6)),
      });
      return jsonRes({
        ...payload,
        commission: null,
        commissionXrp: 0,
        feePaid: true,
        sellerNet,
      });
    }

    if (segments[2] === 'escrow' && segments[3] === 'status' && method === 'GET') {
      if (!isBuyer && !isSeller && !isAdmin) return jsonRes({ error: 'Forbidden' }, 403);
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
      if (!isBuyer) return jsonRes({ error: 'Forbidden' }, 403);
      if (['completed', 'refunded', 'disputed', 'cancelled'].includes(order.status)) {
        return jsonRes({ error: 'Order already ' + order.status }, 400);
      }
      order.escrow_confirm_pending = true;
      const payload = await createXummOrDemoPayload({
        TransactionType: 'EscrowFinish',
        Account: order.buyer_wallet_address,
        Owner: order.buyer_wallet_address,
        OfferSequence: order.escrow_sequence || 100001,
      });
      return jsonRes({ xumm: payload, orderId: order.id });
    }

    if (segments[2] === 'escrow' && segments[3] === 'cancel' && method === 'POST') {
      if (!isBuyer && !isAdmin) return jsonRes({ error: 'Only the buyer can reclaim this escrow' }, 403);
      if (!order.escrow_sequence) return jsonRes({ error: 'No active escrow on this order' }, 400);
      const payload = await createXummOrDemoPayload({
        TransactionType: 'EscrowCancel',
        Account: order.buyer_wallet_address,
        Owner: order.buyer_wallet_address,
        OfferSequence: order.escrow_sequence,
      });
      return jsonRes({ xumm: payload, orderId: order.id });
    }

    if (segments[2] === 'escrow' && segments[3] === 'claim' && method === 'POST') {
      if (!isSeller) return jsonRes({ error: 'Only the seller can claim this payout' }, 403);
      if (order.status !== 'release_approved') return jsonRes({ error: 'No release has been approved for this order' }, 400);
      const payload = await createXummOrDemoPayload({
        TransactionType: 'EscrowFinish',
        Account: order.seller_wallet_address,
        Owner: order.buyer_wallet_address,
        OfferSequence: order.escrow_sequence || 100001,
      });
      return jsonRes({ xumm: payload, orderId: order.id });
    }

    if (segments[2] === 'deliver' && method === 'POST') {
      if (!isSeller) return jsonRes({ error: 'Only the seller can mark this order delivered' }, 403);
      if (!['escrow_locked', 'in_escrow'].includes(order.status)) {
        return jsonRes({ error: 'Order is not awaiting delivery' }, 400);
      }
      order.status = 'delivered';
      order.updated_at = nowIso();
      return jsonRes({ status: 'delivered' });
    }

    if (segments[2] === 'cancel' && method === 'POST') {
      if (!isBuyer && !isSeller && !isAdmin) return jsonRes({ error: 'Forbidden' }, 403);
      if (!['pending', 'awaiting_payment'].includes(order.status)) {
        return jsonRes({ error: 'This order can no longer be cancelled' }, 400);
      }
      order.status = 'cancelled';
      order.updated_at = nowIso();
      return jsonRes({ status: 'cancelled' });
    }

    if (segments[2] === 'review' && method === 'POST') {
      if (!isBuyer) return jsonRes({ error: 'Only the buyer can review this order' }, 403);
      const rawRating = body.rating;
      const r = typeof rawRating === 'boolean' || rawRating === null || rawRating === undefined || rawRating === '' ? NaN : Number(rawRating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return jsonRes({ error: 'Rating must be an integer between 1 and 5' }, 400);
      }
      if (body.comment !== undefined && body.comment !== null && (typeof body.comment !== 'string' || body.comment.length > 2000)) {
        return jsonRes({ error: 'Review comment must be a string up to 2000 characters' }, 400);
      }
      if (order.status !== 'completed') {
        return jsonRes({ error: 'Can only review completed orders' }, 400);
      }
      return jsonRes({ ok: true });
    }

    if (segments[2] === 'dispute' && method === 'POST') {
      if (!isBuyer && !isSeller) return jsonRes({ error: 'Forbidden' }, 403);
      if (['completed', 'cancelled', 'refunded'].includes(order.status)) {
        return jsonRes({ error: 'This order is already ' + order.status + ' and cannot be disputed.' }, 400);
      }
      if (body.reason !== undefined && body.reason !== null && (typeof body.reason !== 'string' || body.reason.length > 2000)) {
        return jsonRes({ error: 'Dispute reason must be a string up to 2000 characters' }, 400);
      }
      order.status = 'disputed';
      return jsonRes({ status: 'disputed' });
    }
  }

  // Offers
  if (method === 'POST' && pathStr === 'offers') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    const listingId = body.listingId !== undefined ? body.listingId : body.listing_id;
    const amountXrp = body.amountXrp !== undefined ? body.amountXrp : body.amount_xrp;
    if (!isValidUuid(listingId)) return jsonRes({ error: 'Valid listingId (UUID) is required' }, 400);
    if (!validatePositiveAmount(amountXrp)) return jsonRes({ error: 'amountXrp must be a positive number' }, 400);
    if (body.message !== undefined && body.message !== null && (typeof body.message !== 'string' || body.message.length > 1000)) {
      return jsonRes({ error: 'Offer message must be a string up to 1000 characters' }, 400);
    }
    const l = store.listings.find(x => x.id === listingId && x.status === 'active');
    if (!l) return jsonRes({ error: 'Listing not found' }, 404);
    if (l.seller_id === u.id) return jsonRes({ error: 'Cannot offer on own listing' }, 400);
    const offer = {
      id: crypto.randomUUID(),
      listing_id: l.id,
      buyer_id: u.id,
      seller_id: l.seller_id,
      amount_xrp: Number(amountXrp),
      message: body.message ? sanitizeString(body.message, 1000) : null,
      currency: l.currency || 'XRP',
      status: 'pending',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.offers.unshift(offer);
    return jsonRes(offer);
  }

  if (segments[0] === 'offers' && segments[1] && segments[2] === 'accept' && (method === 'PATCH' || method === 'POST')) {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    if (!isValidUuid(segments[1])) return jsonRes({ error: 'Invalid offer ID' }, 400);
    const offer = store.offers.find(x => x.id === segments[1]);
    if (!offer) return jsonRes({ error: 'Offer not found' }, 404);
    if (offer.seller_id !== u.id) return jsonRes({ error: 'Forbidden' }, 403);
    if (offer.status !== 'pending') return jsonRes({ error: 'Offer is no longer pending' }, 400);

    // Server-side price authority: compute total_xrp, commission_rate, commission_xrp, and seller_receives_xrp
    // strictly from stored offer and seller records (ignoring any client request body fields).
    const sellerIsPro = Boolean(u.pro_until && new Date(u.pro_until).getTime() > Date.now());
    const acceptRate = sellerIsPro
      ? parseFloat(process.env.COMMISSION_RATE_PRO || '0.015')
      : parseFloat(process.env.COMMISSION_RATE || '0.03');
    const authoritativeOfferXrp = Number(Number(offer.amount_xrp).toFixed(6));
    const commission = Number((authoritativeOfferXrp * acceptRate).toFixed(6));
    const sellerReceives = Number((authoritativeOfferXrp - commission).toFixed(6));

    offer.status = 'accepted';
    offer.updated_at = nowIso();
    const l = store.listings.find(x => x.id === offer.listing_id);
    if (l) l.status = 'sold';
    store.offers.forEach(o => {
      if (o.listing_id === offer.listing_id && o.id !== offer.id && o.status === 'pending') {
        o.status = 'declined';
        o.updated_at = nowIso();
      }
    });

    const buyer = store.users.find(x => x.id === offer.buyer_id) || {};
    const newOrder = {
      id: crypto.randomUUID(),
      listing_id: offer.listing_id,
      listing_title: l ? l.title : 'Digital Item',
      images: l ? l.images : [],
      buyer_id: offer.buyer_id,
      seller_id: u.id,
      buyer_wallet_address: buyer.wallet_address || DEFAULT_DEMO_WALLET,
      seller_wallet_address: u.wallet_address,
      total_xrp: authoritativeOfferXrp,
      commission_rate: acceptRate,
      commission_xrp: commission,
      seller_receives_xrp: sellerReceives,
      currency: offer.currency || (l && l.currency) || 'XRP',
      escrow_tx_hash: null,
      escrow_sequence: null,
      finish_tx_hash: null,
      cancel_tx_hash: null,
      escrow_finish_after: null,
      status: 'awaiting_payment',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.orders.unshift(newOrder);
    offer.order_id = newOrder.id;
    return jsonRes({
      ok: true,
      orderId: newOrder.id,
      total_xrp: authoritativeOfferXrp,
      commission_rate: acceptRate,
      commission_xrp: commission,
      seller_receives_xrp: sellerReceives,
    });
  }

  if (segments[0] === 'offers' && segments[1] && segments[2] === 'decline' && (method === 'PATCH' || method === 'POST')) {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    if (!isValidUuid(segments[1])) return jsonRes({ error: 'Invalid offer ID' }, 400);
    const offer = store.offers.find(x => x.id === segments[1]);
    if (!offer) return jsonRes({ error: 'Offer not found' }, 404);
    if (offer.seller_id !== u.id) return jsonRes({ error: 'Forbidden' }, 403);
    if (offer.status !== 'pending') return jsonRes({ error: 'Offer is no longer pending' }, 400);
    offer.status = 'declined';
    offer.updated_at = nowIso();
    return jsonRes({ ok: true });
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
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    store.notifications.forEach(n => { if (n.user_id === u.id) n.is_read = true; });
    return jsonRes({ ok: true });
  }

  if (method === 'GET' && pathStr === 'favorites') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes([]);
    const ids = new Set(store.favorites.filter(f => f.user_id === u.id).map(f => f.listing_id));
    return jsonRes(store.listings.filter(l => ids.has(l.id)).map(l => enrichListing(store, l, u)));
  }

  if (method === 'GET' && pathStr === 'favorites/ids') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes([]);
    return jsonRes(store.favorites.filter(f => f.user_id === u.id).map(f => f.listing_id));
  }

  if (segments[0] === 'favorites' && segments[1]) {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    if (!isValidUuid(segments[1])) return jsonRes({ error: 'Invalid listing ID' }, 400);
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
        if (!body.name || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) {
          return jsonRes({ error: 'Store name is required (max 80 chars)' }, 400);
        }
        if (!body.handle || typeof body.handle !== 'string' || !/^[a-z0-9-]{3,40}$/.test(body.handle)) {
          return jsonRes({ error: 'Store URL must be 3-40 chars: lowercase letters, numbers, hyphens' }, 400);
        }
        if (!body.payoutAddress || typeof body.payoutAddress !== 'string' || !isValidWalletAddress(body.payoutAddress.trim())) {
          return jsonRes({ error: 'Valid XRP Ledger payout address is required' }, 400);
        }
        const dupe = store.users.find(x => x.store_handle === body.handle && x.id !== u.id);
        if (dupe) return jsonRes({ error: 'That store URL is already taken' }, 409);
        u.store_handle = body.handle;
        u.store = {
          name: sanitizeString(body.name, 80),
          tagline: body.tagline ? sanitizeString(String(body.tagline), 200) : '',
          about: body.about ? sanitizeString(String(body.about), 2000) : '',
          categories: Array.isArray(body.categories) ? body.categories.slice(0, 4) : [],
          payoutAddress: body.payoutAddress.trim(),
        };
        return jsonRes({ store: u.store, handle: u.store_handle });
      }
      if (method === 'DELETE') {
        u.store = null;
        u.store_handle = null;
        return jsonRes({ ok: true });
      }
    } else if (segments[1] && method === 'GET') {
      if (!/^[a-z0-9-]{2,40}$/i.test(segments[1])) return jsonRes({ error: 'Invalid store handle' }, 400);
      const u = store.users.find(x => x.store_handle === segments[1]);
      if (!u || !u.store) return jsonRes({ error: 'Store not found' }, 404);
      const viewer = ensureAuthUser(store, req);
      const listings = store.listings.filter(l => l.seller_id === u.id && l.status === 'active').map(l => enrichListing(store, l, viewer));
      return jsonRes({ seller: u, store: u.store, handle: u.store_handle, listings });
    }
  }

  if (segments[0] === 'users' && segments[1]) {
    if (segments[1] === 'me' && method === 'PATCH') {
      const u = ensureAuthUser(store, req);
      if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
      if (body.username !== undefined && body.username !== null) {
        if (typeof body.username !== 'string' || !/^[a-zA-Z0-9_-]{2,40}$/.test(body.username.trim())) {
          return jsonRes({ error: 'Username must be 2-40 characters (letters, numbers, underscores, hyphens)' }, 400);
        }
        u.username = sanitizeString(body.username, 40);
      }
      if (body.bio !== undefined && body.bio !== null) {
        if (typeof body.bio !== 'string' || body.bio.length > 1000) {
          return jsonRes({ error: 'Bio must be a string up to 1000 characters' }, 400);
        }
        u.bio = sanitizeString(body.bio, 1000);
      }
      return jsonRes(u);
    }
    if (!isValidUuid(segments[1])) return jsonRes({ error: 'Invalid user ID' }, 400);
    const target = store.users.find(x => x.id === segments[1]);
    if (segments[2] === 'listings') {
      const viewer = ensureAuthUser(store, req);
      return jsonRes(store.listings.filter(l => l.seller_id === segments[1]).map(l => enrichListing(store, l, viewer)));
    }
    if (segments[2] === 'reviews') {
      return jsonRes([]);
    }
    if (target) return jsonRes(target);
    return jsonRes({ error: 'User not found' }, 404);
  }

  if (['messages', 'inquiries', 'offers/received', 'offers/sent'].includes(pathStr) && method === 'GET') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    return jsonRes([]);
  }

  if (method === 'POST' && pathStr === 'upload') {
    const u = ensureAuthUser(store, req);
    if (!u) return jsonRes({ error: 'Unauthorized' }, 401);
    if (body.archiveEntries !== undefined) {
      const archiveCheck = validateArchiveEntries(body.archiveEntries);
      if (!archiveCheck.valid) {
        return jsonRes({ error: archiveCheck.error || 'Unsafe archive entry path' }, 400);
      }
    }
    const { image } = body;
    if (!image || typeof image !== 'string') {
      return jsonRes({ error: 'image (base64) required' }, 400);
    }
    if (image.length > 7.5 * 1024 * 1024) {
      return jsonRes({ error: 'Image too large (max 5MB)' }, 413);
    }
    const validation = validateUploadedImage(image);
    if (!validation.valid) {
      return jsonRes({ error: validation.error || 'Invalid image file signature' }, 400);
    }
    const apiKey = process.env.IMGBB_API_KEY || process.env.IMGBB_KEY;
    if (apiKey) {
      try {
        const fd = new FormData();
        fd.append('image', validation.cleanBase64);
        fd.append('name', crypto.randomUUID());
        fd.append('key', apiKey);
        const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
        const d = await r.json();
        const uploadedUrl = d && d.data && typeof d.data.url === 'string' ? d.data.url.trim() : '';
        if (!d || !d.success || !uploadedUrl.startsWith('https://i.ibb.co/')) {
          return jsonRes({ error: 'Upload failed' }, 502);
        }
        return jsonRes({
          url: uploadedUrl,
          mimeType: validation.mimeType,
          filename: validation.safeFilename,
          size: validation.size,
        });
      } catch {
        return jsonRes({ error: 'Upload failed' }, 500);
      }
    }
    return jsonRes({
      url: `https://i.ibb.co/demo/${validation.safeFilename}`,
      mimeType: validation.mimeType,
      filename: validation.safeFilename,
      size: validation.size,
      demoMode: true,
    });
  }

  return jsonRes({ error: 'Route not found: ' + pathStr }, 404);
}

async function handler(req, ctx) {
  const origin = getRequestOrigin(req);
  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      return withSecurityAndCorsHeaders(
        jsonRes({ error: 'CORS origin not allowed' }, 403),
        req
      );
    }
    return new Response(null, {
      status: 204,
      headers: {
        ...SECURITY_RESPONSE_HEADERS,
        ...getCorsHeaders(req),
      },
    });
  }

  const resolvedParams = ctx && ctx.params ? await ctx.params : {};
  const segments = resolvedParams && resolvedParams.path ? resolvedParams.path : [];
  const pathStr = segments.join('/');
  const search = req.nextUrl ? req.nextUrl.search : '';

  if (req.method === 'GET' && pathStr === 'xrp-price') {
    try {
      const cbr = await fetch('https://api.exchange.coinbase.com/products/XRP-USD/stats', { cache: 'no-store' });
      if (cbr.ok) {
        const cbd = await cbr.json();
        if (cbd && cbd.last) {
          const price = parseFloat(cbd.last);
          const open = cbd.open ? parseFloat(cbd.open) : null;
          const change = open && open > 0 ? ((price - open) / open) * 100 : null;
          return withSecurityAndCorsHeaders(
            jsonRes({ price, change, ts: Date.now() }),
            req
          );
        }
      }
    } catch {}
    try {
      const cr = await fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot', { cache: 'no-store' });
      if (cr.ok) {
        const cd = await cr.json();
        if (cd && cd.data && cd.data.amount) {
          return withSecurityAndCorsHeaders(
            jsonRes({ price: parseFloat(cd.data.amount), change: null, ts: Date.now() }),
            req
          );
        }
      }
    } catch {}
    return withSecurityAndCorsHeaders(jsonRes({ error: 'Price unavailable' }, 502), req);
  }

  const reqHeaders = { 'content-type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) reqHeaders['authorization'] = auth;
  if (origin && isAllowedOrigin(origin)) reqHeaders['origin'] = origin;

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
        return withSecurityAndCorsHeaders(
          new Response(respText, { status: res.status, headers: { 'content-type': ct } }),
          req
        );
      }
    } catch {
      // Upstream unreachable, try next candidate or fallback to built-in API
    }
  }

  const fallbackResp = await handleFallbackApi(req, pathStr, segments, bodyText);
  return withSecurityAndCorsHeaders(fallbackResp, req);
}

export const GET     = handler;
export const POST    = handler;
export const PATCH   = handler;
export const PUT     = handler;
export const DELETE  = handler;
export const OPTIONS = handler;
