'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import clsx from 'clsx';

const CAT_BADGE = { skin:'badge-purple', coin:'badge-teal', bp:'badge-amber', account:'badge-gray', physical:'badge-gray', nft:'badge-green' };
const STEPS = ['Awaiting payment','In escrow','Delivered','Completed'];

export default function ListingDetailPage({ params }) {
  const { id }  = params;
  const user    = useAuthStore(s => s.user);
  const [listing,    setListing]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [order,      setOrder]      = useState(null);
  const [buying,     setBuying]     = useState(false);
  const [escrowStep, setEscrowStep] = useState(0);

  useEffect(() => {
    api.listings.get(id).then(setListing).catch(()=>{}).finally(()=>setLoading(false));
  }, [id]);

  async function handleBuy() {
    if (!user) return alert('Please sign in first');
    setBuying(true);
    try {
      const o = await api.orders.create(id);
      setOrder(o);
      setEscrowStep(1);
      setTimeout(() => setEscrowStep(2), 1500);
    } catch(e) { alert(e.message); }
    finally { setBuying(false); }
  }

  async function handleConfirm() {
    try {
      await api.orders.confirm(order.id);
      setEscrowStep(4);
    } catch(e) { alert(e.message); }
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-64 bg-gray-100 rounded-2xl"/><div className="h-8 bg-gray-100 rounded w-2/3"/></div>;
  if (!listing) return <p className="text-center py-16 text-gray-400">Listing not found.</p>;

  const isSeller = user?.id === listing.seller_id;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/listings" className="text-sm text-gray-400 hover:text-gray-600">← Back to listings</Link>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-2xl h-64 flex items-center justify-center text-7xl border border-gray-100">
          {listing.images?.[0] ? <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover rounded-2xl"/> : '🎮'}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={clsx('badge', CAT_BADGE[listing.category]||'badge-gray')}>{listing.category}</span>
              {listing.game && <span className="badge badge-gray">{listing.game}</span>}
              {listing.is_featured && <span className="badge bg-amber-100 text-amber-700">★ Featured</span>}
            </div>
            <h1 className="text-2xl font-bold">{listing.title}</h1>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{Number(listing.price_xrp).toLocaleString()}</span>
            <span className="text-gray-400 font-medium">XRP</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {listing.username?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{listing.username} {listing.is_verified && <span className="text-blue-500 text-xs">✓</span>}</p>
              {listing.reputation_score > 0 && <p className="text-xs text-amber-500">★ {Number(listing.reputation_score).toFixed(1)}</p>}
            </div>
          </div>

          {!isSeller && !order && listing.status === 'active' && (
            <div className="space-y-2">
              {!user ? (
                <p className="text-sm text-gray-500">Sign in to purchase</p>
              ) : (
                <button onClick={handleBuy} disabled={buying} className="btn-primary w-full py-3 text-base">
                  {buying ? 'Processing...' : `Buy — ${Number(listing.price_xrp).toLocaleString()} XRP`}
                </button>
              )}
              <p className="text-xs text-center text-gray-400">Secured by XRP Ledger escrow</p>
            </div>
          )}

          {listing.status === 'sold' && <div className="bg-gray-50 rounded-xl p-3 text-center text-sm text-gray-500">This item has been sold.</div>}
          {isSeller && <Link href={`/listings/${id}/edit`} className="btn-outline w-full justify-center block text-center">Edit listing</Link>}
        </div>
      </div>

      {listing.description && (
        <div className="card">
          <h2 className="font-semibold mb-2 text-sm text-gray-500 uppercase tracking-wide">Description</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
        </div>
      )}

      {order && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Payment & Escrow</h2>
          <div className="flex items-center">
            {STEPS.map((s,i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2', i < escrowStep ? 'bg-green-500 border-green-500 text-white' : i === escrowStep ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400')}>
                    {i < escrowStep ? '✓' : i+1}
                  </div>
                  <span className={clsx('text-xs whitespace-nowrap hidden sm:block', i === escrowStep ? 'text-blue-600 font-medium' : i < escrowStep ? 'text-green-600' : 'text-gray-400')}>{s}</span>
                </div>
                {i < STEPS.length-1 && <div className={clsx('flex-1 h-0.5 mx-1', i < escrowStep ? 'bg-green-400' : 'bg-gray-200')} />}
              </div>
            ))}
          </div>

          {escrowStep === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-blue-700 bg-blue-50 rounded-lg p-3">Payment is locked in escrow. Confirm you received the item to release payment.</p>
              <div className="flex gap-2">
                <button onClick={handleConfirm} className="btn-success flex-1">✓ I received it — Release payment</button>
                <button onClick={() => api.orders.dispute(order.id,{reason:'Issue with delivery'})} className="btn-danger">⚠ Report issue</button>
              </div>
            </div>
          )}

          {escrowStep === 4 && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 text-center font-medium">✓ Transaction completed!</div>
          )}
        </div>
      )}
    </div>
  );
}
