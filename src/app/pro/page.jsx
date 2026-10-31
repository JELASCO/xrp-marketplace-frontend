'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import XummLoginModal from '../../components/XummLoginModal';

export default function ProPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [pricing, setPricing] = useState({
    pro: { days: 30, xrp: 50 },
    featured: { days: 7, xrp: 10 },
  });
  const [modal, setModal] = useState(null); // { qrUrl, deepLink, paymentId, days, kind }
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [foundingStatus, setFoundingStatus] = useState({ total: 100, claimed: 14, remaining: 86, alreadyClaimed: false });
  const [claimingFounding, setClaimingFounding] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingFoundingClaim, setPendingFoundingClaim] = useState(false);
  const [isFoundingIntent, setIsFoundingIntent] = useState(false);
  const autoClaimTriggeredRef = useRef(false);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  }

  // Detect ?claim=founding100 on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('claim') === 'founding100') {
      setIsFoundingIntent(true);
      setPendingFoundingClaim(true);
    }
  }, []);

  // Fetch pricing & Founding 100 status for both logged-out and logged-in visitors
  useEffect(() => {
    api.upgrades
      .pricing()
      .then((d) => {
        if (d && d.pro) setPricing(d);
      })
      .catch(() => {});

    const fetchFounding = api.pro?.foundingStatus
      ? api.pro.foundingStatus()
      : fetch('/api/pro/founding-status').then((r) => r.json());

    Promise.resolve(fetchFounding)
      .then((d) => {
        if (d) {
          const total = d.total || d.totalSlots || 100;
          const remaining =
            typeof d.remaining === 'number'
              ? d.remaining
              : typeof d.remainingSlots === 'number'
              ? d.remainingSlots
              : 86;
          const claimed =
            typeof d.claimed === 'number'
              ? d.claimed
              : typeof d.claimedSlots === 'number'
              ? d.claimedSlots
              : total - remaining;
          setFoundingStatus({
            total,
            claimed,
            remaining,
            alreadyClaimed: Boolean(d.alreadyClaimed),
          });
        }
      })
      .catch(() => {});
  }, [user]);

  // Handle ?claim=founding100 intent once auth store is hydrated
  useEffect(() => {
    if (!hydrated || !pendingFoundingClaim) return;
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (!autoClaimTriggeredRef.current) {
      autoClaimTriggeredRef.current = true;
      setPendingFoundingClaim(false);
      claimFoundingPro();
    }
  }, [hydrated, user, pendingFoundingClaim]);

  async function claimFoundingPro() {
    setError('');
    if (!user) {
      setPendingFoundingClaim(true);
      setShowLogin(true);
      return;
    }
    setClaimingFounding(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('xrpmarket_token') : null;
      const r = api.pro?.claimFounding
        ? await api.pro.claimFounding()
        : await fetch('/api/pro/claim-founding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not claim Founding Creator Pro');
            return data;
          });

      const msg =
        r.message ||
        (r.alreadyClaimed
          ? '🎉 Your Founding 100 Creator Pro membership is active! Redirecting to your Pro Storefront…'
          : '🎉 Founding 100 Creators Pro activated! You now have 30 days of free XRPHarbor Pro.');
      setDone(msg);
      showToast(msg);

      const rem =
        typeof r?.remaining === 'number'
          ? r.remaining
          : typeof r?.remainingSlots === 'number'
          ? r.remainingSlots
          : null;
      if (rem !== null) {
        setFoundingStatus((prev) => ({
          ...prev,
          remaining: rem,
          claimed: (prev.total || 100) - rem,
          alreadyClaimed: true,
        }));
      }
      if (refreshUser) await refreshUser();
      setTimeout(() => {
        router.push('/store/create');
      }, 1400);
    } catch (e) {
      const errMsg = e.message || 'Could not claim Founding Creator Pro';
      setError(errMsg);
    } finally {
      setClaimingFounding(false);
    }
  }

  async function buyPro() {
    setError('');
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      const r = await api.upgrades.payload('pro');
      if (r.uuid || r.qrUrl) {
        setModal({
          qrUrl: r.qrUrl,
          deepLink: r.deepLink,
          paymentId: r.paymentId,
          days: r.days || 30,
          kind: 'pro',
        });
      } else {
        setError(r.error || 'Could not start payment');
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function verify() {
    if (!modal) return;
    setVerifying(true);
    setError('');
    try {
      const r = await api.upgrades.verify(modal.paymentId);
      if (r.ok) {
        setModal(null);
        const msg = 'Pro activated! Your Pro badge and priority search placement are now live.';
        setDone(msg);
        showToast(msg);
        if (refreshUser) await refreshUser();
      } else {
        setError(r.error || 'Not verified yet');
      }
    } catch (e) {
      setError(e.message);
    }
    setVerifying(false);
  }

  const proUntilVal = user && (user.proUntil || user.pro_until || user.pro_expires_at);
  const proActive = Boolean(
    user &&
      ((proUntilVal && new Date(proUntilVal) > new Date()) ||
        user.is_pro ||
        user.isPro ||
        foundingStatus.alreadyClaimed)
  );
  const C = { card: 'var(--surface)', border: 'var(--border)', accent: 'var(--accent)' };

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 64px' }}>
      {showLogin && <XummLoginModal onClose={() => setShowLogin(false)} />}
      {toastMsg && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 250,
            background: '#064e3b',
            color: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 12,
            padding: '13px 18px',
            fontSize: 13.5,
            fontWeight: 700,
            boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          {toastMsg}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 34 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 8,
          }}
        >
          XRPHarbor Pro
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
          Stand out and sell faster
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          Upgrade to Pro for a custom <code style={{ fontSize: 13 }}>/store/handle</code> storefront, verified Pro badge, priority search ranking, and creator CRM perks — or claim your Founding 100 Creator slot free.
        </p>
      </div>

      {isFoundingIntent && !user && (
        <div
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 12,
            padding: '14px 18px',
            color: 'var(--text)',
            fontSize: 13.5,
            marginBottom: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>
            🚀 <strong>Founding 100 Creators Offer Ready:</strong> Connect your Xaman wallet to activate your free 30-day Pro membership &amp; open your custom storefront.
          </span>
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            style={{
              background: '#2080F5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Connect Xaman Wallet →
          </button>
        </div>
      )}

      {done && (
        <div
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.35)',
            borderRadius: 12,
            padding: '16px 18px',
            color: '#10b981',
            fontSize: 14,
            marginBottom: 24,
            textAlign: 'center',
            fontWeight: 700,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div>{done}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/store/create"
              style={{
                background: '#10b981',
                color: '#06281e',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Open &amp; Customize Your Pro Storefront →
            </Link>
            <Link
              href="/dashboard"
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Go to Creator Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Founding 100 Creators Launch Campaign Card */}
      <div
        id="founding100"
        style={{
          background: 'linear-gradient(135deg, #0b192c 0%, #132c4e 55%, #1e3a8a 100%)',
          border: isFoundingIntent ? '2px solid #f59e0b' : '1px solid rgba(245,158,11,0.45)',
          borderRadius: 18,
          padding: '22px 20px',
          marginBottom: 26,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 18,
          boxShadow: '0 14px 34px rgba(11,25,44,0.25)',
          minWidth: 0,
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(245,158,11,0.18)',
              border: '1px solid rgba(245,158,11,0.45)',
              color: '#fbbf24',
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: 'DM Mono,monospace',
              marginBottom: 10,
              maxWidth: '100%',
              flexWrap: 'wrap',
            }}
          >
            🚀 FOUNDING 100 CREATORS LAUNCH CAMPAIGN · {foundingStatus.remaining} / {foundingStatus.total} SLOTS LEFT
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
            First 100 Creators Get 30 Days of Pro Membership FREE
          </div>
          <div style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.55 }}>
            Claim your Founding Creator slot to unlock a custom <code style={{ color: '#fbbf24' }}>/store/handle</code> storefront, Conversion &amp; Vault Download Analytics, Buyer CSV Export, Product Update Alerts, and 1 free 7-day Featured Boost — with{' '}
            <strong style={{ color: '#fff' }}>0 XRP upfront</strong>.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, flex: '1 1 230px', minWidth: 0 }}>
          <button
            type="button"
            onClick={claimFoundingPro}
            disabled={claimingFounding || foundingStatus.remaining <= 0}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0b192c',
              border: 'none',
              borderRadius: 11,
              padding: '13px 16px',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: claimingFounding ? 'wait' : 'pointer',
              boxShadow: '0 6px 18px rgba(245,158,11,0.3)',
              width: '100%',
            }}
          >
            {claimingFounding
              ? 'Activating Founding Pro…'
              : !user
              ? '🎁 Connect Wallet & Claim Free 30-Day Pro'
              : foundingStatus.alreadyClaimed
              ? '✨ Founding Pro Active — Open Store Builder →'
              : '🎁 Claim Free 30-Day Pro (Founding Creator)'}
          </button>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'DM Mono,monospace', textAlign: 'center' }}>
            Instant activation · 1 claim per wallet · 0 XRP required
          </span>
        </div>
      </div>

      <div id="pricing" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
        {/* Pro subscription */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${proActive ? 'rgba(59,130,246,0.4)' : C.border}`,
            borderRadius: 16,
            padding: 28,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {proActive && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(59,130,246,0.15)',
                color: 'var(--accent)',
                borderRadius: 6,
                padding: '3px 8px',
              }}
            >
              ACTIVE
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>⭐ Pro Membership</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>{pricing ? pricing.pro.xrp : 50}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>XRP</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>/ {pricing ? pricing.pro.days : 30} days</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>
              ✓ <strong style={{ color: 'var(--text)' }}>Custom Pro Storefront</strong> (<code style={{ fontSize: 12 }}>/store/your-name</code>) with live announcement bar, specialty tags, promo code &amp; FAQ accordion
            </li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>
              ✓ <strong style={{ color: 'var(--text)' }}>Creator CRM &amp; Analytics Suite</strong>: Conversion rate tracking, Vault download metrics, <strong style={{ color: 'var(--text)' }}>Buyer CSV Export</strong> &amp; 1-click <strong style={{ color: 'var(--text)' }}>Product Update Alerts</strong> to past buyers
            </li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>
              ✓ <strong style={{ color: 'var(--text)' }}>Animated .GIF &amp; Live Avatars</strong> + <strong style={{ color: 'var(--text)' }}>360° Rotating Glowing Frames</strong> for your profile &amp; store logo
            </li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>
              ✓ <strong style={{ color: 'var(--text)' }}>Unlimited active listings</strong> &amp; up to <strong style={{ color: 'var(--text)' }}>6 photos</strong> per listing (Standard: 30 listings / 3 photos)
            </li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>
              ✓ <strong style={{ color: 'var(--text)' }}>1 FREE 7-day Featured Listing boost</strong> every 30 days (10 XRP value)
            </li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>
              ✓ Featured in the <Link href="/stores" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Verified Pro Stores</Link> directory &amp; shimmering{' '}
              <span className="xh-pro" style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                PRO
              </span>{' '}
              badge
            </li>
          </ul>
          {proActive && proUntilVal ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
              Active until {new Date(proUntilVal).toLocaleDateString('en-US')}. Buying again extends it.
            </div>
          ) : null}
          <button
            onClick={buyPro}
            style={{
              width: '100%',
              marginTop: 'auto',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {proActive ? 'Extend Pro (50 XRP)' : 'Get Pro (50 XRP)'}
          </button>
        </div>

        {/* Feature a listing */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🔥 Feature a Listing</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)' }}>{pricing ? pricing.featured.xrp : 10}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>XRP</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>/ {pricing ? pricing.featured.days : 7} days</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Pinned to the very top of the homepage (&ldquo;Today&rsquo;s catch&rdquo;) &amp; marketplace</li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Highlighted &ldquo;FEATURED&rdquo; badge on the listing card</li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>
              ✓ <strong style={{ color: '#10b981' }}>Pro members get 1 FREE 7-day boost every month!</strong>
            </li>
            <li style={{ fontSize: 13, color: 'var(--text2)' }}>✓ Per-listing — no subscription required</li>
          </ul>
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
            Go to one of your listings and tap &ldquo;Feature this listing&rdquo;.
          </div>
          <button
            onClick={() => (user ? router.push('/dashboard') : setShowLogin(true))}
            style={{
              width: '100%',
              marginTop: 'auto',
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border2)',
              borderRadius: 10,
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {user ? 'Go to my listings' : 'Sign in to feature a listing'}
          </button>
        </div>
      </div>

      {/* Standard vs Pro Comparison Table */}
      <div style={{ marginTop: 32, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 18px', overflowX: 'auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Standard vs. Pro Comparison</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1.5fr) minmax(90px, 1fr) minmax(100px, 1fr)', gap: 8, fontSize: 12.5, alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--text3)', paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>Feature</div>
          <div style={{ fontWeight: 700, color: 'var(--text3)', paddingBottom: 8, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>Standard (Free)</div>
          <div style={{ fontWeight: 800, color: '#f59e0b', paddingBottom: 8, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>★ Pro (50 XRP / 30d)</div>

          {[
            ['Sales Commission Fee', '0% (Keep 100%)', '0% (Keep 100%)'],
            ['Active Listings Limit', 'Up to 30 active listings', 'Unlimited'],
            ['Photos per Listing', 'Up to 3 photos', 'Up to 6 photos'],
            ['Creator Social & Portfolio Links', '✓ Included (Free)', '✓ Included (Free)'],
            ['1-Click Gumroad / itch.io Importer', '✓ Included (Free)', '✓ Included (Free)'],
            ['Encrypted Asset Vault + SHA-256 Proof', '✓ Included (Free)', '✓ Included (Free)'],
            ['Conversion Rate & Vault Download Analytics', '—', '✓ Included'],
            ['Buyer List CSV Export & Product Update Alerts', '—', '✓ Included'],
            ['Custom Storefront (/store/handle) & Promo Codes', '—', '✓ Included'],
            ['Store Live Announcement & Pinned Showcase', '—', '✓ Included'],
            ['Dedicated /stores Directory Showcase', '—', '✓ Included'],
            ['Monthly Free 7-Day Featured Listing Boost', '—', '✓ 1 Free Boost / mo'],
            ['Marketplace Search Ranking', 'Standard', '★ Priority Top Tier'],
          ].map(([feat, std, pro], i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, color: 'var(--text)', fontWeight: 500 }}>{feat}</div>
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, color: 'var(--text2)', textAlign: 'center' }}>{std}</div>
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, color: 'var(--text)', fontWeight: 700, textAlign: 'center' }}>{pro}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginTop: 16 }}>{error}</div>}

      {modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 20,
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Pay {modal.days}-day Pro</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Scan with Xaman to pay the membership fee.</div>
            {modal.qrUrl && (
              <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
                <img src={modal.qrUrl} alt="QR" style={{ width: 192, height: 192, display: 'block' }} />
              </div>
            )}
            {modal.deepLink && (
              <a
                href={modal.deepLink}
                style={{
                  display: 'block',
                  background: 'var(--accent)',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 8,
                  padding: '10px',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                Open in Xaman App
              </a>
            )}
            <button
              onClick={verify}
              disabled={verifying}
              style={{
                width: '100%',
                background: verifying ? 'var(--surface2)' : 'rgba(16,185,129,0.12)',
                color: verifying ? 'var(--text3)' : '#34d399',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 8,
                padding: '11px',
                fontSize: 13,
                fontWeight: 600,
                cursor: verifying ? 'default' : 'pointer',
              }}
            >
              {verifying ? 'Checking…' : "I've paid — activate Pro"}
            </button>
            <button
              onClick={() => setModal(null)}
              style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
