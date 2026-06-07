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
  const catScrollRef = useRef(null);
  const [catEdges, setCatEdges] = useState({ left: false, right: false });
  function updateCatEdges() { const el = catScrollRef.current; if (!el) return; setCatEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }); }
  function scrollCats(dir) { const el = catScrollRef.current; if (el) el.scrollBy({ left: dir * 220, behavior: 'smooth' }); }
  useEffect(() => { updateCatEdges(); const el = catScrollRef.current; if (!el) return; const on = () => updateCatEdges(); el.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on); return () => { el.removeEventListener('scroll', on); window.removeEventListener('resize', on); }; }, []);
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [inputQ, setInputQ] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [game, setGame] = useState('');
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
    { const c0 = p.get('cat') || p.get('category'); if (c0) setCat(c0); }
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
    if (game) params.game = game;
    api.listings.list(params)
      .then(data => {
        setListings(data || []);
        setHasMore((data || []).length === 24);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [cat, sort, q, minPrice, maxPrice, game]);

  const loadMore = () => {
    const next = offset + 24;
    const params = { sort, limit: 24, offset: next };
    if (cat) params.category = cat;
    if (q) params.search = q;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (game) params.game = game;
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
    setCat(''); setSort('newest'); setQ(''); setInputQ(''); setMinPrice(''); setMaxPrice(''); setGame('');
  };

  const hasActiveFilters = cat || q || minPrice || maxPrice || game || sort !== 'newest';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <input
          ref={searchRef}
          value={inputQ}
          onChange={e => setInputQ(e.target.value)}
          placeholder="Search listings..."
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
        />
        <button type="submit" style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Search
        </button>
        <button type="button" onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? 'var(--surface)' : 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚙ Filters {hasActiveFilters && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>ON</span>}
        </button>
      </form>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort</div>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer' }}>
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min Price (XRP)</div>
            <input type="number" min="0" step="0.01" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" style={{ width: 90, background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max Price (XRP)</div>
            <input type="number" min="0" step="0.01" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="∞" style={{ width: 90, background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Game</div>
            <select value={game} onChange={e => setGame(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer' }}>
              <option value="">All games</option>
              {['CS2','Valorant','Fortnite','Dota 2','Rocket League','WoW','LoL','Apex Legends','Minecraft','Other'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Category tabs - horizontal scroll with edge fade + arrows */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        {catEdges.left && (<>
          <div style={{ position:'absolute', left:0, top:0, bottom:8, width:44, background:'linear-gradient(to right, var(--bg), transparent)', pointerEvents:'none', zIndex:2 }} />
          <button onClick={() => scrollCats(-1)} aria-label="Scroll categories left" style={{ position:'absolute', left:0, top:'calc(50% - 4px)', transform:'translateY(-50%)', zIndex:3, width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', cursor:'pointer', fontSize:15, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        </>)}
        <div ref={catScrollRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {CATS.map(c => (
            <button key={c.key} onClick={() => setCat(c.key)} style={{ flexShrink: 0, background: cat === c.key ? 'var(--accent)' : 'var(--surface)', color: cat === c.key ? '#fff' : 'var(--text2)', border: '1px solid ' + (cat === c.key ? 'var(--accent)' : 'var(--border)'), borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: cat === c.key ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        {catEdges.right && (<>
          <div style={{ position:'absolute', right:0, top:0, bottom:8, width:44, background:'linear-gradient(to left, var(--bg), transparent)', pointerEvents:'none', zIndex:2 }} />
          <button onClick={() => scrollCats(1)} aria-label="Scroll categories right" style={{ position:'absolute', right:0, top:'calc(50% - 4px)', transform:'translateY(-50%)', zIndex:3, width:28, height:28, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', cursor:'pointer', fontSize:15, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        </>)}
      </div>

      {/* Results header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>
          {loading ? 'Loading...' : listings.length === 0 ? 'No listings found' : listings.length + (hasMore ? '+' : '') + ' listings'}
          {q && <span style={{ color: 'var(--text2)' }}> for "<b style={{ color: 'var(--text)' }}>{q}</b>"</span>}
        </span>
        {!showFilters && (
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 12 }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ background: 'var(--surface)', borderRadius: 12, height: 220, animation: 'pulse2 1.5s infinite' }} />
          ))}
          <style>{'@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No listings found</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Try different search terms or filters</div>
          {hasActiveFilters && <button onClick={clearFilters} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Clear filters</button>}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 12 }}>
            {listings.map(l => <ListingCard key={l.id} listing={l} isFavorited={favIds.has(l.id)} onToggleFavorite={user ? toggleFav : undefined} />)}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={loadMore} style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text2)', borderRadius: 10, padding: '10px 28px', fontSize: 13, cursor: 'pointer' }}>Load more</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ListingsPage() {
  return <Suspense fallback={<div style={{padding:40,color:'var(--text3)',textAlign:'center'}}>Loading...</div>}><ListingsContent /></Suspense>;
}
