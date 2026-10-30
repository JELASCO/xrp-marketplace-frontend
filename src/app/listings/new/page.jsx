'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { sanitizeImageUrl } from '../../../lib/sanitizeUrl';

const CATS = [
  { key:'graphics',  label:'3D, Shaders & Design',   emoji:'🎨' },
  { key:'templates', label:'Templates & UI Kits',    emoji:'🧩' },
  { key:'software',  label:'Software & Indie Tools', emoji:'💻' },
  { key:'education', label:'Education & Courses',    emoji:'🎓' },
  { key:'prompts',   label:'Prompts & AI Assets',    emoji:'✨' },
  { key:'audio',     label:'Audio & Music',          emoji:'🎵' },
  { key:'games',     label:'Games & Game Assets',    emoji:'🎮' },
  { key:'accounts',  label:'Accounts',               emoji:'👤' },
  { key:'other',     label:'Other',                  emoji:'📦' },
];
const CAT_LABEL_UPPER = {
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
const CAT_BG = {
  graphics:  'linear-gradient(135deg,rgba(139,92,246,0.16),rgba(139,92,246,0.05))',
  templates: 'linear-gradient(135deg,rgba(99,102,241,0.16),rgba(99,102,241,0.05))',
  software:  'linear-gradient(135deg,rgba(20,184,166,0.16),rgba(20,184,166,0.05))',
  education: 'linear-gradient(135deg,rgba(236,72,153,0.16),rgba(236,72,153,0.05))',
  prompts:   'linear-gradient(135deg,rgba(245,158,11,0.16),rgba(245,158,11,0.05))',
  audio:     'linear-gradient(135deg,rgba(16,185,129,0.16),rgba(16,185,129,0.05))',
  games:     'linear-gradient(135deg,rgba(59,130,246,0.16),rgba(59,130,246,0.05))',
  accounts:  'linear-gradient(135deg,rgba(148,163,184,0.12),rgba(148,163,184,0.04))',
  other:     'linear-gradient(135deg,rgba(245,158,11,0.16),rgba(245,158,11,0.05))',
};
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
const DELIVERY_OPTS = [
  { v:'instant', l:'⚡ Instant Vault Delivery' },
  { v:'1h',      l:'Under 1 hour' },
  { v:'24h',     l:'Within 24 hours' },
  { v:'1-3d',    l:'1–3 days' },
];
const TITLE_MAX = 120;
const DESC_MAX  = 5000;

async function uploadToImgbb(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB');
  const base64 = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result.split(',')[1]);
    fr.onerror = () => rej(new Error('Could not read file'));
    fr.readAsDataURL(file);
  });
  const token = localStorage.getItem('xrpmarket_token');
  const r = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ image: base64, filename: file.name }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) throw new Error((d && d.error) || 'Upload failed');
  return d.url;
}

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
.xh-form-mast h1 .icon{width:40px;height:40px;border-radius:10px;background:var(--xh-accent);display:grid;place-items:center;font-size:20px;flex:none}
.xh-form-mast .sub{color:#cbd5e1;font-size:14px;max-width:640px;line-height:1.55;margin-top:6px}
.xh-form-mast .step-rail{display:flex;gap:8px;margin-top:22px;flex-wrap:wrap}
.xh-form-mast .step{font-family:var(--xh-mono);font-size:11px;color:#cbd5e1;background:rgba(255,255,255,0.06);border:1px solid #33507e;border-radius:8px;padding:7px 12px;display:flex;align-items:center;gap:8px;letter-spacing:0.04em}
.xh-form-mast .step.on{color:#ffffff;background:rgba(59,130,246,0.28);border-color:#60a5fa}
.xh-form-mast .step.done{color:#10b981;border-color:rgba(16,185,129,0.4)}
.xh-form-mast .step .num{width:18px;height:18px;border-radius:50%;background:#10264a;display:grid;place-items:center;font-size:10px;color:#cbd5e1}
.xh-form-mast .step.on .num{background:var(--xh-accent);color:#fff}
.xh-form-mast .step.done .num{background:#10b981;color:#fff}
.xh-form-mast .wave{position:absolute;bottom:-2px;left:0;right:0;height:24px;pointer-events:none}

.xh-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:32px;padding:0 0 60px;align-items:start}
.xh-col{display:flex;flex-direction:column;gap:18px}

.xh-card{background:var(--xh-surface);border:1px solid var(--xh-border);border-radius:14px;padding:22px 24px}
.xh-card .sec-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:6px}
.xh-card .sec-head .lbl{font-family:var(--xh-mono);font-size:10.5px;letter-spacing:0.08em;color:#1668D6;text-transform:uppercase;font-weight:500}
.xh-card .sec-head h2{font-size:17px;color:var(--xh-text)}
.xh-card .sec-head .hint{font-size:12px;color:var(--xh-text2);font-family:var(--xh-mono)}

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

.xh-cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.xh-cat-btn{padding:12px 8px;border-radius:10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;background:var(--xh-surface);border:1px solid var(--xh-border);font-family:inherit;color:var(--xh-text2);transition:all 0.15s}
.xh-cat-btn:hover{border-color:var(--xh-accent);color:#1668D6}
.xh-cat-btn.on{background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(59,130,246,0.20));border-color:var(--xh-accent);color:#1668D6}
.xh-cat-btn .emoji{font-size:20px}
.xh-cat-btn .lbl{font-size:11.5px;font-weight:600;letter-spacing:0.01em;text-align:center}

.xh-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.xh-media-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.xh-tile{aspect-ratio:1;border-radius:12px;background:var(--xh-surface2);border:1px dashed var(--xh-border);display:grid;place-items:center;position:relative;color:var(--xh-text2);font-size:24px;overflow:hidden;transition:all 0.15s}
.xh-tile.add{cursor:pointer}
.xh-tile.add:hover{border-color:var(--xh-accent);color:var(--xh-accent)}
.xh-tile.filled{border-style:solid;background:linear-gradient(135deg,rgba(59,130,246,0.16),rgba(59,130,246,0.05))}
.xh-tile.filled img{width:100%;height:100%;object-fit:cover}
.xh-tile.cover{outline:2px solid var(--xh-accent);outline-offset:-2px}
.xh-tile .cover-tag{position:absolute;top:6px;left:6px;font-family:var(--xh-mono);font-size:9.5px;background:var(--xh-accent);color:#fff;padding:2px 6px;border-radius:4px;letter-spacing:0.05em;z-index:2}
.xh-tile .x{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;background:rgba(11,27,51,0.85);color:#fff;display:grid;place-items:center;font-size:12px;cursor:pointer;border:none;padding:0;z-index:2}
.xh-tile.add .plus{font-size:30px;font-weight:300;line-height:1;color:inherit}
.xh-tile.add .lbl{font-family:var(--xh-mono);font-size:9.5px;color:var(--xh-text2);margin-top:4px;letter-spacing:0.04em;text-transform:uppercase}
.xh-tile.add .col{display:flex;flex-direction:column;align-items:center}
.xh-media-note{font-family:var(--xh-mono);font-size:10.5px;color:var(--xh-text2);margin-top:10px}

.xh-price{position:relative}
.xh-price input{padding-right:92px;font-family:var(--xh-mono);font-weight:500;font-size:18px;color:#1668D6}
.xh-price .suffix{position:absolute;right:14px;top:50%;transform:translateY(-50%);font-family:var(--xh-mono);font-size:12px;color:var(--xh-text2);font-weight:500;letter-spacing:0.04em;pointer-events:none}
.xh-usd-live{font-family:var(--xh-mono);font-size:11px;color:#10b981;margin-top:6px;display:flex;align-items:center;gap:6px}
.xh-usd-live .lvdot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:xhPulse 2s infinite}
.xh-fee{font-family:var(--xh-mono);font-size:11px;color:var(--xh-text2);margin-top:4px}
.xh-fee b{color:#10b981;font-weight:600}
@keyframes xhPulse{0%,100%{opacity:1}50%{opacity:0.5}}

.xh-chips{display:flex;gap:6px;flex-wrap:wrap}
.xh-chip{font-family:var(--xh-mono);font-size:11.5px;color:var(--xh-text2);border:1px solid var(--xh-border);background:var(--xh-surface);border-radius:999px;padding:7px 14px;cursor:pointer;font-weight:500;letter-spacing:0.03em;transition:all 0.15s}
.xh-chip:hover{border-color:var(--xh-accent);color:#1668D6}
.xh-chip.on{background:#2080F5;color:#fff;border-color:#2080F5}

.xh-taginput{border:1px solid var(--xh-border);border-radius:10px;padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--xh-surface);transition:border-color 0.15s,box-shadow 0.15s}
.xh-taginput:focus-within{border-color:var(--xh-accent);box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.xh-tag{font-family:var(--xh-mono);font-size:11.5px;background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:999px;padding:4px 10px 4px 12px;color:var(--xh-text);display:flex;align-items:center;gap:6px}
.xh-tag button{cursor:pointer;color:var(--xh-text2);background:none;border:none;font-weight:500;padding:0;font-size:13px;font-family:inherit}
.xh-tag button:hover{color:#ef4444}
.xh-taginput input{flex:1;min-width:120px;border:none;outline:none;padding:6px 8px;font-size:13.5px;background:transparent;font-family:inherit;box-shadow:none}

.xh-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--xh-border);gap:16px}
.xh-toggle-row:last-child{border-bottom:none;padding-bottom:0}
.xh-toggle-row:first-child{padding-top:0}
.xh-toggle-row .info{flex:1}
.xh-toggle-row .info .t{font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px;margin-bottom:3px;color:var(--xh-text)}
.xh-toggle-row .info .badge{font-family:var(--xh-mono);font-size:9.5px;background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;letter-spacing:0.05em;font-weight:500}
.xh-toggle-row .info .s{font-size:12.5px;color:var(--xh-text2);line-height:1.45}
.xh-toggle{position:relative;width:42px;height:24px;flex:none}
.xh-toggle input{display:none}
.xh-toggle .track{display:block;width:100%;height:100%;background:var(--xh-border);border-radius:999px;position:relative;transition:background 0.15s;cursor:pointer}
.xh-toggle .track::before{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--xh-surface);box-shadow:0 1px 3px rgba(0,0,0,0.18);transition:transform 0.15s}
.xh-toggle input:checked + .track{background:var(--xh-accent)}
.xh-toggle input:checked + .track::before{transform:translateX(18px)}

.xh-digital-extra{margin-top:14px;display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:12px;background:rgba(32,128,245,0.05);border:1px solid rgba(32,128,245,0.22)}
.xh-digital-extra textarea{font-family:var(--xh-mono);font-size:13px}

.xh-action-bar{position:sticky;bottom:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-top:1px solid var(--xh-border);padding:14px 0;margin-top:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.xh-action-bar .left{font-family:var(--xh-mono);font-size:11.5px;color:var(--xh-text2)}
.xh-action-bar .left .ok{color:#10b981}
.xh-action-bar .btn-group{display:flex;gap:10px}
.xh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:14.5px;padding:11px 22px;border-radius:10px;border:1px solid transparent;cursor:pointer;transition:all 0.15s;font-family:inherit}
.xh-btn:disabled{cursor:not-allowed;opacity:0.6}
.xh-btn-primary{background:var(--xh-accent);color:#fff;box-shadow:0 6px 18px rgba(59,130,246,0.28)}
.xh-btn-primary:hover:not(:disabled){background:#1668D6;transform:translateY(-1px)}
.xh-btn-ghost{background:var(--xh-surface);border-color:var(--xh-border);color:var(--xh-text)}
.xh-btn-ghost:hover:not(:disabled){border-color:var(--xh-accent)}

.xh-err{background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.16);border-radius:8px;padding:10px 14px;font-size:13px;color:#b91c1c;font-family:var(--xh-body)}

.xh-auth-gate{max-width:480px;margin:60px auto;text-align:center;padding:40px 24px;background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:14px}
.xh-auth-gate .ic{font-size:38px;margin-bottom:14px}
.xh-auth-gate .t{font-family:var(--xh-display);font-size:20px;font-weight:700;color:var(--xh-text);margin-bottom:6px;letter-spacing:-0.01em}
.xh-auth-gate .s{font-size:13.5px;color:var(--xh-text2);line-height:1.55}

/* PREVIEW PANEL */
.xh-prev-col{position:sticky;top:84px}
.xh-prev{background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:14px;padding:18px;font-size:13px}
.xh-prev .head{display:flex;align-items:center;justify-content:space-between;font-family:var(--xh-mono);font-size:10.5px;color:var(--xh-text2);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px;padding-bottom:12px;border-bottom:1px dashed var(--xh-border)}
.xh-prev .head .live{color:#10b981;display:flex;align-items:center;gap:5px}
.xh-prev .head .live::before{content:"";width:6px;height:6px;border-radius:50%;background:#10b981;animation:xhPulse 2s infinite}
.xh-prev-img{aspect-ratio:4/3;border-radius:12px;background:linear-gradient(135deg,rgba(59,130,246,0.16),rgba(59,130,246,0.05));display:grid;place-items:center;font-size:54px;position:relative;border:1px solid var(--xh-border);margin-bottom:8px;overflow:hidden}
.xh-prev-img img{width:100%;height:100%;object-fit:cover}
.xh-prev-img .badge{position:absolute;top:9px;left:9px;font-family:var(--xh-mono);font-size:9.5px;background:rgba(11,27,51,0.85);color:#fff;padding:3px 7px;border-radius:5px;letter-spacing:0.04em}
.xh-prev-thumbs{display:flex;gap:5px;margin-bottom:12px}
.xh-prev-thumbs div{flex:1;aspect-ratio:1;border-radius:6px;background:linear-gradient(135deg,#e0eaff,#f1f6ff);font-size:14px;display:grid;place-items:center;overflow:hidden}
.xh-prev-thumbs div img{width:100%;height:100%;object-fit:cover}
.xh-prev-thumbs div.on{outline:2px solid var(--xh-accent);outline-offset:-2px}
.xh-prev .cat{font-family:var(--xh-mono);font-size:10px;letter-spacing:0.06em;color:#1668D6;margin-bottom:5px;text-transform:uppercase}
.xh-prev .title{font-family:var(--xh-display);font-weight:800;font-size:18px;line-height:1.2;letter-spacing:-0.01em;margin-bottom:8px;color:var(--xh-text);word-break:break-word}
.xh-prev .price{display:flex;align-items:baseline;gap:8px;margin-bottom:4px;flex-wrap:wrap}
.xh-prev .price .xrp{font-family:var(--xh-mono);font-weight:500;font-size:22px;color:#1668D6;line-height:1}
.xh-prev .price .usd{font-family:var(--xh-mono);font-size:11px;color:var(--xh-text2)}
.xh-prev .stock{font-size:11.5px;color:var(--xh-text2);margin-bottom:10px}
.xh-prev .stock .ok{color:#10b981;font-weight:600}
.xh-prev .buy{background:var(--xh-accent);color:#fff;border-radius:8px;padding:10px;text-align:center;font-weight:600;font-size:13px;margin-bottom:10px}
.xh-prev .mini{background:#0b1b33;color:#e2e8f0;border-radius:10px;padding:11px 12px;font-size:10.5px;margin-bottom:10px}
.xh-prev .mini .t{font-family:var(--xh-mono);font-size:9px;color:#93c5fd;letter-spacing:0.07em;margin-bottom:8px}
.xh-prev .mini .steps{display:flex;gap:4px;align-items:flex-start;color:#cbd5e1;font-size:9.5px;text-align:center;line-height:1.3}
.xh-prev .mini .steps .s{flex:1}
.xh-prev .mini .steps .s .ic{width:22px;height:22px;margin:0 auto 4px;border-radius:6px;background:#10264a;border:1px solid #2c4571;display:grid;place-items:center;font-size:11px}
.xh-prev .mini .steps .arrow{color:#60a5fa;font-size:11px;padding-top:5px}
.xh-prev .seller{background:var(--xh-surface);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;font-size:12px}
.xh-prev .seller .av{width:30px;height:30px;border-radius:50%;background:var(--xh-accent);color:#fff;display:grid;place-items:center;font-weight:700;font-size:12px;flex:none}
.xh-prev .seller .nm{font-weight:600;font-size:12.5px;color:var(--xh-text)}
.xh-prev .seller .st{font-size:10.5px;color:var(--xh-text2);margin-top:1px}
.xh-prev .empty{padding:40px 20px;text-align:center;color:var(--xh-text2);font-size:12.5px;font-family:var(--xh-mono)}
.xh-prev .foot{margin-top:14px;padding-top:12px;border-top:1px dashed var(--xh-border);font-family:var(--xh-mono);font-size:10px;color:var(--xh-text2);text-align:center;letter-spacing:0.04em;text-transform:uppercase}

@media (max-width:960px){
  .xh-grid{grid-template-columns:minmax(0,1fr);gap:22px;padding-bottom:40px}
  .xh-col,.xh-prev-col{min-width:0;max-width:100%}
  .xh-prev-col{position:static}
  .xh-row2{grid-template-columns:minmax(0,1fr)}
  .xh-cat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .xh-form-mast h1{font-size:22px}
}
@media (max-width:560px){
  .xh-media-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .xh-form-mast{padding:20px 16px 28px}
  .xh-card{padding:16px}
}
`;

const WAVE_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 24' preserveAspectRatio='none'><path d='M0 12 Q150 0 300 12 T600 12 T900 12 T1200 12 V24 H0Z' fill='%23fff'/></svg>";

export default function NewListingPage() {
  const router  = useRouter();
  const user    = useAuthStore(s => s.user);
  const fileRef = useRef(null);
  const archiveRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'graphics',
    game: '',
    platform: '',
    priceXrp: '',
    priceUsd: '',
    pricingMode: 'XRP', // 'XRP' | 'USD' | 'RLUSD'
    currency: 'XRP',
    images: [],
    isDigital: true,
    digitalContent: '',
    digitalLink: '',
    digitalArchiveUrl: '',
    digitalArchiveName: '',
    digitalArchiveSize: 0,
    digitalArchiveSha256: '',
    r2ObjectKey: '',
    quantity: '',
    deliveryTime: 'instant',
    tags: [],
    featured: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [uploading,setUploading]= useState(false);
  const [uploadingArchive, setUploadingArchive] = useState(false);
  const [error,    setError]    = useState('');
  const [xrpUsd,   setXrpUsd]   = useState(2.25);
  const [rlusdOk,  setRlusdOk]  = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => { api.listings.rlusdStatus().then(r => { if (r && typeof r.escrowable === 'boolean') setRlusdOk(r.escrowable); }).catch(() => {}); }, []);

  // Load imported listing draft from sessionStorage if present
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('xrph_imported_listing');
      if (raw) {
        sessionStorage.removeItem('xrph_imported_listing');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          applyImportedData(data);
        }
      }
    } catch {}
  }, []);

  // Inject fonts + CSS once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('xh-form-fonts')) {
      const link = document.createElement('link');
      link.id = 'xh-form-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);
    }
    let style = document.getElementById('xh-form-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'xh-form-css';
      document.head.appendChild(style);
    }
    style.textContent = ':root{--xh-display:"Bricolage Grotesque","Inter",system-ui,sans-serif;--xh-body:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--xh-mono:"JetBrains Mono",ui-monospace,monospace}\n' + CSS;
  }, []);

  // Live XRP/USD price
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

  function applyImportedData(data) {
    const liveRate = xrpUsd || 2.25;
    const hasUsdPrice = data.priceUsd !== null && data.priceUsd !== undefined && data.priceUsd !== '' && Number.isFinite(Number(data.priceUsd));
    const usdVal = hasUsdPrice ? Number(data.priceUsd) : null;
    const xrpVal = (data.priceXrp !== null && data.priceXrp !== undefined && data.priceXrp !== '' && Number(data.priceXrp) > 0)
      ? Number(data.priceXrp)
      : (usdVal && usdVal > 0 ? +(usdVal / liveRate).toFixed(2) : '');
    setForm(f => ({
      ...f,
      title: (data.title || f.title).slice(0, TITLE_MAX),
      description: (data.description || f.description).slice(0, DESC_MAX),
      category: data.category || f.category || 'graphics',
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 8) : f.tags,
      images: Array.isArray(data.images) ? data.images.map(u => sanitizeImageUrl(u)).filter(Boolean).slice(0, 6) : f.images,
      priceUsd: usdVal !== null && usdVal > 0 ? String(usdVal) : '',
      priceXrp: xrpVal ? String(xrpVal) : '',
      pricingMode: usdVal !== null && usdVal > 0 ? 'USD' : f.pricingMode,
    }));
  }

  async function handleImportListing(e) {
    if (e) e.preventDefault();
    if (!importUrl.trim()) { setImportError('Please paste a Gumroad or itch.io product URL'); return; }
    setImporting(true);
    setImportError('');
    try {
      const token = localStorage.getItem('xrpmarket_token');
      const r = await fetch('/api/import-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && !d.title) {
        throw new Error(d.error || 'Could not import from that URL');
      }
      applyImportedData(d);
      setShowImportModal(false);
      setImportUrl('');
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  if (!user) return (
    <div className="xh-form">
      <div className="xh-auth-gate">
        <div className="ic">🔒</div>
        <div className="t">Sign in required</div>
        <div className="s">Connect your Xaman wallet from the top right to list items on the harbor.</div>
      </div>
    </div>
  );

  const isPro = Boolean(user && ((user.proUntil && new Date(user.proUntil) > new Date()) || (user.pro_until && new Date(user.pro_until) > new Date()) || user.role === 'admin'));
  const maxImages = isPro ? 6 : 3;
  const maxActiveListingsLabel = isPro ? 'Unlimited' : '30';
  const liveRate = xrpUsd || 2.25;
  const priceNum = parseFloat(form.priceXrp);
  const sellerReceives = (priceNum > 0) ? priceNum.toFixed(2) : null;
  const usdPrice = (priceNum > 0)
    ? (form.pricingMode === 'USD' && form.priceUsd
        ? Number(form.priceUsd).toFixed(2)
        : form.currency === 'RLUSD'
          ? priceNum.toFixed(2)
          : (xrpUsd ? (priceNum * xrpUsd).toFixed(2) : null))
    : null;

  // Step progression (for the masthead step rail)
  const step1Done = !!(form.title.trim() && form.category && form.description.trim());
  const step2Done = form.images.length > 0;
  const step3Done = priceNum > 0;
  const step4Done = !!form.deliveryTime;
  const stepClass = (idx) => {
    const done = [step1Done, step2Done, step3Done, step4Done][idx-1];
    if (done) return 'done';
    const prevAllDone = [true, step1Done, step1Done && step2Done, step1Done && step2Done && step3Done][idx-1];
    return prevAllDone ? 'on' : '';
  };

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = maxImages - form.images.length;
    if (remaining <= 0) { setError(`You can upload up to ${maxImages} images${!isPro ? ' (Upgrade to Pro for up to 6 images)' : ''}`); return; }
    const toUpload = files.slice(0, remaining);
    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) { setError('Each image must be under 5MB'); continue; }
    }
    setUploading(true);
    setError('');
    try {
      for (const file of toUpload) {
        if (file.size > 5 * 1024 * 1024) continue;
        const url = await uploadToImgbb(file);
        setForm(f => ({ ...f, images: [...f.images, url] }));
      }
    } catch(err) {
      setError('Image upload failed. Try again or use fewer images.');
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function handleArchiveUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('Archive file must be under 50MB (or use External Download URL for larger files)');
      return;
    }
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
      const r = await fetch('/api/vault/upload', {
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
      if (!r.ok || !d.ok || !d.url) {
        throw new Error((d && d.error) || 'Archive upload failed — file could not be verified in R2 Vault');
      }
      const sha = d.sha256 || localSha || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      setForm(f => ({
        ...f,
        isDigital: true,
        digitalArchiveUrl: d.url,
        digitalArchiveName: d.filename || file.name,
        digitalArchiveSize: d.size || file.size,
        digitalArchiveSha256: sha,
        r2ObjectKey: d.r2ObjectKey || '',
      }));
    } catch (err) {
      setError(err.message || 'Archive upload failed');
    } finally {
      setUploadingArchive(false);
      if (archiveRef.current) archiveRef.current.value = '';
    }
  }

  function removeImage(idx) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  function addTag() {
    const v = tagInput.trim().toLowerCase();
    if (v && form.tags.length < 8 && !form.tags.includes(v)) {
      setForm(f => ({ ...f, tags: [...f.tags, v] }));
    }
    setTagInput('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.priceXrp || parseFloat(form.priceXrp) <= 0) return setError('Enter a valid price');
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        priceXrp: parseFloat(form.priceXrp),
        priceUsd: form.pricingMode === 'USD' && form.priceUsd ? parseFloat(form.priceUsd) : null,
        pricingMode: form.pricingMode,
      };
      const l = await api.listings.create(payload);
      router.push('/listing/' + l.id);
    } catch(err) { setError(err.message); setLoading(false); }
  }

  const isGameOrAccount = form.category === 'games' || form.category === 'accounts';
  const catKey = form.category || 'other';
  const previewCat = [CAT_LABEL_UPPER[catKey] || 'ITEM'];
  if (form.game) previewCat.push(form.game);
  if (form.platform) previewCat.push(form.platform);

  const avInitial = (user.username || user.id || '?').slice(0,1).toUpperCase();

  return (
    <div className="xh-form">
      <div className="xh-form-mast">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="crumb">HARBOR · <b>LIST A NEW ITEM</b></div>
            <h1><span className="icon">⛴</span>Cast off a new listing</h1>
            <p className="sub">Publish 3D models, shaders, UI kits, indie tools, audio, or game assets. Every purchase is protected by non-custodial XRPL escrow with 0% platform fees.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => { setShowImportModal(true); setImportError(''); }}
              style={{
                background: 'linear-gradient(135deg, #2080F5, #6366f1)',
                color: '#fff',
                border: '1px solid #60a5fa',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 6px 18px rgba(32,128,245,0.35)',
              }}
            >
              <span>⚡ Import from Gumroad / itch.io</span>
            </button>
            <span style={{ fontFamily: 'var(--xh-mono)', fontSize: 11, color: '#93c5fd' }}>
              Active plan limit: <b style={{ color: '#fff' }}>{maxActiveListingsLabel} active listings</b>
            </span>
          </div>
        </div>
        <div className="step-rail">
          <span className={'step ' + stepClass(1)}><span className="num">1</span>BASICS</span>
          <span className={'step ' + stepClass(2)}><span className="num">2</span>MEDIA</span>
          <span className={'step ' + stepClass(3)}><span className="num">3</span>PRICE &amp; STOCK</span>
          <span className={'step ' + stepClass(4)}><span className="num">4</span>DELIVERY</span>
          <span className="step"><span className="num">5</span>FEATURED BOOST</span>
        </div>
        <div className="wave" style={{ background: `url("${WAVE_SVG}") no-repeat`, backgroundSize: '100% 100%' }}></div>
      </div>

      {/* GUMROAD / ITCH.IO IMPORTER MODAL */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,27,51,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div style={{ background: 'var(--xh-surface, #fff)', border: '1px solid var(--xh-border)', borderRadius: 16, padding: '22px 18px', maxWidth: 'min(480px, calc(100vw - 24px))', width: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 24px 60px -12px rgba(10,22,40,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--xh-text)' }}>⚡ Import from Gumroad or itch.io</h3>
              <button type="button" onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--xh-text2)' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--xh-text2)', lineHeight: 1.5, marginTop: 0, marginBottom: 16 }}>
              Paste your existing Gumroad or itch.io product URL. We&apos;ll automatically extract the title, description, cover images, tags, and USD/XRP price.
            </p>
            <form onSubmit={handleImportListing}>
              <input
                type="url"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://username.gumroad.com/l/shader-pack or https://creator.itch.io/asset"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--xh-border)', background: 'var(--xh-surface2)', color: 'var(--xh-text)', fontSize: 13.5, boxSizing: 'border-box', marginBottom: 12 }}
              />
              {importError && <div style={{ fontSize: 12.5, color: '#ef4444', marginBottom: 10 }}>{importError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowImportModal(false)} className="xh-btn xh-btn-ghost" style={{ padding: '9px 16px', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={importing} className="xh-btn xh-btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
                  {importing ? 'Importing metadata…' : '⚡ Auto-Fill Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="xh-grid">
        {/* FORM COL */}
        <form className="xh-col" onSubmit={handleSubmit}>

          {/* 1. Basics */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">01 · BASICS</div><h2 className="sec-h">Tell the harbor what you&rsquo;re selling</h2></div>
              <div className="hint">required</div>
            </div>

            <div className="xh-field">
              <label>Category <span className="req">*</span></label>
              <div className="xh-cat-grid">
                {CATS.map(c => (
                  <button key={c.key} type="button" className={'xh-cat-btn' + (form.category === c.key ? ' on' : '')}
                    onClick={() => setForm(f => ({ ...f, category: c.key, game: '', platform: '' }))}>
                    <span className="emoji">{c.emoji}</span>
                    <span className="lbl">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="xh-field">
              <label>Title <span className="req">*</span></label>
              <input type="text" maxLength={TITLE_MAX} placeholder="e.g. Cyberpunk Modular Shader Pack v2 (Blender + Godot 4)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <div className={'count' + (form.title.length > TITLE_MAX ? ' over' : '')}>{form.title.length} / {TITLE_MAX}</div>
            </div>

            {isGameOrAccount ? (
              <div className="xh-row2">
                <div className="xh-field">
                  <label>{form.category === 'games' ? 'Game' : 'Account Type'}</label>
                  <select value={form.game} onChange={e => setForm(f => ({ ...f, game: e.target.value }))}>
                    <option value="">Select {form.category === 'games' ? 'game' : 'type'} (optional)…</option>
                    {(SUBCATS[form.category] || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="xh-field">
                  <label>Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                    <option value="">Select platform (optional)…</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="xh-row2">
                <div className="xh-field">
                  <label>Subcategory / Format <span className="opt">optional</span></label>
                  <select value={form.game} onChange={e => setForm(f => ({ ...f, game: e.target.value }))}>
                    <option value="">Select format / subcategory…</option>
                    {(SUBCATS[form.category] || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="xh-field">
                  <label>Compatible Engine / Tool <span className="opt">optional</span></label>
                  <input type="text" placeholder="e.g. Blender 4.2, Godot 4, Figma, Next.js" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="xh-field">
              <label>Description <span className="opt">recommended</span></label>
              <textarea rows={5} maxLength={DESC_MAX} placeholder="Include file formats (.BLEND, .GLB, .FIG, .ZIP), version compatibility, license terms, and what's included in the download." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className={'count' + (form.description.length > DESC_MAX ? ' over' : '')}>{form.description.length} / {DESC_MAX}</div>
            </div>
          </div>

          {/* 2. Media */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">02 · MEDIA</div><h2 className="sec-h">Up to {maxImages} images · first one is the cover</h2></div>
              <div className="hint">{form.images.length} of {maxImages}</div>
            </div>

            <div className="xh-media-grid">
              {form.images.map((url, i) => (
                <div key={i} className={'xh-tile filled' + (i === 0 ? ' cover' : '')}>
                  <img src={sanitizeImageUrl(url)} alt={'image ' + (i + 1)} />
                  {i === 0 && <span className="cover-tag">COVER</span>}
                  <button type="button" className="x" onClick={() => removeImage(i)} aria-label="Remove image">×</button>
                </div>
              ))}
              {form.images.length < maxImages && (
                <button type="button" className="xh-tile add" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading}>
                  <div className="col">
                    <span className="plus">{uploading ? '⏳' : '+'}</span>
                    <span className="lbl">{uploading ? 'UPLOADING' : 'ADD'}</span>
                  </div>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            <div className="xh-media-note">
              PNG · JPG · WEBP · max 5MB each · {isPro ? (
                <span style={{ color: '#b45309', fontWeight: 600 }}>★ Pro active: up to 6 images &amp; Unlimited active listings</span>
              ) : (
                <span>Standard plan: up to 3 images &amp; 30 active listings · <Link href="/pro" style={{ color: 'var(--xh-accent)', fontWeight: 600 }}>Upgrade to ★ Pro for 6 images &amp; Unlimited listings →</Link></span>
              )}
            </div>
          </div>

          {/* 3. Price & stock */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">03 · PRICE &amp; STOCK</div><h2 className="sec-h">Choose XRP, USD-Pegged, or RLUSD pricing</h2></div>
              <div className="hint">XRP {xrpUsd ? '$' + xrpUsd.toFixed(4) : '…'}</div>
            </div>

            <div className="xh-field">
              <label>Pricing &amp; Settlement Mode</label>
              <div className="xh-chips">
                {[
                  { k: 'XRP', l: '💎 Standard XRP' },
                  { k: 'USD', l: '💵 USD-Pegged (Auto-XRP)' },
                  ...(rlusdOk ? [{ k: 'RLUSD', l: '🪙 Native RLUSD Stablecoin' }] : []),
                ].map(pm => (
                  <button
                    key={pm.k}
                    type="button"
                    className={'xh-chip' + (form.pricingMode === pm.k ? ' on' : '')}
                    onClick={() => {
                      if (pm.k === 'USD') {
                        const usd = form.priceUsd || (priceNum > 0 ? (priceNum * liveRate).toFixed(2) : '49.00');
                        const calcXrp = (parseFloat(usd || '0') / liveRate).toFixed(2);
                        setForm(f => ({ ...f, pricingMode: 'USD', currency: 'XRP', priceUsd: usd, priceXrp: calcXrp }));
                      } else if (pm.k === 'RLUSD') {
                        setForm(f => ({ ...f, pricingMode: 'RLUSD', currency: 'RLUSD' }));
                      } else {
                        setForm(f => ({ ...f, pricingMode: 'XRP', currency: 'XRP' }));
                      }
                    }}
                  >
                    {pm.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="xh-row2">
              <div className="xh-field">
                {form.pricingMode === 'USD' ? (
                  <>
                    <label>USD Target Price <span className="req">*</span> <span className="opt">auto-converts to XRP</span></label>
                    <div className="xh-price">
                      <input
                        type="number"
                        step="0.01"
                        min="0.50"
                        placeholder="49.00"
                        value={form.priceUsd}
                        onChange={e => {
                          const usd = e.target.value;
                          const calcXrp = usd && parseFloat(usd) > 0 ? (parseFloat(usd) / liveRate).toFixed(2) : '';
                          setForm(f => ({ ...f, priceUsd: usd, priceXrp: calcXrp }));
                        }}
                      />
                      <span className="suffix">USD</span>
                    </div>
                    <div className="xh-usd-live">
                      <span className="lvdot"></span>Live checkout price: <b>{form.priceXrp || '0.00'} XRP</b> (@ ${liveRate.toFixed(4)}/XRP)
                    </div>
                  </>
                ) : (
                  <>
                    <label>Price ({form.currency}) <span className="req">*</span></label>
                    <div className="xh-price">
                      <input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.priceXrp} onChange={e => setForm(f => ({ ...f, priceXrp: e.target.value }))} />
                      <span className="suffix">{form.currency}</span>
                    </div>
                    {usdPrice && <div className="xh-usd-live"><span className="lvdot"></span>≈ ${usdPrice} USD · live · refreshes every 15s</div>}
                  </>
                )}
                {sellerReceives && <div className="xh-fee">You&rsquo;ll receive <b>{sellerReceives} {form.currency}</b> (100% · 0% platform fee)</div>}
              </div>
              <div className="xh-field">
                <label>Quantity <span className="opt">stock</span></label>
                <input type="number" step="1" min="1" placeholder="Unlimited / Digital copies" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                <div className="helper">Leave blank for unlimited digital copies, or set a number for limited-edition drops.</div>
              </div>
            </div>
          </div>

          {/* 4. Unified Delivery & Encrypted Digital File Vault */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">04 · DELIVERY &amp; DIGITAL VAULT</div><h2 className="sec-h">How buyers receive your asset</h2></div>
            </div>

            <div className="xh-field">
              <label>Delivery method &amp; speed</label>
              <div className="xh-chips">
                {DELIVERY_OPTS.map(d => (
                  <button key={d.v} type="button"
                    className={'xh-chip' + (form.deliveryTime === d.v ? ' on' : '')}
                    onClick={() => setForm(f => ({
                      ...f,
                      deliveryTime: d.v,
                      isDigital: d.v === 'instant' ? true : f.isDigital,
                    }))}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            {form.deliveryTime === 'instant' && (
              <div className="xh-digital-extra">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--xh-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🔐 Encrypted Digital File Vault</span>
                      <span style={{ fontFamily: 'var(--xh-mono)', fontSize: 10, background: '#10b981', color: '#fff', padding: '2px 7px', borderRadius: 4 }}>SHA-256 VERIFIED</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--xh-text2)', marginTop: 2 }}>
                      Files and keys are encrypted at rest and unlocked only after on-chain XRPL EscrowCreate verification.
                    </div>
                  </div>
                </div>

                {/* Encrypted Archive File Upload */}
                <div className="xh-field" style={{ marginBottom: 4 }}>
                  <label>Encrypted Archive / File Upload <span className="opt">.ZIP, .PDF, .GLB, .BLEND, .WAV</span></label>
                  <input
                    ref={archiveRef}
                    type="file"
                    accept=".zip,.pdf,.glb,.gltf,.blend,.wav,.mp3,.fbx,.obj,.unitypackage,.rar,.7z"
                    style={{ display: 'none' }}
                    onChange={handleArchiveUpload}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => archiveRef.current && archiveRef.current.click()}
                      disabled={uploadingArchive}
                      className="xh-btn xh-btn-ghost"
                      style={{ padding: '9px 16px', fontSize: 13 }}
                    >
                      {uploadingArchive ? '⏳ Encrypting & Hashing…' : '📦 Upload Asset Archive (.ZIP / .PDF / .BLEND / .GLB)'}
                    </button>
                    {form.digitalArchiveName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: 'var(--xh-text)' }}>{form.digitalArchiveName}</span>
                        {form.digitalArchiveSize > 0 && (
                          <span style={{ color: 'var(--xh-text2)', fontFamily: 'var(--xh-mono)', fontSize: 11 }}>
                            ({(form.digitalArchiveSize / 1024).toFixed(1)} KB)
                          </span>
                        )}
                        <span style={{ color: '#059669', fontFamily: 'var(--xh-mono)', fontSize: 10.5, fontWeight: 700 }}>
                          ✓ SHA-256 Verified ({form.digitalArchiveSha256.slice(0, 10)}…)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="xh-field">
                  <label>License Key / Serial Vault <span className="opt">optional · encrypted at rest</span></label>
                  <textarea rows={2} placeholder="e.g. License key, activation serial, or private download instructions…" value={form.digitalContent} onChange={e => setForm(f => ({ ...f, digitalContent: e.target.value }))} />
                </div>

                <div className="xh-field">
                  <label>External Download / Release URL <span className="opt">optional</span></label>
                  <input type="url" placeholder="https://github.com/.../releases or https://drive.google.com/..." value={form.digitalLink} onChange={e => setForm(f => ({ ...f, digitalLink: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="xh-field" style={{ marginTop: 14 }}>
              <label>Tags <span className="opt">up to 8 · helps buyers find you</span></label>
              <div className="xh-taginput">
                {form.tags.map((t, i) => (
                  <span key={i} className="xh-tag">#{t}<button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))} aria-label="Remove tag">×</button></span>
                ))}
                <input type="text" placeholder={form.tags.length === 0 ? 'e.g. blender, shader, godot, figma — press Enter' : 'add another…'} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
              </div>
            </div>
          </div>

          {/* 5. Featured Boost */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">05 · FEATURED BOOST</div><h2 className="sec-h">Spotlight placement on the harbor</h2></div>
            </div>

            <div className="xh-toggle-row">
              <div className="info">
                <div className="t">🔥 Feature this listing on Homepage &amp; Search <span className="badge">OPTIONAL</span></div>
                <div className="s">
                  {isPro
                    ? 'Pro Members get 1 FREE 7-day Featured Listing Boost every month (activate right after publishing).'
                    : 'Pin your listing to "Today\'s catch" on the homepage and top of search results (10 XRP for 7 days, or 1 Free/mo with Pro).'}
                </div>
              </div>
              <label className="xh-toggle"><input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} /><span className="track"></span></label>
            </div>
          </div>

          {error && <div className="xh-err">{error}</div>}

          {/* sticky action bar */}
          <div className="xh-action-bar">
            <div className="left">DRAFT · <span className="ok">{form.title.trim() ? 'ready to publish' : 'fill in the basics first'}</span></div>
            <div className="btn-group">
              <Link href="/listings" className="xh-btn xh-btn-ghost">Cancel</Link>
              <button type="submit" className="xh-btn xh-btn-primary" disabled={loading || uploading || uploadingArchive}>
                {loading ? 'Publishing…' : uploadingArchive ? 'Uploading Vault Archive…' : '⛵ Publish to harbor'}
              </button>
            </div>
          </div>
        </form>

        {/* PREVIEW COL */}
        <div className="xh-prev-col">
          <div className="xh-prev">
            <div className="head">
              <span>LIVE PREVIEW</span>
              <span className="live">UPDATING</span>
            </div>

            {form.images.length === 0 && !form.title.trim() ? (
              <div className="empty">
                <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>🖼</div>
                Fill in the basics on the left to see your listing come to life
              </div>
            ) : (
              <>
                <div className="xh-prev-img" style={{ background: CAT_BG[catKey] || CAT_BG.other }}>
                  {form.images[0]
                    ? <img src={sanitizeImageUrl(form.images[0])} alt="cover" />
                    : <span style={{ opacity: 0.6 }}>🖼</span>}
                  <span className="badge">{previewCat.slice(0,2).join(' · ')}</span>
                </div>

                {form.images.length > 1 && (
                  <div className="xh-prev-thumbs">
                    {form.images.slice(0, 6).map((u, i) => (
                      <div key={i} className={i === 0 ? 'on' : ''}><img src={sanitizeImageUrl(u)} alt={'thumb ' + (i + 1)} /></div>
                    ))}
                  </div>
                )}

                <div className="cat">{previewCat.join(' / ')}</div>
                <div className="title">{form.title || 'Your listing title shows here'}</div>
                <div className="price">
                  <span className="xrp">{priceNum > 0 ? Number(form.priceXrp).toLocaleString('en-US') : '0'} {form.currency}</span>
                  {usdPrice && <span className="usd">≈ ${usdPrice}{form.pricingMode === 'USD' ? ' (USD-Pegged)' : ''}</span>}
                </div>
                <div className="stock"><span className="ok">● In stock</span>{form.quantity ? ` · ${form.quantity} available` : ' · Instant digital access'}</div>

                <div className="buy">🛡 Buy with escrow</div>

                <div className="mini">
                  <div className="t">WHERE BUYER&rsquo;S XRP GOES</div>
                  <div className="steps">
                    <div className="s"><div className="ic">🔒</div>Locked at<br />purchase</div>
                    <div className="arrow">→</div>
                    <div className="s"><div className="ic">📦</div>Vault<br />delivers</div>
                    <div className="arrow">→</div>
                    <div className="s"><div className="ic">✓</div>Escrow<br />releases</div>
                  </div>
                </div>

                <div className="seller">
                  <span className="av">{avInitial}</span>
                  <div>
                    <div className="nm">{user.username || 'you'}</div>
                    <div className="st">✨ New creator · escrow-protected</div>
                  </div>
                </div>
              </>
            )}

            <div className="foot">SHOWS LIVE ON xrpharbor.com/listing/&lt;id&gt;</div>
          </div>
        </div>
      </div>
    </div>
  );
}
