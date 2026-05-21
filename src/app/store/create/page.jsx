'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

async function uploadImage(file) {
  const key = process.env.NEXT_PUBLIC_IMGBB_KEY;
  if (!key) throw new Error('Image upload not configured');
  const fd = new FormData();
  fd.append('image', file);
  const r = await fetch('https://api.imgbb.com/1/upload?key=' + key, { method: 'POST', body: fd });
  const d = await r.json();
  if (!d.success) throw new Error('Upload failed');
  return d.data.url;
}

const C = {
  ink: '#14161a', muted: '#5b6370', line: '#e7e9ed', lineStrong: '#cfd2d7',
  bg: '#ffffff', bgSoft: '#f5f6f8', bgSofter: '#eef0f4',
  blue: '#3b82f6', blueDark: '#2563eb', green: '#10b981',
};

const CATS = ['CS2 skins', 'Valorant', 'Fortnite', 'Dota 2', 'WoW gold', 'Accounts', 'Physical'];
const RESPONSES = ['Within 4 hours (business hours)', 'Within 12 hours', 'Within 24 hours', 'Within 48 hours'];

const sectionStyle = { background: C.bg, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, marginBottom: 16 };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.ink };
const hintStyle = { fontSize: 12, color: C.muted, marginTop: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.lineStrong}`, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: C.ink, minHeight: 44, boxSizing: 'border-box' };

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      style={{ position: 'relative', width: 40, height: 24, flexShrink: 0, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 999, background: checked ? C.blue : C.lineStrong, transition: 'background 0.15s' }}>
      <span style={{ position: 'absolute', top: 2, left: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'transform 0.15s', transform: checked ? 'translateX(16px)' : 'translateX(0)', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
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
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [cats, setCats] = useState([]);
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user === null) return;
    if (!user) { router.push('/'); return; }
    api.stores.mine().then((d) => {
      if (d.store) {
        setName(d.store.name || '');
        setHandle(d.handle || '');
        setCats(d.store.categories || []);
        setTagline(d.store.tagline || '');
        setAbout(d.store.about || '');
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
  }, [user, router]);

  const toggleCat = (c) => setCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : (prev.length >= 4 ? prev : [...prev, c]));

  const handleLogoFile = async (file) => {
    if (!file) return;
    setLogo(file); setError('');
    try { setLogoUrl(await uploadImage(file)); }
    catch (e) { setError('Logo upload failed: ' + e.message); }
  };
  const handleBannerFile = async (file) => {
    if (!file) return;
    setBanner(file); setError('');
    try { setBannerUrl(await uploadImage(file)); }
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
    if (handle && /^[a-z0-9-]{3,40}$/.test(handle)) window.open('/store/' + handle, '_blank');
    else setError('Set a valid store URL first to preview');
  };

  const handlePublish = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError(''); setSaving(true);
    try {
      await api.stores.save({
        name, handle, tagline, about, categories: cats,
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

        <header style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 6 }}>Seller setup</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.4px', lineHeight: 1.2, marginBottom: 8, margin: 0, color: C.ink }}>Create your store</h1>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 560, marginTop: 8 }}>Set up a storefront buyers can discover and follow. Everything here is editable later — nothing is locked in until your first listing sells.</p>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATS.map((c) => {
                    const on = cats.includes(c);
                    return (
                      <button key={c} type="button" aria-pressed={on} onClick={() => toggleCat(c)}
                        style={{ padding: '7px 13px', background: on ? C.ink : C.bg, border: `1px solid ${on ? C.ink : C.line}`, borderRadius: 999, fontSize: 13, fontWeight: 500, color: on ? '#fff' : C.ink, cursor: 'pointer', fontFamily: 'inherit', minHeight: 36 }}>{c}</button>
                    );
                  })}
                </div>
                <div style={hintStyle}>Helps buyers find you in category browsing. Pick up to 4.</div>
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, margin: 0, color: C.ink }}>Storefront branding</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Logo, banner, and tagline appear at the top of your store.</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Logo</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 12, background: C.bgSoft, border: `1.5px dashed ${C.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, flexShrink: 0, overflow: 'hidden' }} aria-hidden="true">
                    {logoUrl ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><polyline points="21 15 16 10 5 21" /></svg>}
                  </div>
                  <div>
                    <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleLogoFile(e.target.files?.[0])} />
                    <button type="button" onClick={() => document.getElementById('logo-upload').click()} style={{ minHeight: 36, padding: '8px 14px', fontSize: 13, background: C.bg, border: `1px solid ${C.lineStrong}`, borderRadius: 8, color: C.ink, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Upload logo</button>
                    <div style={{ ...hintStyle }}>{logo ? logo.name : 'Square, 256×256 or larger. PNG, JPG, or SVG.'}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Cover banner</label>
                <input type="file" id="banner-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBannerFile(e.target.files?.[0])} />
                <div onClick={() => document.getElementById('banner-upload').click()} style={{ aspectRatio: '3 / 1', background: bannerUrl ? `center/cover no-repeat url(${bannerUrl})` : C.bgSoft, border: `1.5px dashed ${C.lineStrong}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: C.muted, cursor: 'pointer' }}>
                  {!bannerUrl && <><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{banner ? banner.name : 'Drop an image or click to browse'}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>3:1 ratio recommended (1500×500). PNG or JPG, up to 5 MB.</div></>}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Tagline</label>
                <input style={inputStyle} type="text" maxLength={80} placeholder="One sentence under your store name." value={tagline} onChange={(e) => setTagline(e.target.value)} />
                <div style={hintStyle}>One sentence under your store name. Max 80 characters.</div>
              </div>
              <div>
                <label style={labelStyle}>About</label>
                <textarea style={{ ...inputStyle, minHeight: 96, resize: 'vertical', lineHeight: 1.5 }} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Tell buyers about your store, sourcing, and turnaround." />
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
          </div>

          <aside style={{ position: 'sticky', top: 80 }} className="store-create-preview">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2.5" /><path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" /></svg>
              What buyers will see
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '3 / 1', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }} aria-hidden="true" />
              <div style={{ padding: '0 16px 16px', position: 'relative' }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, border: `3px solid ${C.bg}`, marginTop: -28 }} aria-hidden="true">{initials}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: C.ink }}>
                  {displayName}
                  <span style={{ color: C.blue, display: 'inline-flex' }} aria-label="Verified seller">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 1l1.6 1.4 2.1-.3.5 2 1.8 1.1-.9 1.9.5 2.1-2 .8-.9 1.9-2-.5-1.7 1.3-1.7-1.3-2 .5-.9-1.9-2-.8.5-2.1L0 5.2l1.8-1.1.5-2 2.1.3z" /><polyline points="5 8 7 10 11 6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{tagline || 'Your tagline appears here.'}</div>
                <div style={{ display: 'flex', gap: 16, padding: '12px 0', marginTop: 12, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.muted }}>
                  <span><strong style={{ color: C.ink, fontWeight: 700 }}>0</strong> sales</span>
                  <span><strong style={{ color: C.ink, fontWeight: 700 }}>New</strong> store</span>
                  <span><strong style={{ color: C.ink, fontWeight: 700 }}>{responseShort}</strong> response</span>
                </div>
                <div style={{ paddingTop: 12, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>{about ? (about.length > 120 ? about.slice(0, 120) + '…' : about) : 'Your store description appears here.'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <button type="button" style={{ background: C.ink, color: '#fff', border: `1px solid ${C.ink}`, padding: 9, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Follow store</button>
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
            <strong style={{ color: C.ink }}>Draft</strong> · not published yet
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {error && <span style={{ color: '#ef4444', fontSize: 13, marginRight: 'auto' }}>{error}</span>}
            <button type="button" onClick={handlePreview} style={{ background: C.bg, color: C.ink, border: `1px solid ${C.lineStrong}`, padding: '10px 18px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>Preview live</button>
            <button type="button" onClick={handlePublish} disabled={saving} style={{ background: saving ? C.lineStrong : C.blue, color: '#fff', border: `1px solid ${saving ? C.lineStrong : C.blue}`, padding: '10px 22px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', minHeight: 44 }}>{saving ? 'Publishing…' : 'Publish store'}</button>
          </div>
        </div>
      </div>

      <div style={{ height: 80 }} />

      <style>{`@media (max-width:960px){.store-create-grid{grid-template-columns:1fr!important}.store-create-preview{position:static!important}}`}</style>
    </>
  );
}
