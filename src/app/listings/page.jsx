'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import ListingCard from '../../components/ListingCard';

const CATS = [
  { key: '', label: 'All', emoji: '🌐' },
  { key: 'skin', label: 'Skins & Cosmetics', emoji: '🎨' },
  { key: 'coin', label: 'Coins & Currency', emoji: '💰' },
  { key: 'bp', label: 'Battle Pass', emoji: '🎖' },
  { key: 'account', label: 'Accounts', emoji: '🤖' },
  { key: 'nft', label: 'NFTs', emoji: '💎' },
  { key: 'key', label: 'CD Keys & Gift Cards', emoji: '🔑' },
  { key: 'item', label: 'In-Game Items', emoji: '🛡' },
  { key: 'bundle', label: 'Bundles', emoji: '📦' },
  { key: 'template', label: 'Templates & Tools', emoji: '📄' },
  { key: 'art', label: 'Digital Art', emoji: '🖼' },
  { key: 'ebook', label: 'Ebooks & Guides', emoji: '📚' },
  { key: 'audio', label: 'Music & Audio', emoji: '🎵' },
  { key: 'software', label: 'Software & Scripts', emoji: '💻' },
];

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'popular', label: 'Popular' },
];

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [inputQ, setInputQ] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [favIds, setFavIds] = useState(new Set());
  const user = useAuthStore(s => s.user);
  const searchRef = useRef(null);

  useEffect(() => {
    if (user) api.favorites.ids().then(ids => setFavIds(new Set(ids))).catch(() => {});
  }, [user]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('q')) { setQ(p.get('q')); setInputQ(p.get('q')); }
    if (p.get('cat')) setCat(p.get('cat'));
  }, []);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setHasMore(false);
    const params = { sort, limit: 24, offset: 0 };
    if (cat) params.category = cat;
    if (q) params.search = q;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    api.listings.list(params)
      .then(data => {
        setListings(data || []);
        setHasMore((data || []).length === 24);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [cat, sort, q, minPrice, maxPrice]);

  const loadMore = () => {
    const next = offset + 24;
    const params = { sort, limit: 24, offset: next };
    if (cat) params.category = cat;
    if (q) params.search = q;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    api.listings.list(params).then(data => {
      setListings(l => [...l, ...(data || [])]);
      setOffset(next);
      setHasMore((data || []).length === 24);
    });
  };

  const toggleFav = async (id) => {
    if (!user) return;
    const isFav = favIds.has(id);
    const next = new Set(favIds);
    if (isFav) { next.delete(id); await api.favorites.remove(id).catch(() => {}); }
    else { next.add(id); await api.favorites.add(id).catch(() => {}); }
    setFavIds(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(inputQ.trim());
  };

  const clearFilters = () => {
    setCat(''); setSort('newest'); setQ(''); setInputQ(''); setMinPrice(''); setMaxPrice('');
  };

  const hasActiveFilters = cat || q || minPrice || maxPrice || sort !== 'newest';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          ref={searchRef}
          value={inputQ}
          onChange={e => setInputQ(e.target.value)}
          placeholder="Search listings..."
          style={{ flex: 1, background: '#111620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#e8eaf0', fontSize: 14, outline: 'none' }}
        />
        <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Search
        </button>
        <button type="button" onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? '#1e293b' : '#111620', border: '1px solid rgba(255,255,255,0.08)', color: '#8892a4', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚙ Filters {hasActiveFilters && <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>ON</span>}
        </button>
      </form>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort</div>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0', borderRadius: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer' }}>
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min Price (XRP)</div>
            <input type="number" min="0" step="0.01" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" style={{ width: 90, background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max Price (XRP)</div>
            <input type="number" min="0" step="0.01" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="∞" style={{ width: 90, background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Category tabs - horizontal scroll */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 20, scrollbarWidth: 'none' }}>
        {CATS.map(c => (
          <button key={c.key} onClick={() => setCat(c.key)} style={{ flexShrink: 0, background: cat === c.key ? '#3b82f6' : '#111620', color: cat === c.key ? '#fff' : '#8892a4', border: '1px solid ' + (cat === c.key ? '#3b82f6' : 'rgba(255,255,255,0.06)'), borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: cat === c.key ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Results header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#4a5568' }}>
          {loading ? 'Loading...' : listings.length === 0 ? 'No listings found' : listings.length + (hasMore ? '+' : '') + ' listings'}
          {q && <span style={{ color: '#8892a4' }}> for "<b style={{ color: '#e8eaf0' }}>{q}</b>"</span>}
        </span>
        {!showFilters && (
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', color: '#8892a4', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 12 }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ background: '#111620', borderRadius: 12, height: 220, animation: 'pulse2 1.5s infinite' }} />
          ))}
          <style>{'@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#111620', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e8eaf0', marginBottom: 6 }}>No listings found</div>
          <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 16 }}>Try different search terms or filters</div>
          {hasActiveFilters && <button onClick={clearFilters} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Clear filters</button>}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 12 }}>
            {listings.map(l => <ListingCard key={l.id} listing={l} isFavorited={favIds.has(l.id)} onToggleFavorite={user ? toggleFav : undefined} />)}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={loadMore} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.08)', color: '#8892a4', borderRadius: 10, padding: '10px 28px', fontSize: 13, cursor: 'pointer' }}>Load more</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ListingsPage() {
  return <Suspense fallback={<div style={{padding:40,color:'#4a5568',textAlign:'center'}}>Loading...</div>}><ListingsContent /></Suspense>;
}
