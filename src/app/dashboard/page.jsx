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
const liveCss = '@keyframes xhLivePulse{0%,100%{opacity:1}50%{opacity:.35}}';

function Pill({status}) {
  const s = ST[status] || ST.pending;
  return <span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:999,whiteSpace:'nowrap',color:s.c,background:s.b}}>{s.l}</span>;
}

function Metric({label,value,unit,sub,subColor}) {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'15px 16px'}}>
      <div style={{fontSize:12.5,color:'var(--text2)'}}>{label}</div>
      <div style={{fontSize:23,fontWeight:600,color:'var(--text)',marginTop:6,fontFamily:'monospace'}}>{value}{unit&&<span style={{fontSize:12,fontWeight:500,color:'var(--text2)'}}> {unit}</span>}</div>
      {sub&&<div style={{fontSize:11.5,color:subColor||'var(--text2)',marginTop:3}}>{sub}</div>}
    </div>
  );
}

function pillLink(c,b){ return {fontSize:11.5,fontWeight:500,padding:'4px 10px',borderRadius:999,whiteSpace:'nowrap',color:c,background:b,textDecoration:'none'}; }

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const hydrated = useAuthStore(s => s.hydrated);
  const { price: xrpPrice, change: xrpChange } = useXrpPrice();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!user) { router.push('/'); return; }
    setBusy(true);
    Promise.all([
      api.users.myStats().catch(() => null),
      api.orders.mine('buyer').catch(() => []),
      api.orders.mine('seller').catch(() => []),
      api.users.listings(user.id).catch(() => []),
    ]).then(([st, b, s, ls]) => {
      setStats(st);
      const barr = (Array.isArray(b)?b:(b.orders||[])).map(o => ({...o, role:'buyer'}));
      const sarr = (Array.isArray(s)?s:(s.orders||[])).map(o => ({...o, role:'seller'}));
      const merged = [...barr, ...sarr].sort((x,y) => new Date(y.created_at) - new Date(x.created_at));
      setOrders(merged);
      const la = Array.isArray(ls)?ls:(ls.listings||[]);
      setListings(la);
    }).finally(() => setBusy(false));
  }, [user, loading, hydrated]);

  if (!hydrated || loading || !user) return null;

  const active = orders.filter(o => ACTIVE.includes(o.status));
  const lockedAsBuyer = orders.filter(o => o.role==='buyer' && ACTIVE.includes(o.status)).reduce((a,o) => a+Number(o.total_xrp||0), 0);
  const escrowedAsSeller = orders.filter(o => o.role==='seller' && ACTIVE.includes(o.status)).reduce((a,o) => a+Number(o.seller_receives_xrp||o.total_xrp||0), 0);
  const inEscrow = lockedAsBuyer + escrowedAsSeller;
  const spent = orders.filter(o => o.role==='buyer' && o.status==='completed').reduce((a,o) => a+Number(o.total_xrp||0), 0);
  const earned = stats ? stats.totalRevenueXrp : 0;
  const trades = stats ? (Number(stats.completedSales||0)+Number(stats.completedPurchases||0)) : 0;
  const rating = stats ? stats.avgRating : 0;
  const reviewCount = stats ? stats.reviewCount : 0;
  const activeListings = stats ? stats.activeListings : listings.filter(l => l.status==='active').length;
  const escrowTotal = lockedAsBuyer + escrowedAsSeller || 1;
  const buyerPct = Math.round((lockedAsBuyer/escrowTotal)*100);
  const recent = orders.slice(0, 6);
  const activeEscrows = active.slice(0, 4);
  const wallet = user.wallet_address || '';
  const walletShort = wallet ? wallet.slice(0,5) + '…' + wallet.slice(-4) : '';

  const toDeliver = orders.filter(o => o.role==='seller' && (o.status==='escrow_locked'||o.status==='in_escrow')).length;
  const toConfirm = orders.filter(o => o.role==='buyer' && o.status==='delivered').length;
  const disputes = orders.filter(o => o.status==='disputed').length;
  const attention = toDeliver + toConfirm + disputes;

  const DAYS = 30, CW = 300, CH = 80, PAD = 3;
  const today = new Date(); today.setHours(0,0,0,0);
  const buckets = new Array(DAYS).fill(0);
  orders.filter(o => o.role==='seller' && o.status==='completed').forEach(o => {
    const dt = new Date(o.created_at); if (isNaN(dt)) return; dt.setHours(0,0,0,0);
    const idx = DAYS - 1 - Math.round((today - dt) / 86400000);
    if (idx >= 0 && idx < DAYS) buckets[idx] += Number(o.seller_receives_xrp || o.total_xrp || 0);
  });
  const maxB = Math.max(1, ...buckets);
  const pts = buckets.map((v,i) => { const x = PAD + (i/(DAYS-1))*(CW-2*PAD); const y = CH-PAD-(v/maxB)*(CH-2*PAD); return [Math.round(x*10)/10, Math.round(y*10)/10]; });
  const linePath = pts.map((p,i) => (i?'L':'M')+p[0]+','+p[1]).join(' ');
  const areaPath = 'M'+pts[0][0]+','+(CH-PAD)+' '+pts.map(p => 'L'+p[0]+','+p[1]).join(' ')+' L'+pts[DAYS-1][0]+','+(CH-PAD)+' Z';
  const earned30 = buckets.reduce((a,b) => a+b, 0);
  const card = {background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 18px'};

  return (
    <div style={{maxWidth:980, margin:'0 auto', padding:'0 4px'}}>
      <style dangerouslySetInnerHTML={{__html: liveCss}}/>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:16}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',margin:0}}>Welcome back, {user.username}</h1>
          {walletShort && <p style={{fontSize:12.5,color:'var(--text2)',margin:'3px 0 0',fontFamily:'monospace'}}>{walletShort}</p>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'#0b1b33',borderRadius:10,padding:'8px 13px'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#34d399',animation:'xhLivePulse 1.6s ease-in-out infinite',display:'inline-block',flex:'none'}}/>
          <span style={{fontSize:11.5,color:'#8aa0c4'}}>XRP</span>
          <span style={{fontFamily:'monospace',color:'#fff',fontSize:13}}>{xrpPrice ? '$'+xrpPrice.toFixed(4) : '—'}</span>
          {xrpChange != null && <span style={{fontFamily:'monospace',fontSize:11,color: xrpChange>=0 ? '#34d399' : '#f87171'}}>{(xrpChange>=0?'▲':'▼')+Math.abs(xrpChange).toFixed(1)+'%'}</span>}
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap',marginBottom:16}}>
        <span style={{fontSize:12,color:'var(--text2)',fontWeight:600}}>Needs attention</span>
        {toDeliver>0 && <Link href="/orders" style={pillLink('#9a6a07','rgba(245,158,11,0.13)')}>{toDeliver} to deliver</Link>}
        {toConfirm>0 && <Link href="/orders" style={pillLink('#185fa5','rgba(59,130,246,0.12)')}>{toConfirm} to confirm</Link>}
        {disputes>0 && <Link href="/orders" style={pillLink('#a32d2d','rgba(220,38,38,0.10)')}>{disputes} in dispute</Link>}
        {attention===0 && <span style={{fontSize:12,color:'#15966b'}}>All clear</span>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:11,marginBottom:14}}>
        <Metric label="In escrow" value={fmt(inEscrow)} unit="XRP" sub={active.length+' active trades'} subColor="#1d6fd6"/>
        <Metric label="Earned" value={fmt(earned)} unit="XRP" sub="as seller"/>
        <Metric label="Spent" value={fmt(spent)} unit="XRP" sub="as buyer"/>
        <Metric label="Trades" value={fmt(trades)} sub={'★ '+Number(rating||0).toFixed(1)+' · '+reviewCount+' reviews'} subColor="#b9770e"/>
      </div>

      <div style={{...card, marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Earnings — last 30 days</span>
          <span style={{fontFamily:'monospace',fontSize:12.5,color:'#15966b'}}>+{fmt(earned30)} XRP</span>
        </div>
        <svg viewBox={'0 0 '+CW+' '+CH} preserveAspectRatio="none" style={{width:'100%',height:90,display:'block'}}>
          <path d={areaPath} fill="rgba(22,163,74,0.10)"/>
          <path d={linePath} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        </svg>
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
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,color:'var(--text2)',marginBottom:5}}><span>As buyer {buyerPct}%</span><span>As seller {100-buyerPct}%</span></div>
              <div style={{display:'flex',height:8,borderRadius:999,overflow:'hidden',background:'var(--bg)'}}>
                <div style={{width:buyerPct+'%',background:'#85b7eb'}}/>
                <div style={{width:(100-buyerPct)+'%',background:'#1d6fd6'}}/>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Your listings</span>
              <span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:999,color:'#15966b',background:'rgba(16,185,129,0.12)'}}>{activeListings} live</span>
            </div>
            {listings.filter(l => l.status==='active').slice(0,3).map(l => (
              <Link key={l.id} href={'/listing/'+l.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',textDecoration:'none'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{l.title}</div>
                  <div style={{fontSize:11.5,color:'var(--text2)',fontFamily:'monospace'}}>{fmt(l.price_xrp)} XRP</div>
                </div>
              </Link>
            ))}
            {activeListings===0 && <div style={{fontSize:13,color:'var(--text3)',padding:'4px 0'}}>No live listings.</div>}
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Link href="/listings/new" style={{flex:1,minWidth:140,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13.5,fontWeight:500,padding:'12px 14px',border:'1px solid var(--border2)',borderRadius:11,color:'var(--text)',textDecoration:'none',background:'var(--surface)'}}>List an item</Link>
        <Link href="/store/create" style={{flex:1,minWidth:140,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13.5,fontWeight:500,padding:'12px 14px',border:'1px solid var(--border2)',borderRadius:11,color:'var(--text)',textDecoration:'none',background:'var(--surface)'}}>Create store</Link>
        <Link href="/listings" style={{flex:1,minWidth:140,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:13.5,fontWeight:500,padding:'12px 14px',border:'1px solid var(--border2)',borderRadius:11,color:'var(--text)',textDecoration:'none',background:'var(--surface)'}}>Browse market</Link>
      </div>

    </div>
  );
}
