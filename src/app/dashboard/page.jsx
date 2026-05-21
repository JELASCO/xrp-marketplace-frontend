'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const [stats, setStats] = useState(null);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    setLoadingStats(true);
    Promise.all([
      api.users.myStats().catch(() => null),
      api.offers.received().catch(() => [])
    ]).then(([statsData, offersData]) => {
      if (statsData) setStats(statsData);
      setOffers(offersData || []);
    }).catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoadingStats(false));
  }, [user, loading]);

  if (loading || !user) return null;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Seller Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Your sales, listings, and reputation at a glance.</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {loadingStats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {[...Array(4)].map((_,i) => <div key={i} style={{ background: 'var(--surface)', borderRadius: 10, height: 72 }} />)}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Sales" value={stats.total_sales ?? 0} />
          <StatCard label="Revenue (XRP)" value={Number(stats.total_revenue_xrp ?? 0).toFixed(2)} />
          <StatCard label="Active Listings" value={stats.active_listings ?? 0} />
          <StatCard label="Reputation" value={Number(stats.reputation_score ?? 0).toFixed(1) + ' â'} />
          <StatCard label="Pending Orders" value={stats.pending_orders ?? 0} alert={(stats.pending_orders ?? 0) > 0} />
          <StatCard label="Disputes" value={stats.open_disputes ?? 0} alert={(stats.open_disputes ?? 0) > 0} />
        </div>
      )}

      {/* Received Offers */}
      {offers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>ð° Received Offers ({offers.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {offers.map(o => (
              <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    <a href={'/listing/'+o.listing_id} style={{ color: 'var(--text)', textDecoration: 'none' }}>{o.listing_title}</a>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    From <strong style={{ color: '#94a3b8' }}>{o.buyer_username}</strong>
                    {o.message && <span> Â· &ldquo;{o.message.slice(0,60)}{o.message.length>60?'...':''}&rdquo;</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{o.amount_xrp} XRP</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Listed: {o.price_xrp} XRP</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => api.offers.accept(o.id).then(r => { setOffers(p => p.filter(x => x.id !== o.id)); if(r.orderId) alert("Offer accepted! The buyer will now complete payment via Xumm. Order ID: " + r.orderId.slice(0,8)); }).catch(e => alert(e.message))}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    â Accept
                  </button>
                  <button onClick={() => api.offers.decline(o.id).then(() => setOffers(p => p.filter(x => x.id !== o.id))).catch(e => alert(e.message))}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    â Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/new" style={{ padding: '10px 18px', background: 'var(--accent)', color: '#fff', textDecoration: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600 }}>+ List New Item</Link>
        <Link href="/store/create" style={{ padding: '10px 18px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none', borderRadius: 9, fontSize: 13 }}>🏪 Create Store</Link>
        <Link href="/orders" style={{ padding: '10px 18px', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)', textDecoration: 'none', borderRadius: 9, fontSize: 13 }}>View Orders</Link>
        <Link href={'/user/'+user?.id} style={{ padding: '10px 18px', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)', textDecoration: 'none', borderRadius: 9, fontSize: 13 }}>View Profile</Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, alert }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid '+(alert ? 'rgba(245,158,11,0.3)' : 'var(--border)'), borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: alert ? '#fbbf24' : 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
    </div>
  );
}
