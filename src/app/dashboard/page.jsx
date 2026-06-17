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
const liveCss = '@keyframes xhLivePulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes xhSail{0%{opacity:0;transform:translateX(-220px)}30%{opacity:1}100%{opacity:1;transform:translateX(0)}}@keyframes xhBob{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-4px) rotate(1.2deg)}}@keyframes xhDrift{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes xhTwk{0%,100%{opacity:.15}50%{opacity:.9}}@keyframes xhRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';

function Pill({status}) {
  const s = ST[status] || ST.pending;
  return <span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:999,whiteSpace:'nowrap',color:s.c,background:s.b}}>{s.l}</span>;
}

function Metric({icon,label,value,unit,sub,subColor}) {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'15px 16px'}}>
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
        <p style={{margin:0,fontSize:12,letterSpacing:1,color:'#5f7da8',opacity:0,animation:'xhRise .7s ease 1.6s forwards'}}>XRPHarbor</p>
        <h1 style={{margin:'5px 0 0',fontSize:25,fontWeight:600,color:'#f3f8ff',opacity:0,animation:'xhRise .7s ease 1.8s forwards'}}>Welcome aboard{username ? <>, <span style={{color:'#46a0ff'}}>{username}</span></> : ''}</h1>
        <p style={{margin:'8px 0 0',display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#9db8de',opacity:0,animation:'xhRise .7s ease 2.05s forwards'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#46a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>
          Verified by the ledger
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

      <WelcomeBanner username={user.username} wallet={walletShort}/>

      <div style={{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap',marginBottom:16}}>
        <span style={{fontSize:12,color:'var(--text2)',fontWeight:600}}>Needs attention</span>
        {toDeliver>0 && <Link href="/orders" style={pillLink('#9a6a07','rgba(245,158,11,0.13)')}>{toDeliver} to deliver</Link>}
        {toConfirm>0 && <Link href="/orders" style={pillLink('#185fa5','rgba(59,130,246,0.12)')}>{toConfirm} to confirm</Link>}
        {disputes>0 && <Link href="/orders" style={pillLink('#a32d2d','rgba(220,38,38,0.10)')}>{disputes} in dispute</Link>}
        {attention===0 && <span style={{fontSize:12,color:'#15966b'}}>All clear</span>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:11,marginBottom:14}}>
        <Metric icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>} label="In escrow" value={fmt(inEscrow)} unit="XRP" sub={active.length+' active trades'} subColor="#1d6fd6"/>
        <Metric icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M14.2 9.3a2.5 2.5 0 0 0-2.2-1.1c-1.4 0-2.3.8-2.3 1.8 0 2.5 4.6 1.4 4.6 3.9 0 1-1 1.8-2.4 1.8a2.7 2.7 0 0 1-2.3-1.1M12 6.6v10.8"/></svg>} label="Earned" value={fmt(earned)} unit="XRP" sub="as seller"/>
        <Metric icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h7.8a1 1 0 0 0 1-.8L20 8H6"/></svg>} label="Spent" value={fmt(spent)} unit="XRP" sub="as buyer"/>
        <Metric icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.8 7 18.9l.9-5.6-4-3.9 5.6-.8z"/></svg>} label="Trades" value={fmt(trades)} sub={'★ '+Number(rating||0).toFixed(1)+' · '+reviewCount+' reviews'} subColor="#b9770e"/>
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
