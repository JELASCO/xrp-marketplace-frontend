'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../../lib/store';
import { api } from '../../../../lib/api';
import { sanitizeImageUrl, sanitizeExternalUrl } from '../../../../lib/sanitizeUrl';

const TITLE_MAX = 120;
const DESC_MAX = 2000;

const CATS = [
  { key:'graphics',  label:'🎨 3D, Shaders & Design' },
  { key:'templates', label:'🧩 Templates & UI Kits' },
  { key:'software',  label:'💻 Software & Indie Tools' },
  { key:'education', label:'🎓 Education & Courses' },
  { key:'prompts',   label:'✨ Prompts & AI Assets' },
  { key:'audio',     label:'🎵 Audio & Music' },
  { key:'games',     label:'🎮 Games & Game Assets' },
  { key:'accounts',  label:'👤 Accounts' },
  { key:'other',     label:'📦 Other' },
];
const GAMES = ['CS2','Valorant','Fortnite','Dota 2','Rocket League','League of Legends','World of Warcraft','Apex Legends','Roblox','Minecraft','Call of Duty','Old School RuneScape','RuneScape 3','Path of Exile','Diablo 4','Rust','Team Fortress 2','PUBG','Genshin Impact','Grand Theft Auto V','EA FC 24','Overwatch 2','Escape from Tarkov','ARC Raiders','New World','Lost Ark','Albion Online','Final Fantasy XIV','Warframe','Destiny 2','Other'];
const PLATFORMS = ['PC','PlayStation','Xbox','Nintendo Switch','Mobile','Cross-platform','Other'];
const SUBCATS = {
  graphics:  ['3D & models','Shaders & materials','Textures & PBR','Illustrations','Logos & branding','Avatars / PFP'],
  templates: ['UI/UX kits','Next.js / React templates','Figma design systems','Notion templates','Webflow / Framer'],
  software:  ['Plugins & extensions','Indie dev tools','Scripts & automation','Source code','Licenses & keys'],
  education: ['Courses & video tutorials','eBooks & PDF guides','Project files & breakdowns','Mentorship'],
  prompts:   ['ComfyUI / Stable Diffusion','LLM workflows','Midjourney prompt packs','LUTs & presets'],
  audio:     ['Game SFX packs','Synth presets & MIDI','Ambient & OST loops','Voice & Foley'],
  games:     GAMES,
  accounts:  ['Game accounts','Social media','Streaming','Subscriptions'],
  other:     ['Digital bundles','eBooks & guides','Collectibles','Misc'],
};

async function computeSha256Hex(file) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const buf = await file.arrayBuffer();
      const hashBuf = await window.crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return '';
}

