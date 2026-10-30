'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { PRO_LIVE_AVATARS, PRO_FRAME_STYLES, uploadAvatarOrLogoFile } from '../../../lib/avatars';

async function uploadImage(file) {
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
    body: JSON.stringify({ image: base64 }),
  });
  const d = await r.json();
  if (!r.ok || !d.url) throw new Error((d && d.error) || 'Upload failed');
  return d.url;
}

const C = {
  ink: 'var(--xh-text)', muted: 'var(--xh-text2)', line: 'var(--xh-border)', lineStrong: 'var(--xh-border)',
  bg: '#ffffff', bgSoft: 'var(--xh-surface2)', bgSofter: 'var(--xh-surface2)',
  blue: 'var(--xh-accent)', blueDark: 'var(--xh-accent)', green: '#10b981',
};

const CAT_TREE = {
  'Games': ['CS2','Valorant','Fortnite','Dota 2','Rocket League','League of Legends','Apex Legends','Roblox','Minecraft','OSRS','Path of Exile','Rust','Genshin Impact','GTA V','Warframe','Other'],
  'Graphics & Art': ['Logos','Illustrations','3D models','UI/UX kits','Avatars / PFP','Textures & materials','Animation rigs','Motion graphics','Brushes & presets','Font assets','Design templates','Other'],
  'Education': ['Courses & tutorials','eBooks & guides','Mentorship sessions','Design resources','Other'],
  'Software & Tools': ['Licenses & keys','Scripts & bots','Plugins','Templates','Source code','Other'],
  'Accounts': ['Game accounts','Social media','Streaming','Subscriptions','Other'],
  'Other': ['Gift cards','Collectibles','Misc','Other'],
};
const CAT_KEYS = Object.keys(CAT_TREE);
const RESPONSES = ['Within 4 hours (business hours)', 'Within 12 hours', 'Within 24 hours', 'Within 48 hours'];

