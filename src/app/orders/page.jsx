'use client';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.orders.mine(role).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, [user, role]);

  function toggleOpen(orderId) {
    const next = open === orderId ? null : orderId;
    setOpen(next);
    if (next && role === 'buyer' && delivery[orderId] === undefined) {
      setDelivery(d => ({ ...d, [orderId]: { loading: true } }));
      api.orders.delivery(orderId)
        .then(r => setDelivery(d => ({ ...d, [orderId]: r })))
        .catch(() => setDelivery(d => ({ ...d, [orderId]: { error: true } })));
    }
  }

  async function handleConfirm(order) {
    try {
      const result = await api.orders.confirm(order.id);
      if (result.xumm) {
        setXummModal({ qrUrl: result.xumm.qrUrl, deepLink: result.xumm.deepLink, orderId: order.id });
      } else {
        api.orders.mine(role).then(setOrders);
      }
    } catch(e) { alert(e.message); }
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
          onClick={e => { if(e.target===e.currentTarget){setXummModal(null);api.orders.mine(role).then(setOrders);} }}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,padding:28,maxWidth:380,width:'100%'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:4}}>Sign in Xumm to Release Payment</div>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>Scan with your Xumm app to complete the escrow</div>
            {xummModal.qrUrl && <div style={{background:'#fff',padding:12,borderRadius:12,display:'inline-block',marginBottom:16}}><img src={xummModal.qrUrl} alt="Xumm QR" style={{width:192,height:192,display:'block'}}/></div>}
            {xummModal.deepLink && <a href={xummModal.deepLink} style={{display:'block',background:'var(--accent)',color:'#fff',textAlign:'center',padding:'10px',borderRadius:8,marginBottom:12,fontSize:13,fontWeight:600,textDecoration:'none'}}>Open in Xumm App</a>}
            <button onClick={() => { setXummModal(null); api.orders.mine(role).then(setOrders); }}
              style={{width:'100%',background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)',borderRadius:8,padding:'9px',fontSize:13,cursor:'pointer'}}>
              Done
            </button>
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
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{order.listing_title||'Item'}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{new Date(order.created_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{Number(order.total_xrp).toLocaleString()} XRP</span>
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
              <div style={{display:'flex',gap:8,marginBottom:8}}>
                <button onClick={() => handleConfirm(order)} style={{flex:1,padding:'11px 16px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  ⚡ Pay with Xumm · {Number(order.total_xrp).toFixed(2)} XRP
                </button>
                <button onClick={() => handleCancel(order)} style={{padding:'11px 16px',borderRadius:9,border:'1px solid var(--border2)',background:'transparent',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            )}
            {(order.status==='escrow_locked'||order.status==='delivered') && role==='buyer' && (
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={() => handleConfirm(order)}
                        style={{flex:1,background:'rgba(16,185,129,0.1)',color:'#34d399',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'10px',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                        ✓ Received — Release Payment
                      </button>
                      <button onClick={() => api.orders.dispute(order.id,{reason:'Issue'}).then(() => api.orders.mine(role).then(setOrders))}
                        style={{background:'rgba(239,68,68,0.08)',color:'#f87171',border:'1px solid rgba(239,68,68,0.15)',borderRadius:8,padding:'10px 14px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>⚠</button>
                    </div>
                  )}
                  {order.status==='completed' && <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'12px',textAlign:'center',fontSize:13,fontWeight:600,color:'#34d399'}}>✓ Transaction completed!</div>}
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
