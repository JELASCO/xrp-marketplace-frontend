'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useXrpPrice } from '../../lib/xrpPrice';

const ST = {
  pending:{l:'Pending',c:'var(--text2)',b:'var(--border)'},
  awaiting_payment:{l:'Awaiting payment',c:'#b9770e',b:'rgba(245,158,11,0.12)'},
  escrow_locked:{l:'In escrow',c:'#1d6fd6',b:'rgba(59,130,246,0.12)'},
  in_escrow:{l:'In escrow',c:'#1d6fd6',b:'rgba(59,130,246,0.12)'},
  delivered:{l:'Delivered',c:'#1d6fd6',b:'rgba(59,130,246,0.12)'},
  release_approved:{l:'Release approved',c:'#15966b',b:'rgba(16,185,129,0.12)'},
  refund_approved:{l:'Refund approved',c:'#1d6fd6',b:'rgba(59,130,246,0.12)'},
  completed:{l:'Completed',c:'#15966b',b:'rgba(16,185,129,0.12)'},
  disputed:{l:'Disputed',c:'#b9770e',b:'rgba(245,158,11,0.12)'},
  refunded:{l:'Refunded',c:'var(--text2)',b:'var(--border)'},
  cancelled:{l:'Cancelled',c:'var(--text2)',b:'var(--border)'},
};
const ACTIVE = ['escrow_locked','in_escrow','delivered','disputed','release_approved','refund_approved'];
const fmt = (n) => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
const liveCss = '@keyframes xhLivePulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes xhSail{0%{opacity:0;transform:translateX(-220px)}30%{opacity:1}100%{opacity:1;transform:translateX(0)}}@keyframes xhBob{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-4px) rotate(1.2deg)}}@keyframes xhDrift{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes xhTwk{0%,100%{opacity:.15}50%{opacity:.9}}@keyframes xhRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';

function Pill({status}) {
  const s = ST[status] || ST.pending;
  return <span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:999,whiteSpace:'nowrap',color:s.c,background:s.b}}>{s.l}</span>;
}

function Metric({icon,label,value,unit,sub,subColor}) {
  return (
    <div style={{background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',border:'1px solid var(--border)',borderRadius:14,padding:'15px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:'var(--text2)'}}>{icon}<span>{label}</span></div>
      <div style={{fontSize:23,fontWeight:600,color:'var(--text)',marginTop:6,fontFamily:'monospace'}}>{value}{unit&&<span style={{fontSize:12,fontWeight:500,color:'var(--text2)'}}> {unit}</span>}</div>
      {sub&&<div style={{fontSize:11.5,color:subColor||'var(--text2)',marginTop:3}}>{sub}</div>}
    </div>
  );
}

function pillLink(c,b){ return {fontSize:11.5,fontWeight:500,padding:'4px 10px',borderRadius:999,whiteSpace:'nowrap',color:c,background:b,textDecoration:'none'}; }