const sectionStyle = { background: C.bg, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, marginBottom: 16 };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.ink };
const hintStyle = { fontSize: 12, color: C.muted, marginTop: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.lineStrong}`, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: C.ink, minHeight: 44, boxSizing: 'border-box' };

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      style={{ position: 'relative', width: 40, height: 24, flexShrink: 0, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 999, background: checked ? C.blue : C.lineStrong, transition: 'background 0.15s' }}>
      <span style={{ position: 'absolute', top: 2, left: 2, width: 20, height: 20, background: 'var(--xh-surface)', borderRadius: '50%', transition: 'transform 0.15s', transform: checked ? 'translateX(16px)' : 'translateX(0)', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
    </button>
  );
}

function ToggleRow({ title, desc, checked, onChange, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${C.line}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export default function CreateStorePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [cats, setCats] = useState([]);
  const [activeCat, setActiveCat] = useState('Games');
  const [otherText, setOtherText] = useState({});
  const [tagline, setTagline] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [about, setAbout] = useState('');
  const [socials, setSocials] = useState({ discord: '', twitter: '', telegram: '', website: '' });
  const [pinnedListingIds, setPinnedListingIds] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [autoAccept, setAutoAccept] = useState(true);
  const [requireShot, setRequireShot] = useState(true);
  const [vacation, setVacation] = useState(false);
  const [response, setResponse] = useState(RESPONSES[0]);
  const [wallet, setWallet] = useState('');
  const [destTag, setDestTag] = useState('');
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [frameStyle, setFrameStyle] = useState('gold');
  const [promoCode, setPromoCode] = useState('HARBOR10');
  const [promoDiscount, setPromoDiscount] = useState(10);
  const [minOfferPct, setMinOfferPct] = useState(85);
  const [faqs, setFaqs] = useState([
    { q: 'How fast are digital items delivered after escrow lock?', a: 'All digital codes and game transfers are dispatched within 5–15 minutes of on-chain XRPL escrow lock.' },
    { q: 'How do I claim the store promo or bundle discount?', a: 'Click "Make Offer" on any listing and mention our store promo code (or bundle 2+ items) for priority discount approval.' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasStore, setHasStore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push('/'); return; }
    api.stores.mine().then((d) => {
      if (d.store) {
        setHasStore(true);
        setName(d.store.name || '');
        setHandle(d.handle || '');
        setCats(d.store.categories || []);
        setTagline(d.store.tagline || '');
        setAnnouncement(d.store.announcement || '');
        setAbout(d.store.about || '');
        if (d.store.socials && typeof d.store.socials === 'object') {
          setSocials({
            discord: d.store.socials.discord || '',
            twitter: d.store.socials.twitter || '',
            telegram: d.store.socials.telegram || '',
            website: d.store.socials.website || '',
          });
        }
        if (Array.isArray(d.store.pinnedListingIds)) {
          setPinnedListingIds(d.store.pinnedListingIds);
        }
        if (d.store.frameStyle) setFrameStyle(d.store.frameStyle);
        if (d.store.promoCode !== undefined) setPromoCode(d.store.promoCode || '');
        if (d.store.promoDiscount != null) setPromoDiscount(Number(d.store.promoDiscount));
        if (d.store.minOfferPct != null) setMinOfferPct(Number(d.store.minOfferPct));
        if (Array.isArray(d.store.faqs) && d.store.faqs.length > 0) setFaqs(d.store.faqs);
        setWallet(d.store.payoutAddress || '');
        setDestTag(d.store.destinationTag || '');
        setLogoUrl(d.store.logoUrl || null);
        setBannerUrl(d.store.bannerUrl || null);
        const s = d.store.settings || {};
        if (typeof s.autoAccept === 'boolean') setAutoAccept(s.autoAccept);
        if (typeof s.requireShot === 'boolean') setRequireShot(s.requireShot);
        if (typeof s.vacation === 'boolean') setVacation(s.vacation);
        if (s.response) setResponse(s.response);
      }
    }).catch(() => {});
    api.users.listings(user.id).then((ls) => {
      const arr = Array.isArray(ls) ? ls : (ls?.listings || []);
      setMyListings(arr.filter((l) => l.status === 'active'));
    }).catch(() => {});
  }, [user, router, hydrated]);

  const togglePinnedListing = (lid) => {
    setPinnedListingIds((prev) => {
      if (prev.includes(lid)) return prev.filter((id) => id !== lid);
      if (prev.length >= 3) return prev;
      return [...prev, lid];
    });
  };

  const toggleCat = (c) => setCats((prev) => {
    if (prev.includes(c)) {
      if (c === 'Other') setOtherText((t) => { const n = {...t}; delete n[activeCat]; return n; });
      return prev.filter((x) => x !== c);
    }
    return prev.length >= 8 ? prev : [...prev, c];
  });

  const handleLogoFile = async (file) => {
    if (!file) return;
    setLogo(file); setError('');
    try { setLogoUrl(await uploadAvatarOrLogoFile(file, true)); }
    catch (e) { setError('Logo upload failed: ' + e.message); }
  };
  const handleBannerFile = async (file) => {
    if (!file) return;
    setBanner(file); setError('');
    try { setBannerUrl(await uploadAvatarOrLogoFile(file, true)); }
    catch (e) { setError('Banner upload failed: ' + e.message); }
  };

  const validate = () => {
    if (!name.trim()) return 'Store name is required';
    if (!/^[a-z0-9-]{3,40}$/.test(handle)) return 'Store URL must be 3-40 chars: lowercase letters, numbers, hyphens';
    if (cats.length === 0) return 'Select at least one category';
    if (!wallet.trim()) return 'XRP Ledger payout address is required';
    return null;
  };

  const handlePreview = () => {
    if (!hasStore) { setError('Publish your store first — then you can preview the live page.'); return; }
    if (handle && /^[a-z0-9-]{3,40}$/.test(handle)) window.open('/store/' + handle, '_blank');
    else setError('Set a valid store URL first to preview');
  };

  const isProUser = Boolean(user && ((user.proUntil && new Date(user.proUntil) > new Date()) || (user.pro_until && new Date(user.pro_until) > new Date()) || user.store_handle || user.role === 'admin'));

  const handlePublish = async () => {
    if (!isProUser) {
      setError('Custom Pro Storefronts require an active Pro membership (50 XRP / 30 days).');
      return;
    }
    const v = validate();
    if (v) { setError(v); return; }
    setError(''); setSaving(true);
    try {
      await api.stores.save({
        name, handle, tagline, announcement, about, categories: cats,
        socials,
        pinnedListingIds,
        frameStyle,
        promoCode,
        promoDiscount: Number(promoDiscount) || 0,
        minOfferPct: Number(minOfferPct) || 85,
        faqs: faqs.filter((f) => f && f.q && f.q.trim() && f.a && f.a.trim()),
        settings: { autoAccept, requireShot, vacation, response },
        payoutAddress: wallet, destinationTag: destTag || null,
        logoUrl, bannerUrl,
      });
      router.push('/store/' + handle);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const handleDeleteStore = async () => {
    setError(''); setDeleting(true);
    try {
      await api.stores.remove();
      router.push('/dashboard');
    } catch (e) {
      setError(e.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const displayName = name.trim() || 'Your store';
  const initials = (name.trim() || 'St').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const responseShort = response.match(/\d+\s?\w/) ? response.match(/(\d+)\s?(h|hour)/i) ? response.match(/(\d+)/)[0] + 'h' : response : '4h';

  return (
    <>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 0' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.muted, textDecoration: 'none', fontSize: 14, marginBottom: 24, padding: '4px 0' }}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="10 12 6 8 10 4" /></svg>
          Back to dashboard
        </Link>

        {!isProUser && (
          <div style={{ background: 'linear-gradient(135deg, #0b1b33 0%, #173a86 100%)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 16, padding: '20px 24px', marginBottom: 28, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>
                ★ PRO EXCLUSIVE FEATURE
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Unlock your Custom Pro Storefront (`xrpharbor.com/store/your-name`)</div>
              <div style={{ fontSize: 13.5, color: '#cbd5e1', maxWidth: 680 }}>
                Pro members get a custom storefront URL, live announcement broadcast bar, verified social links, in-store search, unlimited listings, and placement in the Homepage Verified Pro Stores showcase.
              </div>
            </div>
            <Link href="/pro" style={{ background: '#f59e0b', color: '#0b1b33', padding: '11px 22px', borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Upgrade to Pro (50 XRP) →
            </Link>
          </div>
        )}

        <header style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 6 }}>Pro Seller Setup</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.4px', lineHeight: 1.2, marginBottom: 8, margin: 0, color: C.ink }}>Create your Pro Storefront</h1>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 560, marginTop: 8 }}>Set up a branded Pro storefront with live announcements, social links, and in-store search that buyers can discover on the homepage.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40, alignItems: 'start' }} className="store-create-grid">
          <div>
            <section style={sectionStyle}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, margin: 0, color: C.ink }}>Store basics</h2>
                <p style={{ fontSize: 13, color: C.muted }}>The name and URL buyers see across the marketplace.</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Store name</label>
                <input style={inputStyle} type="text" placeholder="e.g. Ripple Vault" value={name} onChange={(e) => setName(e.target.value)} />
                <div style={hintStyle}>Appears on every listing, receipt, and profile link.</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Store URL</label>
                <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${C.lineStrong}`, borderRadius: 12, overflow: 'hidden' }}>
                  <span style={{ padding: '0 12px', fontSize: 13, color: C.muted, background: C.bgSoft, borderRight: `1px solid ${C.lineStrong}`, display: 'flex', alignItems: 'center', fontFamily: 'monospace' }}>xrpharbor.com/store/</span>
                  <input style={{ border: 'none', flex: 1, padding: '10px 12px', minHeight: 44, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: C.ink, background: C.bg }} type="text" placeholder="ripple-vault" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
                </div>
                <div style={hintStyle}>Lowercase letters, numbers, and dashes. You can change this once after publishing.</div>
              </div>
              <div>
                                <label style={labelStyle}>What do you sell?</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {CAT_KEYS.map((k) => {
                    const active = activeCat === k;
                    return (
                      <button key={k} type="button" onClick={() => setActiveCat(k)}
                        style={{ padding: '7px 14px', background: active ? C.blue : C.bg, border: '1px solid ' + (active ? C.blue : C.line), borderRadius: 999, fontSize: 13, fontWeight: 600, color: active ? '#fff' : C.ink, cursor: 'pointer', fontFamily: 'inherit', minHeight: 36 }}>{k}</button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CAT_TREE[activeCat].map((c) => {
                    const on = cats.includes(c);
                    return (
                      <button key={c} type="button" aria-pressed={on} onClick={() => toggleCat(c)}
                        style={{ padding: '6px 12px', background: on ? C.ink : C.bg, border: '1px solid ' + (on ? C.ink : C.line), borderRadius: 999, fontSize: 13, fontWeight: 500, color: on ? '#fff' : C.ink, cursor: 'pointer', fontFamily: 'inherit', minHeight: 34 }}>{c}</button>
                    );
                  })}
                </div>
                {cats.includes('Other') && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      placeholder={`Describe what you sell under "${activeCat} — Other"…`}
                      value={otherText[activeCat] || ''}
                      onChange={(e) => setOtherText((t) => ({ ...t, [activeCat]: e.target.value }))}
                      style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
                    />
                    <div style={hintStyle}>This appears on your store page so buyers know what to expect.</div>
                  </div>
                )}
                <div style={hintStyle}>Pick a category, then the items you sell. {cats.length}/8 selected.</div>
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, margin: 0, color: C.ink }}>Storefront branding</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Logo (animated .GIF or Live Crest), 360° glowing frame, banner, and tagline appear at the top of your store.</p>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Store Logo &amp; Animated .GIF <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, marginLeft: 6, padding: '2px 6px', borderRadius: 5 }}>PRO</span></label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
                  <div
                    className={frameStyle !== 'none' ? `xh-pro-ring frame-${frameStyle}` : ''}
                    style={{ borderRadius: 16, flexShrink: 0, ...(frameStyle === 'none' ? { padding: 3, border: '3px solid #f59e0b' } : {}) }}
                  >
                    <div style={{ width: 72, height: 72, borderRadius: 12, background: logoUrl ? C.bgSoft : 'linear-gradient(135deg, var(--xh-accent), #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 800, overflow: 'hidden' }} aria-hidden="true">
                      {logoUrl ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <input type="file" id="logo-upload" accept="image/gif,image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => handleLogoFile(e.target.files?.[0])} />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => document.getElementById('logo-upload').click()} style={{ minHeight: 36, padding: '8px 14px', fontSize: 13, background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        📤 Upload Animated .GIF / Logo
                      </button>
                      {logoUrl && (
                        <button type="button" onClick={() => setLogoUrl(null)} style={{ minHeight: 36, padding: '8px 12px', fontSize: 12.5, background: C.bg, border: `1px solid ${C.lineStrong}`, borderRadius: 8, color: C.muted, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Use Initials ({initials})
                        </button>
                      )}
                    </div>
                    <div style={{ ...hintStyle }}>{logo ? logo.name : 'Supports animated .GIF, PNG, JPG, WEBP or built-in Live Crests below.'}</div>
                  </div>
                </div>

                {/* Built-in Animated Live Store Logos */}
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Or pick a built-in Animated Live Store Crest:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 8, marginBottom: 14 }}>
                  {PRO_LIVE_AVATARS.map((item) => {
                    const active = logoUrl === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLogoUrl(item.url)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: active ? '2px solid #f59e0b' : `1px solid ${C.lineStrong}`,
                          background: active ? 'rgba(245,158,11,0.12)' : C.bgSoft,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <img src={item.url} alt={item.label} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', fontWeight: 800, color: '#d97706' }}>● {item.tag}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{item.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Animated Frame Style Selector */}
                <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                  Store Logo 360° Animated Border Frame <span className="xh-pro" style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', fontWeight: 800, padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>PRO</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 8 }}>
                  {PRO_FRAME_STYLES.map((fr) => {
                    const active = frameStyle === fr.id;
                    return (
                      <button
                        key={fr.id}
                        type="button"
                        onClick={() => setFrameStyle(fr.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: active ? '2px solid #f59e0b' : `1px solid ${C.lineStrong}`,
                          background: active ? 'rgba(245,158,11,0.12)' : C.bg,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: fr.previewGrad, flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.7)' }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{fr.name}</div>
                          <div style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fr.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Cover banner</label>
                <input type="file" id="banner-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBannerFile(e.target.files?.[0])} />
                <div onClick={() => document.getElementById('banner-upload').click()} style={{ aspectRatio: '3 / 1', background: bannerUrl ? `center/cover no-repeat url(${bannerUrl})` : C.bgSoft, border: `1.5px dashed ${C.lineStrong}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: C.muted, cursor: 'pointer' }}>
                  {!bannerUrl && <><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{banner ? banner.name : 'Drop an image or click to browse'}</div></>}
                </div>
                <div style={hintStyle}>Recommended 1500×500px (3:1). PNG or JPG, up to 5 MB.</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Tagline</label>
                <input style={inputStyle} type="text" maxLength={160} placeholder="One sentence under your store name." value={tagline} onChange={(e) => setTagline(e.target.value)} />
                <div style={hintStyle}>One sentence under your store name. Max 160 characters.</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Live Store Announcement Bar <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, marginLeft: 6, padding: '2px 6px', borderRadius: 5 }}>PRO</span></label>
                <input style={inputStyle} type="text" maxLength={240} placeholder="e.g. 🟢 Online now — instant delivery within 10 minutes!" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
                <div style={hintStyle}>Pinned at the very top of your store page to broadcast live status or promotions.</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>About</label>
                <textarea style={{ ...inputStyle, minHeight: 96, resize: 'vertical', lineHeight: 1.5 }} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Tell buyers about your store, sourcing, and turnaround." />
              </div>
              <div>
                <label style={labelStyle}>Verified Social &amp; Community Links <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, marginLeft: 6, padding: '2px 6px', borderRadius: 5 }}>PRO</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input style={inputStyle} type="url" placeholder="Discord invite URL (https://discord.gg/...)" value={socials.discord} onChange={(e) => setSocials(s => ({ ...s, discord: e.target.value }))} />
                  <input style={inputStyle} type="url" placeholder="X / Twitter URL (https://x.com/...)" value={socials.twitter} onChange={(e) => setSocials(s => ({ ...s, twitter: e.target.value }))} />
                  <input style={inputStyle} type="url" placeholder="Telegram URL (https://t.me/...)" value={socials.telegram} onChange={(e) => setSocials(s => ({ ...s, telegram: e.target.value }))} />
                  <input style={inputStyle} type="url" placeholder="Website URL (https://...)" value={socials.website} onChange={(e) => setSocials(s => ({ ...s, website: e.target.value }))} />
                </div>
                <div style={hintStyle}>Displayed on your storefront header so buyers can verify your reputation and community.</div>
              </div>

              <div style={{ marginTop: 18 }}>
                <label style={labelStyle}>Store Spotlight · Pinned Showcase (up to 3 items) <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, marginLeft: 6, padding: '2px 6px', borderRadius: 5 }}>PRO</span></label>
                {myListings.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: C.muted, background: C.bgSoft, border: `1px dashed ${C.lineStrong}`, borderRadius: 10, padding: '12px 14px' }}>
                    You don&apos;t have any active listings yet. Once you publish listings, you can pin up to 3 items to the top of your storefront here.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {myListings.map((item) => {
                      const pinned = pinnedListingIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => togglePinnedListing(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: `1.5px solid ${pinned ? '#f59e0b' : C.lineStrong}`,
                            background: pinned ? 'rgba(245,158,11,0.10)' : C.bg,
                            color: C.ink,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                          }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{item.title} <span style={{ color: C.muted, fontWeight: 500 }}>· {item.price_xrp} XRP</span></span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: pinned ? '#d97706' : C.muted }}>
                            {pinned ? '📌 Pinned to Spotlight' : '+ Pin'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={hintStyle}>Selected items appear in the highlighted &ldquo;Store Spotlight&rdquo; box at the top of your store page ({pinnedListingIds.length}/3 selected).</div>
              </div>
            </section>

            {/* NEW SECTION: Store Promo Code, Bundle Discount & Offer Rules */}
            <section style={sectionStyle}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.ink }}>🎁 Store Promo Code &amp; Bundle Privilege</h2>
                  <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, padding: '2px 6px', borderRadius: 5 }}>PRO</span>
                </div>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Highlight a 1-click copyable promo code &amp; minimum offer rule on your storefront to boost buyer conversions.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Promo Code</label>
                  <input
                    style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}
                    type="text"
                    maxLength={20}
                    placeholder="e.g. HARBOR10"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Bundle / Promo Discount (%)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={0}
                    max={90}
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Min. Offer Accepted (%)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={50}
                    max={100}
                    value={minOfferPct}
                    onChange={(e) => setMinOfferPct(e.target.value)}
                  />
                </div>
              </div>
              <div style={hintStyle}>Leave Promo Code blank if you don&apos;t want to display a promo banner on your storefront.</div>
            </section>

            {/* NEW SECTION: Store FAQ Accordion Builder */}
            <section style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.ink }}>❓ Store FAQ Accordion</h2>
                    <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, padding: '2px 6px', borderRadius: 5 }}>PRO</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Answer common buyer questions upfront (delivery speed, warranty, bundle deals) on your storefront.</p>
                </div>
                {faqs.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setFaqs((prev) => [...prev, { q: '', a: '' }])}
                    style={{ background: C.bgSoft, border: `1px solid ${C.lineStrong}`, color: C.ink, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + Add FAQ ({faqs.length}/4)
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {faqs.map((f, idx) => (
                  <div key={idx} style={{ background: C.bgSoft, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted }}>Question #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFaqs((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      style={{ ...inputStyle, marginBottom: 8, minHeight: 38, fontSize: 13 }}
                      type="text"
                      maxLength={160}
                      placeholder="e.g. How fast do you deliver after escrow lock?"
                      value={f.q}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFaqs((prev) => prev.map((item, i) => (i === idx ? { ...item, q: val } : item)));
                      }}
                    />
                    <textarea
                      style={{ ...inputStyle, minHeight: 62, fontSize: 13, resize: 'vertical' }}
                      maxLength={600}
                      placeholder="e.g. Digital keys are delivered automatically within 5–10 minutes."
                      value={f.a}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFaqs((prev) => prev.map((item, i) => (i === idx ? { ...item, a: val } : item)));
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, margin: 0, color: C.ink }}>Policies &amp; commitments</h2>
                <p style={{ fontSize: 13, color: C.muted }}>What buyers can count on. These appear on every listing.</p>
              </div>
              <ToggleRow title="Auto-accept escrow offers" desc="Buyer commits → funds lock in escrow without you confirming first. Recommended for digital items." checked={autoAccept} onChange={() => setAutoAccept((v) => !v)} />
              <ToggleRow title="Require Steam-profile screenshot on listings" desc="Adds a verified-source badge to your items. Slightly slower to list, materially more trust." checked={requireShot} onChange={() => setRequireShot((v) => !v)} />
              <ToggleRow title="Vacation mode" desc="Hide your listings without removing them. Useful when you can't respond for over 24 hours." checked={vacation} onChange={() => setVacation((v) => !v)} last />
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Response-time commitment</label>
                <select style={inputStyle} value={response} onChange={(e) => setResponse(e.target.value)}>
                  {RESPONSES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <div style={hintStyle}>Shown publicly. If you miss it, the buyer can cancel a pending order without penalty.</div>
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, margin: 0, color: C.ink }}>Payout</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Where escrowed XRP settles when a buyer confirms delivery.</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>XRP Ledger address</label>
                <input style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }} type="text" placeholder="r..." value={wallet} onChange={(e) => setWallet(e.target.value)} />
                <div style={hintStyle}>Public r-address only. Never paste your secret key.</div>
              </div>
              <div>
                <label style={labelStyle}>Destination tag <span style={{ color: C.muted, fontWeight: 500 }}>(optional)</span></label>
                <input style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }} type="text" placeholder="e.g. 4827" value={destTag} onChange={(e) => setDestTag(e.target.value)} />
                <div style={hintStyle}>Required if your wallet is hosted on an exchange (Bitstamp, Bitso, etc.).</div>
              </div>
            </section>

            {hasStore && (
              <section style={{ ...sectionStyle, borderColor: 'rgba(239,68,68,0.3)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#dc2626', marginBottom: 4 }}>Danger zone</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Deleting your store removes your public storefront page. Your listings stay active.</div>
                {!confirmDelete ? (
                  <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: C.bg, color: '#dc2626', border: '1px solid rgba(239,68,68,0.4)', padding: '10px 18px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>Delete store</button>
                ) : (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 13, color: C.ink, marginBottom: 12 }}>Delete your storefront? This cannot be undone.</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ flex: 1, background: C.bg, color: C.muted, border: `1px solid ${C.lineStrong}`, borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                      <button type="button" onClick={handleDeleteStore} disabled={deleting} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside style={{ position: 'sticky', top: 80 }} className="store-create-preview">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2.5" /><path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" /></svg>
              What buyers will see
            </div>
            <div style={{ background: C.bg, border: `1.5px solid rgba(245,158,11,0.45)`, borderRadius: 16, overflow: 'hidden' }}>
              {announcement.trim() && (
                <div style={{ background: 'rgba(16,185,129,0.12)', borderBottom: '1px solid rgba(16,185,129,0.3)', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{announcement}</span>
                </div>
              )}
              <div style={{ aspectRatio: '3 / 1', background: bannerUrl ? ('center/cover no-repeat url(' + bannerUrl + ')') : 'linear-gradient(135deg, #1e3a8a 0%, var(--xh-accent) 100%)', position: 'relative' }} aria-hidden="true">
                <span className="xh-pro" style={{ position: 'absolute', top: 10, right: 10, fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.05em' }}>
                  ★ VERIFIED PRO STORE
                </span>
              </div>
              <div style={{ padding: '0 16px 16px', position: 'relative' }}>
                <div
                  className={frameStyle !== 'none' ? `xh-pro-ring frame-${frameStyle}` : ''}
                  style={{ borderRadius: 16, marginTop: -28, ...(frameStyle === 'none' ? { padding: 3, border: '3px solid #f59e0b', display: 'inline-flex' } : {}) }}
                >
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: logoUrl ? C.bgSoft : 'linear-gradient(135deg, var(--xh-accent), #f59e0b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, overflow: 'hidden' }} aria-hidden="true">
                    {logoUrl ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: C.ink, flexWrap: 'wrap' }}>
                  {displayName}
                  <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, borderRadius: 5, padding: '2px 6px' }}>PRO</span>
                  <span style={{ color: C.blue, display: 'inline-flex' }} aria-label="Verified seller">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 1l1.6 1.4 2.1-.3.5 2 1.8 1.1-.9 1.9.5 2.1-2 .8-.9 1.9-2-.5-1.7 1.3-1.7-1.3-2 .5-.9-1.9-2-.8.5-2.1L0 5.2l1.8-1.1.5-2 2.1.3z" /><polyline points="5 8 7 10 11 6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{tagline || 'Your tagline appears here.'}</div>
                {promoCode && Number(promoDiscount) > 0 && (
                  <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 9, background: 'rgba(245,158,11,0.12)', border: '1px dashed rgba(245,158,11,0.5)', fontSize: 11.5, fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>🎁 Code: <strong style={{ fontFamily: 'DM Mono,monospace' }}>{promoCode}</strong> ({promoDiscount}% OFF)</span>
                    <span style={{ fontSize: 10, color: C.muted }}>Min offer {minOfferPct}%</span>
                  </div>
                )}
                {(socials.discord || socials.twitter || socials.telegram || socials.website) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {socials.discord && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: C.bgSoft, border: `1px solid ${C.line}` }}>💬 Discord</span>}
                    {socials.twitter && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: C.bgSoft, border: `1px solid ${C.line}` }}>𝕏 Twitter</span>}
                    {socials.telegram && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: C.bgSoft, border: `1px solid ${C.line}` }}>✈️ Telegram</span>}
                    {socials.website && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: C.bgSoft, border: `1px solid ${C.line}` }}>🌐 Website</span>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, padding: '12px 0', marginTop: 12, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.muted }}>
                  <span><strong style={{ color: C.ink, fontWeight: 700 }}>0</strong> sales</span>
                  <span><strong style={{ color: C.ink, fontWeight: 700 }}>New</strong> store</span>
                  <span><strong style={{ color: C.ink, fontWeight: 700 }}>{responseShort}</strong> response</span>
                </div>
                <div style={{ paddingTop: 12, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>{about ? (about.length > 120 ? about.slice(0, 120) + '…' : about) : 'Your store description appears here.'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <button type="button" style={{ background: C.ink, color: '#fff', border: `1px solid ${C.ink}`, padding: 9, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>🔔 Follow store</button>
                  <button type="button" style={{ background: C.bg, color: C.ink, border: `1px solid ${C.lineStrong}`, padding: 9, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Message</button>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>Listings appear below the header once you publish your first item. The preview updates as you edit.</p>
          </aside>
        </div>
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.line}`, zIndex: 40 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} aria-hidden="true" />
            <strong style={{ color: C.ink }}>{hasStore ? 'Published' : 'Draft'}</strong> · {hasStore ? 'live now' : 'not published yet'}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {error && <span style={{ color: '#ef4444', fontSize: 13, marginRight: 'auto' }}>{error}</span>}
            <button type="button" onClick={handlePreview} style={{ background: C.bg, color: C.ink, border: `1px solid ${C.lineStrong}`, padding: '10px 18px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>Preview live</button>
            <button type="button" onClick={handlePublish} disabled={saving} style={{ background: saving ? C.lineStrong : C.blue, color: '#fff', border: `1px solid ${saving ? C.lineStrong : C.blue}`, padding: '10px 22px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', minHeight: 44 }}>{saving ? 'Saving…' : (hasStore ? 'Save changes' : 'Publish store')}</button>
          </div>
        </div>
      </div>

      <div style={{ height: 80 }} />

      <style>{`@media (max-width:960px){.store-create-grid{grid-template-columns:1fr!important}.store-create-preview{position:static!important}}`}</style>
    </>
  );
}
