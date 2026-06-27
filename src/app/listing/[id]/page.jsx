'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import XummLoginModal from '../../../components/XummLoginModal';

const CAT_BG = {
  games:    'linear-gradient(135deg,#dbeafe,#eff6ff)',
  graphics: 'linear-gradient(135deg,#ede9fe,#faf5ff)',
  software: 'linear-gradient(135deg,#ccfbf1,#f0fdfa)',
  accounts: 'linear-gradient(135deg,#f1f5f9,#f8fafc)',
  other:    'linear-gradient(135deg,#fef3c7,#fffbeb)',
};
const CAT_LABEL = { games:'GAMES', graphics:'GRAPHICS', software:'SOFTWARE', accounts:'ACCOUNTS', other:'OTHER' };
const CAT_EMOJI = { games:'🎮', graphics:'🎨', software:'💻', accounts:'👤', other:'📦' };
const DELIVERY_LABEL = { instant:'Instant', '1h':'Under 1 hour', '24h':'Within 24 hours', '1-3d':'1–3 days' };

const CSS = `
.xh-prod{font-family:var(--xh-body);color:var(--xh-text)}
.xh-prod h1{font-family:var(--xh-display);font-weight:800;font-size:30px;letter-spacing:-0.02em;line-height:1.15;margin:0 0 14px;color:var(--xh-text)}
.xh-prod .sec-h{font-family:var(--xh-display);font-weight:700;font-size:22px;letter-spacing:-0.02em;margin-bottom:16px;color:var(--xh-text)}
.xh-prod .mono{font-family:var(--xh-mono)}

.xh-prod .pcrumb{font-family:var(--xh-mono);font-size:12px;color:var(--xh-text2);padding:6px 0 0;letter-spacing:0.02em;text-transform:uppercase}
.xh-prod .pcrumb b{color:#1668D6;font-weight:500}

.xh-prod-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:42px;padding:22px 0 50px}

.xh-main-img{aspect-ratio:4/3;border-radius:18px;background:linear-gradient(135deg,#dbeafe,#eff6ff);display:grid;place-items:center;font-size:84px;position:relative;border:1px solid var(--xh-border);overflow:hidden}
.xh-main-img img{width:100%;height:100%;object-fit:cover}
.xh-main-img .badge{position:absolute;top:14px;left:14px;font-family:var(--xh-mono);font-size:11px;background:rgba(11,27,51,0.85);color:#fff;padding:5px 11px;border-radius:7px;letterSpacing:0.04em}
.xh-main-img .share{position:absolute;top:14px;right:14px;display:flex;gap:8px;z-index:2}
.xh-main-img .share button{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.94);display:grid;place-items:center;font-size:16px;cursor:pointer;border:1px solid var(--xh-border);color:var(--xh-text);padding:0}
.xh-main-img .share button:hover{border-color:var(--xh-accent);color:#1668D6}
.xh-main-img .share button.on{color:#ef4444;border-color:#fecaca;background:#fff}
.xh-main-img .sold-overlay{position:absolute;inset:0;background:rgba(11,27,51,0.55);display:grid;place-items:center}
.xh-main-img .sold-overlay span{font-family:var(--xh-mono);background:#ef4444;color:#fff;border-radius:8px;padding:8px 16px;font-size:14px;font-weight:500;letter-spacing:0.06em}

.xh-thumbs{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:12px}
.xh-thumbs button{aspect-ratio:1;border-radius:10px;background:linear-gradient(135deg,#e0eaff,#f1f6ff);display:grid;place-items:center;font-size:22px;border:2px solid transparent;cursor:pointer;overflow:hidden;padding:0;color:var(--xh-text)}
.xh-thumbs button.on{border-color:var(--xh-accent)}
.xh-thumbs button:hover{border-color:#bcd2f7}
.xh-thumbs button img{width:100%;height:100%;object-fit:cover}

.xh-prod .cat-line{font-family:var(--xh-mono);font-size:11.5px;letter-spacing:0.06em;color:#1668D6;margin-bottom:10px;text-transform:uppercase}
.xh-prod .meta-row{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--xh-text2);margin-bottom:20px}
.xh-prod .meta-row span b{color:var(--xh-text);font-weight:600}

.xh-buy-card{border:1px solid var(--xh-border);border-radius:16px;padding:22px;background:#fff;box-shadow:0 12px 30px -18px rgba(20,22,26,0.15)}

.xh-price-box{display:flex;align-items:baseline;gap:12px;margin-bottom:6px;flex-wrap:wrap}
.xh-price-box .xrp{font-family:var(--xh-mono);font-weight:500;font-size:34px;color:#1668D6;line-height:1}
.xh-price-box .xrp.sold{color:var(--xh-text3);text-decoration:line-through}
.xh-price-box .usd{font-family:var(--xh-mono);font-size:14px;color:var(--xh-text2)}
.xh-price-live{font-family:var(--xh-mono);font-size:11px;color:#10b981;margin-bottom:20px;display:flex;align-items:center;gap:6px}
.xh-price-live .lvdot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:xhPulse 2s infinite}
@keyframes xhPulse{0%,100%{opacity:1}50%{opacity:0.5}}

.xh-stock{font-size:13px;color:var(--xh-text2);display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.xh-stock i{font-style:normal;color:#10b981;font-weight:600}
.xh-stock i.out{color:#ef4444}

.xh-buy-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.xh-buy-btns.single{grid-template-columns:1fr}
.xh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:14.5px;padding:12px 18px;border-radius:10px;border:1px solid transparent;cursor:pointer;transition:all 0.15s;font-family:inherit}
.xh-btn:disabled{cursor:not-allowed;opacity:0.6}
.xh-btn-primary{background:var(--xh-accent);color:#fff;box-shadow:0 6px 18px rgba(59,130,246,0.28)}
.xh-btn-primary:hover:not(:disabled){background:#1668D6;transform:translateY(-1px);box-shadow:0 10px 24px rgba(59,130,246,0.35)}
.xh-btn-ghost{background:#fff;border-color:var(--xh-border);color:var(--xh-text)}
.xh-btn-ghost:hover:not(:disabled){border-color:var(--xh-accent);color:#1668D6}

.xh-mini-line{background:#0b1b33;border-radius:12px;padding:16px;color:#cfe0ff;margin-bottom:16px}
.xh-mini-line .t{font-family:var(--xh-mono);font-size:10.5px;letter-spacing:0.08em;color:var(--xh-text3);margin-bottom:14px}
.xh-mini-steps{display:flex;align-items:flex-start;gap:6px}
.xh-ms{flex:1;text-align:center;font-size:11px;color:#aebfdd;line-height:1.35}
.xh-ms .ic{width:32px;height:32px;margin:0 auto 6px;border-radius:9px;background:#10264a;border:1px solid #2c4571;display:grid;place-items:center;transition:all 0.25s}
.xh-ms .ic svg{width:15px;height:15px;stroke:#7eb0ff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.xh-ms.done .ic{background:rgba(16,185,129,0.18);border-color:rgba(16,185,129,0.5)}
.xh-ms.done .ic svg{stroke:#34d399}
.xh-ms.now .ic{background:rgba(59,130,246,0.18);border-color:rgba(59,130,246,0.5)}
.xh-ms.now .ic svg{stroke:#9cc0ff}
.xh-ms-arrow{color:#33507e;font-size:13px;flex:none;padding-top:8px}
.xh-mini-foot{font-family:var(--xh-mono);font-size:10.5px;color:var(--xh-text3);border-top:1px solid #21385f;margin:14px -16px 0;padding:10px 16px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px}
.xh-mini-foot .ok{color:#10b981}

.xh-seller-card{display:flex;align-items:center;gap:14px;border:1px solid var(--xh-border);border-radius:12px;padding:14px 16px;margin-bottom:16px;background:var(--xh-surface2)}
.xh-seller-card .av{width:44px;height:44px;border-radius:50%;background:var(--xh-accent);color:#fff;display:grid;place-items:center;font-weight:700;font-size:17px;flex:none}
.xh-seller-card .info{flex:1;min-width:0}
.xh-seller-card .nm{font-weight:600;font-size:14.5px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.xh-seller-card .nm .ver{font-size:10px;font-weight:600;color:#1668D6;background:rgba(59,130,246,0.1);padding:2px 7px;border-radius:5px;font-family:var(--xh-mono)}
.xh-seller-card .nm .verif{color:#10b981;font-size:13px}
.xh-seller-card .st{font-size:12px;color:var(--xh-text2);margin-top:2px}
.xh-seller-card .st .star{color:#f59e0b}
.xh-seller-card .actions{display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex:none}
.xh-seller-card .actions a,.xh-seller-card .actions button{font-size:13px;font-weight:600;color:var(--xh-accent);text-decoration:none;white-space:nowrap;background:none;border:none;cursor:pointer;padding:0;font-family:inherit}
.xh-seller-card .actions a:hover,.xh-seller-card .actions button:hover{color:#1668D6}

.xh-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.xh-tags span{font-family:var(--xh-mono);font-size:11.5px;color:var(--xh-text2);border:1px solid var(--xh-border);border-radius:999px;padding:5px 12px;background:#fff}

.xh-buy-error{margin-top:12px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#b91c1c;font-size:13px}

.xh-order-pane{background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:12px;padding:18px;text-align:center;margin-bottom:16px}
.xh-order-pane .t{color:var(--xh-text);font-weight:600;margin-bottom:8px;font-size:14px}
.xh-order-pane .s{color:var(--xh-text2);font-size:13px;margin-bottom:14px;line-height:1.5}
.xh-order-pane a{display:block;padding:12px;border-radius:10px;background:var(--xh-accent);color:#fff;text-decoration:none;font-weight:600;font-size:14px}
.xh-order-pane a:hover{background:#1668D6}

.xh-prod section{padding:36px 0}
.xh-desc{max-width:760px;color:#374151;font-size:15px;line-height:1.65;white-space:pre-wrap}
.xh-desc p{margin-bottom:14px}
.xh-spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:760px;margin-top:8px}
.xh-spec{background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:10px;padding:13px 15px}
.xh-spec b{font-family:var(--xh-mono);font-size:10.5px;letter-spacing:0.07em;color:var(--xh-text2);display:block;margin-bottom:4px;font-weight:500;text-transform:uppercase}
.xh-spec span{font-size:14px;font-weight:600;color:var(--xh-text)}

.xh-similar-section{background:var(--xh-surface2);border-top:1px solid var(--xh-border);margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px}
.xh-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.xh-mini-card{border:1px solid var(--xh-border);border-radius:14px;overflow:hidden;background:#fff;transition:all 0.18s;display:block;text-decoration:none;color:inherit}
.xh-mini-card:hover{transform:translateY(-3px);box-shadow:0 16px 32px -14px rgba(20,22,26,0.18)}
.xh-mini-card .th{aspect-ratio:4/3;background:linear-gradient(135deg,#dbeafe,#eff6ff);display:grid;place-items:center;font-size:30px;overflow:hidden}
.xh-mini-card .th img{width:100%;height:100%;object-fit:cover}
.xh-mini-card .cb{padding:12px 14px}
.xh-mini-card .cb .t{font-weight:600;font-size:13.5px;margin-bottom:7px;color:var(--xh-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xh-mini-card .cb .row{display:flex;justify-content:space-between;align-items:center;gap:6px}
.xh-mini-card .pr{font-family:var(--xh-mono);font-size:13px;font-weight:500;color:#1668D6}
.xh-mini-card .esc{font-size:10.5px;font-weight:600;color:#10b981;background:rgba(16,185,129,0.1);padding:2px 7px;border-radius:5px;white-space:nowrap}

.xh-modal-bg{position:fixed;inset:0;background:rgba(11,27,51,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.xh-modal{background:#fff;border:1px solid var(--xh-border);border-radius:14px;padding:24px;width:420px;max-width:100%;box-shadow:0 20px 50px -10px rgba(20,22,26,0.4)}
.xh-modal h3{font-family:var(--xh-display);margin:0 0 4px;color:var(--xh-text);font-size:18px;font-weight:700}
.xh-modal p.sub{margin:0 0 16px;color:var(--xh-text2);font-size:13px}
.xh-modal label{font-size:12px;color:var(--xh-text2);display:block;margin-bottom:4px;font-family:var(--xh-mono);letter-spacing:0.04em;text-transform:uppercase}
.xh-modal input,.xh-modal textarea{width:100%;background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:8px;padding:10px 12px;color:var(--xh-text);font-size:14px;box-sizing:border-box;font-family:inherit;resize:vertical}
.xh-modal input:focus,.xh-modal textarea:focus{outline:2px solid var(--xh-accent);background:#fff}
.xh-modal .row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.xh-modal .ok-msg{text-align:center;padding:20px 0;color:#10b981;font-weight:600}
.xh-modal .xumm-block{text-align:center}
.xh-modal .xumm-block img{width:200px;height:200px;border-radius:8px;margin-bottom:12px}
.xh-modal .xumm-block a{background:var(--xh-accent);color:#fff;text-decoration:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;display:inline-block;margin-top:4px}

@media (max-width:920px){
  .xh-prod-grid{grid-template-columns:1fr;gap:28px;padding:18px 0 40px}
  .xh-grid4{grid-template-columns:repeat(2,1fr)}
  .xh-spec-grid{grid-template-columns:repeat(2,1fr)}
  .xh-prod h1{font-size:24px}
  .xh-price-box .xrp{font-size:28px}
}
@media (max-width:560px){
  .xh-grid4{grid-template-columns:1fr}
  .xh-buy-btns{grid-template-columns:1fr}
  .xh-thumbs{grid-template-columns:repeat(4,1fr)}
  .xh-seller-card{flex-wrap:wrap}
  .xh-seller-card .actions{flex-direction:row;align-items:flex-start;width:100%;justify-content:flex-end}
}
`;

