'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

const STATUS_MAP = {
  pending:       {label:'Pending',   color:'var(--text2)', bg:'var(--border)'},
  awaiting_payment: {label:'Awaiting Payment', color:'var(--amber)', bg:'rgba(245,158,11,0.12)'}, escrow_locked: {label:'In Escrow', color:'var(--accent2)', bg:'rgba(59,130,246,0.12)'},
  delivered:     {label:'Delivered', color:'var(--accent2)', bg:'rgba(59,130,246,0.12)'},
  completed:     {label:'Completed', color:'#34d399', bg:'rgba(16,185,129,0.12)'},
  disputed:      {label:'Disputed',  color:'#fbbf24', bg:'rgba(245,158,11,0.12)'},
  refunded:      {label:'Refunded',  color:'var(--text2)', bg:'var(--border)'},
  cancelled:     {label:'Cancelled', color:'var(--text2)', bg:'var(--border)'},
};
const STEPS = ['Awaiting payment', 'In escrow', 'Delivered', 'Completed'];
const STEP_IDX = { pending:0, escrow_locked:1, delivered:2, completed:3 };

export default function OrdersPage() {
  const user = useAuthStore(s => s.user);
  const [role, setRole] = useState('buyer');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [xummModal, setXummModal] = useState(null);
  const [delivery, setDelivery] = useState({});
  const [escrowInfo, setEscrowInfo] = useState({});
  const [now, setNow] = useState(Date.now());
  const [reviewState, setReviewState] = useState({});
  const [attemptedPay, setAttemptedPay] = useState({}); // orderId -> true once user opened the pay flow
  const [syncing, setSyncing] = useState(null); // orderId currently being synced
  const [delivering, setDelivering] = useState(null); // orderId currently being marked delivered

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.orders.mine(role).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, [user, role]);

  // tick every second so the release countdown updates live
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-open payment when arriving from a Buy click (orders?pay=ORDER_ID)
  const autoPaidRef = useRef(false);
  useEffect(() => {
    if (autoPaidRef.current || !orders.length || typeof window === 'undefined') return;
    const payId = new URLSearchParams(window.location.search).get('pay');
    if (!payId) return;
    const ord = orders.find(o => o.id === payId);
    if (ord && (ord.status === 'pending' || ord.status === 'awaiting_payment')) {
      autoPaidRef.current = true;
      setOpen(payId);
      handlePay(ord);
    }
  }, [orders]);

  const RIPPLE_EPOCH = 946684800;
  function releaseSecondsLeft(orderId) {
    const info = escrowInfo[orderId];
    let finishAfter = info && info.finishAfter;
    // Fallback to the value stored on the order itself (escrow_finish_after is a unix epoch)
    if (!finishAfter) {
      const ord = orders.find(o => o.id === orderId);
      if (ord && ord.escrow_finish_after) {
        const fa = Number(ord.escrow_finish_after);
        // stored as unix epoch seconds; convert to ripple-epoch base used below
        return Math.max(0, Math.ceil((fa * 1000 - now) / 1000));
      }
      return null;
    }
    const finishUnixMs = (finishAfter + RIPPLE_EPOCH) * 1000;
    return Math.max(0, Math.ceil((finishUnixMs - now) / 1000));
  }

  function toggleOpen(orderId) {
    const next = open === orderId ? null : orderId;
    setOpen(next);
    if (next && role === 'buyer' && delivery[orderId] === undefined) {
      setDelivery(d => ({ ...d, [orderId]: { loading: true } }));
      api.orders.delivery(orderId)
        .then(r => setDelivery(d => ({ ...d, [orderId]: r })))
        .catch(() => setDelivery(d => ({ ...d, [orderId]: { error: true } })));
    }
    if (next && escrowInfo[orderId] === undefined) {
      api.orders.escrowStatus(orderId)
        .then(r => { if (r.onChain && r.onChain.finishAfter) setEscrowInfo(e => ({ ...e, [orderId]: { finishAfter: r.onChain.finishAfter } })); })
        .catch(() => {});
    }
  }

  async function closeXummModal() {
    const m = xummModal;
    setXummModal(null);
    if (m && m.orderId) {
      // sync on-chain escrow state into the order (covers both create and finish)
      try { await api.orders.escrowStatus(m.orderId); } catch(e) {}
      // refresh delivery for this order in case it just unlocked
      if (delivery[m.orderId] !== undefined) {
        try { const d = await api.orders.delivery(m.orderId); setDelivery(prev => ({ ...prev, [m.orderId]: d })); } catch(e) {}
      }
    }
    api.orders.mine(role).then(setOrders);
  }

  async function handleReclaim(order) {
    try {
      const result = await api.orders.escrowCancel(order.id);
      if (result.xumm) {
        setXummModal({ qrUrl: result.xumm.qrUrl, deepLink: result.xumm.deepLink, orderId: order.id, mode: 'reclaim' });
      }
    } catch(e) { alert(e.message); }
  }

  async function submitReview(orderId) {
    const st = reviewState[orderId] || {};
    if (!st.rating) { setReviewState(s => ({ ...s, [orderId]: { ...st, error: 'Pick a rating' } })); return; }
    try {
      await api.orders.review(orderId, { rating: st.rating, comment: st.comment || '' });
      setReviewState(s => ({ ...s, [orderId]: { ...st, done: true } }));
    } catch(e) {
      setReviewState(s => ({ ...s, [orderId]: { ...st, error: e.message } }));
    }
  }

  async function handlePay(order) {
    try {
      const result = await api.orders.xummPayload(order.id);
      if (result.uuid || result.qrUrl) {
        setAttemptedPay(p => ({ ...p, [order.id]: true }));
        const base = {
          orderId: order.id,
          commissionXrp: result.commissionXrp || 0,
          sellerNet: result.sellerNet,
          // keep the escrow payload to show AFTER the fee is paid
          escrowQr: result.qrUrl,
          escrowDeepLink: result.deepLink,
        };
        if (result.commission && result.commissionXrp > 0) {
          // Step 1: pay the marketplace fee first (so it can't be skipped), step 2: lock escrow
          setXummModal({ ...base, qrUrl: result.commission.qrUrl, deepLink: result.commission.deepLink, mode: 'commission', step: 1, hasFee: true });
        } else {
          // No fee configured — go straight to escrow
          setXummModal({ ...base, qrUrl: result.qrUrl, deepLink: result.deepLink, mode: 'pay', step: 1, hasFee: false });
        }
      } else if (result.error) {
        if (/already been created/i.test(result.error)) setAttemptedPay(p => ({ ...p, [order.id]: true }));
        alert(result.error);
      }
    } catch(e) { alert(e.message); }
  }

  async function handleSync(orderId) {
    setSyncing(orderId);
    try {
      await api.orders.escrowStatus(orderId);
      await api.orders.mine(role).then(setOrders);
    } catch(e) { alert(e.message); }
    setSyncing(null);
  }

  function proceedToEscrow() {
    setXummModal(m => {
      if (!m || !m.escrowQr) return null;
      return { ...m, qrUrl: m.escrowQr, deepLink: m.escrowDeepLink, mode: 'pay', step: 2 };
    });
  }

  async function handleConfirm(order) {
    try {
      const result = await api.orders.confirm(order.id);
      if (result.xumm) {
        setXummModal({ qrUrl: result.xumm.qrUrl, deepLink: result.xumm.deepLink, orderId: order.id, mode: 'release' });
      } else {
        api.orders.mine(role).then(setOrders);
      }
    } catch(e) { alert(e.message); }
  }

  async function handleDeliver(order) {
    setDelivering(order.id);
    try {
      await api.orders.deliver(order.id);
      await api.orders.mine(role).then(setOrders);
    } catch(e) { alert(e.message); }
    finally { setDelivering(null); }
  }

  async function handleCancel(order) {
    if (!confirm('Cancel this order? This only works before payment is locked in escrow.')) return;
    try {
      await api.orders.cancel(order.id);
      api.orders.mine(role).then(setOrders);
    } catch(e) { alert(e.message); }
  }

  if (!user) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:40,marginBottom:12}}>🔒</div>
      <div style={{fontSize:16,fontWeight:600,color:'var(--text)',marginBottom:6}}>Sign in required</div>
    </div>
  );

  return (
    <div style={{maxWidth:680,margin:'0 auto'}}>
      {xummModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20,backdropFilter:'blur(4px)'}}
          onClick={e => { if(e.target===e.currentTarget){ closeXummModal(); } }}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,padding:28,maxWidth:380,width:'100%'}}>
            {xummModal.hasFee && xummModal.mode==='commission' && <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:8,letterSpacing:'0.04em'}}>STEP 1 OF 2 · FEE</div>}
            {xummModal.hasFee && xummModal.mode==='pay' && <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:8,letterSpacing:'0.04em'}}>STEP 2 OF 2 · ESCROW</div>}
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:4}}>{xummModal.mode==='release' ? 'Release Payment in Xumm' : xummModal.mode==='reclaim' ? 'Reclaim Funds in Xumm' : xummModal.mode==='commission' ? 'Pay Marketplace Fee' : 'Lock Payment in Escrow'}</div>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>{xummModal.mode==='release' ? 'Scan to release the escrow to the seller. Your delivery unlocks right after.' : xummModal.mode==='reclaim' ? 'Scan to cancel the escrow and return the funds to your wallet.' : xummModal.mode==='commission' ? `Scan to pay the ${Number(xummModal.commissionXrp).toFixed(2)} XRP marketplace fee. This completes your payment.` : `Scan to lock ${xummModal.sellerNet!=null?Number(xummModal.sellerNet).toFixed(2)+' XRP ':''}in escrow for the seller.`}</div>
            {xummModal.qrUrl && <div style={{background:'#fff',padding:12,borderRadius:12,display:'inline-block',marginBottom:16}}><img src={xummModal.qrUrl} alt="Xumm QR" style={{width:192,height:192,display:'block'}}/></div>}
            {xummModal.deepLink && <a href={xummModal.deepLink} style={{display:'block',background:'var(--accent)',color:'#fff',textAlign:'center',padding:'10px',borderRadius:8,marginBottom:12,fontSize:13,fontWeight:600,textDecoration:'none'}}>Open in Xumm App</a>}
            {xummModal.mode==='commission' ? (
              <button onClick={proceedToEscrow}
                style={{width:'100%',background:'var(--accent)',border:'none',color:'#fff',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                I've paid the fee — next: lock escrow →
              </button>
            ) : (
              <button onClick={closeXummModal}
                style={{width:'100%',background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)',borderRadius:8,padding:'9px',fontSize:13,cursor:'pointer'}}>
                I've signed — refresh
              </button>
            )}
          </div>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>My Orders</h1>
        <div style={{display:'flex',background:'var(--surface)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,overflow:'hidden'}}>
          {['buyer','seller'].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{padding:'7px 16px',fontSize:13,fontWeight:500,cursor:'pointer',border:'none',background:role===r?'var(--accent)':'transparent',color:role===r?'#fff':'var(--text2)',fontFamily:'inherit'}}>
              {r==='buyer'?'Purchases':'Sales'}
            </button>
          ))}
        </div>
      </div>
      {loading && <div style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} style={{height:72,background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)'}}/>)}</div>}
      {!loading && orders.length===0 && (
        <div style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:40,marginBottom:12}}>📭</div>
          <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:6}}>No {role==='buyer'?'purchases':'sales'} yet</div>
          <Link href="/listings" style={{display:'inline-flex',background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600,marginTop:8}}>Browse Listings</Link>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {orders.map(order => {
          const st = STATUS_MAP[order.status] || STATUS_MAP.pending;
          const exp = open === order.id;
          const stepIdx = STEP_IDX[order.status] || 0;
          return (
            <div key={order.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
              <button onClick={() => toggleOpen(order.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'16px 18px',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                {order.images && order.images[0] ? (
                  <img src={order.images[0]} alt='' style={{width:48,height:48,borderRadius:8,objectFit:'cover',flexShrink:0,background:'var(--surface)'}}/>
                ) : (
                  <div style={{width:48,height:48,borderRadius:8,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📦</div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{order.listing_title||'Item'}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{new Date(order.created_at).toLocaleDateString('en-US',{day:'numeric',month:'long',year:'numeric'})}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{Number(order.total_xrp).toLocaleString('en-US')} XRP</span>
                  <span style={{fontSize:11,fontWeight:500,padding:'3px 8px',borderRadius:20,background:st.bg,color:st.color}}>{st.label}</span>
                  <span style={{color:'var(--text3)',fontSize:10}}>{exp?'▲':'▼'}</span>
                </div>
              </button>
              {exp && (
                <div style={{padding:'0 18px 18px',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                  <div style={{display:'flex',alignItems:'center',marginBottom:16,paddingTop:16}}>
                    {STEPS.map((s,i) => (
                      <div key={s} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'none'}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                          <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,border:'2px solid',
                            background:i<stepIdx?'var(--green)':i===stepIdx?'var(--accent)':'var(--surface2)',
                            borderColor:i<stepIdx?'var(--green)':i===stepIdx?'var(--accent)':'var(--border2)',
                            color:i<=stepIdx?'#fff':'var(--text3)'}}>
                            {i<stepIdx?'✓':i+1}
                          </div>
                        </div>
                        {i<STEPS.length-1 && <div style={{flex:1,height:2,margin:'0 4px',marginBottom:14,background:i<stepIdx?'var(--green)':'rgba(255,255,255,0.08)'}}/>}
                      </div>
                    ))}
                  </div>
                  {(order.status==='pending'||order.status==='awaiting_payment') && role==='buyer' && (
              attemptedPay[order.id] ? (
                <div style={{marginBottom:8}}>
                  <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--text2)',marginBottom:8}}>
                    Already signed in Xumm? Don't pay again — tap below to sync. If your wallet shows the XRP left your account, the escrow is on-chain; syncing will pick it up.
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={() => handleSync(order.id)} disabled={syncing===order.id} style={{flex:1,padding:'11px 16px',borderRadius:9,border:'none',background:syncing===order.id?'var(--surface2)':'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:syncing===order.id?'default':'pointer'}}>
                      {syncing===order.id ? 'Syncing…' : 'Sync escrow status'}
                    </button>
                    <button onClick={() => handleCancel(order)} style={{padding:'11px 16px',borderRadius:9,border:'1px solid var(--border2)',background:'transparent',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
              <div style={{display:'flex',gap:8,marginBottom:8}}>
                <button onClick={() => handlePay(order)} style={{flex:1,padding:'11px 16px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  ⚡ Pay with Xumm · {Number(order.total_xrp).toFixed(2)} XRP
                </button>
                <button onClick={() => handleCancel(order)} style={{padding:'11px 16px',borderRadius:9,border:'1px solid var(--border2)',background:'transparent',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
              )
            )}
            {(order.status==='escrow_locked'||order.status==='delivered') && role==='buyer' && (() => {
                    const secsLeft = releaseSecondsLeft(order.id);
                    const locked = secsLeft !== null && secsLeft > 0;
                    const mins = secsLeft !== null ? Math.floor(secsLeft/60) : 0;
                    const secs = secsLeft !== null ? secsLeft%60 : 0;
                    return (
                    <div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={() => !locked && handleConfirm(order)} disabled={locked}
                        style={{flex:1,background:locked?'var(--surface2)':'rgba(16,185,129,0.1)',color:locked?'var(--text3)':'#34d399',border:'1px solid '+(locked?'var(--border2)':'rgba(16,185,129,0.2)'),borderRadius:8,padding:'10px',fontSize:13,fontWeight:500,cursor:locked?'not-allowed':'pointer',fontFamily:'inherit'}}>
                        {locked ? `Release available in ${mins}:${String(secs).padStart(2,'0')}` : '✓ Received — Release Payment'}
                      </button>
                      <button onClick={() => { if(confirm('Open a dispute for this order?')) api.orders.dispute(order.id,{reason:'Issue reported by buyer'}).then(() => api.orders.mine(role).then(setOrders)).catch(e=>alert(e.message)); }}
                        style={{background:'rgba(239,68,68,0.08)',color:'#f87171',border:'1px solid rgba(239,68,68,0.15)',borderRadius:8,padding:'10px 14px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>⚠</button>
                    </div>
                    {locked && <div style={{fontSize:11,color:'var(--text3)',marginTop:6,textAlign:'center'}}>XRPL escrow requires a short hold before release. This protects both sides.</div>}
                    <button onClick={() => { if(confirm('Reclaim your funds? This only works after the escrow hold period (if the seller never delivered).')) handleReclaim(order); }}
                      style={{width:'100%',marginTop:8,background:'transparent',color:'var(--text3)',border:'none',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>
                      Seller didn't deliver? Reclaim your funds
                    </button>
                    </div>
                    );
                  })()}
                  {order.status==='refunded' && (
                    <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'12px 14px'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:8}}>Refund approved</div>
                      <div style={{fontSize:12,color:'var(--text3)',marginBottom:10}}>You can reclaim your escrowed funds back to your wallet.</div>
                      <button onClick={() => handleReclaim(order)} style={{width:'100%',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Reclaim funds to wallet</button>
                    </div>
                  )}
                  {order.status==='completed' && <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'12px',textAlign:'center',fontSize:13,fontWeight:600,color:'#34d399'}}>✓ Transaction completed!</div>}
                  {order.status==='completed' && role==='buyer' && (() => {
                    const st = reviewState[order.id] || {};
                    if (st.done) return <div style={{marginTop:10,fontSize:12,color:'var(--text3)',textAlign:'center'}}>★ Thanks for your review!</div>;
                    return (
                      <div style={{marginTop:10,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:14}}>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:8}}>Rate this seller</div>
                        <div style={{display:'flex',gap:4,marginBottom:10}}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={()=>setReviewState(s=>({...s,[order.id]:{...st,rating:n,error:null}}))}
                              style={{background:'none',border:'none',cursor:'pointer',fontSize:24,lineHeight:1,padding:0,color:(st.rating||0)>=n?'#fbbf24':'var(--border2)'}}>★</button>
                          ))}
                        </div>
                        <textarea value={st.comment||''} onChange={e=>setReviewState(s=>({...s,[order.id]:{...st,comment:e.target.value}}))}
                          placeholder="Optional comment…" rows={2}
                          style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'8px 10px',color:'var(--text)',fontSize:13,boxSizing:'border-box',resize:'vertical',marginBottom:8,fontFamily:'inherit'}}/>
                        {st.error && <div style={{fontSize:12,color:'#f87171',marginBottom:8}}>{st.error}</div>}
                        <button onClick={()=>submitReview(order.id)} style={{width:'100%',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'9px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Submit review</button>
                      </div>
                    );
                  })()}
                  {role==='seller' && (order.status==='escrow_locked'||order.status==='delivered') && (
                    <div style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--text2)'}}>
                      <div style={{fontWeight:600,color:'var(--text)',marginBottom:4}}>💰 Buyer paid — funds secured in escrow</div>
                      {order.status==='delivered' ? (
                        <div>You marked this delivered. Waiting for the buyer to confirm receipt and release the {Number(order.seller_receives_xrp||order.total_xrp).toFixed(2)} XRP to your wallet.</div>
                      ) : (<>
                        <div style={{marginBottom:10}}>Deliver the item to the buyer now, then mark it delivered. Once they confirm receipt and release, the {Number(order.seller_receives_xrp||order.total_xrp).toFixed(2)} XRP lands in your wallet.</div>
                        <button onClick={() => handleDeliver(order)} disabled={delivering===order.id} style={{width:'100%',background:delivering===order.id?'var(--surface2)':'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,cursor:delivering===order.id?'default':'pointer',fontFamily:'inherit'}}>
                          {delivering===order.id ? 'Marking...' : 'Mark as delivered'}
                        </button>
                      </>)}
                    </div>
                  )}
                  {role==='seller' && order.status==='pending' && (
                    <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--text3)'}}>Waiting for the buyer to lock payment in escrow.</div>
                  )}
                  {role==='seller' && order.status==='completed' && (
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:4,textAlign:'center'}}>Funds released to your wallet 🎉</div>
                  )}
                  {role==='buyer' && delivery[order.id] && delivery[order.id].isDigital && (
                    <div style={{marginTop:10}}>
                      {delivery[order.id].loading ? (
                        <div style={{fontSize:12,color:'var(--text3)',padding:'10px'}}>Checking delivery…</div>
                      ) : delivery[order.id].unlocked ? (
                        <div style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:10,padding:14}}>
                          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>📦 Your digital delivery</div>
                          {delivery[order.id].content && (
                            <div style={{marginBottom:delivery[order.id].link?10:0}}>
                              <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>Content</div>
                              <div style={{display:'flex',gap:8,alignItems:'stretch'}}>
                                <pre style={{flex:1,margin:0,background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'10px 12px',fontSize:13,color:'var(--text)',fontFamily:'monospace',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{delivery[order.id].content}</pre>
                                <button onClick={()=>navigator.clipboard.writeText(delivery[order.id].content)} style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'0 14px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Copy</button>
                              </div>
                            </div>
                          )}
                          {delivery[order.id].link && (
                            <div>
                              <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>Download</div>
                              <a href={delivery[order.id].link} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'9px 16px',fontSize:13,fontWeight:600}}>Open download link →</a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',fontSize:12,color:'var(--text3)',display:'flex',alignItems:'center',gap:8}}>🔒 {delivery[order.id].message || 'Delivery unlocks once payment is secured in escrow.'}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
