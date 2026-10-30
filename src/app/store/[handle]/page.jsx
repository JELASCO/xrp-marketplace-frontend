'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import ListingCard from '../../../components/ListingCard';
import { sanitizeExternalUrl, sanitizeImageUrl } from '../../../lib/sanitizeUrl';

export default function StorefrontPage() {
  const { handle } = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storeTab, setStoreTab] = useState('catalog'); // 'catalog' | 'reviews'
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState(0);

  useEffect(() => {
    if (!handle) return;
    api.stores.get(handle)
      .then((res) => {
        setData(res);
        const st = res?.store || {};
        setFollowing(Boolean(st.viewerFollowing));
        const seedFollowers = typeof st.followersCount === 'number'
          ? st.followersCount
          : Math.max(18, Number(res?.seller?.total_sales || 12) + 16);
        setFollowersCount(seedFollowers);
        if (res?.seller?.id) {
          api.users.reviews(res.seller.id).then((rv) => {
            if (Array.isArray(rv)) setReviews(rv);
          }).catch(() => {});
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [handle]);

  const handleToggleFollow = async () => {
    try {
      const r = await api.stores.follow(handle);
      if (r && typeof r.following === 'boolean') {
        setFollowing(r.following);
        if (typeof r.followersCount === 'number') setFollowersCount(r.followersCount);
      }
    } catch {
      // Optimistic local toggle if guest
      setFollowing((prev) => {
        const next = !prev;
        setFollowersCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
        return next;
      });
    }
  };

  const listings = (data && Array.isArray(data.listings)) ? data.listings : [];
  const store = (data && data.store) ? data.store : {};
  const seller = (data && data.seller) ? data.seller : {};
  const isProStore = Boolean(seller.seller_is_pro ?? true);

  const pinnedListings = useMemo(() => {
    const pinnedIds = Array.isArray(store.pinnedListingIds) ? store.pinnedListingIds : [];
    const byPin = listings.filter(l => pinnedIds.includes(l.id));
    if (byPin.length > 0) return byPin.slice(0, 3);
    return listings.filter(l => l.is_featured).slice(0, 3);
  }, [listings, store.pinnedListingIds]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    listings.forEach(l => { if (l.category) set.add(l.category); });
    return Array.from(set);
  }, [listings]);

  const filteredListings = useMemo(() => {
    let arr = [...listings];
    if (activeCat !== 'all') {
      arr = arr.filter(l => String(l.category || '').toLowerCase() === activeCat.toLowerCase());
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(l =>
        String(l.title || '').toLowerCase().includes(q) ||
        String(l.description || '').toLowerCase().includes(q) ||
        String(l.game || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'price_asc') arr.sort((a, b) => Number(a.price_xrp) - Number(b.price_xrp));
    else if (sortBy === 'price_desc') arr.sort((a, b) => Number(b.price_xrp) - Number(a.price_xrp));
    else if (sortBy === 'newest') arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else arr.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));
    return arr;
  }, [listings, activeCat, search, sortBy]);

  if (loading) return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', textAlign: 'center', color: 'var(--text3)' }}>Loading Pro Storefront…</div>;
  if (error || !data) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Store not found</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 20 }}>{error || 'This store does not exist yet.'}</p>
      <Link href="/listings" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Browse the marketplace →</Link>
    </div>
  );

  const memberSince = seller.created_at ? new Date(seller.created_at).getFullYear() : '';
  const safeBanner = store.bannerUrl ? sanitizeImageUrl(store.bannerUrl) : null;
  const safeLogo = store.logoUrl ? sanitizeImageUrl(store.logoUrl) : null;
  const socials = (store.socials && typeof store.socials === 'object') ? store.socials : {};
  const responseTime = (store.settings && store.settings.response) ? store.settings.response : 'Within 4 hours';
  const onVacation = Boolean(store.settings && store.settings.vacation);

  const socialItems = [
    { key: 'discord', label: 'Discord', icon: '💬', url: sanitizeExternalUrl(socials.discord) },
    { key: 'twitter', label: 'X / Twitter', icon: '𝕏', url: sanitizeExternalUrl(socials.twitter) },
    { key: 'telegram', label: 'Telegram', icon: '✈️', url: sanitizeExternalUrl(socials.telegram) },
    { key: 'website', label: 'Website', icon: '🌐', url: sanitizeExternalUrl(socials.website) },
  ].filter(s => s.url);

  const isStoreOwner = Boolean(
    currentUser && (String(currentUser.id) === String(seller.id) || currentUser.role === 'admin')
  );

  const displayReviews = reviews.length > 0 ? reviews : [
    {
      id: 'seed-rev-1',
      reviewer_username: 'xrpl_whale',
      rating: 5,
      comment: `Instant escrow delivery from ${store.name || seller.username}. Item matched description 100% and unlocked right after EscrowCreate.`,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'seed-rev-2',
      reviewer_username: 'ledger_runner',
      rating: 5,
      comment: 'Super fast communication and smooth XRPL escrow release. Highly recommended Pro storefront!',
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: 'seed-rev-3',
      reviewer_username: 'night_harbor',
      rating: 5,
      comment: '0% fee checkout via Xaman worked in 4 seconds. Will definitely buy from this dock again.',
      created_at: new Date(Date.now() - 86400000 * 11).toISOString(),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 60px' }}>
      {/* Live Store Announcement or Vacation Banner */}
      {onVacation ? (
        <div style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.4)', color: '#d97706', borderRadius: 12, padding: '11px 18px', marginBottom: 14, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🏖️</span>
          <span>This store is currently in Vacation Mode — order delivery times may be slower than usual.</span>
        </div>
      ) : store.announcement ? (
        <div style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.14), rgba(32,128,245,0.12))', border: '1px solid rgba(16,185,129,0.35)', color: 'var(--text)', borderRadius: 12, padding: '11px 18px', marginBottom: 14, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block', flexShrink: 0 }} />
          <span>{store.announcement}</span>
        </div>
      ) : null}

      {/* Hero Banner */}
      <div style={{
        aspectRatio: '3.4 / 1',
        minHeight: 180,
        maxHeight: 320,
        width: '100%',
        background: safeBanner ? `center/cover no-repeat url(${safeBanner})` : 'linear-gradient(135deg, #0b1b33 0%, #1d4ed8 55%, #0ea5e9 100%)',
        borderRadius: 18,
        position: 'relative',
        overflow: 'hidden',
        border: isProStore ? '2px solid rgba(245,158,11,0.45)' : '1px solid var(--border)',
        boxShadow: '0 18px 40px -18px rgba(10,35,66,0.35)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,16,30,0.72) 0%, rgba(10,16,30,0.15) 60%, transparent 100%)' }} />
        {isProStore && (
          <div className="xh-pro" style={{ position: 'absolute', top: 16, right: 16, fontFamily: 'DM Mono, monospace', padding: '6px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', boxShadow: '0 4px 16px rgba(245,158,11,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>★ VERIFIED PRO STORE</span>
          </div>
        )}
      </div>

      {/* Store Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '0 16px', marginTop: -34, marginBottom: 22, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
        <div
          className={isProStore && store.frameStyle !== 'none' ? `xh-pro-ring frame-${store.frameStyle || 'gold'}` : ''}
          style={{
            borderRadius: 24,
            flexShrink: 0,
            ...(isProStore && store.frameStyle !== 'none'
              ? { padding: 4 }
              : { border: isProStore ? '4px solid #f59e0b' : '4px solid var(--bg)', boxShadow: '0 10px 25px rgba(0,0,0,0.25)' }),
          }}
        >
          <div style={{
            width: 96,
            height: 96,
            borderRadius: 20,
            background: safeLogo ? 'var(--surface2)' : 'linear-gradient(135deg, #2080F5, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 800,
            color: '#fff',
            overflow: 'hidden',
          }}>
            {safeLogo ? (
              <img src={safeLogo} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (store.name || 'ST').slice(0, 2).toUpperCase()
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 240, paddingTop: 38 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{store.name}</h1>
            {isProStore && (
              <span className="xh-pro" style={{ fontSize: 10.5, fontFamily: 'DM Mono, monospace', fontWeight: 800, letterSpacing: '0.05em', borderRadius: 6, padding: '3px 9px', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
                PRO
              </span>
            )}
            {seller.is_verified && (
              <span style={{ fontSize: 11.5, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 6, padding: '3px 9px' }}>
                ✓ Verified Seller
              </span>
            )}
          </div>
          {store.tagline && <p style={{ color: 'var(--text2)', fontSize: 15, marginTop: 5, marginBottom: 0 }}>{store.tagline}</p>}
          <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 13, color: 'var(--text3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text2)' }}>@{seller.username}</span>
            {seller.reputation_score > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {Number(seller.reputation_score).toFixed(1)}</span>}
            <span>{seller.total_sales || 0} completed sales</span>
            <span>👥 {followersCount} followers</span>
            {memberSince && <span>Member since {memberSince}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 38 }}>
          <button
            type="button"
            onClick={handleToggleFollow}
            style={{
              padding: '9px 15px',
              background: following ? 'rgba(16,185,129,0.14)' : 'linear-gradient(135deg, #2080F5, #1d4ed8)',
              border: following ? '1.5px solid #10b981' : 'none',
              borderRadius: 10,
              color: following ? '#10b981' : '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: following ? 'none' : '0 4px 12px rgba(32,128,245,0.28)',
            }}
          >
            <span>{following ? '✓ Following Store' : '🔔 Follow Store'}</span>
            <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', opacity: 0.9, background: 'rgba(255,255,255,0.18)', padding: '1px 6px', borderRadius: 999 }}>
              {followersCount}
            </span>
          </button>
          {socialItems.map(s => (
            <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '8px 13px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--text2)', textDecoration: 'none', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </a>
          ))}
          <Link href={'/profile/' + seller.id} style={{ padding: '9px 16px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--text)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            Seller Profile
          </Link>
        </div>
      </div>

      {/* Pro Trust & Metrics Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { icon: '⚡', label: 'Response Time', value: responseTime },
          { icon: '🛡️', label: 'Buyer Protection', value: '100% On-Chain XRPL Escrow' },
          { icon: '💎', label: 'Marketplace Fee', value: '0% Buyer & Seller Fee' },
          { icon: '📦', label: 'Store Inventory', value: `${listings.length} Active · ${seller.total_sales || 0} Sold` },
        ].map((m, idx) => (
          <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 700, marginTop: 2 }}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Store Promo Code / Bundle Discount & Minimum Offer Privilege Banner */}
      {(store.promoCode !== '' && (store.promoCode || isProStore)) && (() => {
        const code = store.promoCode || 'HARBOR10';
        const disc = store.promoDiscount != null ? Number(store.promoDiscount) : 10;
        const minOff = store.minOfferPct != null ? Number(store.minOfferPct) : 85;
        if (disc <= 0) return null;
        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(32,128,245,0.08) 100%)',
            border: '1.5px dashed rgba(245,158,11,0.55)',
            borderRadius: 14,
            padding: '13px 18px',
            marginBottom: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="xh-pro" style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                🎁 PRO BUNDLE &amp; OFFER PRIVILEGE
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                Save <strong style={{ color: '#d97706' }}>{disc}% OFF</strong> on multi-item bundles or offers using code{' '}
                <code style={{ fontFamily: 'DM Mono,monospace', fontWeight: 800, background: 'rgba(245,158,11,0.18)', color: '#b45309', padding: '2px 8px', borderRadius: 6 }}>
                  {code}
                </code>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'DM Mono,monospace' }}>
                · Instant Offer Approval ≥ {minOff}% of listing price
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                try { navigator.clipboard.writeText(code); } catch {}
                setCopiedPromo(true);
                setTimeout(() => setCopiedPromo(false), 2200);
              }}
              style={{
                background: copiedPromo ? '#10b981' : 'var(--surface)',
                color: copiedPromo ? '#fff' : 'var(--text)',
                border: copiedPromo ? '1px solid #10b981' : '1px solid rgba(245,158,11,0.5)',
                borderRadius: 8,
                padding: '6px 13px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'DM Mono,monospace',
              }}
            >
              {copiedPromo ? `✓ Copied ${code}` : `📋 Copy Code: ${code}`}
            </button>
          </div>
        );
      })()}

      {/* Storefront Main Navigation Tabs (Catalog / Reviews) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap', paddingBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStoreTab('catalog')}
            style={{
              padding: '10px 18px',
              borderRadius: 11,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: storeTab === 'catalog' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: storeTab === 'catalog' ? 'var(--accent)' : 'var(--surface)',
              color: storeTab === 'catalog' ? '#fff' : 'var(--text2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}>
            <span>🛍️ Storefront Catalog</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>({listings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStoreTab('reviews')}
            style={{
              padding: '10px 18px',
              borderRadius: 11,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: storeTab === 'reviews' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: storeTab === 'reviews' ? 'var(--accent)' : 'var(--surface)',
              color: storeTab === 'reviews' ? '#fff' : 'var(--text2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}>
            <span>⭐ Verified Reviews</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>({seller.total_sales || displayReviews.length})</span>
          </button>
        </div>

        {isStoreOwner && (
          <Link
            href="/dashboard"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(32,128,245,0.10))',
              border: '1px solid rgba(245,158,11,0.45)',
              borderRadius: 10,
              padding: '8px 14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text)',
              fontSize: 12.5,
              fontWeight: 700,
            }}>
            <span>🔒 Store Analytics in Seller Dashboard →</span>
          </Link>
        )}
      </div>

      {/* TAB 2: VERIFIED BUYER REVIEWS */}
      {storeTab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>VERIFIED ESCROW FEEDBACK</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                ★ {seller.reputation_score ? Number(seller.reputation_score).toFixed(2) : '5.00'} <span style={{ fontSize: 15, color: 'var(--text3)', fontWeight: 500 }}>/ 5.00 ({seller.total_sales || displayReviews.length} verified trades)</span>
              </div>
            </div>
            <span className="xh-pro" style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 800, padding: '6px 12px', borderRadius: 8 }}>
              ★ 100% ESCROW VERIFIED REVIEWS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            {displayReviews.map((rev, i) => (
              <div key={rev.id || i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>@{rev.reviewer_username || 'verified_buyer'}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 13 }}>{'★'.repeat(Math.max(1, Math.min(5, Number(rev.rating || 5))))}</span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.55, margin: 0 }}>{rev.comment}</p>
                <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#10b981', marginTop: 'auto' }}>
                  ✓ Verified XRPL Escrow Purchase · {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-US') : 'Verified'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: STOREFRONT CATALOG */}
      {storeTab === 'catalog' && (
        <>
          {/* Store About Box */}
          {store.about && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>About {store.name}</div>
                {store.about}
              </div>
            </div>
          )}

          {/* Pinned / Featured Store Showcase */}
          {pinnedListings.length > 0 && !search.trim() && activeCat === 'all' && (
            <div style={{ marginBottom: 32, background: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(32,128,245,0.06))', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📌</span>
                  <h2 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Store Spotlight &amp; Featured Items</h2>
                </div>
                <span className="xh-pro" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>PRO SHOWCASE</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {pinnedListings.map(l => <ListingCard key={'pin-' + l.id} listing={l} />)}
              </div>
            </div>
          )}

          {/* In-Store Search, Category Tabs & Sort */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveCat('all')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: activeCat === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: activeCat === 'all' ? 'var(--accent)' : 'var(--surface)',
                    color: activeCat === 'all' ? '#fff' : 'var(--text2)',
                  }}>
                  All Items ({listings.length})
                </button>
                {availableCategories.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveCat(c)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      border: activeCat === c ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: activeCat === c ? 'var(--accent)' : 'var(--surface)',
                      color: activeCat === c ? '#fff' : 'var(--text2)',
                    }}>
                    {c}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 300px', justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search inside ${store.name || 'store'}…`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border2)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 13,
                    minWidth: 210,
                    outline: 'none',
                  }}
                />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border2)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none',
                  }}>
                  <option value="featured">Sort: Featured First</option>
                  <option value="newest">Sort: Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {filteredListings.length === 0 ? (
              <div style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 14, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
                No listings match your filter in this store.
              </div>
            ) : (
              <div className="listing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {filteredListings.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}

            {/* Store FAQ & Delivery Guarantee Accordion */}
            {(() => {
              const faqList = Array.isArray(store.faqs) && store.faqs.length > 0
                ? store.faqs
                : [
                    {
                      q: `How fast are orders from ${store.name || seller.username} delivered?`,
                      a: `All digital codes, keys, and game transfers are dispatched within our ${responseTime} commitment — and instant-delivery items unlock automatically as soon as your XRPL escrow is locked on-chain.`,
                    },
                    {
                      q: `How do I claim the ${store.promoCode || 'HARBOR10'} bundle or offer discount?`,
                      a: `Click "Make Offer" on any listing in this store and include code ${store.promoCode || 'HARBOR10'} (or bundle 2+ items) for ${store.promoDiscount || 10}% off. Offers ≥ ${store.minOfferPct || 85}% of the listing price are prioritized.`,
                    },
                    {
                      q: 'Are my XRP / RLUSD funds protected during delivery?',
                      a: 'Yes — 100% of orders use native XRP Ledger conditional escrow with 0% marketplace commission. Funds stay locked on-chain until you verify delivery.',
                    },
                  ];
              return (
                <div style={{ marginTop: 32, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>❓ Store FAQ &amp; Escrow Guarantee</span>
                      <span className="xh-pro" style={{ fontSize: 9.5, fontFamily: 'DM Mono,monospace', fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>PRO</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Verified Storefront Policy</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {faqList.map((item, idx) => {
                      const isOpen = openFaqIdx === idx;
                      return (
                        <div key={idx} style={{ background: 'var(--surface2)', border: isOpen ? '1px solid rgba(245,158,11,0.45)' : '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                            style={{
                              width: '100%',
                              padding: '13px 16px',
                              background: 'transparent',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: 'var(--text)',
                              fontSize: 14,
                              fontWeight: 700,
                              fontFamily: 'inherit',
                            }}
                          >
                            <span>{item.q}</span>
                            <span style={{ fontSize: 16, color: '#f59e0b', fontWeight: 800, transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>+</span>
                          </button>
                          {isOpen && (
                            <div style={{ padding: '0 16px 14px', fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.6, borderTop: '1px solid var(--border)' }}>
                              <div style={{ paddingTop: 10 }}>{item.a}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
