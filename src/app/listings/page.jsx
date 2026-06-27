'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import ListingCard from '../../components/ListingCard';

const CATS = [
  { key: '',         label: 'All',              emoji: '🌐', mast: { title: 'Open harbor',    sub: 'Browse every dock — game items, accounts, software keys and more. Every trade escrow-locked on the XRP Ledger.', ico: 'compass' } },
  { key: 'games',    label: 'Games',            emoji: '🎮', mast: { title: 'Games dock',     sub: 'Accounts, keys and in-game currency — every trade escrow-locked on the XRP Ledger.',                                  ico: 'gamepad' } },
  { key: 'graphics', label: 'Graphics & Art',   emoji: '🎨', mast: { title: 'Graphics bay',   sub: 'Logos, illustrations, design assets and creative files — paid in XRP, locked in escrow.',                              ico: 'palette' } },
  { key: 'software', label: 'Software & Tools', emoji: '💻', mast: { title: 'Software pier',  sub: 'Licenses, scripts, plugins and digital tools — released only when you confirm delivery.',                              ico: 'code' } },
  { key: 'accounts', label: 'Accounts',         emoji: '👤', mast: { title: 'Accounts quay',  sub: 'Verified profiles, subscriptions and access — handed over under XRPL escrow protection.',                              ico: 'user' } },
  { key: 'other',    label: 'Other',            emoji: '📦', mast: { title: 'General cargo',  sub: 'Everything else digital — protected by XRP Ledger escrow from sale to settlement.',                                    ico: 'package' } },
];

const SORTS = [
  { key: 'newest',     label: 'Newest' },
  { key: 'price_asc',  label: 'Price: low → high' },
  { key: 'price_desc', label: 'Price: high → low' },
  { key: 'popular',    label: 'Popular' },
];

const GAMES = ['Valorant', 'CS2', 'Fortnite', 'League of Legends', 'Dota 2', 'Apex Legends', 'WoW', 'Minecraft', 'Rocket League', 'Steam (general)', 'Other'];
const SUBCATS = {
  games: ['CS2','Valorant','Fortnite','Dota 2','Rocket League','League of Legends','World of Warcraft','Apex Legends','Roblox','Minecraft','Call of Duty','Old School RuneScape','RuneScape 3','Path of Exile','Diablo 4','Rust','Team Fortress 2','PUBG','Genshin Impact','Grand Theft Auto V','EA FC 24','Overwatch 2','Escape from Tarkov','ARC Raiders','New World','Lost Ark','Albion Online','Final Fantasy XIV','Warframe','Destiny 2','Other'],
  graphics: ['Logos','Illustrations','3D & models','UI/UX kits','Avatars / PFP','Textures'],
  software: ['Licenses & keys','Scripts & bots','Plugins','Templates','Source code'],
  accounts: ['Game accounts','Social media','Streaming','Subscriptions'],
  other: ['Gift cards','eBooks & guides','Collectibles','Misc'],
};

const ICON_PATHS = {
  compass: 'M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10ZM16 8l-2 6-6 2 2-6 6-2Z',
  gamepad: 'M6 11h4M8 9v4M15 10h.01M18 12h.01M17.3 5H6.7a4.7 4.7 0 0 0-4.6 5.6l1 5.3A2.6 2.6 0 0 0 7.7 17l1.6-2h5.4l1.6 2a2.6 2.6 0 0 0 4.6-1.1l1-5.3A4.7 4.7 0 0 0 17.3 5Z',
  palette: 'M12 2a10 10 0 1 0 0 20 2 2 0 0 0 1.4-3.4A1.5 1.5 0 0 1 14.5 16H17a5 5 0 0 0 5-5c0-4.97-4.48-9-10-9ZM6.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM10 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM14 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM17.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  code:    'M8 6L2 12l6 6M16 6l6 6-6 6M14 4l-4 16',
  user:    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  package: 'M3 7l9 4 9-4M3 7v10l9 4M21 7v10l-9 4M12 11v10',
};

