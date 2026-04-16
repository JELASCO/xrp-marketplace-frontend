'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ListingCard from '../components/ListingCard';

const CATEGORIES = [
  { key: '',         label: 'All' },
  { key: 'skin',     label: 'Skins' },
  { key: 'coin',     label: 'Coins' },
  { key: 'bp',       label: 'Battle Pass' },
  { key: 'account',  label: 'Accounts' },
  { key: 'physical', label: 'Physical' },
  { key: 'nft',      label: 'NFT' },
];

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState('');
  const [sort,     setSort]     = useState('created_at');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { sort, limit: 24 };
    if (category) params.category = category;
    api.listings.list(params)
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [category, sort]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-blue-600 rounded-2xl p-6 flex items-center justify-between text-white">
        <div>
          <h1 className="text-xl font-bold mb-1">Secure P2P Game Marketplace</h1>
          <p className="text-sm text-blue-100">100% safe trading with XRP Ledger escrow</p>
        </div>
        <Link href="/listings/new" className="bg-white text-blue-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-blue-50 whitespace-nowrap">
          + List Item
        </Link>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === c.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Listings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {category ? CATEGORIES.find(c => c.key === category)?.label : 'All Listings'}
            <span className="ml-2 text-sm font-normal text-gray-400">{listings.length} listings</span>
          </h2>
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="created_at">Newest</option>
            <option value="price_asc">Cheapest</option>
            <option value="price_desc">Most expensive</option>
            <option value="views">Popular</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-48 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-3">No listings yet</p>
            <Link href="/listings/new" className="btn-primary">Be the first to list</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}
