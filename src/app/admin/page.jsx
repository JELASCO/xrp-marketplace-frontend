'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';

export default function AdminPage() {
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [removing, setRemoving] = useState({});

  useEffect(() => {
    if (loading || !user || user.role !== 'admin') return;
    api.admin.stats().then(setStats).catch(() => {});
    api.admin.disputes().then(d => setDisputes(d || [])).catch(() => {});
  }, [user, loading]);

  useEffect(() => {
    if (tab !== 'listings' || !user || user.role !== 'admin') return;
    setListingsLoading(true);
    api.listings.list({ limit: 100, offset: 0 })
      .then(data => {
        const arr = Array.isArray(data) ? data : (data && Array.isArray(data.listings) ? data.listings : []);
        setListings(arr);
      })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false));
  }, [tab, user]);

  useEffect(() => {
    if (tab !== 'users' || !user || user.role !== 'admin') return;
    setUsersLoading(true);
    api.admin.users()
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [tab, user]);

  const removeListing = async (id) => {
    if (!window.confirm('Bu listing\'i kaldırmak istediğine emin misin?')) return;
    setRemoving(r => ({ ...r, [id]: true }));
    try {
      await api.admin.removeListing(id);
      setListings(ls => ls.filter(l => l.id !== id));
    } catch (e) { alert('Hata: ' + e.message); }
    finally { setRemoving(r => ({ ...r, [id]: false })); }
  };

  const verifyUser = async (uid, verify) => {
    try {
      await api.admin.verifyUser(uid, verify);
      setUsers(us => us.map(u => u.id === uid ? { ...u, is_verified: verify } : u));
    } catch (e) { alert('Hata: ' + e.message); }
  };

  const banUser = async (uid, ban) => {
    try {
      await api.admin.banUser(uid, ban);
      setUsers(us => us.map(u => u.id === uid ? { ...u, is_banned: ban } : u));
    } catch (e) { alert('Hata: ' + e.message); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4a5568' }}>Loading...</div>;
  if (!user) return <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4a5568' }}>Sign in required</div>;
  if (user.role !== 'admin') return <div style={{ textAlign: 'center', padding: '60px 20px', color: '#f87171' }}>Admin only</div>;

  const TABS = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'listings', label: '📋 Listings' },
    { key: 'disputes', label: '⚖️ Disputes' },
    { key: 'users', label: '👥 Users' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8eaf0' }}>Admin Panel</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: tab === t.key ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: tab === t.key ? '#fff' : '#8892a4', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Users', value: stats?.totalUsers ?? '...' },
              { label: 'Active Listings', value: stats?.activeListings ?? '...' },
              { label: 'Completed Orders', value: stats?.completedOrders ?? '...' },
              { label: 'Commission (XRP)', value: stats?.totalCommission != null ? Number(stats.totalCommission).toFixed(2) : '...' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#e8eaf0' }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px', color: '#4a5568', fontSize: 13, textAlign: 'center' }}>
            More admin features coming soon — transactions, user management, ad slots
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listingsLoading && <div style={{ textAlign: 'center', padding: 40, color: '#4a5568', fontSize: 13 }}>Loading listings...</div>}
          {!listingsLoading && listings.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#4a5568', fontSize: 13 }}>No active listings</div>}
          {!listingsLoading && listings.map(l => (
            <div key={l.id} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#0a0e1a', flexShrink: 0, overflow: 'hidden' }}>
                {l.images && l.images[0] && <img src={l.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                <div style={{ fontSize: 12, color: '#4a5568' }}>
                  {l.username && <span style={{ marginRight: 10 }}>@{l.username}</span>}
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{l.price_xrp != null ? Number(l.price_xrp).toLocaleString() : '0'} XRP</span>
                  {l.category && <span style={{ marginLeft: 10, color: '#4a5568' }}>{l.category}</span>}
                </div>
              </div>
              <button onClick={() => removeListing(l.id)} disabled={removing[l.id]} style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: removing[l.id] ? 'not-allowed' : 'pointer' }}>
                {removing[l.id] ? '...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'disputes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {disputes.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#4a5568', fontSize: 13 }}>No disputes</div>}
          {disputes.map(d => (
            <div key={d.id} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, color: '#e8eaf0', marginBottom: 4 }}>{d.reason || 'Dispute'}</div>
              <div style={{ fontSize: 12, color: '#4a5568' }}>Status: {d.status}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usersLoading && <div style={{ textAlign: 'center', padding: 40, color: '#4a5568', fontSize: 13 }}>Loading...</div>}
          {!usersLoading && users.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#4a5568', fontSize: 13 }}>No users</div>}
          {!usersLoading && users.map(u => (
            <div key={u.id} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#161c28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>
                {(u.username || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>
                  {u.username}
                  {u.is_verified && <span style={{ marginLeft: 6, fontSize: 11, color: '#10b981' }}>✓ Verified</span>}
                  {u.is_banned && <span style={{ marginLeft: 6, fontSize: 11, color: '#f87171' }}>Banned</span>}
                </div>
                <div style={{ fontSize: 12, color: '#4a5568' }}>{u.role} · ★ {Number(u.reputation_score || 0).toFixed(1)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => verifyUser(u.id, !u.is_verified)} style={{ background: u.is_verified ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.is_verified ? '#f87171' : '#10b981', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {u.is_verified ? 'Unverify' : '✓ Verify'}
                </button>
                <button onClick={() => banUser(u.id, !u.is_banned)} style={{ background: u.is_banned ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: u.is_banned ? '#10b981' : '#f87171', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {u.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
