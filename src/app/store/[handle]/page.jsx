'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import ListingCard from '../../../components/ListingCard';
import { sanitizeExternalUrl, sanitizeImageUrl } from '../../../lib/sanitizeUrl';

export default function StorefrontPage() {
  const { handle } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    if (!handle) return;
    api.stores.get(handle)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [handle]);

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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 60px' }}>
      {/* Live Store Announcement or Vacation Banner */}
      {onVacation ? (
        <div style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.4)', color: '#d97706', borderRadius: 12, padding: '11px 18px', marginBottom: 14, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🏖️</span>
          <span>This store is currently in Vacation Mode — order delivery times may be slower than usual.</span>
        </div>
      ) : store.announcement ? (
        <div style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.14), rgba(32,128,245,0.12))', border: '1px solid rgba(16,185,129,0.35)', color: 'var(--text)', borderRadius: 12, padding: '11px 18px', marginBottom: 14, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block', flexShrink: 0 }} />
            <span>{store.announcement}</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRO STORE BROADCAST</span>
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
          <div style={{ position: 'absolute', top: 16, right: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '6px 13px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.05em', boxShadow: '0 4px 14px rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>★ VERIFIED PRO STORE</span>
          </div>
        )}
      </div>

      {/* Store Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '0 16px', marginTop: -34, marginBottom: 22, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
        <div style={{
          width: 100,
          height: 100,
          borderRadius: 22,
          background: safeLogo ? `center/cover no-repeat url(${safeLogo})` : 'linear-gradient(135deg, #2080F5, #f59e0b)',
          border: isProStore ? '4px solid #f59e0b' : '4px solid var(--bg)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 800,
          color: '#fff',
          flexShrink: 0,
        }}>
          {!safeLogo && (store.name || 'ST').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 240, paddingTop: 38 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{store.name}</h1>
            {isProStore && (
              <span style={{ fontSize: 11.5, fontWeight: 700, background: 'rgba(245,158,11,0.16)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 6, padding: '3px 9px' }}>
                ★ PRO
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
            {memberSince && <span>Member since {memberSince}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', paddingTop: 38 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
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
            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#d97706', fontWeight: 600 }}>PRO SHOWCASE</span>
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
      </div>
    </div>
  );
}