const CSS = `
.xh-listings{font-family:var(--xh-body);color:var(--xh-text)}
.xh-listings h1{font-family:var(--xh-display);font-weight:800;color:#fff}

.xh-mast{background:#0b1b33;color:#fff;border-radius:14px;position:relative;overflow:hidden;margin:-8px 0 24px}
.xh-mast-in{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:30px 32px 40px;position:relative;z-index:1}
.xh-crumb{font-family:var(--xh-mono);font-size:11px;color:var(--xh-text3);margin-bottom:10px;letter-spacing:0.06em}
.xh-crumb b{color:#cfe0ff;font-weight:500}
.xh-mast h1{font-size:32px;letter-spacing:-0.02em;display:flex;align-items:center;gap:14px;line-height:1.1;margin:0}
.xh-mast h1 .ico{width:46px;height:46px;border-radius:13px;background:rgba(59,130,246,0.2);border:1px solid rgba(125,160,255,0.3);display:grid;place-items:center;flex-shrink:0}
.xh-mast h1 .ico svg{width:24px;height:24px;stroke:#9cc0ff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.xh-mast p{color:#9db4da;font-size:14px;margin-top:8px;max-width:560px;line-height:1.5}
.xh-mast-stats{display:flex;gap:24px;font-family:var(--xh-mono);font-size:11px;color:var(--xh-text3);text-align:right;letter-spacing:0.04em;flex-shrink:0;padding-top:6px}
.xh-mast-stats b{display:block;font-size:20px;color:#fff;font-weight:500;margin-bottom:3px;letter-spacing:0;font-family:var(--xh-display)}
.xh-mast-wave{position:absolute;bottom:-1px;left:0;right:0;height:30px;opacity:0.45;z-index:0}
.xh-mast-wave svg{width:100%;height:100%}

.xh-page{display:grid;grid-template-columns:240px minmax(0,1fr);gap:28px;padding-bottom:48px}

.xh-side{position:sticky;top:80px;align-self:start;display:flex;flex-direction:column;gap:16px;max-height:calc(100vh - 96px);overflow-y:auto;padding-bottom:8px;padding-right:4px}
.xh-side::-webkit-scrollbar{width:4px}
.xh-side::-webkit-scrollbar-thumb{background:var(--xh-border);border-radius:2px}
.xh-fg{border:1px solid var(--xh-border);border-radius:14px;padding:16px 18px;background:#fff}
.xh-fg h4{font-family:var(--xh-mono);font-size:11px;letter-spacing:0.08em;color:var(--xh-text2);margin:0 0 12px;font-weight:500}
.xh-fi{display:flex;align-items:center;gap:10px;font-size:13.5px;padding:6px 0;color:var(--xh-text2);cursor:pointer;-webkit-user-select:none;user-select:none}
.xh-fi:hover{color:var(--xh-text)}
.xh-fi.on{color:#1668D6;font-weight:600}
.xh-fi .box{width:16px;height:16px;border:1.5px solid var(--xh-border);border-radius:5px;display:grid;place-items:center;flex:none;background:#fff;transition:all 0.15s}
.xh-fi.on .box{background:var(--xh-accent);border-color:var(--xh-accent)}
.xh-fi.on .box::after{content:"✓";color:#fff;font-size:10.5px;line-height:1}
.xh-fi .count{margin-left:auto;font-family:var(--xh-mono);font-size:10.5px;color:#a8b0bc}
.xh-price-in{display:flex;gap:8px;align-items:center}
.xh-price-in input{flex:1;min-width:0;width:100%;font:inherit;font-size:13px;font-family:var(--xh-mono);padding:8px 10px;border:1px solid var(--xh-border);border-radius:8px;background:var(--xh-surface2);color:var(--xh-text)}
.xh-price-in input:focus{outline:2px solid var(--xh-accent);background:#fff}
.xh-escrow-note{font-size:12.5px;color:var(--xh-text2);background:var(--xh-surface2);border:1px solid var(--xh-border);border-left:3px solid #10b981;border-radius:10px;padding:12px 14px;line-height:1.45}

.xh-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.xh-search{flex:1;display:flex;gap:8px;min-width:240px}
.xh-search input{flex:1;font:inherit;font-size:14px;padding:10px 16px;border:1px solid var(--xh-border);border-radius:10px;background:var(--xh-surface2);color:var(--xh-text);min-width:0}
.xh-search input:focus{outline:2px solid var(--xh-accent);background:#fff}
.xh-search button{background:var(--xh-accent);color:#fff;border:none;padding:0 18px;border-radius:10px;font-weight:500;cursor:pointer;font-size:14px}
.xh-search button:hover{background:#1668D6}
.xh-sort{font:inherit;font-size:13.5px;font-weight:500;padding:10px 14px;border:1px solid var(--xh-border);border-radius:10px;background:#fff;color:var(--xh-text);cursor:pointer}

.xh-rline{font-family:var(--xh-mono);font-size:12px;color:var(--xh-text2);margin-bottom:14px}
.xh-rline b{color:var(--xh-text);font-weight:500}

.xh-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;align-items:center}
.xh-chip{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:500;color:#1668D6;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.22);border-radius:999px;padding:5px 12px}
.xh-chip i{font-style:normal;cursor:pointer;opacity:0.55}
.xh-chip i:hover{opacity:1}
.xh-chip-clear{background:transparent;border:0;color:var(--xh-text2);font-size:12.5px;cursor:pointer;padding:5px 8px;text-decoration:underline}

.xh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}

.xh-empty{text-align:center;padding:64px 24px;background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:14px;color:var(--xh-text2)}
.xh-empty .ico{font-size:38px;margin-bottom:12px;opacity:0.55}
.xh-empty .t{font-size:16px;font-weight:600;color:var(--xh-text);margin-bottom:6px}
.xh-empty .s{font-size:13px;margin-bottom:16px}
.xh-empty button{background:var(--xh-accent);color:#fff;border:none;border-radius:10px;padding:9px 18px;font-size:13.5px;font-weight:500;cursor:pointer}
.xh-empty button:hover{background:#1668D6}

.xh-load{text-align:center;margin-top:28px}
.xh-load button{background:#fff;border:1px solid var(--xh-border);color:var(--xh-text2);border-radius:10px;padding:10px 28px;font-size:14px;cursor:pointer;font-family:var(--xh-mono)}
.xh-load button:hover{border-color:var(--xh-accent);color:#1668D6}

.xh-skel{background:var(--xh-surface2);border:1px solid var(--xh-border);border-radius:14px;height:280px;animation:xhSkel 1.4s ease-in-out infinite}
@keyframes xhSkel{0%,100%{opacity:1}50%{opacity:0.5}}

@media (max-width:920px){
  .xh-page{grid-template-columns:1fr}
  .xh-side{position:static;flex-direction:row;flex-wrap:wrap;max-height:none;overflow:visible;padding-right:0}
  .xh-fg{flex:1 1 calc(50% - 8px);min-width:200px}
  .xh-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .xh-mast-in{flex-direction:column;align-items:flex-start;gap:18px;padding:24px 20px 36px}
  .xh-mast h1{font-size:24px}
  .xh-mast-stats{text-align:left;gap:18px;flex-wrap:wrap}
}
@media (max-width:560px){
  .xh-grid{grid-template-columns:1fr}
  .xh-mast-in{padding:20px 18px 32px}
}
`;