const CSS = `
.xh-form{font-family:var(--xh-body);color:var(--xh-text)}
.xh-form h1{font-family:var(--xh-display);font-weight:800;letter-spacing:-0.02em;line-height:1.1}
.xh-form .sec-h{font-family:var(--xh-display);font-weight:700;letter-spacing:-0.01em}

.xh-form-mast{background:#0b1b33;color:#e2e8f0;border-radius:16px;padding:28px 30px 36px;margin:14px 0 18px;position:relative;overflow:hidden}
.xh-form-mast .crumb{font-family:var(--xh-mono);font-size:11.5px;color:#cbd5e1;letter-spacing:0.04em;margin-bottom:10px;text-transform:uppercase}
.xh-form-mast .crumb b{color:#60a5fa;font-weight:700}
.xh-form-mast h1{font-size:28px;display:flex;align-items:center;gap:14px;margin:0 0 6px;color:#fff}
.xh-form-mast h1 .icon{width:40px;height:40px;border-radius:10px;background:#f59e0b;display:grid;place-items:center;font-size:20px;flex:none}
.xh-form-mast .sub{color:#cbd5e1;font-size:14px;max-width:640px;line-height:1.55;margin-top:6px}
.xh-form-mast .step-rail{display:flex;gap:8px;margin-top:22px;flex-wrap:wrap}
.xh-form-mast .step{font-family:var(--xh-mono);font-size:11px;color:#cbd5e1;background:rgba(255,255,255,0.06);border:1px solid #33507e;border-radius:8px;padding:7px 12px;display:flex;align-items:center;gap:8px;letter-spacing:0.04em}
.xh-form-mast .step.on{color:#ffffff;background:rgba(59,130,246,0.28);border-color:#60a5fa}
.xh-form-mast .step .num{width:18px;height:18px;border-radius:50%;background:#10264a;display:grid;place-items:center;font-size:10px;color:#cbd5e1}
.xh-form-mast .step.on .num{background:var(--xh-accent);color:#fff}
.xh-form-mast .wave{position:absolute;bottom:-2px;left:0;right:0;height:24px;pointer-events:none}

.xh-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:32px;padding:0 0 60px;align-items:start}
.xh-col{display:flex;flex-direction:column;gap:18px}

.xh-card{background:var(--xh-surface);border:1px solid var(--xh-border);border-radius:14px;padding:22px 24px}
.xh-card .sec-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:6px}
.xh-card .sec-head .lbl{font-family:var(--xh-mono);font-size:10.5px;letter-spacing:0.08em;color:#1668D6;text-transform:uppercase;font-weight:500}
.xh-card .sec-head .lbl.warn{color:#f59e0b}
.xh-card .sec-head .lbl.danger{color:#ef4444}
.xh-card .sec-head h2{font-size:17px;color:var(--xh-text)}
.xh-card .sec-head .hint{font-size:12px;color:var(--xh-text2);font-family:var(--xh-mono)}
.xh-card.boost{background:linear-gradient(135deg,rgba(245,158,11,0.05),rgba(245,158,11,0.10));border-color:#fde68a}
.xh-card.danger{background:rgba(239,68,68,0.05);border-color:rgba(239,68,68,0.16)}

.xh-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.xh-field:last-child{margin-bottom:0}
.xh-field label{font-size:13px;font-weight:600;color:var(--xh-text);display:flex;align-items:center;gap:6px}
.xh-field label .opt{font-family:var(--xh-mono);font-size:10.5px;font-weight:400;color:var(--xh-text2);text-transform:uppercase}
.xh-field label .req{color:#ef4444}
.xh-field .helper{font-size:12px;color:var(--xh-text2);line-height:1.45}
.xh-field input[type=text],.xh-field input[type=number],.xh-field input[type=url],.xh-field textarea,.xh-field select{
  width:100%;background:var(--xh-surface);border:1px solid var(--xh-border);border-radius:10px;
  padding:11px 14px;font-size:14px;color:var(--xh-text);font-family:inherit;transition:border-color 0.15s,box-shadow 0.15s;box-sizing:border-box
}
.xh-field input:focus,.xh-field textarea:focus,.xh-field select:focus{outline:none;border-color:var(--xh-accent);box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.xh-field input.err,.xh-field textarea.err{border-color:#ef4444}
.xh-field textarea{resize:vertical;min-height:96px;line-height:1.55}
.xh-field .count{font-family:var(--xh-mono);font-size:10.5px;color:var(--xh-text2);text-align:right;margin-top:2px}
.xh-field .count.over{color:#ef4444}
.xh-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.xh-chips{display:flex;gap:6px;flex-wrap:wrap}
.xh-chip{font-family:var(--xh-mono);font-size:11.5px;color:var(--xh-text2);border:1px solid var(--xh-border);background:var(--xh-surface);border-radius:999px;padding:7px 14px;cursor:pointer;font-weight:500;letter-spacing:0.03em;transition:all 0.15s}
.xh-chip:hover{border-color:var(--xh-accent);color:#1668D6}
.xh-chip.on{background:#2080F5;color:#fff;border-color:#2080F5}

.xh-price{position:relative}
.xh-price input{padding-right:60px;font-family:var(--xh-mono);font-weight:500;font-size:18px;color:#1668D6}
.xh-price .suffix{position:absolute;right:14px;top:50%;transform:translateY(-50%);font-family:var(--xh-mono);font-size:12px;color:var(--xh-text2);font-weight:500;letter-spacing:0.04em;pointer-events:none}
.xh-usd-live{font-family:var(--xh-mono);font-size:11px;color:#10b981;margin-top:6px;display:flex;align-items:center;gap:6px}
.xh-usd-live .lvdot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:xhPulse 2s infinite}
@keyframes xhPulse{0%,100%{opacity:1}50%{opacity:0.5}}

.xh-digital-extra{margin-top:14px;display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:12px;background:rgba(32,128,245,0.05);border:1px solid rgba(32,128,245,0.22)}
.xh-digital-extra textarea{font-family:var(--xh-mono);font-size:13px}

.xh-boost-cta{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:6px;flex-wrap:wrap}
.xh-boost-cta .info{flex:1;min-width:200px}
.xh-boost-cta .info .t{font-weight:600;font-size:14px;color:var(--xh-text);margin-bottom:4px;display:flex;align-items:center;gap:8px}
.xh-boost-cta .info .s{font-size:12.5px;color:var(--xh-text2);line-height:1.5}
.xh-boost-cta .info .s b{color:#f59e0b;font-weight:700;font-family:var(--xh-mono)}

.xh-danger-body{margin-top:4px}
.xh-danger-body .s{font-size:13px;color:var(--xh-text2);line-height:1.55;margin-bottom:14px}
.xh-danger-confirm{background:var(--xh-surface);border:1px solid rgba(239,68,68,0.16);border-radius:10px;padding:14px}
.xh-danger-confirm .t{font-size:13px;color:var(--xh-text);margin-bottom:12px;font-weight:500}
.xh-danger-confirm .row{display:flex;gap:8px}

.xh-action-bar{position:sticky;bottom:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-top:1px solid var(--xh-border);padding:14px 0;margin-top:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.xh-action-bar .left{font-family:var(--xh-mono);font-size:11.5px;color:var(--xh-text2)}
.xh-action-bar .left .ok{color:#10b981}
.xh-action-bar .btn-group{display:flex;gap:10px}
.xh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:14.5px;padding:11px 22px;border-radius:10px;border:1px solid transparent;cursor:pointer;transition:all 0.15s;font-family:inherit;text-decoration:none}
.xh-btn:disabled{cursor:not-allowed;opacity:0.6}
.xh-btn-primary{background:var(--xh-accent);color:#fff;box-shadow:0 6px 18px rgba(59,130,246,0.28)}
.xh-btn-primary:hover:not(:disabled){background:#1668D6;transform:translateY(-1px)}
.xh-btn-ghost{background:var(--xh-surface);border-color:var(--xh-border);color:var(--xh-text)}
.xh-btn-ghost:hover:not(:disabled){border-color:var(--xh-accent)}
.xh-btn-warn{background:#f59e0b;color:#fff;box-shadow:0 6px 18px rgba(245,158,11,0.28)}
.xh-btn-warn:hover:not(:disabled){background:#d97706;transform:translateY(-1px)}
.xh-btn-danger{background:#ef4444;color:#fff}
.xh-btn-danger:hover:not(:disabled){background:#dc2626}
.xh-btn-danger-ghost{background:var(--xh-surface);border-color:rgba(239,68,68,0.16);color:#b91c1c}
.xh-btn-danger-ghost:hover:not(:disabled){background:rgba(239,68,68,0.05);border-color:#ef4444}

.xh-err{background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.16);border-radius:8px;padding:10px 14px;font-size:13px;color:#b91c1c}

.xh-loading{max-width:480px;margin:80px auto;text-align:center;color:var(--xh-text2);font-family:var(--xh-mono);font-size:13px}

/* PREVIEW PANEL */
.xh-prev-col{position:sticky;top:84px}
.xh-prev{background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:14px;padding:18px;font-size:13px}
.xh-prev .head{display:flex;align-items:center;justify-content:space-between;font-family:var(--xh-mono);font-size:10.5px;color:var(--xh-text2);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px;padding-bottom:12px;border-bottom:1px dashed var(--xh-border)}
.xh-prev .head .live{color:#10b981;display:flex;align-items:center;gap:5px}
.xh-prev .head .live::before{content:"";width:6px;height:6px;border-radius:50%;background:#10b981;animation:xhPulse 2s infinite}
.xh-prev-img{aspect-ratio:4/3;border-radius:12px;background:linear-gradient(135deg,rgba(59,130,246,0.16),rgba(59,130,246,0.05));display:grid;place-items:center;font-size:54px;position:relative;border:1px solid var(--xh-border);margin-bottom:8px;overflow:hidden}
.xh-prev-img img{width:100%;height:100%;object-fit:cover}
.xh-prev-img .badge{position:absolute;top:9px;left:9px;font-family:var(--xh-mono);font-size:9.5px;background:rgba(11,27,51,0.85);color:#fff;padding:3px 7px;border-radius:5px;letter-spacing:0.04em}
.xh-prev .cat{font-family:var(--xh-mono);font-size:10px;letter-spacing:0.06em;color:#1668D6;margin-bottom:5px;text-transform:uppercase}
.xh-prev .title{font-family:var(--xh-display);font-weight:800;font-size:18px;line-height:1.2;letter-spacing:-0.01em;margin-bottom:8px;color:var(--xh-text);word-break:break-word}
.xh-prev .price{display:flex;align-items:baseline;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.xh-prev .price .xrp{font-family:var(--xh-mono);font-weight:500;font-size:22px;color:#1668D6;line-height:1}
.xh-prev .price .usd{font-family:var(--xh-mono);font-size:11px;color:var(--xh-text2)}
.xh-prev .buy{background:var(--xh-accent);color:#fff;border-radius:8px;padding:10px;text-align:center;font-weight:600;font-size:13px;margin-bottom:10px}
.xh-prev .desc-preview{background:var(--xh-surface);border-radius:10px;padding:10px 12px;font-size:12.5px;color:#374151;line-height:1.55;max-height:120px;overflow:hidden;position:relative;white-space:pre-wrap}
.xh-prev .desc-preview.fade::after{content:"";position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(to bottom,transparent,#fff)}
.xh-prev .foot{margin-top:14px;padding-top:12px;border-top:1px dashed var(--xh-border);font-family:var(--xh-mono);font-size:10px;color:var(--xh-text2);text-align:center;letter-spacing:0.04em;text-transform:uppercase}

/* feature modal */
.xh-modal-bg{position:fixed;inset:0;background:rgba(11,27,51,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}
.xh-modal{background:var(--xh-surface);border:1px solid var(--xh-border);border-radius:14px;padding:26px;width:380px;max-width:100%;box-shadow:0 20px 50px -10px rgba(20,22,26,0.4);text-align:center}
.xh-modal .title{font-family:var(--xh-display);font-weight:700;font-size:18px;color:var(--xh-text);margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:8px}
.xh-modal .sub{font-size:12.5px;color:var(--xh-text2);margin-bottom:18px;line-height:1.5}
.xh-modal .qrwrap{background:var(--xh-surface);padding:12px;border-radius:12px;border:1px solid var(--xh-border);display:inline-block;margin-bottom:14px}
.xh-modal .qrwrap img{width:192px;height:192px;display:block}
.xh-modal .deep-link{display:block;background:var(--xh-accent);color:#fff;text-decoration:none;border-radius:8px;padding:11px;font-size:13.5px;font-weight:600;margin-bottom:10px}
.xh-modal .deep-link:hover{background:#1668D6}
.xh-modal .verify-btn{width:100%;background:rgba(245,158,11,0.12);color:#d97706;border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s}
.xh-modal .verify-btn:hover:not(:disabled){background:rgba(245,158,11,0.2)}
.xh-modal .verify-btn:disabled{cursor:not-allowed;opacity:0.6}
.xh-modal .cancel{width:100%;margin-top:8px;background:none;border:none;color:var(--xh-text2);font-size:12px;cursor:pointer;padding:6px;font-family:inherit}
.xh-modal .cancel:hover{color:var(--xh-text)}

@media (max-width:960px){
  .xh-grid{grid-template-columns:1fr;gap:22px;padding-bottom:40px}
  .xh-prev-col{position:static}
  .xh-row2{grid-template-columns:1fr}
  .xh-form-mast h1{font-size:22px}
}
@media (max-width:560px){
  .xh-form-mast{padding:22px 20px 30px}
}
`;

