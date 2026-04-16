'use client';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ListingCard from '../../components/ListingCard';

const GAMES = ['CS2','Valorant','Fortnite','Roblox','Apex Legends','Minecraft','Call of Duty'];
const CATS  = [
  { key:'',        label:'All'         },
  { key:'skin',    label:'Skins'       },
  { key:'coin',    label:'Coins'       },
  { key:'bp',      label:'Battle Pass' },
  { key:'account', label:'Accounts'    },
  { key:'physical',label:'Physical'    },
  { key:'nft',     label:'NFT'         },
];

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [category, setCategory] = useState('');
  const [game,     setGame]     = useState('');
  const [sort,     setSort]     = useState('created_at');
  const [q,        setQ]        = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('q')) setQ(params.get('q'));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { sort, limit: 48 };
    if (category) params.category = category;
    if (game)     params.game     = game;
    api.listings.list(params)
      .then(data => {
        const filtered = q ? data.filter(l => l.title.toLowerCase().includes(q.toLowerCase())) : data;
        setListings(filtered);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [category, game, sort, q]);

  return (
    <div className="flex gap-6">
      <aside className="w-48 flex-shrink-0 hidden lg:block space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Category</p>
          {CATS.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                category===c.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Game</p>
          <select className="input text-sm" value={game} onChange={e => setGame(e.target.value)}>
            <option value="">All games</option>
            {GAMES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-gray-900">Listings</h1>
            <span className="text-sm text-gray-400">{listings.length} results</span>
          </div>
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            value={sort} onChange={e => setSort(e.target.value)}>
            <option value="created_at">Newest</option>
            <option value="price_asc">Cheapest</option>
            <option value="price_desc">Most expensive</option>
          </select>
        </div>

        {q && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Search: <strong>{q}</strong></span>
            <button onClick={() => setQ('')} className="text-xs text-gray-400 hover:text-gray-600">✕ Clear</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({length:12}).map((_,i) => (
              <div key={i} className="h-48 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No listings found</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
