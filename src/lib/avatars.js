// Curated Web3, Cyber, Bot, Pixel-Art & Animated Live Avatars + PRO Frame Styles

function svgToDataUri(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
}

// 12 Sleek Static Presets (Available to all users — replaces old avataaars)
export const CURATED_AVATARS = [
  {
    id: 'bot-harbor',
    label: 'Harbor Bot',
    url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=HarborPrime&backgroundColor=0a2342',
  },
  {
    id: 'bot-ledger',
    label: 'Ledger Unit',
    url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=LedgerCore&backgroundColor=1e1b4b',
  },
  {
    id: 'bot-escrow',
    label: 'Escrow Guard',
    url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=VortexXRP&backgroundColor=064e3b',
  },
  {
    id: 'bot-solar',
    label: 'Solar Droid',
    url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=SolarNode&backgroundColor=78350f',
  },
  {
    id: 'pixel-captain',
    label: '8-Bit Captain',
    url: 'https://api.dicebear.com/7.x/pixel-art-neutral/svg?seed=CyberCaptain&backgroundColor=0f172a',
  },
  {
    id: 'pixel-ronin',
    label: '8-Bit Ronin',
    url: 'https://api.dicebear.com/7.x/pixel-art-neutral/svg?seed=NeonSamurai&backgroundColor=1e1b4b',
  },
  {
    id: 'pixel-vandal',
    label: '8-Bit Agent',
    url: 'https://api.dicebear.com/7.x/pixel-art-neutral/svg?seed=ShadowVandal&backgroundColor=064e3b',
  },
  {
    id: 'pixel-hacker',
    label: '8-Bit Hacker',
    url: 'https://api.dicebear.com/7.x/pixel-art-neutral/svg?seed=AstraGlitch&backgroundColor=3b0764',
  },
  {
    id: 'shape-prism',
    label: 'XRPL Prism',
    url: 'https://api.dicebear.com/7.x/shapes/svg?seed=XRPLPrism&backgroundColor=0a2342',
  },
  {
    id: 'shape-vault',
    label: 'Quantum Geo',
    url: 'https://api.dicebear.com/7.x/shapes/svg?seed=QuantumVault&backgroundColor=1e293b',
  },
  {
    id: 'ring-orbit',
    label: 'Ledger Rings',
    url: 'https://api.dicebear.com/7.x/rings/svg?seed=HarborOrbit&backgroundColor=090d1a',
  },
  {
    id: 'ident-node',
    label: 'Validator Crest',
    url: 'https://api.dicebear.com/7.x/identicon/svg?seed=ValidatorNode&backgroundColor=0f172a',
  },
];

