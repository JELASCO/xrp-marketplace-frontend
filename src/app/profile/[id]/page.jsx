'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import ListingCard from '../../../components/ListingCard';

export default function ProfilePage({ params }) {
  const { id }  = params;
  const me      = useAuthStore(s => s.user);
  const [user,     setUser]     = useState(null);
  const [listings, setListings] = useState([]);
  const [tab,      setTab]      = useState('listings');
  const [loading,  setLoading]  = useState(true);
  const isMe = me?.id === id;

  useEffect(() => {
    api.users.get(id).then(setUser).catch(()=>{}).finally(()=>setLoading(false));
    api.listings.list({ limit: 12 }).then(data => setListings(data.filter(l => l.seller_id === id))).catch(()=>{});
  }, [id]);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-100 rounded-2xl"/></div>;
  if (!user)   return <p className="text-center py-16 text-gray-400">User not found.</p>;

  const avgRating = user.reviews?.length
    ? (user.reviews.reduce((s, r) => s + r.rating, 0) / user.reviews.length).toFixed(1)
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 text-xl font-bold flex items-center justify-center flex-shrink-0">
          {user.username?.slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold">{user.username}</h1>
            {user.is_verified && <span className="badge-blue">✓ Verified</span>}
            {user.role === 'admin' && <span className="badge-purple">Admin</span>}
          </div>
          <p className="text-xs text-gray-400 font-mono mb-2 truncate">{user.wallet_address}</p>
          {user.bio && <p className="text-sm text-gray-600">{user.bio}</p>}
        </div>
        {isMe && (
          <Link href="/profile/edit" className="btn-outline btn-sm flex-shrink-0">Edit</Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total sales',   value: user.total_sales || 0 },
          { label: 'Volume (XRP)',  value: Number(user.total_volume_xrp || 0).toLocaleString() },
          { label: 'Rating',        value: avgRating ? `★ ${avgRating}` : '—' },
          { label: 'Member since',  value: new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex border-b border-gray-100">
        {[
          { key:'listings', label:`Listings (${listings.length})` },
          { key:'reviews',  label:`Reviews (${user.reviews?.length || 0})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab===t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {listings.length === 0
            ? <p className="col-span-3 text-center py-8 text-gray-400">No listings yet.</p>
            : listings.map(l => <ListingCard key={l.id} listing={l} />)
          }
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {(!user.reviews || user.reviews.length === 0)
            ? <p className="text-center py-8 text-gray-400">No reviews yet.</p>
            : user.reviews.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{r.reviewer_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