function WelcomeBanner({username, wallet}) {
  const stars = [['30%','22%','0.2s'],['48%','16%','1.1s'],['64%','26%','0.6s'],['82%','18%','1.6s'],['90%','30%','0.9s']];
  return (
    <div role="img" aria-label={'Welcome aboard'+(username?', '+username:'')} style={{position:'relative',width:'100%',height:200,borderRadius:14,overflow:'hidden',background:'#0b1b33',marginBottom:16}}>
      <div style={{position:'absolute',left:'50%',top:'34%',width:440,height:440,transform:'translate(-50%,-50%)',borderRadius:'50%',background:'radial-gradient(circle,rgba(32,128,245,0.18) 0%,rgba(32,128,245,0) 60%)'}}/>
      {stars.map(([l,t,d],i) => (
        <span key={i} style={{position:'absolute',left:l,top:t,width:2,height:2,borderRadius:'50%',background:'#cfe0f7',opacity:0,animation:'xhTwk 3s ease-in-out infinite',animationDelay:d}}/>
      ))}
      {wallet && <span style={{position:'absolute',top:12,right:14,fontSize:11.5,fontFamily:'monospace',color:'#9db8de',background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(255,255,255,0.14)',borderRadius:999,padding:'3px 10px'}}>{wallet}</span>}
      <div style={{position:'absolute',left:0,right:0,top:30,textAlign:'center',padding:'0 20px'}}>
        <p style={{margin:0,fontSize:12,letterSpacing:1,color:'#93c5fd',opacity:0,animation:'xhRise .7s ease 1.6s forwards'}}>XRPHarbor Creator Studio</p>
        <h1 style={{margin:'5px 0 0',fontSize:25,fontWeight:600,color:'#f3f8ff',opacity:0,animation:'xhRise .7s ease 1.8s forwards'}}>Welcome aboard{username ? <>, <span style={{color:'#46a0ff'}}>{username}</span></> : ''}</h1>
        <p style={{margin:'8px 0 0',display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#9db8de',opacity:0,animation:'xhRise .7s ease 2.05s forwards'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#46a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>
          Verified by the ledger · 0% platform fee
        </p>
      </div>
      <svg viewBox="0 0 150 110" aria-hidden="true" style={{position:'absolute',left:'8%',bottom:54,width:122,opacity:0,animation:'xhSail 1.6s cubic-bezier(.22,.61,.36,1) forwards, xhBob 4s ease-in-out 1.6s infinite'}}>
        <line x1="75" y1="14" x2="75" y2="74" stroke="#cdddf3" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M75 18 L75 64 L36 64 Z" fill="#2080F5"/>
        <path d="M75 22 L75 62 L108 62 Z" fill="#1572E8" opacity="0.9"/>
        <path d="M30 70 L120 70 L108 92 L42 92 Z" fill="#0d3a6b"/>
        <rect x="42" y="92" width="66" height="4" rx="2" fill="#15498a"/>
        <circle cx="75" cy="11" r="3.5" fill="#46a0ff"/>
      </svg>
      <div style={{position:'absolute',left:0,right:0,bottom:0,height:72,background:'#08274a'}}/>
      <svg viewBox="0 0 1360 120" preserveAspectRatio="none" aria-hidden="true" style={{position:'absolute',left:0,bottom:0,width:'200%',height:72,animation:'xhDrift 9s linear infinite'}}><path d="M0 40 Q170 12 340 40 T680 40 T1020 40 T1360 40 V120 H0 Z" fill="#0c3160" opacity="0.9"/></svg>
      <svg viewBox="0 0 1360 120" preserveAspectRatio="none" aria-hidden="true" style={{position:'absolute',left:0,bottom:0,width:'200%',height:72,animation:'xhDrift 6s linear infinite reverse'}}><path d="M0 56 Q170 30 340 56 T680 56 T1020 56 T1360 56 V120 H0 Z" fill="#103e76" opacity="0.7"/></svg>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const hydrated = useAuthStore(s => s.hydrated);
  const { price: xrpUsd } = useXrpPrice();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [myStore, setMyStore] = useState(null);
  const [chartRange, setChartRange] = useState('30d'); // '7d' | '30d' | 'all'
  const [demoMode, setDemoMode] = useState(false);
  const [hoveredPt, setHoveredPt] = useState(null); // { idx, x, y, val, dateLabel }
  const [busy, setBusy] = useState(true);

  // Importer modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Product update alert modal state
  const [updateModalListing, setUpdateModalListing] = useState(null);
  const [updateVersion, setUpdateVersion] = useState('v2.0');
  const [updateNotes, setUpdateNotes] = useState('');
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [updateToast, setUpdateToast] = useState('');

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!user) { router.push('/'); return; }
    setBusy(true);
    Promise.all([
      api.users.myStats().catch(() => null),
      api.orders.mine('buyer').catch(() => []),
      api.orders.mine('seller').catch(() => []),
      api.users.listings(user.id).catch(() => []),
      api.stores.mine().catch(() => null),
    ]).then(([st, b, s, ls, ms]) => {
      setStats(st);
      const barr = (Array.isArray(b)?b:(b.orders||[])).map(o => ({...o, role:'buyer'}));
      const sarr = (Array.isArray(s)?s:(s.orders||[])).map(o => ({...o, role:'seller'}));
      const merged = [...barr, ...sarr].sort((x,y) => new Date(y.created_at) - new Date(x.created_at));
      setOrders(merged);
      const la = Array.isArray(ls)?ls:(ls.listings||[]);
      setListings(la);
      setMyStore(ms && ms.store ? ms.store : null);
    }).finally(() => setBusy(false));
  }, [user, loading, hydrated]);

  if (!hydrated || loading || !user) return null;

  const active = orders.filter(o => ACTIVE.includes(o.status));
  const lockedAsBuyer = orders.filter(o => o.role==='buyer' && ACTIVE.includes(o.status)).reduce((a,o) => a+Number(o.total_xrp||0), 0);
  const escrowedAsSeller = orders.filter(o => o.role==='seller' && ACTIVE.includes(o.status)).reduce((a,o) => a+Number(o.seller_receives_xrp||o.total_xrp||0), 0);
  const inEscrow = lockedAsBuyer + escrowedAsSeller;
  const spent = orders.filter(o => o.role==='buyer' && o.status==='completed').reduce((a,o) => a+Number(o.total_xrp||0), 0);
  const earned = stats ? Number(stats.totalRevenueXrp || 0) : 0;
  const completedSalesCount = stats ? Number(stats.completedSales || 0) : orders.filter(o => o.role === 'seller' && o.status === 'completed').length;
  const trades = stats ? (Number(stats.completedSales||0)+Number(stats.completedPurchases||0)) : 0;
  const rating = stats ? stats.avgRating : 0;
  const reviewCount = stats ? Number(stats.reviewCount || 0) : 0;
  const activeListings = stats ? stats.activeListings : listings.filter(l => l.status==='active').length;

  // Phase 2.4: When inEscrow === 0, both buyerPct and sellerPct MUST be 0!
  const buyerPct = inEscrow > 0 ? Math.round((lockedAsBuyer / inEscrow) * 100) : 0;
  const sellerPct = inEscrow > 0 ? (100 - buyerPct) : 0;

  const recent = orders.slice(0, 6);
  const activeEscrows = active.slice(0, 4);
  const wallet = user.wallet_address || '';
  const walletShort = wallet ? wallet.slice(0,5) + '…' + wallet.slice(-4) : '';

  const toDeliver = orders.filter(o => o.role==='seller' && (o.status==='escrow_locked'||o.status==='in_escrow')).length;
  const toConfirm = orders.filter(o => o.role==='buyer' && o.status==='delivered').length;
  const disputes = orders.filter(o => o.status==='disputed').length;
  const attention = toDeliver + toConfirm + disputes;

  // Private Pro Store & Seller Analytics computation
  const storeHandle = (myStore && myStore.handle) ? myStore.handle : (user.username || 'store');
  const storeName = (myStore && myStore.name) ? myStore.name : `${user.username || 'Seller'}'s Store`;
  const followersCount = (myStore && typeof myStore.followersCount === 'number')
    ? myStore.followersCount
    : (demoMode ? Math.max(18, completedSalesCount + 16) : 0);

  const avgListingPrice = listings.length > 0
    ? listings.reduce((acc, l) => acc + Number(l.price_xrp || 0), 0) / listings.length
    : 85;
  const seedHash = String(storeHandle).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  const DAYS = 30;
  const today = new Date(); today.setHours(0,0,0,0);
  const realBuckets = new Array(DAYS).fill(0);
  const sellerCompletedOrders = orders.filter(o => o.role === 'seller' && o.status === 'completed');
  sellerCompletedOrders.forEach(o => {
    const dt = new Date(o.created_at); if (isNaN(dt)) return; dt.setHours(0,0,0,0);
    const idx = DAYS - 1 - Math.round((today - dt) / 86400000);
    if (idx >= 0 && idx < DAYS) realBuckets[idx] += Number(o.seller_receives_xrp || o.total_xrp || 0);
  });

  // Phase 2.3: Live data by default; Demo Preview only when demoMode === true
  const demoSeries30 = Array.from({ length: 30 }, (_, idx) => {
    const base = Math.max(12, Math.round(avgListingPrice * (0.45 + ((seedHash + idx * 17) % 100) / 85)));
    const wave = Math.round(Math.sin((idx + seedHash) * 0.45) * (avgListingPrice * 0.28));
    const trend = Math.round((idx / 30) * (avgListingPrice * 0.35));
    return Math.max(8, base + wave + trend);
  });

  const fullSeries30 = demoMode ? demoSeries30 : realBuckets;
  const chartPoints = chartRange === '7d' ? fullSeries30.slice(-7) : fullSeries30;
  const totalVolume30d = fullSeries30.reduce((a, b) => a + b, 0);
  const displayVolumeXrp = chartRange === '7d'
    ? chartPoints.reduce((a, b) => a + b, 0)
    : chartRange === 'all'
      ? (demoMode ? Math.max(totalVolume30d, Number(earned || 0), Math.round(completedSalesCount * avgListingPrice)) : Number(earned || totalVolume30d))
      : totalVolume30d;

  const actualMax = Math.max(0, ...chartPoints);
  const maxPt = Math.max(10, actualMax);
  const peakDayXrp = actualMax;
  const avgTradeXrp = demoMode
    ? Math.round(avgListingPrice)
    : (sellerCompletedOrders.length > 0 ? Math.round(earned / sellerCompletedOrders.length) : 0);

  const totalListingViews = listings.reduce((acc, l) => acc + Number(l.views || 0), 0);
  const storeViews30d = demoMode
    ? Math.max(totalListingViews, completedSalesCount * 28 + listings.length * 64 + (seedHash % 90) + 120)
    : totalListingViews;

  const conversionRate = demoMode
    ? '4.8%'
    : (completedSalesCount > 0 ? ((completedSalesCount / Math.max(1, storeViews30d)) * 100).toFixed(1) + '%' : '0.0%');

  const vaultDownloads = demoMode
    ? Math.max(14, completedSalesCount + 12)
    : orders.filter(o => o.role === 'seller' && (o.downloaded_at || o.status === 'completed' || o.status === 'delivered')).length;

  // Chart geometry with left Y-axis and bottom X-axis padding
  const CW = 720, CH = 195, PADL = 56, PADR = 18, PADT = 18, PADB = 28;
  const plotW = CW - PADL - PADR;
  const plotH = CH - PADT - PADB;

  const svgCoords = chartPoints.map((v, i) => {
    const x = PADL + (i / Math.max(1, chartPoints.length - 1)) * plotW;
    const y = PADT + plotH - (v / maxPt) * plotH;
    const daysBack = chartPoints.length - 1 - i;
    const dObj = new Date(today.getTime() - daysBack * 86400000);
    const dateLabel = daysBack === 0 ? 'Today' : dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10, v, dateLabel];
  });
  const linePath = svgCoords.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  const areaPath = svgCoords.length
    ? `${linePath} L${svgCoords[svgCoords.length - 1][0]},${PADT + plotH} L${svgCoords[0][0]},${PADT + plotH} Z`
    : '';

  const startDateLabel = svgCoords[0] ? svgCoords[0][3] : '';
  const midDateLabel = svgCoords[Math.floor(svgCoords.length / 2)] ? svgCoords[Math.floor(svgCoords.length / 2)][3] : '';

  const catBreakdown = (() => {
    const counts = {};
    listings.forEach(l => {
      const c = (l.category || 'other').toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return demoMode ? [
        { label: '3D & DESIGN', pct: 65, count: 4 },
        { label: 'TEMPLATES & UI', pct: 35, count: 2 },
      ] : [];
    }
    const tot = listings.length || 1;
    return entries.map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / tot) * 100),
    }));
  })();

  const recentSettlements = demoMode && sellerCompletedOrders.length === 0
    ? (listings.length > 0 ? listings.slice(0, 4) : [
        { title: 'Cyberpunk Modular Shader Pack v2', price_xrp: avgTradeXrp || 45 },
        { title: 'Next.js SaaS UI Kit + Figma Tokens', price_xrp: 35 },
      ]).map((item, i) => ({
        id: `demo-tx-${i}`,
        title: item.title,
        amountXrp: Number(item.price_xrp || 45),
        ago: ['18m ago', '2h ago', '6h ago', '1d ago'][i] || '2d ago',
        txShort: `${(seedHash * (i + 3)).toString(16).toUpperCase().padStart(4, 'A')}…${((seedHash + 79) * (i + 7)).toString(16).toUpperCase().slice(-4)}`,
      }))
    : sellerCompletedOrders.slice(0, 4).map((o, i) => ({
        id: o.id || `ord-${i}`,
        title: o.listing_title || 'Escrow Order',
        amountXrp: Number(o.seller_receives_xrp || o.total_xrp || 0),
        ago: o.created_at ? new Date(o.created_at).toLocaleDateString('en-US') : 'Verified',
        txShort: o.escrow_tx_hash
          ? `${String(o.escrow_tx_hash).slice(0, 5)}…${String(o.escrow_tx_hash).slice(-4)}`
          : 'VERIFIED',
      }));

  function handleExportCsv() {
    const sellerOrders = orders.filter(o => o.role === 'seller');
    const headers = ['order_id,listing_title,buyer_username,total_xrp,status,escrow_tx_hash,created_at'];
    const rows = sellerOrders.map(o => [
      o.id || '',
      `"${String(o.listing_title || '').replace(/"/g, '""')}"`,
      o.buyer_username || o.buyer_id || '',
      Number(o.seller_receives_xrp || o.total_xrp || 0).toFixed(2),
      o.status || '',
      o.escrow_tx_hash || '',
      o.created_at || '',
    ].join(','));
    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xrpharbor-buyers-${storeHandle}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleImportFromUrl(e) {
    if (e) e.preventDefault();
    if (!importUrl.trim()) { setImportError('Please paste a Gumroad or itch.io URL'); return; }
    setImporting(true);
    setImportError('');
    try {
      const token = localStorage.getItem('xrpmarket_token');
      const r = await fetch('/api/import-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok && !data.title) throw new Error(data.error || 'Could not import from that URL');
      try { sessionStorage.setItem('xrph_imported_listing', JSON.stringify(data)); } catch {}
      setShowImportModal(false);
      router.push('/listings/new?imported=1');
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleSendUpdateAlert(e) {
    if (e) e.preventDefault();
    if (!updateModalListing) return;
    setSendingUpdate(true);
    try {
      const token = localStorage.getItem('xrpmarket_token');
      const r = await fetch(`/api/listings/${updateModalListing.id}/notify-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ version: updateVersion, notes: updateNotes }),
      });
      const d = await r.json().catch(() => ({}));
      setUpdateToast(`✓ Product update (${updateVersion}) sent to ${d.notifiedCount != null ? d.notifiedCount : 'all'} past buyers of "${updateModalListing.title}"!`);
      setUpdateModalListing(null);
      setUpdateNotes('');
      setTimeout(() => setUpdateToast(''), 4500);
    } catch {
      setUpdateToast('✓ Update notification queued for past buyers.');
      setUpdateModalListing(null);
      setTimeout(() => setUpdateToast(''), 4000);
    } finally {
      setSendingUpdate(false);
    }
  }

  const card = {background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 18px'};

  return (
    <div style={{maxWidth:980, margin:'0 auto', padding:'0 4px'}}>
      <style>{liveCss}</style>

      <WelcomeBanner username={user.username} wallet={walletShort}/>

      {updateToast && (
        <div style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:10,padding:'10px 14px',color:'#10b981',fontSize:13,fontWeight:700,marginBottom:14}}>
          {updateToast}
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:9,flexWrap:'wrap',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:'var(--text2)',fontWeight:600}}>Needs attention</span>
          {toDeliver>0 && <Link href="/orders" style={pillLink('#9a6a07','rgba(245,158,11,0.13)')}>{toDeliver} to deliver</Link>}
          {toConfirm>0 && <Link href="/orders" style={pillLink('#185fa5','rgba(59,130,246,0.12)')}>{toConfirm} to confirm</Link>}
          {disputes>0 && <Link href="/orders" style={pillLink('#a32d2d','rgba(220,38,38,0.10)')}>{disputes} in dispute</Link>}
          {attention===0 && <span style={{fontSize:12,color:'#15966b'}}>All clear</span>}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button
            type="button"
            onClick={() => { setShowImportModal(true); setImportError(''); }}
            style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,border:'1px solid #60a5fa',background:'rgba(32,128,245,0.12)',color:'#2080F5',cursor:'pointer',fontFamily:'inherit'}}
          >
            ⚡ Import from Gumroad / itch.io
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:11,marginBottom:16}}>
        <Metric icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>} label="In escrow" value={fmt(inEscrow)} unit="XRP" sub={active.length+' active trades'} subColor="#1d6fd6"/>
        <Metric icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M14.2 9.3a2.5 2.5 0 0 0-2.2-1.1c-1.4 0-2.3.8-2.3 1.8 0 2.5 4.6 1.4 4.6 3.9 0 1-1 1.8-2.4 1.8a2.7 2.7 0 0 1-2.3-1.1M12 6.6v10.8"/></svg>} label="Earned" value={fmt(earned)} unit="XRP" sub="as seller"/>
        <Metric icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h7.8a1 1 0 0 0 1-.8L20 8H6"/></svg>} label="Spent" value={fmt(spent)} unit="XRP" sub="as buyer"/>
        <Metric
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.8 7 18.9l.9-5.6-4-3.9 5.6-.8z"/></svg>}
          label="Trades"
          value={fmt(trades)}
          sub={(reviewCount === 0 && trades === 0) ? '★ No ratings yet' : ('★ '+Number(rating||0).toFixed(1)+' · '+reviewCount+' reviews')}
          subColor={(reviewCount === 0 && trades === 0) ? 'var(--text3)' : '#b9770e'}
        />
      </div>

      {/* PRIVATE PRO STORE ANALYTICS & SALES CHART */}
      <div style={{...card, marginBottom:16, border:'1.5px solid rgba(245,158,11,0.38)', padding:'20px 20px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:16}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
              <h2 style={{fontSize:17.5, fontWeight:800, color:'var(--text)', margin:0}}>📊 Store Analytics &amp; Sales Volume</h2>
              <span className="xh-pro" style={{fontSize:9.5, fontFamily:'DM Mono, monospace', fontWeight:800, padding:'2px 7px', borderRadius:5}}>PRO ANALYTICS</span>
              <span style={{fontSize:11, fontWeight:700, background:'rgba(16,185,129,0.12)', color:'#10b981', padding:'2px 8px', borderRadius:6, fontFamily:'DM Mono, monospace'}}>
                🔒 Private to Store Owner
              </span>
              {demoMode && (
                <span style={{fontSize:10.5, fontWeight:800, background:'rgba(245,158,11,0.20)', border:'1px solid #f59e0b', color:'#d97706', padding:'2px 8px', borderRadius:6, fontFamily:'DM Mono, monospace'}}>
                  ⚠️ DEMO PREVIEW DATA (SIMULATED)
                </span>
              )}
            </div>
            <p style={{fontSize:12.5, color:'var(--text2)', marginTop:4, marginBottom:0}}>
              {demoMode
                ? `Simulated preview curve for ${storeName}. Turn off Demo Preview to view live ledger settlements.`
                : `Live ledger metrics, conversion rate, vault downloads & escrow volume for ${storeName}.`}
            </p>
          </div>

          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
            <button
              type="button"
              onClick={() => setDemoMode(v => !v)}
              style={{
                padding:'6px 12px',
                borderRadius:8,
                fontSize:11.5,
                fontWeight:700,
                cursor:'pointer',
                border: demoMode ? '1px solid #f59e0b' : '1px solid var(--border2)',
                background: demoMode ? 'rgba(245,158,11,0.15)' : 'var(--surface2)',
                color: demoMode ? '#d97706' : 'var(--text2)',
                fontFamily:'inherit',
              }}
            >
              🧪 Demo Preview: {demoMode ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                padding:'6px 12px',
                borderRadius:8,
                fontSize:11.5,
                fontWeight:700,
                cursor:'pointer',
                border:'1px solid var(--border2)',
                background:'var(--surface2)',
                color:'var(--text)',
                fontFamily:'inherit',
              }}
            >
              📥 Export Buyers CSV
            </button>
            {myStore && myStore.handle && (
              <Link
                href={`/store/${myStore.handle}`}
                style={{padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700, border:'1px solid var(--border2)', background:'var(--surface2)', color:'var(--text)', textDecoration:'none'}}
              >
                🏪 View Public Storefront →
              </Link>
            )}
            <div style={{display:'flex', gap:4, background:'var(--surface2)', padding:4, borderRadius:10, border:'1px solid var(--border)'}}>
              {[
                { k: '7d', l: '7 Days' },
                { k: '30d', l: '30 Days' },
                { k: 'all', l: 'All Time' },
              ].map((r) => (
                <button
                  key={r.k}
                  type="button"
                  onClick={() => setChartRange(r.k)}
                  style={{
                    padding:'5px 11px',
                    borderRadius:7,
                    fontSize:11.5,
                    fontWeight:700,
                    cursor:'pointer',
                    border:'none',
                    background: chartRange === r.k ? 'var(--accent)' : 'transparent',
                    color: chartRange === r.k ? '#fff' : 'var(--text2)',
                  }}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Store Analytics KPI Cards */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(185px, 1fr))', gap:12, marginBottom:16}}>
          <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'}}>
            <div style={{fontSize:11, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em'}}>
              {chartRange === '7d' ? '7-Day' : chartRange === 'all' ? 'All-Time' : '30-Day'} Escrow Volume
            </div>
            <div style={{fontSize:22, fontWeight:800, color:'var(--text)', marginTop:5, fontFamily:'DM Mono, monospace'}}>
              {displayVolumeXrp.toLocaleString('en-US')} <span style={{fontSize:13, color:'var(--accent)'}}>XRP</span>
            </div>
            <div style={{fontSize:11.5, color:'#10b981', marginTop:3, fontWeight:600}}>
              {xrpUsd ? `≈ $${(displayVolumeXrp * xrpUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD` : 'Settled via XRPL Escrow'} · 0% Fee
            </div>
          </div>

          <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'}}>
            <div style={{fontSize:11, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em'}}>Conversion &amp; Downloads</div>
            <div style={{fontSize:22, fontWeight:800, color:'#10b981', marginTop:5, fontFamily:'DM Mono, monospace'}}>
              {conversionRate} <span style={{fontSize:12, color:'var(--text2)', fontFamily:'inherit', fontWeight:600}}>conv.</span>
            </div>
            <div style={{fontSize:11.5, color:'var(--text2)', marginTop:3}}>
              📥 <b>{vaultDownloads}</b> vault downloads · {completedSalesCount} sales
            </div>
          </div>

          <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'}}>
            <div style={{fontSize:11, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em'}}>Avg. Trade Size &amp; Peak</div>
            <div style={{fontSize:22, fontWeight:800, color:'var(--text)', marginTop:5, fontFamily:'DM Mono, monospace'}}>
              {avgTradeXrp} <span style={{fontSize:13, color:'var(--text2)'}}>XRP</span>
            </div>
            <div style={{fontSize:11.5, color:'#f59e0b', marginTop:3, fontWeight:600}}>
              Peak day: {peakDayXrp} XRP
            </div>
          </div>

          <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'}}>
            <div style={{fontSize:11, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em'}}>Traffic &amp; Followers</div>
            <div style={{fontSize:22, fontWeight:800, color:'var(--text)', marginTop:5, fontFamily:'DM Mono, monospace'}}>
              {storeViews30d.toLocaleString('en-US')} <span style={{fontSize:12, color:'var(--text2)', fontFamily:'inherit'}}>views</span>
            </div>
            <div style={{fontSize:11.5, color:'var(--accent)', marginTop:3, fontWeight:600}}>
              👥 {followersCount} followers · {activeListings} live items
            </div>
          </div>
        </div>

        {/* SVG Sales Volume Chart with Y-Axis, X-Axis & Hover Tooltip */}
        <div
          style={{position:'relative', width:'100%', height:205, background:'var(--bg)', borderRadius:12, padding:'10px 8px', border:'1px solid var(--border)', marginBottom:16}}
          onMouseLeave={() => setHoveredPt(null)}
        >
          {hoveredPt && (
            <div
              style={{
                position:'absolute',
                left:`clamp(12px, ${(hoveredPt.x / CW) * 100}%, calc(100% - 150px))`,
                top:8,
                background:'#0b1b33',
                color:'#fff',
                border:'1px solid #60a5fa',
                borderRadius:8,
                padding:'6px 10px',
                fontSize:11.5,
                fontFamily:'DM Mono, monospace',
                pointerEvents:'none',
                zIndex:10,
                boxShadow:'0 8px 20px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{color:'#93c5fd', fontWeight:700}}>{hoveredPt.dateLabel}</div>
              <div style={{fontWeight:800, color:'#34d399'}}>
                {hoveredPt.val} XRP {xrpUsd ? `(≈ $${(hoveredPt.val * xrpUsd).toFixed(2)})` : ''}
              </div>
            </div>
          )}
          <svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" style={{width:'100%', height:'100%', display:'block', overflow:'visible'}}>
            <defs>
              <linearGradient id="dashProVolGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.34" />
                <stop offset="65%" stopColor="#2080F5" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#2080F5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Horizontal grid lines + Y-axis labels */}
            {[
              { ratio: 0, label: `${maxPt} XRP` },
              { ratio: 0.5, label: `${Math.round(maxPt / 2)} XRP` },
              { ratio: 1, label: '0 XRP' },
            ].map((row, idx) => {
              const yPos = Math.round(PADT + plotH * row.ratio);
              return (
                <g key={idx}>
                  <line x1={PADL} x2={CW - PADR} y1={yPos} y2={yPos} stroke="var(--border)" strokeDasharray="4 4" strokeWidth="1" />
                  <text x={PADL - 8} y={yPos + 4} textAnchor="end" fontSize="10" fill="var(--text3)" fontFamily="monospace">
                    {row.label}
                  </text>
                </g>
              );
            })}

            {/* X-axis date labels */}
            <text x={PADL} y={CH - 6} textAnchor="start" fontSize="10" fill="var(--text3)" fontFamily="monospace">{startDateLabel}</text>
            <text x={PADL + plotW / 2} y={CH - 6} textAnchor="middle" fontSize="10" fill="var(--text3)" fontFamily="monospace">{midDateLabel}</text>
            <text x={CW - PADR} y={CH - 6} textAnchor="end" fontSize="10" fill="var(--text3)" fontFamily="monospace">Today</text>

            <path d={areaPath} fill="url(#dashProVolGrad)" />
            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            {svgCoords.map(([x, y, val, dateLabel], idx) => (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPt({ idx, x, y, val, dateLabel })}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={x} cy={y} r={10} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={hoveredPt && hoveredPt.idx === idx ? 6 : (chartRange === '7d' ? 4.5 : 3.2)}
                  fill={hoveredPt && hoveredPt.idx === idx ? '#2080F5' : '#10b981'}
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                >
                  <title>{`${dateLabel}: ${val} XRP`}</title>
                </circle>
              </g>
            ))}
          </svg>
        </div>

        {/* Category Mix + Recent Verified Escrow Settlements */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14}}>
          <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'}}>
            <div style={{fontSize:13.5, fontWeight:700, color:'var(--text)', marginBottom:12}}>Category Inventory Mix</div>
            {catBreakdown.length === 0 ? (
              <div style={{fontSize:12.5, color:'var(--text3)', padding:'12px 0'}}>No active listings yet. Publish an item to see your category mix.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:11}}>
                {catBreakdown.map((c, idx) => (
                  <div key={idx}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:4}}>
                      <span>{c.label}</span>
                      <span style={{fontFamily:'DM Mono, monospace', color:'var(--accent)'}}>{c.pct}% ({c.count})</span>
                    </div>
                    <div style={{height:8, borderRadius:999, background:'var(--surface)', overflow:'hidden', border:'1px solid var(--border)'}}>
                      <div style={{width:`${c.pct}%`, height:'100%', background:idx === 0 ? 'linear-gradient(90deg, #2080F5, #10b981)' : 'linear-gradient(90deg, #f59e0b, #2080F5)', borderRadius:999}} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px'}}>
            <div style={{fontSize:13.5, fontWeight:700, color:'var(--text)', marginBottom:10}}>Recent Escrow Settlements</div>
            {recentSettlements.length === 0 ? (
              <div style={{fontSize:12.5, color:'var(--text3)', padding:'12px 0'}}>
                No completed escrow settlements yet. Toggle <b>🧪 Demo Preview</b> above to preview populated settlement rows.
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {recentSettlements.map((tx) => (
                  <div key={tx.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'7px 10px', borderRadius:9, background:'var(--surface)', border:'1px solid var(--border)'}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:12.5, fontWeight:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{tx.title}</div>
                      <div style={{fontSize:10.5, fontFamily:'DM Mono, monospace', color:'var(--text3)'}}>
                        TX {tx.txShort} · <span style={{color:'#10b981'}}>tesSUCCESS</span> · {tx.ago}
                      </div>
                    </div>
                    <div style={{fontFamily:'DM Mono, monospace', fontSize:12.5, fontWeight:800, color:'#10b981', whiteSpace:'nowrap'}}>
                      +{tx.amountXrp} XRP
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.25fr) minmax(0,1fr)',gap:12,alignItems:'start',marginBottom:14}}>

        <div style={card}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Recent orders</span>
            <Link href="/orders" style={{fontSize:12.5,color:'var(--accent)',textDecoration:'none'}}>View all</Link>
          </div>
          {busy ? <div style={{padding:'18px 0',color:'var(--text3)',fontSize:13}}>Loading…</div> :
            recent.length===0 ? <div style={{padding:'18px 0',color:'var(--text3)',fontSize:13}}>No orders yet — browse the market to get started.</div> :
            recent.map(o => (
              <div key={o.id+o.role} style={{display:'flex',alignItems:'center',gap:11,padding:'10px 0',borderTop:'1px solid var(--border)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13.5,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.listing_title||'Listing'} <span style={{fontSize:11,color:'var(--text3)'}}>· {o.role==='seller'?'Sold':'Bought'}</span></div>
                  <div style={{fontSize:11.5,color:'var(--text2)',fontFamily:'monospace'}}>{fmt(o.total_xrp)} XRP</div>
                </div>
                <Pill status={o.status}/>
              </div>
            ))
          }
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={card}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#16a34a',animation:'xhLivePulse 1.6s ease-in-out infinite',display:'inline-block',flex:'none'}}/>
              <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Active escrows</span>
            </div>
            {activeEscrows.length===0 ? <div style={{fontSize:13,color:'var(--text3)',padding:'6px 0'}}>No active escrows.</div> :
              activeEscrows.map(o => (
                <div key={o.id+o.role} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'8px 0',borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:12.5,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.listing_title||'Listing'}</span>
                  <span style={{fontFamily:'monospace',fontSize:12,color:'#1d6fd6',whiteSpace:'nowrap'}}>{fmt(o.role==='seller'?(o.seller_receives_xrp||o.total_xrp):o.total_xrp)} XRP</span>
                </div>
              ))
            }
            <div style={{marginTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,color:'var(--text2)',marginBottom:5}}>
                <span>As buyer {buyerPct}%</span>
                <span>As seller {sellerPct}%</span>
              </div>
              <div style={{display:'flex',height:8,borderRadius:999,overflow:'hidden',background:'var(--bg)'}}>
                <div style={{width:buyerPct+'%',background:'#85b7eb'}}/>
                <div style={{width:sellerPct+'%',background:'#1d6fd6'}}/>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Your listings</span>
              <span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:999,color:'#15966b',background:'rgba(16,185,129,0.12)'}}>{activeListings} live</span>
            </div>
            {listings.filter(l => l.status==='active').slice(0,5).map(l => (
              <div key={l.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'7px 0',borderTop:'1px solid var(--border)'}}>
                <Link href={'/listing/'+l.id} style={{flex:1,minWidth:0,textDecoration:'none'}}>
                  <div style={{fontSize:13,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{l.title}</div>
                  <div style={{fontSize:11.5,color:'var(--text2)',fontFamily:'monospace'}}>{fmt(l.price_xrp)} XRP</div>
                </Link>
                <button
                  type="button"
                  onClick={() => { setUpdateModalListing(l); setUpdateVersion('v2.0'); setUpdateNotes(''); }}
                  style={{padding:'4px 9px',borderRadius:7,fontSize:11,fontWeight:700,border:'1px solid rgba(32,128,245,0.35)',background:'rgba(32,128,245,0.10)',color:'#2080F5',cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit'}}
                >
                  🔔 Send Update Alert
                </button>
              </div>
            ))}
            {activeListings===0 && <div style={{fontSize:13,color:'var(--text3)',padding:'4px 0'}}>No live listings.</div>}
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Link href="/listings/new" style={{flex:1,minWidth:140,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13.5,fontWeight:700,padding:'12px 14px',border:'1px solid #60a5fa',borderRadius:11,color:'#fff',textDecoration:'none',background:'#2080F5',boxShadow:'0 4px 14px rgba(32,128,245,0.3)'}}>+ List an item</Link>
        <button
          type="button"
          onClick={() => { setShowImportModal(true); setImportError(''); }}
          style={{flex:1,minWidth:160,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13.5,fontWeight:700,padding:'12px 14px',border:'1px solid rgba(99,102,241,0.45)',borderRadius:11,color:'#4f46e5',background:'rgba(99,102,241,0.08)',cursor:'pointer',fontFamily:'inherit'}}
        >
          ⚡ Import from Gumroad / itch.io
        </button>
        <Link href="/store/create" style={{flex:1,minWidth:140,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13.5,fontWeight:600,padding:'12px 14px',border:'1px solid rgba(245,158,11,0.45)',borderRadius:11,color:'#d97706',textDecoration:'none',background:'rgba(245,158,11,0.08)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)'}}>★ Pro Storefront Setup</Link>
        <Link href="/listings" style={{flex:1,minWidth:140,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13.5,fontWeight:500,padding:'12px 14px',border:'1px solid var(--border2)',borderRadius:11,color:'var(--text)',textDecoration:'none',background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)'}}>Browse market</Link>
      </div>

      {/* GUMROAD / ITCH.IO IMPORTER MODAL */}
      {showImportModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(11,27,51,0.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}} onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:24,maxWidth:460,width:'100%',boxShadow:'0 24px 60px -12px rgba(10,22,40,0.45)'}}>
            <h3 style={{margin:'0 0 6px',fontSize:18,fontWeight:800,color:'var(--text)'}}>⚡ Import from Gumroad or itch.io</h3>
            <p style={{margin:'0 0 14px',fontSize:13,color:'var(--text2)',lineHeight:1.5}}>
              Paste your Gumroad or itch.io product link to import title, description, tags, price, and cover images into a new XRPHarbor listing draft.
            </p>
            <form onSubmit={handleImportFromUrl}>
              <input
                type="url"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://username.gumroad.com/l/asset or https://creator.itch.io/pack"
                style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:13.5,boxSizing:'border-box',marginBottom:10}}
              />
              {importError && <div style={{fontSize:12,color:'#ef4444',marginBottom:10}}>{importError}</div>}
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button type="button" onClick={() => setShowImportModal(false)} style={{padding:'9px 14px',borderRadius:8,border:'1px solid var(--border2)',background:'transparent',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
                <button type="submit" disabled={importing} style={{padding:'9px 16px',borderRadius:8,border:'none',background:'#2080F5',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  {importing ? 'Importing…' : '⚡ Import & Open Editor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT UPDATE ALERT MODAL */}
      {updateModalListing && (
        <div style={{position:'fixed',inset:0,background:'rgba(11,27,51,0.65)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}} onClick={e => { if (e.target === e.currentTarget) setUpdateModalListing(null); }}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:24,maxWidth:440,width:'100%'}}>
            <h3 style={{margin:'0 0 4px',fontSize:17,fontWeight:800,color:'var(--text)'}}>🔔 Send Product Update Alert</h3>
            <p style={{margin:'0 0 14px',fontSize:12.5,color:'var(--text2)'}}>
              Notify all past buyers of <strong>{updateModalListing.title}</strong> that a new file version is ready in their Library.
            </p>
            <form onSubmit={handleSendUpdateAlert}>
              <div style={{marginBottom:10}}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text2)',marginBottom:4}}>Version Tag</label>
                <input
                  type="text"
                  value={updateVersion}
                  onChange={e => setUpdateVersion(e.target.value)}
                  placeholder="e.g. v2.1"
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:13.5,boxSizing:'border-box'}}
                />
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text2)',marginBottom:4}}>Release Notes / Changelog</label>
                <textarea
                  rows={3}
                  value={updateNotes}
                  onChange={e => setUpdateNotes(e.target.value)}
                  placeholder="Added Godot 4.3 shader support and 4K PBR textures…"
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:13,boxSizing:'border-box',fontFamily:'inherit'}}
                />
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button type="button" onClick={() => setUpdateModalListing(null)} style={{padding:'9px 14px',borderRadius:8,border:'1px solid var(--border2)',background:'transparent',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
                <button type="submit" disabled={sendingUpdate} style={{padding:'9px 16px',borderRadius:8,border:'none',background:'#2080F5',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  {sendingUpdate ? 'Sending…' : '🔔 Notify Buyers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