// 4 Built-in Animated Live Avatars / Store Logos (PRO Exclusive)
export const PRO_LIVE_AVATARS = [
  {
    id: 'live-xrpl-orbit',
    label: 'XRPL Core Orbit',
    tag: 'LIVE',
    url: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <radialGradient id="g1" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#1e3a8a"/>
            <stop offset="65%" stop-color="#090d1a"/>
            <stop offset="100%" stop-color="#050811"/>
          </radialGradient>
          <linearGradient id="gold1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#38bdf8"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill="url(#g1)"/>
        <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(56,189,248,0.22)" stroke-width="1.5" stroke-dasharray="6 4">
          <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="8s" repeatCount="indefinite"/>
        </circle>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="5s" repeatCount="indefinite"/>
          <circle cx="60" cy="60" r="34" fill="none" stroke="url(#gold1)" stroke-width="2" stroke-dasharray="32 18"/>
          <circle cx="60" cy="26" r="4" fill="#fde047"/>
          <circle cx="60" cy="94" r="3.5" fill="#38bdf8"/>
        </g>
        <circle cx="60" cy="60" r="22" fill="rgba(15,23,42,0.85)" stroke="#f59e0b" stroke-width="1.5">
          <animate attributeName="r" values="21;23.5;21" dur="2.4s" repeatCount="indefinite"/>
        </circle>
        <path d="M46 46 L55 56 L60 51 L65 56 L74 46 M46 74 L55 64 L60 69 L65 64 L74 74" fill="none" stroke="url(#gold1)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `),
  },
  {
    id: 'live-solar-vault',
    label: 'Solar Gold Vault',
    tag: 'LIVE',
    url: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <radialGradient id="svBg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="#451a03"/>
            <stop offset="70%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#090d1a"/>
          </radialGradient>
          <linearGradient id="svGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff7d6"/>
            <stop offset="45%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill="url(#svBg)"/>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="4s" repeatCount="indefinite"/>
          <circle cx="60" cy="60" r="43" fill="none" stroke="url(#svGold)" stroke-width="3" stroke-dasharray="45 25"/>
          <polygon points="60,10 64,20 56,20" fill="#fde047"/>
          <polygon points="60,110 64,100 56,100" fill="#f59e0b"/>
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="6s" repeatCount="indefinite"/>
          <rect x="34" y="34" width="52" height="52" rx="10" fill="none" stroke="rgba(253,224,71,0.45)" stroke-width="2"/>
        </g>
        <polygon points="60,34 82,60 60,86 38,60" fill="url(#svGold)">
          <animate attributeName="opacity" values="0.85;1;0.85" dur="1.8s" repeatCount="indefinite"/>
        </polygon>
        <polygon points="60,44 73,60 60,76 47,60" fill="#090d1a"/>
        <circle cx="60" cy="60" r="5" fill="#fff7d6">
          <animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `),
  },
  {
    id: 'live-cyber-cube',
    label: 'Cyber Neon Matrix',
    tag: 'LIVE',
    url: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="cbBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#090d1a"/>
            <stop offset="50%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="cbNeon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#00f2fe"/>
            <stop offset="50%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#a855f7"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill="url(#cbBg)"/>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="5.5s" repeatCount="indefinite"/>
          <polygon points="60,14 100,37 100,83 60,106 20,83 20,37" fill="none" stroke="url(#cbNeon)" stroke-width="2.5" stroke-dasharray="28 12"/>
        </g>
        <polygon points="60,28 88,44 88,76 60,92 32,76 32,44" fill="rgba(30,41,59,0.8)" stroke="#00f2fe" stroke-width="1.8">
          <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
        </polygon>
        <path d="M60 28 L60 60 L88 44 M60 60 L32 44 M60 60 L60 92" fill="none" stroke="#a855f7" stroke-width="2"/>
        <circle cx="60" cy="60" r="7" fill="#00f2fe">
          <animate attributeName="r" values="5;8.5;5" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `),
  },
  {
    id: 'live-plasma-crest',
    label: 'Plasma Supernova',
    tag: 'LIVE',
    url: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <radialGradient id="plBg" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#4c0519"/>
            <stop offset="65%" stop-color="#1e1035"/>
            <stop offset="100%" stop-color="#090d1a"/>
          </radialGradient>
          <linearGradient id="plGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ec4899"/>
            <stop offset="50%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill="url(#plBg)"/>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="3.6s" repeatCount="indefinite"/>
          <circle cx="60" cy="60" r="42" fill="none" stroke="url(#plGrad)" stroke-width="3" stroke-dasharray="36 20"/>
          <circle cx="60" cy="18" r="4.5" fill="#fde047"/>
          <circle cx="60" cy="102" r="4.5" fill="#ec4899"/>
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="4.8s" repeatCount="indefinite"/>
          <polygon points="60,26 68,48 92,48 72,62 80,86 60,72 40,86 48,62 28,48 52,48" fill="url(#plGrad)" opacity="0.9"/>
        </g>
        <circle cx="60" cy="60" r="10" fill="#090d1a" stroke="#fde047" stroke-width="2"/>
        <circle cx="60" cy="60" r="4.5" fill="#fde047">
          <animate attributeName="r" values="3.5;6;3.5" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `),
  },
];

// 4 Animated PRO Frame Styles + Static option
export const PRO_FRAME_STYLES = [
  {
    id: 'gold',
    name: 'Solar Gold Orbit',
    badge: 'DEFAULT PRO',
    desc: '360° rotating molten gold & white-gold light beam',
    previewGrad: 'conic-gradient(from 0deg, #f59e0b, #fff8dc, #fbbf24, #b45309, #f59e0b)',
  },
  {
    id: 'cyber',
    name: 'Cyber Ledger Neon',
    badge: 'PRO',
    desc: 'Electric XRPL blue, cyan & violet orbital pulse',
    previewGrad: 'conic-gradient(from 0deg, #2080F5, #00f2fe, #8b5cf6, #38bdf8, #2080F5)',
  },
  {
    id: 'plasma',
    name: 'Harbor Plasma Flare',
    badge: 'PRO',
    desc: 'Crimson, magenta & solar yellow supernova spin',
    previewGrad: 'conic-gradient(from 0deg, #ec4899, #fde047, #f43f5e, #a855f7, #ec4899)',
  },
  {
    id: 'diamond',
    name: 'Prismatic Emerald',
    badge: 'PRO',
    desc: 'Emerald & ice-diamond verified ledger aura',
    previewGrad: 'conic-gradient(from 0deg, #10b981, #e0f2fe, #38bdf8, #059669, #10b981)',
  },
  {
    id: 'none',
    name: 'Static Gold Frame',
    badge: 'CLASSIC',
    desc: 'Non-animated solid gold border',
    previewGrad: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
];

export function isAnimatedImage(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    /\.gif(\?|#|$)/i.test(trimmed) ||
    /^data:image\/gif/i.test(trimmed) ||
    /^data:image\/svg\+xml/i.test(trimmed)
  );
}

/**
 * Reads an image file (.gif, .png, .jpg, .webp) and uploads via /api/upload.
 * Falls back cleanly to a validated base64 data URI if ImgBB is in demo mode.
 */
export async function uploadAvatarOrLogoFile(file, isPro = false) {
  if (!file) throw new Error('No file selected');
  const mime = String(file.type || '').toLowerCase();
  const isGif = mime === 'image/gif' || /\.gif$/i.test(file.name || '');

  if (isGif && !isPro) {
    throw new Error('Animated .GIF profile pictures & store logos are an exclusive PRO membership perk!');
  }

  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
  if (!allowed.includes(mime) && !/\.(png|jpe?g|webp|gif)$/i.test(file.name || '')) {
    throw new Error('Unsupported format. Please choose a PNG, JPG, WEBP, or animated GIF file.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image is too large (max 5 MB).');
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('xrpmarket_token') : null;
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ image: dataUrl }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.url && !data.demoMode && !String(data.url).includes('/demo/')) {
      return data.url;
    }
  } catch {
    // Fallback to inline data URI below if under 650 KB
  }

  if (file.size <= 650 * 1024) {
    return dataUrl;
  }
  throw new Error('For files over 650 KB, please paste a hosted image/GIF URL or choose a smaller file.');
}