function MastIcon({ name }) {
  return (
    <span className="ico">
      <svg viewBox="0 0 24 24"><path d={ICON_PATHS[name] || ICON_PATHS.compass} /></svg>
    </span>
  );
}

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore(s => s.user);

  const [cat, setCat] = useState('');
  const [game, setGame] = useState('');
  const [q, setQ] = useState('');
  const [inputQ, setInputQ] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [proOnly, setProOnly] = useState(false);
  const [ratingMin, setRatingMin] = useState(false);
  const [sort, setSort] = useState('newest');

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [favIds, setFavIds] = useState(new Set());
  const [catCounts, setCatCounts] = useState({});

  // Inject fonts + CSS once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('xh-listings-fonts')) {
      const link = document.createElement('link');
      link.id = 'xh-listings-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);
    }
    if (!document.getElementById('xh-listings-css')) {
      const style = document.createElement('style');
      style.id = 'xh-listings-css';
      style.textContent = ':root{--xh-display:"Bricolage Grotesque","Inter",system-ui,sans-serif;--xh-body:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--xh-mono:"JetBrains Mono",ui-monospace,monospace}\n' + CSS;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (user) api.favorites.ids().then(ids => setFavIds(new Set(ids))).catch(() => {});
  }, [user]);

  // Restore from URL once
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('q')) { setQ(p.get('q')); setInputQ(p.get('q')); }
    const c0 = p.get('cat') || p.get('category'); if (c0) setCat(c0);
    if (p.get('game')) setGame(p.get('game'));
    if (p.get('min'))  setMinPrice(p.get('min'));
    if (p.get('max'))  setMaxPrice(p.get('max'));
  }, []);

  // Fetch listings whenever filters change
  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setHasMore(false);
    const params = { sort, limit: 24, offset: 0 };
    if (cat)      params.category = cat;
    if (q)        params.search   = q;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (game)     params.game     = game;
    api.listings.list(params)
      .then(data => {
        let arr = data || [];
        if (proOnly)   arr = arr.filter(x => x.seller_is_pro);
        if (ratingMin) arr = arr.filter(x => (Number(x.reputation_score) || 0) >= 4);
        setListings(arr);
        setHasMore((data || []).length === 24);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [cat, sort, q, minPrice, maxPrice, game, proOnly, ratingMin]);

  // Category counts (cheap snapshot, ignores filters)
  useEffect(() => {
    api.listings.list({ limit: 200, offset: 0 }).then(data => {
      const counts = {};
      (data || []).forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1; });
      setCatCounts(counts);
    }).catch(() => {});
  }, []);

  const loadMore = () => {
    const next = offset + 24;
    const params = { sort, limit: 24, offset: next };
    if (cat)      params.category = cat;
    if (q)        params.search   = q;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (game)     params.game     = game;
    api.listings.list(params).then(data => {
      let arr = data || [];
      if (proOnly)   arr = arr.filter(x => x.seller_is_pro);
      if (ratingMin) arr = arr.filter(x => (Number(x.reputation_score) || 0) >= 4);
      setListings(l => [...l, ...arr]);
      setOffset(next);
      setHasMore((data || []).length === 24);
    });
  };

  const toggleFav = async (id) => {
    if (!user) return;
    const isFav = favIds.has(id);
    const next = new Set(favIds);
    if (isFav) { next.delete(id); await api.favorites.remove(id).catch(() => {}); }
    else       { next.add(id);    await api.favorites.add(id).catch(() => {}); }
    setFavIds(next);
  };

  const handleSearch = (e) => { e.preventDefault(); setQ(inputQ.trim()); };
  const [openF, setOpenF] = useState({});
  const toggleF = (k) => setOpenF(s => ({ ...s, [k]: !s[k] }));
  const clearFilters = () => {
    setCat(''); setSort('newest'); setQ(''); setInputQ('');
    setMinPrice(''); setMaxPrice(''); setGame(''); setProOnly(false); setRatingMin(false);
  };

  const activeCat = CATS.find(c => c.key === cat) || CATS[0];
  const hasActiveFilters = !!(cat || q || minPrice || maxPrice || game || proOnly || ratingMin);

  const activeChips = [];
  if (cat)       activeChips.push({ k:'cat',    label: CATS.find(c => c.key === cat)?.label || cat, on: () => setCat('') });
  if (game)      activeChips.push({ k:'game',   label: game,                                       on: () => setGame('') });
  if (minPrice)  activeChips.push({ k:'min',    label: 'min ' + minPrice + ' XRP',                 on: () => setMinPrice('') });
  if (maxPrice)  activeChips.push({ k:'max',    label: 'max ' + maxPrice + ' XRP',                 on: () => setMaxPrice('') });
  if (proOnly)   activeChips.push({ k:'pro',    label: 'Pro sellers',                              on: () => setProOnly(false) });
  if (ratingMin) activeChips.push({ k:'rating', label: '4★ and up',                                on: () => setRatingMin(false) });
  if (q)         activeChips.push({ k:'q',      label: '"' + q + '"',                              on: () => { setQ(''); setInputQ(''); } });

  return (
    <div className="xh-listings">
      <header className="xh-mast">
        <div className="xh-mast-in">
          <div>
            <div className="xh-crumb">HARBOR · <b>{activeCat.mast.title.toUpperCase()}</b></div>
            <h1><MastIcon name={activeCat.mast.ico} />{activeCat.mast.title}</h1>
            <p>{activeCat.mast.sub}</p>
          </div>
          <div className="xh-mast-stats">
            <div><b>{listings.length}{hasMore ? '+' : ''}</b>{listings.length === 1 ? 'listing' : 'listings'}</div>
            <div><b>XRPL</b>on-chain escrow</div>
            <div><b>100%</b>escrow-protected</div>
          </div>
        </div>
        <div className="xh-mast-wave">
          <svg viewBox="0 0 1200 34" preserveAspectRatio="none">
            <path d="M0 18 Q 100 4 200 18 T 400 18 T 600 18 T 800 18 T 1000 18 T 1200 18 V34 H0 Z" fill="#10264a" />
          </svg>
        </div>
      </header>

      <div className="xh-page">
        <aside className="xh-side">
          <div className="xh-fg">
            <h4 onClick={() => toggleF('cat')} style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>CATEGORY<span style={{fontSize:10,opacity:0.55,transition:'transform .2s',transform:openF.cat?'rotate(180deg)':'none'}}>▾</span></h4>
            {openF.cat && CATS.filter(c => c.key).map(c => (
              <div key={c.key} className={'xh-fi ' + (cat === c.key ? 'on' : '')} onClick={() => { setCat(cat === c.key ? '' : c.key); setGame(''); }}>
                <span className="box"></span>{c.label}<span className="count">{catCounts[c.key] || 0}</span>
              </div>
            ))}
          </div>
          {(cat ? SUBCATS[cat] : GAMES) && (
            <div className="xh-fg">
              <h4 onClick={() => toggleF('game')} style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>{(cat === '' || cat === 'games') ? 'GAME' : 'TYPE'}<span style={{fontSize:10,opacity:0.55,transition:'transform .2s',transform:openF.game?'rotate(180deg)':'none'}}>▾</span></h4>
              {openF.game && (cat ? (SUBCATS[cat] || []) : GAMES).map(g => (
                <div key={g} className={'xh-fi ' + (game === g ? 'on' : '')} onClick={() => setGame(game === g ? '' : g)}>
                  <span className="box"></span>{g}
                </div>
              ))}
            </div>
          )}
          <div className="xh-fg">
            <h4 onClick={() => toggleF('price')} style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>PRICE · XRP<span style={{fontSize:10,opacity:0.55,transition:'transform .2s',transform:openF.price?'rotate(180deg)':'none'}}>▾</span></h4>
            {openF.price && <div className="xh-price-in">
              <input placeholder="min" value={minPrice} onChange={e => setMinPrice(e.target.value)} inputMode="decimal" />
              <span style={{ color: 'var(--xh-text2)' }}>–</span>
              <input placeholder="max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} inputMode="decimal" />
            </div>}
          </div>
          <div className="xh-fg">
            <h4 onClick={() => toggleF('seller')} style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>SELLER<span style={{fontSize:10,opacity:0.55,transition:'transform .2s',transform:openF.seller?'rotate(180deg)':'none'}}>▾</span></h4>
            {openF.seller && <><div className={'xh-fi ' + (proOnly ? 'on' : '')} onClick={() => setProOnly(!proOnly)}>
              <span className="box"></span>Pro sellers only
            </div>
            <div className={'xh-fi ' + (ratingMin ? 'on' : '')} onClick={() => setRatingMin(!ratingMin)}>
              <span className="box"></span>4★ and up
            </div></>}
          </div>
          <div className="xh-escrow-note">🛡 Every listing here is escrow-protected — your XRP is locked on-chain until you confirm delivery.</div>
        </aside>

        <main>
          <form onSubmit={handleSearch} className="xh-toolbar">
            <div className="xh-search">
              <input value={inputQ} onChange={e => setInputQ(e.target.value)} placeholder={'Search in ' + activeCat.mast.title + '…'} />
              <button type="submit">Search</button>
            </div>
            <select className="xh-sort" value={sort} onChange={e => setSort(e.target.value)}>
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </form>

          {activeChips.length > 0 && (
            <div className="xh-chips">
              {activeChips.map(c => (
                <span key={c.k} className="xh-chip">{c.label} <i onClick={c.on}>✕</i></span>
              ))}
              <button className="xh-chip-clear" onClick={clearFilters} type="button">Clear all</button>
            </div>
          )}

          <div className="xh-rline">
            <b>{loading ? '…' : (listings.length + (hasMore ? '+' : '')) + ' listings'}</b>
            {' · sorted by ' + (SORTS.find(s => s.key === sort)?.label || sort).toLowerCase()}
            {' · ledger-verified sellers first'}
          </div>

          {loading ? (
            <div className="xh-grid">{[...Array(6)].map((_, i) => <div key={i} className="xh-skel" />)}</div>
          ) : listings.length === 0 ? (
            <div className="xh-empty">
              <div className="ico">🔍</div>
              <div className="t">No listings found</div>
              <div className="s">Try a different category or filter — or be the first to list one</div>
              {hasActiveFilters
                ? <button onClick={clearFilters}>Clear filters</button>
                : <button onClick={() => router.push('/listings/new')}>List an item</button>}
            </div>
          ) : (
            <>
              <div className="xh-grid">
                {listings.map(l => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    isFavorited={favIds.has(l.id)}
                    onToggleFavorite={user ? toggleFav : undefined}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="xh-load">
                  <button onClick={loadMore}>Load more</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'var(--xh-text2)', textAlign: 'center', fontFamily: '"Inter",system-ui,sans-serif' }}>Loading…</div>}>
      <ListingsContent />
    </Suspense>
  );
}
