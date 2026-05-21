'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import ListingCard from '../../../components/ListingCard';

export default function StorefrontPage() {
  const { handle } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!handle) return;
    api.stores.get(handle)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', textAlign: 'center', color: 'var(--text3)' }}>Loading store…</div>;
  if (error || !data) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Store not found</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 20 }}>{error || 'This store does not exist yet.'}</p>
      <Link href="/listings" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Browse the marketplace →</Link>
    </div>
  );

  const { seller, store, listings } = data;
  const memberSince = seller.created_at ? new Date(seller.created_at).getFullYear() : '';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 60px' }}>
      <div style={{ aspectRatio: '4 / 1', maxHeight: 280, width: '100%', background: store.bannerUrl ? `center/cover no-repeat url(${store.bannerUrl})` : 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: 16, marginBottom: 0 }} />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, padding: '0 24px', marginTop: -40, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 96, height: 96, borderRadius: 20, background: store.logoUrl ? `center/cover no-repeat url(${store.logoUrl})` : 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: '4px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {!store.logoUrl && (store.name || 'St').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {store.name}
            {seller.is_verified && <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: 'var(--green)', borderRadius: 6, padding: '3px 8px' }}>✓ Verified</span>}
          </h1>
          {store.tagline && <p style={{ color: 'var(--text2)', fontSize: 15, marginTop: 4 }}>{store.tagline}</p>}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--text3)', flexWrap: 'wrap' }}>
            <span>@{seller.username}</span>
            {seller.reputation_score > 0 && <span style={{ color: 'var(--amber)' }}>★ {Number(seller.reputation_score).toFixed(1)}</span>}
            <span>{seller.total_sales || 0} sales</span>
            {memberSince && <span>Since {memberSince}</span>}
          </div>
        </div>
        <Link href={'/profile/' + seller.id} style={{ padding: '10px 18px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--text)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View profile</Link>
      </div>

      {store.about && (
        <div style={{ padding: '0 24px', marginBottom: 28 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{store.about}</div>
        </div>
      )}

      {Array.isArray(store.categories) && store.categories.length > 0 && (
        <div style={{ padding: '0 24px', marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {store.categories.map((c) => (
            <span key={c} style={{ fontSize: 13, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text2)', borderRadius: 999, padding: '6px 14px' }}>{c}</span>
          ))}
        </div>
      )}

      <div style={{ padding: '0 24px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Listings ({listings.length})</h2>
        {listings.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No active listings yet.</div>
        ) : (
          <div className="listing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
