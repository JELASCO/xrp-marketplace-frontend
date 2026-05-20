'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../../lib/store';

export default function CreateStorePage() {
  const { user } = useAuthStore(s => s);

  const [storeName, setStoreName] = useState('');
  const [handle, setHandle] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [autoEscrow, setAutoEscrow] = useState(true);
  const [requireScreenshot, setRequireScreenshot] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [responseTime, setResponseTime] = useState('Within 4 hours (business hours)');
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [destTag, setDestTag] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const categories = ['CS2', 'Valorant', 'Fortnite', 'Dota 2', 'Rocket League', 'WoW', 'LoL', 'Apex Legends', 'Minecraft', 'Physical'];

  const toggleCat = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const s = {
    page: { maxWidth: 1280, margin: '0 auto', padding: '40px 24px 120px' },
    backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text2)', textDecoration: 'none', fontSize: 14, marginBottom: 24 },
    eyebrow: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)', marginBottom: 6 },
    h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.4px', lineHeight: 1.2, marginBottom: 8, color: 'var(--text)' },
    subtitle: { fontSize: 15, color: 'var(--text2)', maxWidth: 560, marginBottom: 32 },
    grid: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40, alignItems: 'start' },
    section: { background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 16, padding: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 2, color: 'var(--text)' },
    sectionDesc: { fontSize: 13, color: 'var(--text2)', marginBottom: 16 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' },
    hint: { fontSize: 12, color: 'var(--text2)', marginTop: 6 },
    input: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 14, color: 'var(--text)', minHeight: 44, fontFamily: 'inherit' },
    textarea: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 14, color: 'var(--text)', minHeight: 96, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' },
    select: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 14, color: 'var(--text)', minHeight: 44, fontFamily: 'inherit' },
    field: { marginBottom: 16 },
    prefixWrap: { display: 'flex', alignItems: 'stretch', border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden' },
    prefix: { padding: '0 12px', fontSize: 13, color: 'var(--text2)', background: 'var(--surface)', borderRight: '1px solid var(--border2)', display: 'flex', alignItems: 'center', fontFamily: 'monospace' },
    prefixInput: { border: 'none', flex: 1, padding: '10px 12px', minHeight: 44, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' },
    toggleRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)' },
    toggleText: { flex: 1 },
    toggleTitle: { fontSize: 14, fontWeight: 600, marginBottom: 2, color: 'var(--text)' },
    toggleDesc: { fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 },
    tagPicker: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    uploadBanner: { aspectRatio: '3/1', background: 'var(--surface)', border: '1.5px dashed var(--border2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: 'var(--text2)', cursor: 'pointer' },
    // preview
    previewWrap: { position: 'sticky', top: 80 },
    previewLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text2)', marginBottom: 12 },
    previewCard: { background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 16, overflow: 'hidden' },
    previewBanner: { aspectRatio: '3/1', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' },
    previewBody: { padding: '0 16px 16px', position: 'relative' },
    previewLogo: { width: 64, height: 64, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, border: '3px solid var(--bg)', position: 'relative', marginTop: -28, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    previewName: { fontSize: 18, fontWeight: 700, marginTop: 12, color: 'var(--text)' },
    previewTagline: { fontSize: 13, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 },
    previewStats: { display: 'flex', gap: 16, padding: '10px 0', marginTop: 10, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' },
    previewAbout: { paddingTop: 10, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 },
    previewNote: { fontSize: 12, color: 'var(--text2)', marginTop: 12, textAlign: 'center', lineHeight: 1.5 },
    // action bar
    actionBar: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg)', borderTop: '1px solid var(--border2)', zIndex: 40 },
    actionBarInner: { maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    actionInfo: { fontSize: 13, color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 6 },
    btnSecondary: { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border2)', padding: '10px 18px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 },
    btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 },
  };

  const initials = storeName ? storeName.substring(0, 2).toUpperCase() : 'RV';

  return (
    <div>
      <div style={s.page}>
        <Link href="/dashboard" style={s.backLink}>← Back to dashboard</Link>

        <div style={{ marginBottom: 32 }}>
          <div style={s.eyebrow}>Seller setup</div>
          <h1 style={s.h1}>Create your store</h1>
          <p style={s.subtitle}>Set up a storefront buyers can discover and follow. Everything here is editable later — nothing is locked in until your first listing sells.</p>
        </div>

        <div style={s.grid}>
          {/* LEFT */}
          <form>
            {/* Section 1: Identity */}
            <section style={s.section}>
              <div style={{ marginBottom: 16 }}>
                <div style={s.sectionTitle}>Store identity</div>
                <div style={s.sectionDesc}>How your store appears on XRPHarbor.</div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Store name</label>
                <input style={s.input} type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Ripple Vault" maxLength={40} />
                <div style={s.hint}>Max 40 characters. Shown on all your listings.</div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Handle</label>
                <div style={s.prefixWrap}>
                  <span style={s.prefix}>xrpharbor.com/@</span>
                  <input style={s.prefixInput} type="text" value={handle} onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="ripple_vault" maxLength={24} />
                </div>
                <div style={s.hint}>Lowercase, letters/numbers/underscores. Cannot be changed after first sale.</div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Store logo</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 10, background: 'var(--surface)', border: '1.5px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 12 }}>⬆</div>
                  <div>
                    <button type="button" style={{ ...s.btnSecondary, minHeight: 36, padding: '8px 14px', fontSize: 13 }}>Upload logo</button>
                    <div style={{...s.hint, marginTop: 6}}>PNG, JPG or SVG. 400 × 400px, max 2 MB.</div>
                  </div>
                </div>
              </div>

              <div style={{ ...s.field, marginBottom: 0 }}>
                <label style={s.label}>Banner</label>
                <div style={s.uploadBanner}>
                  <span style={{ fontSize: 20 }}>🖼</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Click to upload banner</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>1500 × 500px · max 5 MB</span>
                </div>
              </div>
            </section>

            {/* Section 2: Profile */}
            <section style={s.section}>
              <div style={{ marginBottom: 16 }}>
                <div style={s.sectionTitle}>Store profile</div>
                <div style={s.sectionDesc}>Help buyers understand who you are and what you sell.</div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Categories</label>
                <div style={s.tagPicker}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCat(cat)}
                      style={{ padding: '7px 13px', background: selectedCategories.includes(cat) ? 'var(--text)' : 'var(--bg)', border: `1px solid ${selectedCategories.includes(cat) ? 'var(--text)' : 'var(--border2)'}`, borderRadius: 999, fontSize: 13, fontWeight: 500, color: selectedCategories.includes(cat) ? '#fff' : 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', minHeight: 36 }}
                    >{cat}</button>
                  ))}
                </div>
                <div style={s.hint}>Select all that apply. Improves search visibility.</div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Tagline</label>
                <input style={s.input} type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="CS2 knives and rare patterns, escrowed in XRP." maxLength={80} />
                <div style={s.hint}>One sentence under your store name. Max 80 characters.</div>
              </div>

              <div style={{ ...s.field, marginBottom: 0 }}>
                <label style={s.label}>About</label>
                <textarea style={s.textarea} value={about} onChange={e => setAbout(e.target.value)} placeholder="Tell buyers about your store, what you sell, and how long you've been active." />
              </div>
            </section>

            {/* Section 3: Policies */}
            <section style={s.section}>
              <div style={{ marginBottom: 16 }}>
                <div style={s.sectionTitle}>Policies &amp; commitments</div>
                <div style={s.sectionDesc}>What buyers can count on. These appear on every listing.</div>
              </div>

              {[
                { key:'autoEscrow', val:autoEscrow, set:setAutoEscrow, title:'Auto-accept escrow offers', desc:'Buyer commits → funds lock in escrow without you confirming first. Recommended for digital items.' },
                { key:'screenshot', val:requireScreenshot, set:setRequireScreenshot, title:'Require Steam-profile screenshot on listings', desc:'Adds a verified-source badge to your items. Slightly slower to list, materially more trust.' },
                { key:'vacation', val:vacationMode, set:setVacationMode, title:'Vacation mode', desc:'Hide your listings without removing them. Useful when you can't respond for over 24 hours.' },
              ].map((item, idx, arr) => (
                <div key={item.key} style={{ ...s.toggleRow, borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: idx < arr.length - 1 ? 14 : 0 }}>
                  <div style={s.toggleText}>
                    <div style={s.toggleTitle}>{item.title}</div>
                    <div style={s.toggleDesc}>{item.desc}</div>
                  </div>
                  <div
                    onClick={() => item.set(!item.val)}
                    style={{ position: 'relative', width: 40, height: 24, borderRadius: 999, background: item.val ? 'var(--accent)' : 'var(--border2)', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                  >
                    <div style={{ position: 'absolute', top: 2, left: item.val ? 18 : 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                  </div>
                </div>
              ))}

              <div style={{ ...s.field, marginTop: 16, marginBottom: 0 }}>
                <label style={s.label}>Response-time commitment</label>
                <select style={s.select} value={responseTime} onChange={e => setResponseTime(e.target.value)}>
                  <option>Within 4 hours (business hours)</option>
                  <option>Within 12 hours</option>
                  <option>Within 24 hours</option>
                  <option>Within 48 hours</option>
                </select>
                <div style={s.hint}>Shown publicly. If you miss it, the buyer can cancel a pending order without penalty.</div>
              </div>
            </section>

            {/* Section 4: Payout */}
            <section style={{ ...s.section, marginBottom: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={s.sectionTitle}>Payout</div>
                <div style={s.sectionDesc}>Where escrowed XRP settles when a buyer confirms delivery.</div>
              </div>

              <div style={s.field}>
                <label style={s.label}>XRP Ledger address</label>
                <input style={{ ...s.input, fontFamily: 'monospace', fontSize: 13 }} type="text" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="r..." />
                <div style={s.hint}>Public r-address only. Never paste your secret key.</div>
              </div>

              <div style={{ ...s.field, marginBottom: 0 }}>
                <label style={s.label}>Destination tag <span style={{ color: 'var(--text2)', fontWeight: 500 }}>(optional)</span></label>
                <input style={{ ...s.input, fontFamily: 'monospace', fontSize: 13 }} type="text" value={destTag} onChange={e => setDestTag(e.target.value)} placeholder="e.g. 4827" />
                <div style={s.hint}>Required if your wallet is hosted on an exchange (Bitstamp, Bitso, etc.).</div>
              </div>
            </section>
          </form>

          {/* RIGHT: preview */}
          <aside style={s.previewWrap}>
            <div style={s.previewLabel}>👁 What buyers will see</div>
            <div style={s.previewCard}>
              <div style={s.previewBanner} />
              <div style={s.previewBody}>
                <div style={s.previewLogo}>{initials}</div>
                <div style={s.previewName}>{storeName || 'Your store name'}</div>
                <div style={s.previewTagline}>{tagline || 'Your tagline will appear here.'}</div>
                <div style={s.previewStats}>
                  <span><strong>0</strong> sales</span>
                  <span><strong>New</strong> store</span>
                  <span><strong>{responseTime.split(' ').slice(0,2).join('')}</strong> response</span>
                </div>
                <div style={s.previewAbout}>{about ? about.substring(0, 120) + (about.length > 120 ? '…' : '') : 'Your about section will appear here.'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <button style={{ background: 'var(--text)', color: '#fff', border: 'none', padding: 9, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Follow store</button>
                  <button style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border2)', padding: 9, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Message</button>
                </div>
              </div>
            </div>
            <p style={s.previewNote}>Listings appear below the header once you publish your first item. The preview updates as you edit.</p>
          </aside>
        </div>
      </div>

      {/* Action bar */}
      <div style={s.actionBar}>
        <div style={s.actionBarInner}>
          <div style={s.actionInfo}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            <strong>Draft saved</strong> · a few seconds ago
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btnSecondary} type="button">Preview live</button>
            <button style={s.btnPrimary} type="button">Publish store</button>
          </div>
        </div>
      </div>
    </div>
  );
}
