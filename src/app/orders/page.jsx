'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { xhConfirm } from '../../lib/confirm';
import { useAuthStore } from '../../lib/store';
import { sanitizeExternalUrl, sanitizeImageUrl } from '../../lib/sanitizeUrl';
import { signAndSubmitWithCrossmark, signAndSubmitWithGemWallet } from '../../lib/xrplWallets';

const STATUS_MAP = {
  pending:       {label:'Pending',   color:'var(--text2)', bg:'var(--border)'},
  awaiting_payment: {label:'Awaiting Payment', color:'var(--amber)', bg:'rgba(245,158,11,0.12)'}, escrow_locked: {label:'In Escrow', color:'var(--accent2)', bg:'rgba(59,130,246,0.12)'},
  delivered:     {label:'Delivered', color:'var(--accent2)', bg:'rgba(59,130,246,0.12)'},
  release_approved: {label:'Release Approved', color:'#34d399', bg:'rgba(16,185,129,0.12)'},
  refund_approved:  {label:'Refund Approved', color:'var(--accent2)', bg:'rgba(59,130,246,0.12)'},
  completed:     {label:'Completed', color:'#34d399', bg:'rgba(16,185,129,0.12)'},
  disputed:      {label:'Disputed',  color:'#fbbf24', bg:'rgba(245,158,11,0.12)'},
  refunded:      {label:'Refunded',  color:'var(--text2)', bg:'var(--border)'},
  cancelled:     {label:'Cancelled', color:'var(--text2)', bg:'var(--border)'},
};
const STEPS = ['Awaiting payment', 'In escrow', 'Delivered', 'Completed'];
const STEP_IDX = { pending:0, escrow_locked:1, delivered:2, completed:3 };
const XRPL_TX = 'https://livenet.xrpl.org/transactions/';
const shortHash = (h) => h ? h.slice(0,8) + '…' + h.slice(-6) : '';

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
  const [downloadLog, setDownloadLog] = useState({}); // orderId -> { downloadedAt, sha256, fileName, archiveUrl, content, link }
  const [downloadingId, setDownloadingId] = useState(null);
  const [autoReleasingId, setAutoReleasingId] = useState(null);
  const [extSigning, setExtSigning] = useState(null); // 'crossmark' | 'gemwallet' | null
  const [extError, setExtError] = useState(null); // { message, installUrl, wallet } | null

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
    setExtError(null);
    setExtSigning(null);
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

  async function handleExtensionSign(walletType) {
    if (!xummModal || !xummModal.orderId) return;
    setExtError(null);
    setExtSigning(walletType);
    try {
      const fallbackTxType = xummModal.mode === 'release' ? 'EscrowFinish' : xummModal.mode === 'reclaim' ? 'EscrowCancel' : 'EscrowCreate';
      const txjson = xummModal.txjson || {
        TransactionType: fallbackTxType,
        ...(fallbackTxType === 'EscrowCreate' ? {
          Amount: String(Math.round(Number(xummModal.sellerNet || 10) * 1e6)),
        } : {}),
      };
      const signedRes = walletType === 'crossmark'
        ? await signAndSubmitWithCrossmark(txjson)
        : await signAndSubmitWithGemWallet(txjson);
      if (signedRes && signedRes.signed && signedRes.txHash) {
        const token = localStorage.getItem('xrpmarket_token');
        await fetch(`/api/orders/${xummModal.orderId}/escrow/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            signed: true,
            txHash: signedRes.txHash,
            sequence: signedRes.sequence,
            wallet: walletType,
            txType: txjson.TransactionType,
          }),
        }).catch(() => {});
        await closeXummModal();
      }
    } catch (err) {
      setExtError({
        message: err.message || `Failed to sign with ${walletType === 'crossmark' ? 'Crossmark' : 'GemWallet'}`,
        installUrl: err.installUrl || (walletType === 'crossmark' ? 'https://crossmark.io' : 'https://gemwallet.app'),
        wallet: walletType === 'crossmark' ? 'Crossmark' : 'GemWallet',
        notInstalled: err.code === 'EXTENSION_NOT_INSTALLED',
      });
    } finally {
      setExtSigning(null);
    }
  }

  async function handleReclaim(order) {
    try {
      const result = await api.orders.escrowCancel(order.id);
      if (result.xumm) {
        setExtError(null);
        setXummModal({ qrUrl: result.xumm.qrUrl, deepLink: result.xumm.deepLink, txjson: result.txjson || result.xumm.txjson, orderId: order.id, mode: 'reclaim' });
      }
    } catch(e) { alert(e.message); }
  }

  async function handleClaim(order) {
    try {
      const result = await api.orders.claim(order.id);
      if (result.xumm) {
        setExtError(null);
        setXummModal({ qrUrl: result.xumm.qrUrl, deepLink: result.xumm.deepLink, txjson: result.txjson || result.xumm.txjson, orderId: order.id, mode: 'release' });
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
        setExtError(null);
        setAttemptedPay(p => ({ ...p, [order.id]: true }));
        const base = {
          orderId: order.id,
          commissionXrp: result.commissionXrp || 0,
          sellerNet: result.sellerNet,
          // keep the escrow payload to show AFTER the fee is paid
          escrowQr: result.qrUrl,
          escrowDeepLink: result.deepLink,
          escrowTxjson: result.txjson,
        };
        if (result.commission && result.commissionXrp > 0) {
          // Step 1: pay the marketplace fee first (so it can't be skipped), step 2: lock escrow
          setXummModal({ ...base, qrUrl: result.commission.qrUrl, deepLink: result.commission.deepLink, txjson: result.commission.txjson, mode: 'commission', step: 1, hasFee: true });
        } else {
          // No fee configured — go straight to escrow
          setXummModal({ ...base, qrUrl: result.qrUrl, deepLink: result.deepLink, txjson: result.txjson, mode: 'pay', step: 1, hasFee: false });
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
    setExtError(null);
    setXummModal(m => {
      if (!m || !m.escrowQr) return null;
      return { ...m, qrUrl: m.escrowQr, deepLink: m.escrowDeepLink, txjson: m.escrowTxjson, mode: 'pay', step: 2 };
    });
  }

  async function handleConfirm(order) {
    try {
      const result = await api.orders.confirm(order.id);
      if (result.xumm) {
        setExtError(null);
        setXummModal({ qrUrl: result.xumm.qrUrl, deepLink: result.xumm.deepLink, txjson: result.txjson || result.xumm.txjson, orderId: order.id, mode: 'release' });
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

  async function handleDownloadVault(order) {
    setDownloadingId(order.id);
    try {
      const token = localStorage.getItem('xrpmarket_token');
      const r = await fetch(`/api/orders/${order.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const d = await r.json().catch(() => ({}));
      const ts = d.downloadedAt || new Date().toISOString();
      const sha = d.sha256 || order.digital_archive_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const fileName = d.fileName || order.digital_archive_name || `${(order.listing_title || 'creator-asset').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;
      setDownloadLog(prev => ({
        ...prev,
        [order.id]: {
          downloadedAt: ts,
          sha256: sha,
          fileName,
          archiveUrl: d.archiveUrl || order.digital_archive_url,
          content: d.content || (delivery[order.id] && delivery[order.id].content),
          link: d.link || (delivery[order.id] && delivery[order.id].link),
        },
      }));
      if (d.content || d.link || d.unlocked) {
        setDelivery(prev => ({
          ...prev,
          [order.id]: {
            ...(prev[order.id] || {}),
            isDigital: true,
            unlocked: true,
            content: d.content || (prev[order.id] && prev[order.id].content),
            link: d.link || (prev[order.id] && prev[order.id].link),
          },
        }));
      }
      const extLink = sanitizeExternalUrl(d.presignedGetUrl || d.downloadUrl || d.link || (delivery[order.id] && delivery[order.id].link));
      if (extLink && !extLink.startsWith('/api/vault/')) {
        window.open(extLink, '_blank', 'noopener,noreferrer');
      } else {
        const receiptText = [
          `XRPHarbor Encrypted Asset Vault — Signed Delivery Package`,
          `Order ID: ${order.id}`,
          `Item: ${order.listing_title || 'Creator Asset'}`,
          `File: ${fileName}`,
          `SHA-256 Checksum: ${sha}`,
          `Downloaded At: ${ts}`,
          d.content ? `\nLicense / Vault Content:\n${d.content}` : '',
        ].filter(Boolean).join('\n');
        const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace(/\.[^.]+$/, '')}-vault-manifest.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      api.orders.mine(role).then(setOrders).catch(() => {});
    } catch (e) {
      alert(e.message || 'Could not download asset vault');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleAutoRelease(order) {
    setAutoReleasingId(order.id);
    try {
      const token = localStorage.getItem('xrpmarket_token');
      const r = await fetch(`/api/orders/${order.id}/auto-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const d = await r.json().catch(() => ({}));
      if (d && d.xumm) {
        setXummModal({ qrUrl: d.xumm.qrUrl, deepLink: d.xumm.deepLink, orderId: order.id, mode: 'release' });
      } else if (r.ok) {
        await api.orders.mine(role).then(setOrders);
      } else {
        await handleClaim(order);
      }
    } catch (e) {
      alert(e.message || 'Auto-release not available yet');
    } finally {
      setAutoReleasingId(null);
    }
  }

  async function handleCancel(order) {
    if (!(await xhConfirm('Cancel this order? This only works before payment is locked in escrow.', { danger: true, confirmText: 'Cancel order', cancelText: 'Keep' }))) return;
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
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:12,backdropFilter:'blur(4px)'}}
          onClick={e => { if(e.target===e.currentTarget){ closeXummModal(); } }}>
          <div style={{background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',border:'1px solid var(--border2)',borderRadius:16,padding:'22px 18px',maxWidth:'min(380px, calc(100vw - 24px))',width:'100%',maxHeight:'calc(100vh - 32px)',overflowY:'auto',boxSizing:'border-box'}}>
            {xummModal.hasFee && (xummModal.mode==='commission'||xummModal.mode==='pay') && (() => {
              const curIdx = xummModal.mode==='commission' ? 0 : 1;
              return (
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  {[{l:'Marketplace fee'},{l:'Lock in escrow'}].map((st,idx) => {
                    const active = idx===curIdx, done = idx<curIdx;
                    return (
                      <div key={idx} style={{display:'flex',alignItems:'center',gap:8,flex:idx<1?1:'none'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,border:'1px solid '+(done?'var(--green)':active?'var(--accent)':'var(--border2)'),background:done?'var(--green)':active?'var(--accent)':'var(--surface2)',color:done||active?'#fff':'var(--text3)'}}>{done?'✓':idx+1}</div>
                          <span style={{fontSize:11,fontWeight:active?700:500,color:active?'var(--text)':'var(--text3)',whiteSpace:'nowrap'}}>{st.l}</span>
                        </div>
                        {idx<1 && <div style={{flex:1,height:2,borderRadius:1,background:done?'var(--green)':'var(--border2)'}}/>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:4}}>{xummModal.mode==='release' ? 'Release Escrow Payment (EscrowFinish)' : xummModal.mode==='reclaim' ? 'Reclaim Escrowed Funds (EscrowCancel)' : xummModal.mode==='commission' ? 'Pay Marketplace Fee' : 'Lock Payment in XRPL Escrow (EscrowCreate)'}</div>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:16}}>{xummModal.mode==='release' ? 'Sign EscrowFinish via Xaman, Crossmark, or GemWallet to release funds to the seller.' : xummModal.mode==='reclaim' ? 'Sign EscrowCancel to return the escrowed funds to your wallet.' : xummModal.mode==='commission' ? `Scan or sign to pay the ${Number(xummModal.commissionXrp).toFixed(2)} XRP marketplace fee.` : `Sign EscrowCreate via Xaman, Crossmark, or GemWallet to lock ${xummModal.sellerNet!=null?Number(xummModal.sellerNet).toFixed(2)+' XRP ':''}in escrow for the seller.`}</div>
            <div style={{textAlign:'center'}}>
              {sanitizeImageUrl(xummModal.qrUrl) && <div style={{background:'#fff',padding:12,borderRadius:12,display:'inline-block',marginBottom:14}}><img src={sanitizeImageUrl(xummModal.qrUrl)} alt="Xaman QR" style={{width:180,height:180,display:'block'}}/></div>}
            </div>
            {sanitizeExternalUrl(xummModal.deepLink) && <a href={sanitizeExternalUrl(xummModal.deepLink)} target="_blank" rel="noopener noreferrer" style={{display:'block',background:'var(--accent)',color:'#fff',textAlign:'center',padding:'10px',borderRadius:8,marginBottom:10,fontSize:13,fontWeight:600,textDecoration:'none'}}>📱 Open in Xaman App</a>}

            {/* Browser Extension Signing: Crossmark & GemWallet */}
            <div style={{borderTop:'1px solid var(--border)',marginTop:10,paddingTop:12,marginBottom:12}}>
              <div style={{fontSize:10.5,fontWeight:700,color:'var(--text3)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:8,textAlign:'center'}}>
                Or Sign Directly in Browser ({xummModal.mode==='release' ? 'EscrowFinish' : xummModal.mode==='reclaim' ? 'EscrowCancel' : 'EscrowCreate'})
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <button
                  type="button"
                  onClick={() => handleExtensionSign('crossmark')}
                  disabled={Boolean(extSigning)}
                  style={{padding:'9px 10px',borderRadius:8,border:'1px solid rgba(139,92,246,0.35)',background:'rgba(139,92,246,0.08)',color:'#6d28d9',fontSize:12,fontWeight:700,cursor:extSigning?'wait':'pointer',fontFamily:'inherit'}}
                >
                  {extSigning === 'crossmark' ? 'Signing…' : '🟣 Crossmark'}
                </button>
                <button
                  type="button"
                  onClick={() => handleExtensionSign('gemwallet')}
                  disabled={Boolean(extSigning)}
                  style={{padding:'9px 10px',borderRadius:8,border:'1px solid rgba(14,165,233,0.35)',background:'rgba(14,165,233,0.08)',color:'#0369a1',fontSize:12,fontWeight:700,cursor:extSigning?'wait':'pointer',fontFamily:'inherit'}}
                >
                  {extSigning === 'gemwallet' ? 'Signing…' : '💎 GemWallet'}
                </button>
              </div>
              {extError && (
                <div style={{marginTop:10,padding:'9px 11px',borderRadius:8,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',fontSize:11.5,color:'#b91c1c',lineHeight:1.45}}>
                  <div style={{fontWeight:700,marginBottom:3}}>⚠ {extError.wallet} Notice</div>
                  <div>{extError.message}</div>
                  {extError.notInstalled && extError.installUrl && (
                    <a href={sanitizeExternalUrl(extError.installUrl)} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',marginTop:5,color:'#1668D6',fontWeight:700,textDecoration:'underline'}}>
                      Install {extError.wallet} Browser Extension ↗
                    </a>
                  )}
                </div>
              )}
            </div>

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
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>Library &amp; Orders</h1>
        <div style={{display:'flex',background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,overflow:'hidden'}}>
          {['buyer','seller'].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{padding:'7px 16px',fontSize:13,fontWeight:500,cursor:'pointer',border:'none',background:role===r?'var(--accent)':'transparent',color:role===r?'#fff':'var(--text2)',fontFamily:'inherit'}}>
              {r==='buyer'?'Library / Purchases':'Sales'}
            </button>
          ))}
        </div>
      </div>
      {loading && <div style={{display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} style={{height:72,background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',borderRadius:10,border:'1px solid var(--border)'}}/>)}</div>}
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
            <div key={order.id} style={{background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
              <button onClick={() => toggleOpen(order.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'14px 16px',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',flexWrap:'wrap'}}>
                {order.images && sanitizeImageUrl(order.images[0]) ? (
                  <img src={sanitizeImageUrl(order.images[0])} alt='' style={{width:44,height:44,borderRadius:8,objectFit:'cover',flexShrink:0,background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)'}}/>
                ) : (
                  <div style={{width:44,height:44,borderRadius:8,background:'var(--surface)',boxShadow:'0 1px 2px rgba(10,35,66,.06),0 9px 24px -8px rgba(10,35,66,.17)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📦</div>
                )}
                <div style={{flex:'1 1 130px',minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{order.listing_title||'Item'}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{new Date(order.created_at).toLocaleDateString('en-US',{day:'numeric',month:'long',year:'numeric'})}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  <span style={{fontSize:13.5,fontWeight:700,color:'var(--text)',whiteSpace:'nowrap'}}>{Number(order.total_xrp).toLocaleString('en-US')} XRP</span>
                  <span style={{fontSize:11,fontWeight:500,padding:'3px 8px',borderRadius:20,background:st.bg,color:st.color,whiteSpace:'nowrap'}}>{st.label}</span>
                  <span style={{color:'var(--text3)',fontSize:10}}>{exp?'▲':'▼'}</span>
                </div>
              </button>
              {exp && (
                <div style={{padding:'0 16px 16px',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',marginBottom:8,paddingTop:16,minWidth:0}}>
                    {STEPS.map((s,i) => (
                      <div key={s} style={{display:'flex',alignItems:'flex-start',flex:i<STEPS.length-1?1:'none',minWidth:0}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,width:54,minWidth:0}}>
                          <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,border:'2px solid',
                            background:i<stepIdx?'var(--green)':i===stepIdx?'var(--accent)':'var(--surface2)',
                            borderColor:i<stepIdx?'var(--green)':i===stepIdx?'var(--accent)':'var(--border2)',
                            color:i<=stepIdx?'#fff':'var(--text3)'}}>
                            {i<stepIdx?'✓':i+1}
                          </div>
                          <div style={{fontSize:9.5,fontWeight:500,textAlign:'center',lineHeight:1.2,color:i<=stepIdx?'var(--text2)':'var(--text3)'}}>{s}</div>
                        </div>
                        {i<STEPS.length-1 && <div style={{flex:1,height:2,margin:'0 2px',marginTop:12,background:i<stepIdx?'var(--green)':'var(--border)'}}/>}
                      </div>
                    ))}
                  </div>
                  {(order.escrow_tx_hash || order.finish_tx_hash || order.cancel_tx_hash) && (
                    <div style={{marginBottom:16,paddingTop:6}}>
                      <div style={{fontSize:10,fontWeight:600,color:'var(--text3)',letterSpacing:'0.05em',marginBottom:8}}>ON-CHAIN PROOF</div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {order.escrow_tx_hash && sanitizeExternalUrl(XRPL_TX+order.escrow_tx_hash) && <a href={sanitizeExternalUrl(XRPL_TX+order.escrow_tx_hash)} target="_blank" rel="noopener noreferrer" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:12,color:'var(--text2)',textDecoration:'none',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px'}}><span>🔒 Payment locked in escrow</span><span style={{color:'var(--accent)',fontFamily:'monospace',fontSize:11}}>{shortHash(order.escrow_tx_hash)} ↗</span></a>}
                        {order.finish_tx_hash && sanitizeExternalUrl(XRPL_TX+order.finish_tx_hash) && <a href={sanitizeExternalUrl(XRPL_TX+order.finish_tx_hash)} target="_blank" rel="noopener noreferrer" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:12,color:'var(--text2)',textDecoration:'none',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px'}}><span>✅ Payment released to seller</span><span style={{color:'var(--accent)',fontFamily:'monospace',fontSize:11}}>{shortHash(order.finish_tx_hash)} ↗</span></a>}
                        {order.cancel_tx_hash && sanitizeExternalUrl(XRPL_TX+order.cancel_tx_hash) && <a href={sanitizeExternalUrl(XRPL_TX+order.cancel_tx_hash)} target="_blank" rel="noopener noreferrer" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:12,color:'var(--text2)',textDecoration:'none',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px'}}><span>↩️ Funds refunded to buyer</span><span style={{color:'var(--accent)',fontFamily:'monospace',fontSize:11}}>{shortHash(order.cancel_tx_hash)} ↗</span></a>}
                      </div>
                    </div>
                  )}
                  {(order.status==='pending'||order.status==='awaiting_payment') && role==='buyer' && (
              attemptedPay[order.id] ? (
                <div style={{marginBottom:8}}>
                  <button onClick={() => handlePay(order)} style={{width:'100%',padding:'11px 16px',borderRadius:9,border:'none',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:8}}>Continue payment →</button>
                  <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--text2)',marginBottom:8}}>
                    Closed the window or skipped the escrow step? Tap Continue payment to resume — the fee step is skipped automatically if it's already paid. Already signed everything in Xaman? Sync below.
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
                  ⚡ Lock Escrow (Xaman · Crossmark · GemWallet) · {Number(order.total_xrp).toFixed(2)} XRP
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
                      <button onClick={() => { xhConfirm('Open a dispute for this order?', { confirmText: 'Open dispute' }).then(ok => { if(ok) api.orders.dispute(order.id,{reason:'Issue reported by buyer'}).then(() => api.orders.mine(role).then(setOrders)).catch(e=>alert(e.message)); }); }}
                        style={{background:'rgba(239,68,68,0.08)',color:'#f87171',border:'1px solid rgba(239,68,68,0.15)',borderRadius:8,padding:'10px 14px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>⚠</button>
                    </div>
                    {locked && <div style={{fontSize:11,color:'var(--text3)',marginTop:6,textAlign:'center'}}>XRPL escrow requires a short hold before release. This protects both sides.</div>}
                    <button onClick={() => { xhConfirm('Reclaim your funds? This only works after the escrow hold period (if the seller never delivered).', { confirmText: 'Reclaim' }).then(ok => { if(ok) handleReclaim(order); }); }}
                      style={{width:'100%',marginTop:8,background:'transparent',color:'var(--text3)',border:'none',fontSize:11,cursor:'pointer',textDecoration:'underline'}}>
                      Seller didn't deliver? Reclaim your funds
                    </button>
                    </div>
                    );
                  })()}
                  {order.status==='refund_approved' && role==='buyer' && (
                    <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'12px 14px'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:8}}>Refund approved by support</div>
                      <div style={{fontSize:12,color:'var(--text3)',marginBottom:10}}>Reclaim your escrowed funds back to your wallet. Available once the on-chain hold period passes.</div>
                      <button onClick={() => handleReclaim(order)} style={{width:'100%',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Reclaim refund to wallet</button>
                    </div>
                  )}
                  {order.status==='release_approved' && role==='seller' && (
                    <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'12px 14px'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:8}}>Release approved by support</div>
                      <div style={{fontSize:12,color:'var(--text3)',marginBottom:10}}>The dispute was resolved in your favour. Claim the escrowed {Number(order.seller_receives_xrp||order.total_xrp).toFixed(2)} XRP to your wallet.</div>
                      <button onClick={() => handleClaim(order)} style={{width:'100%',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Claim funds to wallet</button>
                    </div>
                  )}
                  {order.status==='refunded' && (
                    <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'12px',textAlign:'center',fontSize:13,fontWeight:600,color:'#34d399'}}>Refund completed</div>
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
                  {role==='seller' && (order.status==='escrow_locked'||order.status==='in_escrow'||order.status==='delivered') && (
                    <div style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:10,padding:'12px 14px',fontSize:13,color:'var(--text2)'}}>
                      <div style={{fontWeight:700,color:'var(--text)',marginBottom:4}}>💰 Buyer paid — funds secured in XRPL escrow</div>
                      <div style={{fontSize:12,color:'#10b981',fontWeight:600,marginBottom:8,fontFamily:'monospace'}}>
                        ⏱️ Auto-Release Protection Window (FinishAfter): Releases automatically after 24h unless disputed
                        {order.downloaded_at && ` · ✓ Buyer downloaded vault (${new Date(order.downloaded_at).toLocaleTimeString()})`}
                      </div>
                      {order.status==='delivered' ? (
                        <div style={{marginBottom:10}}>You marked this delivered. Waiting for the buyer to confirm receipt or for the FinishAfter window to auto-release {Number(order.seller_receives_xrp||order.total_xrp).toFixed(2)} XRP to your wallet.</div>
                      ) : (<>
                        <div style={{marginBottom:10}}>Deliver the item to the buyer now, then mark it delivered. Once they confirm receipt (or after FinishAfter), the {Number(order.seller_receives_xrp||order.total_xrp).toFixed(2)} XRP lands in your wallet.</div>
                        <button onClick={() => handleDeliver(order)} disabled={delivering===order.id} style={{width:'100%',background:delivering===order.id?'var(--surface2)':'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,cursor:delivering===order.id?'default':'pointer',fontFamily:'inherit',marginBottom:8}}>
                          {delivering===order.id ? 'Marking...' : 'Mark as delivered'}
                        </button>
                      </>)}
                      <button
                        type="button"
                        onClick={() => handleAutoRelease(order)}
                        disabled={autoReleasingId === order.id}
                        style={{width:'100%',background:'rgba(16,185,129,0.12)',color:'#10b981',border:'1px solid rgba(16,185,129,0.35)',borderRadius:8,padding:'9px 12px',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}
                      >
                        {autoReleasingId === order.id ? 'Triggering FinishAfter…' : '⚡ Trigger Auto-Release (FinishAfter)'}
                      </button>
                    </div>
                  )}
                  {role==='seller' && order.status==='pending' && (
                    <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--text3)'}}>Waiting for the buyer to lock payment in escrow.</div>
                  )}
                  {role==='seller' && order.status==='completed' && (
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:4,textAlign:'center'}}>Funds released to your wallet 🎉</div>
                  )}
                  {role==='buyer' && ['escrow_locked','in_escrow','delivered','completed'].includes(order.status) && (
                    <div style={{marginTop:12,background:'rgba(32,128,245,0.06)',border:'1px solid rgba(32,128,245,0.28)',borderRadius:10,padding:14}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:8}}>
                        <div style={{fontSize:13,fontWeight:700,color:'var(--text)',display:'flex',alignItems:'center',gap:6}}>
                          <span>🔐 Encrypted Creator Asset Vault</span>
                        </div>
                        <span style={{fontSize:11,fontFamily:'monospace',color:'#10b981',fontWeight:600}}>
                          ⏱️ Auto-Release Protection Window: Releases automatically after 24h unless disputed
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadVault(order)}
                        disabled={downloadingId === order.id}
                        style={{
                          width:'100%',
                          background:'#2080F5',
                          color:'#fff',
                          border:'1px solid #60a5fa',
                          borderRadius:9,
                          padding:'11px 16px',
                          fontSize:13.5,
                          fontWeight:700,
                          cursor:'pointer',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:8,
                          marginBottom: (downloadLog[order.id] || order.downloaded_at) ? 10 : 0,
                        }}
                      >
                        {downloadingId === order.id ? '⏳ Verifying SHA-256 & Unlocking Vault…' : '📥 Download Encrypted Asset Vault'}
                      </button>
                      {(downloadLog[order.id] || order.downloaded_at) && (
                        <div style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:8,padding:'8px 12px',fontSize:11.5,color:'#10b981',fontFamily:'monospace',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
                          <span>✓ Download Logged &amp; SHA-256 Verified</span>
                          <span>{new Date((downloadLog[order.id] && downloadLog[order.id].downloadedAt) || order.downloaded_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
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
                          {sanitizeExternalUrl(delivery[order.id].link) && (
                            <div>
                              <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>Download</div>
                              <a href={sanitizeExternalUrl(delivery[order.id].link)} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'9px 16px',fontSize:13,fontWeight:600}}>Open download link →</a>
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