function StepLock()    { return <svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>; }
function StepDeliver() { return <svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5m0 0 9-5m-9 5v8"/></svg>; }
function StepCheck()   { return <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>; }

export default function ListingDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [showLogin, setShowLogin] = useState(false);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [buying, setBuying] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [offerSent, setOfferSent] = useState(false);
  const [offerSending, setOfferSending] = useState(false);
  const [offerXumm, setOfferXumm] = useState(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [escrowStep, setEscrowStep] = useState(0);
  const [buyError, setBuyError] = useState('');
  const [xrpUsd, setXrpUsd] = useState(null);

  // Inject fonts + CSS once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('xh-prod-fonts')) {
      const link = document.createElement('link');
      link.id = 'xh-prod-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);
    }
    if (!document.getElementById('xh-prod-css')) {
      const style = document.createElement('style');
      style.id = 'xh-prod-css';
      style.textContent = ':root{--xh-display:"Bricolage Grotesque","Inter",system-ui,sans-serif;--xh-body:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--xh-mono:"JetBrains Mono",ui-monospace,monospace}\n' + CSS;
      document.head.appendChild(style);
    }
  }, []);

  // Fetch listing + similar
  useEffect(() => {
    api.listings.view(id).catch(() => {});
    api.listings.get(id).then(l => {
      setListing(l);
      if (l && l.category) {
        api.listings.list({ category: l.category, limit: 6 })
          .then(items => setSimilar((Array.isArray(items) ? items : []).filter(x => x.id !== l.id && x.status === 'active').slice(0, 4)))
          .catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  // Existing order detection
  useEffect(() => {
    if (!user) return;
    api.orders.mine('buyer').then(orders => {
      const priority = { completed: 4, delivered: 3, escrow_locked: 2, in_escrow: 2, pending: 1 };
      const existing = (orders || []).filter(o => o.listing_id === id && o.status !== 'cancelled' && o.status !== 'disputed').sort((a, b) => (priority[b.status] || 0) - (priority[a.status] || 0))[0];
      if (existing) {
        setOrder(existing);
        const st = existing.status;
        if (st === 'pending') setEscrowStep(1);
        else if (st === 'escrow_locked' || st === 'in_escrow') setEscrowStep(2);
        else if (st === 'delivered') setEscrowStep(3);
        else if (st === 'completed') setEscrowStep(4);
      }
    }).catch(() => {});
  }, [id, user]);

  // Live XRP/USD price (refresh every 15s)
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

  // Initial favorite state
  useEffect(() => {
    if (!user || !listing) return;
    api.favorites.ids().then(ids => setIsFav(new Set(ids).has(listing.id))).catch(() => {});
  }, [user, listing]);

  const toggleFav = async () => {
    if (!user) { setShowLogin(true); return; }
    const n = !isFav;
    setIsFav(n);
    if (n) await api.favorites.add(listing.id).catch(() => setIsFav(false));
    else   await api.favorites.remove(listing.id).catch(() => setIsFav(true));
  };

  const handleOffer = async () => {
    if (!user || !listing || !offerAmount) return;
    setOfferSending(true);
    try {
      const res = await api.offers.send(listing.id, parseFloat(offerAmount), offerMsg.trim() || undefined);
      if (res.xumm) { setOfferXumm(res.xumm); setOfferSent(true); }
      else { setOfferSent(true); setTimeout(() => { setOfferSent(false); setShowOfferModal(false); }, 2000); }
    } catch (e) { alert(e.message || 'Failed'); }
    finally { setOfferSending(false); }
  };

  const handleMessage = async () => {
    if (!user || !listing || !msgInput.trim()) return;
    setMsgSending(true);
    try {
      await api.contact.send(listing.id, msgInput.trim());
      setMsgSent(true); setMsgInput('');
      setTimeout(() => { setMsgSent(false); setShowMsgModal(false); }, 2000);
    } catch (e) { alert(e.message || 'Failed'); }
    finally { setMsgSending(false); }
  };

  async function handleBuy() {
    if (!user) { setShowLogin(true); return; }
    setBuying(true); setBuyError('');
    try {
      const o = await api.orders.create(id);
      router.push('/orders?pay=' + o.id);
    } catch (e) { setBuyError(e.message); setBuying(false); }
  }

  async function handleReport() {
    const reasons = ['scam', 'prohibited_item', 'misleading', 'duplicate', 'impersonation', 'other'];
    const reason = prompt('Why are you reporting this listing?\n\nOptions: ' + reasons.join(', '), 'scam');
    if (!reason || !reasons.includes(reason.trim().toLowerCase())) { if (reason !== null) alert('Please pick one of: ' + reasons.join(', ')); return; }
    const details = prompt('Add more details (optional, max 2000 chars):', '') || '';
    try {
      await api.reports.create({ target_type: 'listing', target_id: listing.id, reason: reason.trim().toLowerCase(), details });
      alert('Thanks — your report has been submitted. Admins will review it.');
    } catch (e) { alert(e.message || 'Could not submit report.'); }
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    }
  };

  if (loading) return (
    <div className="xh-prod" style={{ padding: 40, color: 'var(--xh-text2)', textAlign: 'center', fontFamily: '"Inter",system-ui,sans-serif' }}>Loading…</div>
  );
  if (!listing) return (
    <div className="xh-prod" style={{ padding: 40, color: 'var(--xh-text2)', textAlign: 'center', fontFamily: '"Inter",system-ui,sans-serif' }}>Listing not found</div>
  );

  const isSeller = user?.id === listing.seller_id;
  const catKey = listing.category || 'other';
  const isSold = listing.status === 'sold';
  const stockLeft = (listing.quantity != null && listing.quantity_sold != null) ? Math.max(0, listing.quantity - listing.quantity_sold) : null;
  const soldOut = isSold || stockLeft === 0;

  const usdPrice = (listing.currency === 'RLUSD') ? Number(listing.price_xrp).toFixed(2) : (xrpUsd ? (Number(listing.price_xrp) * xrpUsd).toFixed(2) : null);
  const avInitial = (listing.username || '?').slice(0, 1).toUpperCase();

  const crumbBits = [];
  crumbBits.push(CAT_LABEL[catKey] || 'ITEMS');
  if (listing.game) crumbBits.push(listing.game.toUpperCase());

  const catLineBits = [];
  catLineBits.push(CAT_LABEL[catKey] || 'ITEM');
  if (listing.game)     catLineBits.push(listing.game);
  if (listing.platform) catLineBits.push(listing.platform);

  // Step states for mini-waterline
  const stepClass = (idx) => {
    // step 1..3 ; escrowStep 0=none, 1=pending, 2=locked, 3=delivered, 4=completed
    if (escrowStep === 0) return '';
    if (idx === 1) return escrowStep >= 2 ? 'done' : (escrowStep === 1 ? 'now' : '');
    if (idx === 2) return escrowStep >= 3 ? 'done' : (escrowStep === 2 ? 'now' : '');
    if (idx === 3) return escrowStep >= 4 ? 'done' : (escrowStep === 3 ? 'now' : '');
    return '';
  };

  return (
    <div className="xh-prod">
      <div className="pcrumb">
        HARBOR · {crumbBits.map((b, i) => <span key={i}>{i > 0 && ' · '}{i === crumbBits.length - 1 ? <b>{b} · {(listing.title || '').toUpperCase()}</b> : b}</span>)}
      </div>

      <div className="xh-prod-grid">
        {/* Gallery */}
        <div>
          <div className="xh-main-img" style={{ background: CAT_BG[catKey] || CAT_BG.other }}>
            {listing.images && listing.images.length
              ? <img src={listing.images[activeImg] || listing.images[0]} alt={listing.title} />
              : <span style={{ fontSize: 84, opacity: 0.6 }}>{CAT_EMOJI[catKey] || '📦'}</span>}
            <span className="badge">{CAT_LABEL[catKey] || 'ITEM'}{listing.game ? ' · ' + listing.game.toUpperCase() : ''}</span>
            <div className="share">
              <button onClick={toggleFav} className={isFav ? 'on' : ''} title={isFav ? 'Saved' : 'Save'} aria-label="Toggle favorite">{isFav ? '♥' : '♡'}</button>
              <button onClick={handleShare} title="Copy link" aria-label="Share">{shareCopied ? '✓' : '⤴'}</button>
            </div>
            {soldOut && <div className="sold-overlay"><span>SOLD OUT</span></div>}
          </div>
          {listing.images && listing.images.length > 1 && (
            <div className="xh-thumbs">
              {listing.images.slice(0, 6).map((u, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={i === activeImg ? 'on' : ''} aria-label={'View image ' + (i + 1)}>
                  <img src={u} alt={'thumb ' + (i + 1)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy panel */}
        <div>
          <div className="cat-line">{catLineBits.join(' / ')}</div>
          <h1>{listing.title}</h1>
          <div className="meta-row">
            <span>👁 <b>{listing.views || 0}</b> views</span>
            {listing.delivery_time && <span>🚚 delivery <b>{DELIVERY_LABEL[listing.delivery_time] || listing.delivery_time}</b></span>}
            {listing.is_digital && <span>⚡ <b>Instant delivery</b></span>}
          </div>

          <div className="xh-buy-card">
            <div className="xh-price-box">
              <span className={'xrp' + (soldOut ? ' sold' : '')}>{Number(listing.price_xrp).toLocaleString('en-US')} {listing.currency || 'XRP'}</span>
              {usdPrice && <span className="usd">≈ ${usdPrice}</span>}
            </div>
            <div className="xh-price-live"><span className="lvdot"></span>LIVE · XRP {xrpUsd ? '$' + xrpUsd.toFixed(4) : '…'} · refreshes every 15s</div>

            <div className="xh-stock">
              {soldOut
                ? <><i className="out">● Sold out</i></>
                : <><i>● In stock</i>{stockLeft != null ? <span>· {stockLeft} of {listing.quantity} available</span> : null}</>}
            </div>

            {isSeller ? (
              <div className="xh-order-pane">
                <div className="t">This is your listing</div>
                <div className="s">Edit price, description, images, stock and visibility — or pause it from your dashboard.</div>
                <Link href={`/listing/${id}/edit`}>✏️ Edit listing →</Link>
              </div>
            ) : order ? (
              <div className="xh-order-pane">
                <div className="t">You have an order for this item</div>
                <div className="s">Track payment, release the escrow, confirm receipt, get your delivery and leave a review — all from your Orders page.</div>
                <Link href="/orders">Manage in Orders →</Link>
              </div>
            ) : soldOut ? (
              <div className="xh-buy-btns single">
                <button className="xh-btn xh-btn-ghost" disabled>🔴 This item has been sold</button>
              </div>
            ) : (
              <div className="xh-buy-btns">
                <button className="xh-btn xh-btn-primary" onClick={handleBuy} disabled={buying}>
                  {buying ? 'Processing…' : '🛡 Buy with escrow'}
                </button>
                <button className="xh-btn xh-btn-ghost" onClick={() => user ? setShowOfferModal(true) : setShowLogin(true)}>
                  Make an offer
                </button>
              </div>
            )}

            {buyError && <div className="xh-buy-error">{buyError}</div>}

            {/* Mini waterline */}
            <div className="xh-mini-line">
              <div className="t">WHERE YOUR XRP GOES</div>
              <div className="xh-mini-steps">
                <div className={'xh-ms ' + stepClass(1)}><div className="ic"><StepLock /></div>Locked on-chain<br />at purchase</div>
                <div className="xh-ms-arrow">→</div>
                <div className={'xh-ms ' + stepClass(2)}><div className="ic"><StepDeliver /></div>Seller delivers,<br />you confirm</div>
                <div className="xh-ms-arrow">→</div>
                <div className={'xh-ms ' + stepClass(3)}><div className="ic"><StepCheck /></div>Escrow releases<br />to seller</div>
              </div>
              <div className="xh-mini-foot">
                <span>NON-CUSTODIAL · XRPL ESCROW</span>
                <span className="ok">verifiable on ledger ↗</span>
              </div>
            </div>

            {/* Seller card */}
            <div className="xh-seller-card">
              <span className="av">{avInitial}</span>
              <div className="info">
                <div className="nm">
                  {listing.username || 'unknown'}
                  {listing.seller_is_pro && <span className="ver">✓ PRO</span>}
                  {listing.is_verified && !listing.seller_is_pro && <span className="verif" title="Verified seller">✓</span>}
                </div>
                <div className="st">
                  {Number(listing.reputation_score) > 0
                    ? <><span className="star">★ {Number(listing.reputation_score).toFixed(1)}</span> · ledger-verified seller</>
                    : <>New seller · escrow-protected</>}
                </div>
              </div>
              <div className="actions">
                {listing.store_handle && <a href={'/store/' + listing.store_handle}>Visit store →</a>}
                {!isSeller && user && <button onClick={() => setShowMsgModal(true)}>Message →</button>}
                {!isSeller && user && <button onClick={handleReport} style={{ color: 'var(--xh-text3)', fontSize: 11, fontWeight: 500 }}>⚠ Report</button>}
              </div>
            </div>

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="xh-tags">
                {listing.tags.map((t, i) => <span key={i}>#{t}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <section>
          <div className="sec-h">About this listing</div>
          <div className="xh-desc">{listing.description}</div>
          {(listing.delivery_time || listing.platform) && (
            <div className="xh-spec-grid">
              {listing.delivery_time && <div className="xh-spec"><b>DELIVERY</b><span>{DELIVERY_LABEL[listing.delivery_time] || listing.delivery_time}</span></div>}
              {listing.platform     && <div className="xh-spec"><b>PLATFORM</b><span>{listing.platform}</span></div>}
              {listing.game         && <div className="xh-spec"><b>GAME</b><span>{listing.game}</span></div>}
            </div>
          )}
        </section>
      )}

      {/* Similar */}
      {similar.length > 0 && (
        <section className="xh-similar-section">
          <div className="sec-h">More from this dock</div>
          <div className="xh-grid4">
            {similar.map(l => (
              <Link key={l.id} href={'/listing/' + l.id} className="xh-mini-card">
                <div className="th" style={{ background: CAT_BG[l.category] || CAT_BG.other }}>
                  {l.images?.[0] ? <img src={l.images[0]} alt={l.title} /> : <span style={{ opacity: 0.6 }}>{CAT_EMOJI[l.category] || '📦'}</span>}
                </div>
                <div className="cb">
                  <div className="t">{l.title}</div>
                  <div className="row">
                    <span className="pr">{Number(l.price_xrp).toLocaleString('en-US')} {l.currency || 'XRP'}</span>
                    <span className="esc">🛡 escrow</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Offer modal */}
      {showOfferModal && (
        <div className="xh-modal-bg" onClick={() => setShowOfferModal(false)}>
          <div className="xh-modal" onClick={e => e.stopPropagation()}>
            <h3>💰 Make an offer</h3>
            <p className="sub">Listed at <strong style={{ color: '#1668D6' }}>{listing.price_xrp} {listing.currency || 'XRP'}</strong></p>
            {offerSent && offerXumm ? (
              <div className="xumm-block">
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--xh-text)', marginBottom: 8 }}>⚡ Complete payment in Xaman</div>
                <div style={{ fontSize: 12, color: 'var(--xh-text2)', marginBottom: 12 }}>Scan the QR to lock escrow. Seller will review your offer.</div>
                {offerXumm.qrUrl && <img src={offerXumm.qrUrl} alt="Xaman QR" />}
                {offerXumm.deepLink && <a href={offerXumm.deepLink}>Open in Xaman app</a>}
              </div>
            ) : offerSent ? (
              <div className="ok-msg">✅ Offer sent!</div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label>Your offer (XRP)</label>
                  <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="e.g. 90.00" />
                </div>
                <div>
                  <label>Message (optional)</label>
                  <textarea value={offerMsg} onChange={e => setOfferMsg(e.target.value)} placeholder="Why should they accept?" rows={3} />
                </div>
                <div className="row">
                  <button className="xh-btn xh-btn-ghost" onClick={() => setShowOfferModal(false)}>Cancel</button>
                  <button className="xh-btn xh-btn-primary" onClick={handleOffer} disabled={!offerAmount || offerSending}>{offerSending ? 'Sending…' : 'Send offer'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Message modal */}
      {showMsgModal && (
        <div className="xh-modal-bg" onClick={() => setShowMsgModal(false)}>
          <div className="xh-modal" onClick={e => e.stopPropagation()}>
            <h3>💬 Message seller</h3>
            <p className="sub">{listing.title}</p>
            {msgSent ? (
              <div className="ok-msg">✅ Sent!</div>
            ) : (
              <>
                <label>Your message</label>
                <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Hi, I'm interested…" rows={4} />
                <div className="row">
                  <button className="xh-btn xh-btn-ghost" onClick={() => setShowMsgModal(false)}>Cancel</button>
                  <button className="xh-btn xh-btn-primary" onClick={handleMessage} disabled={!msgInput.trim() || msgSending}>{msgSending ? 'Sending…' : 'Send'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showLogin && <XummLoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
