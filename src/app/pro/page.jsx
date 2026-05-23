'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

export default function ProPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);
  const [pricing, setPricing] = useState(null);
  const [modal, setModal] = useState(null); // { qrUrl, deepLink, paymentId, days, kind }
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push('/'); return; }
    api.upgrades.pricing().then(setPricing).catch(() => {});
  }, [user, hydrated, router]);

  async function buyPro() {
    setError('');
    try {
      const r = await api.upgrades.payload('pro');
      if (r.uuid || r.qrUrl) setModal({ qrUrl: r.qrUrl, deepLink: r.deepLink, paymentId: r.paymentId, days: r.days, kind: 'pro' });
      else setError(r.error || 'Could not start payment');
    } catch (e) { setError(e.message); }
  }

  async function verify() {
    if (!modal) return;
    setVerifying(true); setError('');
    try {
      const r = await api.upgrades.verify(modal.paymentId);
      if (r.ok) { setModal(null); setDone('Pro activated! Your lower fees and badge are now live.'); }
      else setError(r.error || 'Not verified yet');
    } catch (e) { setError(e.message); }
    setVerifying(false);
  }

  if (!hydrated || !user) return null;

  const proActive = user.proUntil && new Date(user.proUntil) > new Date();
  const C = { card:'var(--surface)', border:'var(--border)', accent:'var(--accent)' };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>XRPHarbor Pro</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Sell more, pay less</h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>Upgrade to Pro for lower marketplace fees, a trust badge, and priority placement — or feature a single listing to push it to the top.</p>
      </div>

      {done && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '14px 16px', color: '#34d399', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>{done}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
        {/* Pro subscription */}
        <div style={{ background: C.card, border: `1px solid ${proActive ? 'rgba(59,130,246,0.4)' : C.border}`, borderRadius: 16, padding: 28, position: 'relative' }}>
          {proActive && <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', borderRadius: 6, padding: '3px 8px' }}>ACTIVE</div>}
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>⭐ Pro Membership</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>{pricing ? pricing.pro.xrp : '—'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>XRP</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>/ {pricing ? pricing.pro.days : 30} days</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Lower fee: <strong style={{ color: 'var(--text)' }}>{pricing ? (pricing.proCommissionRate*100).toFixed(1) : '1.5'}%</strong> instead of {pricing ? (pricing.standardCommissionRate*100).toFixed(1) : '3'}%</li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Pro badge on your profile & listings</li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Priority placement in search</li>
          </ul>
          {proActive
            ? <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>Active until {new Date(user.proUntil).toLocaleDateString()}. Buying again extends it.</div>
            : null}
          <button onClick={buyPro} style={{ width: '100%', marginTop: proActive ? 10 : 0, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {proActive ? 'Extend Pro' : 'Get Pro'}
          </button>
        </div>

        {/* Feature a listing */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🔥 Feature a Listing</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>{pricing ? pricing.featured.xrp : '—'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>XRP</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>/ {pricing ? pricing.featured.days : 7} days</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Pinned to the top of the marketplace</li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ "Featured" badge on the card</li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Per-listing — no subscription</li>
          </ul>
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>Go to one of your listings and tap "Feature this listing".</div>
          <button onClick={() => router.push('/dashboard')} style={{ width: '100%', background: 'transparent', color: 'var(--text)', border: `1px solid var(--border2)`, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Go to my listings
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginTop: 16 }}>{error}</div>}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Pay {modal.days}-day Pro</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Scan with Xumm to pay the membership fee.</div>
            {modal.qrUrl && <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}><img src={modal.qrUrl} alt="QR" style={{ width: 192, height: 192, display: 'block' }} /></div>}
            {modal.deepLink && <a href={modal.deepLink} style={{ display: 'block', background: 'var(--accent)', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Open in Xumm App</a>}
            <button onClick={verify} disabled={verifying} style={{ width: '100%', background: verifying ? 'var(--surface2)' : 'rgba(16,185,129,0.12)', color: verifying ? 'var(--text3)' : '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 600, cursor: verifying ? 'default' : 'pointer' }}>
              {verifying ? 'Checking…' : "I've paid — activate Pro"}
            </button>
            <button onClick={() => setModal(null)} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}
