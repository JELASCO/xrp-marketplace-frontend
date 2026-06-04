'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

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

function Pill({status}) {
  const s = ST[status] || ST.pending;
  return <span style={{fontSize:12,fontWeight:600,padding:'3px 9px',borderRadius:999,whiteSpace:'nowrap',color:s.c,background:s.b}}>{s.l}</span>;
}

function Metric({label,value,unit,sub,subColor}) {
  return (
    <div style={{background:'var(--surface)',borderRadius:10,padding:'14px 16px'}}>
      <div style={{fontSize:13,color:'var(--text2)'}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color:'var(--text)',marginTop:2}}>{value}{unit&&<span style={{fontSize:13,fontWeight:600,color:'var(--text2)'}}> {unit}</span>}</div>
      {sub&&<div style={{fontSize:12,color:subColor||'var(--text2)',marginTop:2}}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const hydrated = useAuthStore(s => s.hydrated);
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
  const wallet = user.wallet_address || '';
  const walletShort = wallet ? wallet.slice(0,5) + '…' + wallet.slice(-4) : '';

  return (
    <div style={{maxWidth:980, margin:'0 auto', padding:'0 4px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:18}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',margin:0}}>Welcome back, {user.username}</h1>
          <p style={{fontSize:13,color:'var(--text2)',margin:'2px 0 0'}}>Here&apos;s what&apos;s moving in your harbor</p>
        </div>
        {walletShort && (
          <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface)',borderRadius:999,padding:'7px 14px'}}>
            <span style={{fontSize:13,fontFamily:'monospace',color:'var(--text2)'}}>{walletShort}</span>
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:16}}>
        <Metric label="In escrow" value={fmt(inEscrow)} unit="XRP" sub={active.length+' active trades'} subColor="#1d6fd6"/>
        <Metric label="Earned" value={fmt(earned)} unit="XRP" sub="as seller"/>
        <Metric label="Spent" value={fmt(spent)} unit="XRP" sub="as buyer"/>
        <Metric label="Trades" value={fmt(trades)} sub={'★ '+Number(rating||0).toFixed(1)+' · '+reviewCount+' reviews'} subColor="#b9770e"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.55fr) minmax(0,1fr)',gap:12,alignItems:'start'}}>

        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 18px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>Your orders</span>
            <Link href="/orders" style={{fontSize:13,color:'var(--accent)',textDecoration:'none'}}>View all</Link>
          </div>
          {busy ? <div style={{padding:'20px 0',color:'var(--text3)',fontSize:13}}>Loading…</div> :
            recent.length===0 ? <div style={{padding:'20px 0',color:'var(--text3)',fontSize:13}}>No orders yet — browse the market to get started.</div> :
            recent.map(o => (
              <div key={o.id+o.role} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderTop:'1px solid var(--border)'}}>
                <div style={{width:36,height:36,borderRadius:8,overflow:'hidden',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                  {o.images && o.images[0] ? <img src={o.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : '🎮'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.listing_title||'Listing'} <span style={{fontSize:11,color:'var(--text3)'}}>· {o.role==='seller'?'Sold':'Bought'}</span></div>
                  <div style={{fontSize:12,color:'var(--text2)'}}>{fmt(o.total_xrp)} XRP</div>
                </div>
                <Pill status={o.status}/>
              </div>
            ))
          }
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 18px'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:10}}>Escrow at a glance</div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'var(--text2)'}}>Locked as buyer</span><span style={{color:'var(--text)',fontWeight:600}}>{fmt(lockedAsBuyer)} XRP</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:10}}><span style={{color:'var(--text2)'}}>Escrowed as seller</span><span style={{color:'var(--text)',fontWeight:600}}>{fmt(escrowedAsSeller)} XRP</span></div>
            <div style={{display:'flex',height:8,borderRadius:999,overflow:'hidden',background:'var(--bg)'}}>
              <div style={{width:buyerPct+'%',background:'#3b82f6'}}/>
              <div style={{width:(100-buyerPct)+'%',background:'#34d399'}}/>
            </div>
            <div style={{marginTop:10,fontSize:11,color:'var(--text3)'}}>Released only on buyer confirmation</div>
          </div>

          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 18px'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:10}}>Quick actions</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Link href="/listings/new" style={{display:'flex',alignItems:'center',gap:8,fontSize:14,padding:'9px 12px',border:'1px solid var(--border2)',borderRadius:8,color:'var(--text)',textDecoration:'none'}}>List an item</Link>
              <Link href="/listings" style={{display:'flex',alignItems:'center',gap:8,fontSize:14,padding:'9px 12px',border:'1px solid var(--border2)',borderRadius:8,color:'var(--text)',textDecoration:'none'}}>Browse market</Link>
              <Link href={'/profile/'+user.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,padding:'9px 12px',border:'1px solid var(--border2)',borderRadius:8,color:'var(--text)',textDecoration:'none'}}>View my profile</Link>
            </div>
          </div>

          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>Your listings</span>
              <span style={{fontSize:12,fontWeight:600,padding:'3px 9px',borderRadius:999,color:'#15966b',background:'rgba(16,185,129,0.12)'}}>{activeListings} live</span>
            </div>
            {listings.filter(l => l.status==='active').slice(0,3).map(l => (
              <Link key={l.id} href={'/listing/'+l.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',textDecoration:'none'}}>
                <div style={{width:34,height:34,borderRadius:8,overflow:'hidden',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{l.images&&l.images[0]?<img src={l.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'🎮'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{l.title}</div>
                  <div style={{fontSize:12,color:'var(--text2)'}}>{fmt(l.price_xrp)} XRP</div>
                </div>
              </Link>
            ))}
            {activeListings===0 && <div style={{fontSize:13,color:'var(--text3)',padding:'4px 0'}}>No live listings.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
