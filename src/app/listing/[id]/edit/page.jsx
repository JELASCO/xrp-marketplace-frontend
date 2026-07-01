'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../../lib/store';
import { api } from '../../../../lib/api';

const TITLE_MAX = 120;
const DESC_MAX = 2000;

const CSS = `
.xh-form{font-family:var(--xh-body);color:var(--xh-text)}
.xh-form h1{font-family:var(--xh-display);font-weight:800;letter-spacing:-0.02em;line-height:1.1}
.xh-form .sec-h{font-family:var(--xh-display);font-weight:700;letter-spacing:-0.01em}

.xh-form-mast{background:#0b1b33;color:#fff;border-radius:16px;padding:28px 30px 36px;margin:14px 0 18px;position:relative;overflow:hidden}
.xh-form-mast .crumb{font-family:var(--xh-mono);font-size:11.5px;color:var(--xh-text3);letter-spacing:0.04em;margin-bottom:10px;text-transform:uppercase}
.xh-form-mast .crumb b{color:rgba(59,130,246,0.14);font-weight:500}
.xh-form-mast h1{font-size:28px;display:flex;align-items:center;gap:14px;margin:0 0 6px;color:#fff}
.xh-form-mast h1 .icon{width:40px;height:40px;border-radius:10px;background:#f59e0b;display:grid;place-items:center;font-size:20px;flex:none}
.xh-form-mast .sub{color:#aebfdd;font-size:14px;max-width:640px;line-height:1.55;margin-top:6px}
.xh-form-mast .step-rail{display:flex;gap:8px;margin-top:22px;flex-wrap:wrap}
.xh-form-mast .step{font-family:var(--xh-mono);font-size:11px;color:var(--xh-text3);background:rgba(255,255,255,0.05);border:1px solid #21385f;border-radius:8px;padding:7px 12px;display:flex;align-items:center;gap:8px;letter-spacing:0.04em}
.xh-form-mast .step.on{color:rgba(59,130,246,0.14);background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.35)}
.xh-form-mast .step .num{width:18px;height:18px;border-radius:50%;background:#10264a;display:grid;place-items:center;font-size:10px;color:var(--xh-text3)}
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
.xh-card.boost{background:linear-gradient(135deg,rgba(245,158,11,0.05),#fff8e1);border-color:#fde68a}
.xh-card.danger{background:rgba(239,68,68,0.05);border-color:rgba(239,68,68,0.16)}

.xh-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.xh-field:last-child{margin-bottom:0}
.xh-field label{font-size:13px;font-weight:600;color:var(--xh-text);display:flex;align-items:center;gap:6px}
.xh-field label .opt{font-family:var(--xh-mono);font-size:10.5px;font-weight:400;color:var(--xh-text2);text-transform:uppercase}
.xh-field label .req{color:#ef4444}
.xh-field .helper{font-size:12px;color:var(--xh-text2);line-height:1.45}
.xh-field input[type=text],.xh-field input[type=number],.xh-field input[type=url],.xh-field textarea{
  width:100%;background:var(--xh-surface);border:1px solid var(--xh-border);border-radius:10px;
  padding:11px 14px;font-size:14px;color:var(--xh-text);font-family:inherit;transition:border-color 0.15s,box-shadow 0.15s;box-sizing:border-box
}
.xh-field input:focus,.xh-field textarea:focus{outline:none;border-color:var(--xh-accent);box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.xh-field input.err,.xh-field textarea.err{border-color:#ef4444}
.xh-field textarea{resize:vertical;min-height:96px;line-height:1.55}
.xh-field .count{font-family:var(--xh-mono);font-size:10.5px;color:var(--xh-text2);text-align:right;margin-top:2px}
.xh-field .count.over{color:#ef4444}

.xh-price{position:relative}
.xh-price input{padding-right:60px;font-family:var(--xh-mono);font-weight:500;font-size:18px;color:#1668D6}
.xh-price .suffix{position:absolute;right:14px;top:50%;transform:translateY(-50%);font-family:var(--xh-mono);font-size:12px;color:var(--xh-text2);font-weight:500;letter-spacing:0.04em;pointer-events:none}
.xh-usd-live{font-family:var(--xh-mono);font-size:11px;color:#10b981;margin-top:6px;display:flex;align-items:center;gap:6px}
.xh-usd-live .lvdot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:xhPulse 2s infinite}
@keyframes xhPulse{0%,100%{opacity:1}50%{opacity:0.5}}

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

.xh-digital-extra{margin-top:14px;display:flex;flex-direction:column;gap:12px;padding-top:14px;border-top:1px dashed var(--xh-border)}
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
  const [listing, setListing] = useState(null);
  const [title, setTitle] = useState('');
  const [priceXrp, setPriceXrp] = useState('');
  const [description, setDescription] = useState('');
  const [isDigital, setIsDigital] = useState(false);
  const [digitalContent, setDigitalContent] = useState('');
  const [digitalLink, setDigitalLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [featureModal, setFeatureModal] = useState(null);
  const [featPricing, setFeatPricing] = useState(null);
  const [featVerifying, setFeatVerifying] = useState(false);
  const [xrpUsd, setXrpUsd] = useState(null);

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
    if (!document.getElementById('xh-edit-css')) {
      const style = document.createElement('style');
      style.id = 'xh-edit-css';
      style.textContent = ':root{--xh-display:"Bricolage Grotesque","Inter",system-ui,sans-serif;--xh-body:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--xh-mono:"JetBrains Mono",ui-monospace,monospace}\n' + CSS;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => { api.upgrades.pricing().then(setFeatPricing).catch(() => {}); }, []);

  // Live XRP/USD
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
      setPriceXrp(String(l.price_xrp || ''));
      setDescription(l.description || '');
      setIsDigital(!!l.is_digital);
      setDigitalContent(l.digital_content || '');
      setDigitalLink(l.digital_link || '');
    }).catch(() => router.push('/listing/' + id));
  }, [id, user, hydrated]);

  async function startFeature() {
    setError('');
    try {
      const r = await api.upgrades.payload('featured', id);
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
      await api.listings.update(id, { title: title.trim(), description: description.trim() || null, price_xrp: Number(priceXrp), isDigital, digitalContent: digitalContent || null, digitalLink: digitalLink || null });
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

  const priceNum = parseFloat(priceXrp);
  const usdPrice = (priceNum > 0 && xrpUsd) ? (priceNum * xrpUsd).toFixed(2) : null;
  const catLabelMap = { games:'GAMES', graphics:'GRAPHICS', software:'SOFTWARE', accounts:'ACCOUNTS', other:'OTHER' };
  const catBits = [catLabelMap[listing.category] || 'ITEM'];
  if (listing.game) catBits.push(listing.game);

  return (
    <div className="xh-form">
      <div className="xh-form-mast">
        <div className="crumb">HARBOR · <b>EDIT · {(listing.title || '').toUpperCase().slice(0, 60)}</b></div>
        <h1><span className="icon">✎</span>Refit your listing</h1>
        <p className="sub">Tweak the title, copy and price. Toggle digital delivery, boost the listing to the top, or take it off the harbor entirely.</p>
        <div className="step-rail">
          <span className={'step' + (title.trim() ? ' on' : '')}><span className="num">1</span>BASICS</span>
          <span className={'step' + (priceNum > 0 ? ' on' : '')}><span className="num">2</span>PRICE</span>
          <span className="step"><span className="num">3</span>VISIBILITY</span>
          <span className="step"><span className="num">4</span>BOOST</span>
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
              <div><div className="lbl">01 · BASICS</div><h2 className="sec-h">Title &amp; description</h2></div>
              <div className="hint">required</div>
            </div>

            <div className="xh-field">
              <label>Title <span className="req">*</span></label>
              <input type="text" maxLength={TITLE_MAX + 10} value={title} onChange={e => { setTitle(e.target.value); setFieldErrors(fe => ({ ...fe, title: null })); }} className={fieldErrors.title ? 'err' : ''} />
              {fieldErrors.title && <div style={{ fontSize: 11, color: '#ef4444' }}>{fieldErrors.title}</div>}
              <div className={'count' + (title.length > TITLE_MAX ? ' over' : '')}>{title.length} / {TITLE_MAX}</div>
            </div>

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
              <div><div className="lbl">02 · PRICE</div><h2 className="sec-h">What's it worth in XRP?</h2></div>
              <div className="hint">XRP {xrpUsd ? '$' + xrpUsd.toFixed(4) : '…'}</div>
            </div>

            <div className="xh-field">
              <label>Price <span className="req">*</span></label>
              <div className="xh-price">
                <input type="number" step="0.01" min="0.01" value={priceXrp} onChange={e => { setPriceXrp(e.target.value); setFieldErrors(fe => ({ ...fe, priceXrp: null })); }} className={fieldErrors.priceXrp ? 'err' : ''} />
                <span className="suffix">XRP</span>
              </div>
              {fieldErrors.priceXrp && <div style={{ fontSize: 11, color: '#ef4444' }}>{fieldErrors.priceXrp}</div>}
              {usdPrice && <div className="xh-usd-live"><span className="lvdot"></span>≈ ${usdPrice} · live · refreshes every 15s</div>}
            </div>
          </div>

          {/* 3. Visibility */}
          <div className="xh-card">
            <div className="sec-head">
              <div><div className="lbl">03 · VISIBILITY</div><h2 className="sec-h">Delivery mechanics</h2></div>
            </div>

            <div className="xh-toggle-row">
              <div className="info">
                <div className="t">⚡ Instant delivery <span className="badge">DIGITAL</span></div>
                <div className="s">Content unlocks for the buyer the moment escrow is funded. Only enable if your goods can be delivered automatically.</div>
              </div>
              <label className="xh-toggle"><input type="checkbox" checked={isDigital} onChange={e => setIsDigital(e.target.checked)} /><span className="track"></span></label>
            </div>

            {isDigital && (
              <div className="xh-digital-extra">
                <div className="xh-field">
                  <label>Delivery content <span className="opt">key, login, code…</span></label>
                  <textarea rows={3} placeholder="e.g. Steam key: XXXXX-XXXXX-XXXXX" value={digitalContent} onChange={e => setDigitalContent(e.target.value)} />
                </div>
                <div className="xh-field">
                  <label>Download link <span className="opt">optional URL</span></label>
                  <input type="url" placeholder="https://..." value={digitalLink} onChange={e => setDigitalLink(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* 4. Boost */}
          <div className="xh-card boost">
            <div className="sec-head">
              <div><div className="lbl warn">04 · BOOST</div><h2 className="sec-h">🔥 Pin this listing to the top</h2></div>
            </div>

            <div className="xh-boost-cta">
              <div className="info">
                <div className="s">Feature this listing on the marketplace homepage and at the top of search results{featPricing ? <> for <b>{featPricing.featured.days} days</b> · <b>{featPricing.featured.xrp} XRP</b></> : ''}. Featured listings get 4-7× more views on average.</div>
              </div>
              <button onClick={startFeature} className="xh-btn xh-btn-warn">⛵ Feature this listing</button>
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
                  <div className="s">Deletes the listing from the harbor. Active orders are unaffected — buyers can still complete escrow. There's no undo.</div>
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
              {listing.images?.[0]
                ? <img src={listing.images[0]} alt="cover" />
                : <span style={{ opacity: 0.6 }}>🖼</span>}
              <span className="badge">{catBits.slice(0, 2).join(' · ')}</span>
            </div>

            <div className="cat">{catBits.join(' / ')}</div>
            <div className="title">{title || 'Your listing title shows here'}</div>
            <div className="price">
              <span className="xrp">{priceNum > 0 ? Number(priceXrp).toLocaleString('en-US') : '0'} XRP</span>
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
            {featureModal.qrUrl && <div className="qrwrap"><img src={featureModal.qrUrl} alt="Xaman QR" /></div>}
            {featureModal.deepLink && <a href={featureModal.deepLink} className="deep-link">Open in Xaman app</a>}
            <button onClick={verifyFeature} disabled={featVerifying} className="verify-btn">{featVerifying ? 'Checking…' : "I've paid — activate"}</button>
            <button onClick={() => setFeatureModal(null)} className="cancel">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