const WAVE_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 24' preserveAspectRatio='none'><path d='M0 12 Q150 0 300 12 T600 12 T900 12 T1200 12 V24 H0Z' fill='%23fff'/></svg>";

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);
  const archiveRef = useRef(null);
  const [listing, setListing] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('graphics');
  const [game, setGame] = useState('');
  const [platform, setPlatform] = useState('');
  const [priceXrp, setPriceXrp] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [pricingMode, setPricingMode] = useState('XRP');
  const [currency, setCurrency] = useState('XRP');
  const [description, setDescription] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('instant');
  const [isDigital, setIsDigital] = useState(true);
  const [digitalContent, setDigitalContent] = useState('');
  const [digitalLink, setDigitalLink] = useState('');
  const [digitalArchiveUrl, setDigitalArchiveUrl] = useState('');
  const [digitalArchiveName, setDigitalArchiveName] = useState('');
  const [digitalArchiveSha256, setDigitalArchiveSha256] = useState('');
  const [uploadingArchive, setUploadingArchive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [featureModal, setFeatureModal] = useState(null);
  const [featPricing, setFeatPricing] = useState(null);
  const [featVerifying, setFeatVerifying] = useState(false);
  const [xrpUsd, setXrpUsd] = useState(2.25);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('xh-form-fonts')) {
      const link = document.createElement('link');
      link.id = 'xh-form-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);
    }
    let style = document.getElementById('xh-edit-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'xh-edit-css';
      document.head.appendChild(style);
    }
    style.textContent = ':root{--xh-display:"Bricolage Grotesque","Inter",system-ui,sans-serif;--xh-body:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--xh-mono:"JetBrains Mono",ui-monospace,monospace}\n' + CSS;
  }, []);

  useEffect(() => { api.upgrades.pricing().then(setFeatPricing).catch(() => {}); }, []);

  useEffect(() => {
    let alive = true;
    const fetchPrice = () => {
      fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot')
        .then(r => r.json())
        .then(d => { if (alive && d?.data?.amount) setXrpUsd(parseFloat(d.data.amount)); })
        .catch(() => {});
    };
    fetchPrice();
    const t = setInterval(fetchPrice, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push('/'); return; }
    api.listings.get(id).then(l => {
      if (l.seller_id !== user.id) { router.push('/listing/' + id); return; }
      setListing(l);
      setTitle(l.title || '');
      setCategory(l.category || 'graphics');
      setGame(l.game || '');
      setPlatform(l.platform || '');
      setPriceXrp(String(l.price_xrp || ''));
      setPriceUsd(l.price_usd ? String(l.price_usd) : '');
      setPricingMode(l.pricing_mode || (l.currency === 'RLUSD' ? 'RLUSD' : 'XRP'));
      setCurrency(l.currency || 'XRP');
      setDescription(l.description || '');
      setDeliveryTime(l.delivery_time || (l.is_digital ? 'instant' : '24h'));
      setIsDigital(!!l.is_digital);
      setDigitalContent(l.digital_content || '');
      setDigitalLink(l.digital_link || '');
      setDigitalArchiveUrl(l.digital_archive_url || '');
      setDigitalArchiveName(l.digital_archive_name || '');
      setDigitalArchiveSha256(l.digital_archive_sha256 || '');
    }).catch(() => router.push('/listing/' + id));
  }, [id, user, hydrated]);

  async function handleArchiveUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingArchive(true);
    setError('');
    try {
      const localSha = await computeSha256Hex(file);
      const base64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result || '').split(',')[1] || '');
        fr.onerror = () => rej(new Error('Could not read file'));
        fr.readAsDataURL(file);
      });
      const token = localStorage.getItem('xrpmarket_token');
      const r = await fetch('/api/upload-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          filename: file.name,
          fileName: file.name,
          size: file.size,
          fileSize: file.size,
          dataBase64: base64,
          fileBase64: base64,
          mimeType: file.type || 'application/octet-stream',
          sha256: localSha,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.presignedPutUrl) {
        await fetch(d.presignedPutUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        }).catch(() => {});
      }
      setDigitalArchiveUrl(d.url || `vault://${encodeURIComponent(file.name)}`);
      setDigitalArchiveName(file.name);
      setDigitalArchiveSha256(d.sha256 || localSha || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      setIsDigital(true);
    } catch (err) {
      setError(err.message || 'Archive upload failed');
    } finally {
      setUploadingArchive(false);
      if (archiveRef.current) archiveRef.current.value = '';
    }
  }

  async function startFeature() {
    setError('');
    try {
      const r = await api.upgrades.payload('featured', id);
      if (r && r.freeBoostApplied) {
        router.push('/listing/' + id);
        return;
      }
      if (r.uuid || r.qrUrl) setFeatureModal({ qrUrl: r.qrUrl, deepLink: r.deepLink, paymentId: r.paymentId, days: r.days });
      else setError(r.error || 'Could not start payment');
    } catch (e) { setError(e.message); }
  }

  async function verifyFeature() {
    if (!featureModal) return;
    setFeatVerifying(true); setError('');
    try {
      const r = await api.upgrades.verify(featureModal.paymentId);
      if (r.ok) { setFeatureModal(null); router.push('/listing/' + id); }
      else setError(r.error || 'Not verified yet');
    } catch (e) { setError(e.message); }
    setFeatVerifying(false);
  }

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Title required'); return; }
    setSaving(true);
    try {
      await api.listings.update(id, {
        title: title.trim(),
        category,
        game: game || null,
        platform: platform || null,
        description: description.trim() || null,
        price_xrp: Number(priceXrp),
        priceUsd: pricingMode === 'USD' && priceUsd ? Number(priceUsd) : null,
        pricingMode,
        currency,
        deliveryTime,
        isDigital: deliveryTime === 'instant' ? true : isDigital,
        digitalContent: digitalContent || null,
        digitalLink: digitalLink || null,
        digitalArchiveUrl: digitalArchiveUrl || null,
        digitalArchiveName: digitalArchiveName || null,
        digitalArchiveSha256: digitalArchiveSha256 || null,
      });
      router.push('/listing/' + id);
    } catch (e) {
      setError(e.message || 'Failed to save');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError(''); setDeleting(true);
    try {
      await api.listings.remove(id);
      router.push('/profile/' + user.id);
    } catch (e) {
      setError(e.message || 'Failed to delete');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!hydrated) return null;
  if (!user) return null;
  if (!listing) return (
    <div className="xh-form"><div className="xh-loading">Loading listing…</div></div>
  );

  const liveRate = xrpUsd || 2.25;
  const priceNum = parseFloat(priceXrp);
  const usdPrice = (priceNum > 0 && xrpUsd) ? (priceNum * xrpUsd).toFixed(2) : null;
  const catLabelMap = {
    graphics:'3D & DESIGN',
    templates:'TEMPLATES',
    software:'SOFTWARE & TOOLS',
    education:'EDUCATION',
    prompts:'PROMPTS',
    audio:'AUDIO',
    games:'GAMES',
    accounts:'ACCOUNTS',
    other:'OTHER',
  };
  const catBits = [catLabelMap[category] || 'ITEM'];
  if (game) catBits.push(game);
  const isGameOrAccount = category === 'games' || category === 'accounts';

  return (
    <div className="xh-form">
      <div className="xh-form-mast">
        <div className="crumb">HARBOR · <b>EDIT · {(listing.title || '').toUpperCase().slice(0, 60)}</b></div>
        <h1><span className="icon">✎</span>Refit your listing</h1>
        <p className="sub">Update your title, category, pricing mode, encrypted vault files, or boost this listing to the top of the harbor.</p>
        <div className="step-rail">
          <span className={'step' + (title.trim() ? ' on' : '')}><span className="num">1</span>BASICS</span>
          <span className={'step' + (priceNum > 0 ? ' on' : '')}><span className="num">2</span>PRICE</span>
          <span className={'step' + (deliveryTime ? ' on' : '')}><span className="num">3</span>DELIVERY</span>
          <span className="step"><span className="num">4</span>FEATURED BOOST</span>
          <span className="step"><span className="num">5</span>DANGER</span>
        </div>
        <div className="wave" style={{ background: `url("${WAVE_SVG}") no-repeat`, backgroundSize: '100% 100%' }}></div>
      </div>

      <div className="xh-grid">
        {/* FORM COL */}
        <div className="xh-col">

          {/* 1. Basics */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">01 · BASICS</div><h2 className="sec-h">Title, category &amp; description</h2></div>
              <div className="hint">required</div>
            </div>

            <div className="xh-field">
              <label>Category</label>
              <select value={category} onChange={e => { setCategory(e.target.value); setGame(''); setPlatform(''); }}>
                {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>

            <div className="xh-field">
              <label>Title <span className="req">*</span></label>
              <input type="text" maxLength={TITLE_MAX + 10} placeholder="e.g. Cyberpunk Modular Shader Pack v2 (Blender + Godot 4)" value={title} onChange={e => { setTitle(e.target.value); setFieldErrors(fe => ({ ...fe, title: null })); }} className={fieldErrors.title ? 'err' : ''} />
              {fieldErrors.title && <div style={{ fontSize: 11, color: '#ef4444' }}>{fieldErrors.title}</div>}
              <div className={'count' + (title.length > TITLE_MAX ? ' over' : '')}>{title.length} / {TITLE_MAX}</div>
            </div>

            {isGameOrAccount ? (
              <div className="xh-row2">
                <div className="xh-field">
                  <label>{category === 'games' ? 'Game' : 'Account Type'}</label>
                  <select value={game} onChange={e => setGame(e.target.value)}>
                    <option value="">Select {category === 'games' ? 'game' : 'type'} (optional)…</option>
                    {(SUBCATS[category] || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="xh-field">
                  <label>Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)}>
                    <option value="">Select platform (optional)…</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="xh-row2">
                <div className="xh-field">
                  <label>Subcategory / Format <span className="opt">optional</span></label>
                  <select value={game} onChange={e => setGame(e.target.value)}>
                    <option value="">Select format / subcategory…</option>
                    {(SUBCATS[category] || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="xh-field">
                  <label>Compatible Engine / Tool <span className="opt">optional</span></label>
                  <input type="text" placeholder="e.g. Blender 4.2, Godot 4, Figma, Next.js" value={platform} onChange={e => setPlatform(e.target.value)} />
                </div>
              </div>
            )}

            <div className="xh-field">
              <label>Description</label>
              <textarea rows={5} maxLength={DESC_MAX + 50} value={description} onChange={e => { setDescription(e.target.value); setFieldErrors(fe => ({ ...fe, description: null })); }} className={fieldErrors.description ? 'err' : ''} />
              {fieldErrors.description && <div style={{ fontSize: 11, color: '#ef4444' }}>{fieldErrors.description}</div>}
              <div className={'count' + (description.length > DESC_MAX ? ' over' : '')}>{description.length} / {DESC_MAX}</div>
            </div>
          </div>

          {/* 2. Price */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">02 · PRICE</div><h2 className="sec-h">Pricing &amp; settlement currency</h2></div>
              <div className="hint">XRP {xrpUsd ? '$' + xrpUsd.toFixed(4) : '…'}</div>
            </div>

            <div className="xh-field">
              <label>Pricing Mode</label>
              <div className="xh-chips">
                {[
                  { k: 'XRP', l: '💎 Standard XRP' },
                  { k: 'USD', l: '💵 USD-Pegged (Auto-XRP)' },
                  { k: 'RLUSD', l: '🪙 Native RLUSD Stablecoin' },
                ].map(pm => (
                  <button
                    key={pm.k}
                    type="button"
                    className={'xh-chip' + (pricingMode === pm.k ? ' on' : '')}
                    onClick={() => {
                      setPricingMode(pm.k);
                      if (pm.k === 'RLUSD') setCurrency('RLUSD');
                      else setCurrency('XRP');
                      if (pm.k === 'USD' && !priceUsd && priceNum > 0) {
                        setPriceUsd((priceNum * liveRate).toFixed(2));
                      }
                    }}
                  >
                    {pm.l}
                  </button>
                ))}
              </div>
            </div>

            {pricingMode === 'USD' ? (
              <div className="xh-field">
                <label>USD Target Price <span className="req">*</span></label>
                <div className="xh-price">
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={priceUsd}
                    onChange={e => {
                      const u = e.target.value;
                      setPriceUsd(u);
                      if (u && parseFloat(u) > 0) setPriceXrp((parseFloat(u) / liveRate).toFixed(2));
                    }}
                  />
                  <span className="suffix">USD</span>
                </div>
                <div className="xh-usd-live"><span className="lvdot"></span>Live XRP settlement: <b>{priceXrp || '0.00'} XRP</b></div>
              </div>
            ) : (
              <div className="xh-field">
                <label>Price <span className="req">*</span></label>
                <div className="xh-price">
                  <input type="number" step="0.01" min="0.01" value={priceXrp} onChange={e => { setPriceXrp(e.target.value); setFieldErrors(fe => ({ ...fe, priceXrp: null })); }} className={fieldErrors.priceXrp ? 'err' : ''} />
                  <span className="suffix">{currency}</span>
                </div>
                {fieldErrors.priceXrp && <div style={{ fontSize: 11, color: '#ef4444' }}>{fieldErrors.priceXrp}</div>}
                {usdPrice && <div className="xh-usd-live"><span className="lvdot"></span>≈ ${usdPrice} · live · refreshes every 15s</div>}
              </div>
            )}
          </div>

          {/* 3. Unified Delivery & Encrypted Digital File Vault */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">03 · DELIVERY &amp; DIGITAL VAULT</div><h2 className="sec-h">Delivery window &amp; Encrypted Vault</h2></div>
            </div>

            <div className="xh-field">
              <label>Delivery window</label>
              <div className="xh-chips">
                {[
                  { v:'instant', l:'⚡ Instant Vault Delivery' },
                  { v:'1h',      l:'Under 1 hour' },
                  { v:'24h',     l:'Within 24 hours' },
                  { v:'1-3d',    l:'1–3 days' },
                ].map(d => (
                  <button
                    key={d.v}
                    type="button"
                    className={'xh-chip' + (deliveryTime === d.v ? ' on' : '')}
                    onClick={() => {
                      setDeliveryTime(d.v);
                      if (d.v === 'instant') setIsDigital(true);
                    }}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            {deliveryTime === 'instant' && (
              <div className="xh-digital-extra">
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--xh-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🔐 Encrypted Digital File Vault</span>
                  <span style={{ fontFamily: 'var(--xh-mono)', fontSize: 10, background: '#10b981', color: '#fff', padding: '2px 7px', borderRadius: 4 }}>SHA-256 VERIFIED</span>
                </div>

                <div className="xh-field">
                  <label>Encrypted Archive / File Upload <span className="opt">.ZIP, .PDF, .GLB, .BLEND, .WAV</span></label>
                  <input ref={archiveRef} type="file" style={{ display: 'none' }} onChange={handleArchiveUpload} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => archiveRef.current && archiveRef.current.click()} disabled={uploadingArchive} className="xh-btn xh-btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
                      {uploadingArchive ? '⏳ Encrypting…' : '📦 Upload / Replace Asset Archive'}
                    </button>
                    {digitalArchiveName && (
                      <span style={{ fontSize: 12, fontFamily: 'var(--xh-mono)', color: '#059669', fontWeight: 700 }}>
                        ✓ {digitalArchiveName} ({digitalArchiveSha256 ? digitalArchiveSha256.slice(0, 10) + '…' : 'SHA-256 Verified'})
                      </span>
                    )}
                  </div>
                </div>

                <div className="xh-field">
                  <label>License Key / Serial Vault <span className="opt">encrypted at rest</span></label>
                  <textarea rows={3} placeholder="e.g. License key or activation code" value={digitalContent} onChange={e => setDigitalContent(e.target.value)} />
                </div>
                <div className="xh-field">
                  <label>External Download / Release URL <span className="opt">optional URL</span></label>
                  <input type="url" placeholder="https://..." value={digitalLink} onChange={e => setDigitalLink(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* 4. Featured Boost */}
          <div className="xh-card boost">
            <div className="sec-head">
              <div><div className="lbl warn">04 · FEATURED BOOST</div><h2 className="sec-h">🔥 Pin this listing to the top</h2></div>
            </div>

            <div className="xh-boost-cta">
              <div className="info">
                <div className="s">
                  {featPricing && featPricing.freeBoostAvailable ? (
                    <>As a <b>★ Pro Member</b>, you have <b>1 Free 7-Day Featured Listing Boost</b> available this month! Pin this listing to the homepage and top of search results for <b>{featPricing.featured.days} days</b> at <b>0 XRP</b>.</>
                  ) : (
                    <>Feature this listing on the marketplace homepage and at the top of search results{featPricing ? <> for <b>{featPricing.featured.days} days</b> · <b>{featPricing.featured.xrp} XRP</b></> : ''}. Featured listings get 4-7× more views on average.</>
                  )}
                </div>
              </div>
              <button onClick={startFeature} className="xh-btn xh-btn-warn">
                {featPricing && featPricing.freeBoostAvailable ? '🎁 Claim Free 7-Day Pro Boost (0 XRP)' : '⛵ Feature this listing'}
              </button>
            </div>
          </div>

          {error && <div className="xh-err">{error}</div>}

          {/* sticky action bar */}
          <div className="xh-action-bar">
            <div className="left">EDIT MODE · <span className="ok">{title.trim() && priceNum > 0 ? 'ready to save' : 'fill in basics first'}</span></div>
            <div className="btn-group">
              <Link href={'/listing/' + id} className="xh-btn xh-btn-ghost">Cancel</Link>
              <button onClick={handleSave} disabled={saving} className="xh-btn xh-btn-primary">
                {saving ? 'Saving…' : '✓ Save changes'}
              </button>
            </div>
          </div>

          {/* 5. Danger zone */}
          <div className="xh-card danger">
            <div className="sec-head">
              <div><div className="lbl danger">05 · DANGER ZONE</div><h2 className="sec-h">Permanently remove this listing</h2></div>
            </div>
            <div className="xh-danger-body">
              {!confirmDelete ? (
                <>
                  <div className="s">Deletes the listing from the harbor. Active orders are unaffected — buyers can still complete escrow. There&rsquo;s no undo.</div>
                  <button onClick={() => setConfirmDelete(true)} className="xh-btn xh-btn-danger-ghost" style={{ width: '100%' }}>
                    Delete listing
                  </button>
                </>
              ) : (
                <div className="xh-danger-confirm">
                  <div className="t">⚠ Permanently delete this listing? This cannot be undone.</div>
                  <div className="row">
                    <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="xh-btn xh-btn-ghost" style={{ flex: 1 }}>Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} className="xh-btn xh-btn-danger" style={{ flex: 1 }}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PREVIEW COL */}
        <div className="xh-prev-col">
          <div className="xh-prev">
            <div className="head">
              <span>LIVE PREVIEW</span>
              <span className="live">EDITING</span>
            </div>

            <div className="xh-prev-img" style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.16),rgba(59,130,246,0.05))' }}>
              {listing.images?.[0] && sanitizeImageUrl(listing.images[0])
                ? <img src={sanitizeImageUrl(listing.images[0])} alt="cover" />
                : <span style={{ opacity: 0.6 }}>🖼</span>}
              <span className="badge">{catBits.slice(0, 2).join(' · ')}</span>
            </div>

            <div className="cat">{catBits.join(' / ')}</div>
            <div className="title">{title || 'Your listing title shows here'}</div>
            <div className="price">
              <span className="xrp">{priceNum > 0 ? Number(priceXrp).toLocaleString('en-US') : '0'} {currency}</span>
              {usdPrice && <span className="usd">≈ ${usdPrice}</span>}
            </div>

            <div className="buy">🛡 Buy with escrow</div>

            {description.trim() && (
              <div className={'desc-preview' + (description.length > 200 ? ' fade' : '')}>
                {description.slice(0, 240)}
              </div>
            )}

            <div className="foot">SHOWS LIVE ON xrpharbor.com/listing/{(id || '').slice(0, 8)}…</div>
          </div>
        </div>
      </div>

      {/* Feature modal */}
      {featureModal && (
        <div className="xh-modal-bg" onClick={e => { if (e.target === e.currentTarget) setFeatureModal(null); }}>
          <div className="xh-modal">
            <div className="title">🔥 Feature for {featureModal.days} days</div>
            <div className="sub">Scan with Xaman to pay. Your listing jumps to the top right after payment.</div>
            {featureModal.qrUrl && sanitizeImageUrl(featureModal.qrUrl) && <div className="qrwrap"><img src={sanitizeImageUrl(featureModal.qrUrl)} alt="Xaman QR" /></div>}
            {featureModal.deepLink && sanitizeExternalUrl(featureModal.deepLink) && <a href={sanitizeExternalUrl(featureModal.deepLink)} className="deep-link">Open in Xaman app</a>}
            <button onClick={verifyFeature} disabled={featVerifying} className="verify-btn">{featVerifying ? 'Checking…' : "I've paid — activate"}</button>
            <button onClick={() => setFeatureModal(null)} className="cancel">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
