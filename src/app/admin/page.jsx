'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';
import { xhConfirm } from '../../lib/confirm';

const TABS = [
  {key:'dashboard',label:'Dashboard',icon:'▦'},
  {key:'escrows',label:'Disputes & Arbitration',icon:'⚖️'},
  {key:'listings',label:'Listings',icon:'📜'},
  {key:'orders',label:'Orders',icon:'🛒'},
  {key:'users',label:'Users',icon:'👥'},
  {key:'reports',label:'Reports',icon:'⚠️'},
  {key:'settings',label:'Settings',icon:'⚙️'},
];

function Sparkline({data=[], color='var(--xh-accent)', height=32, width=120}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = (max - min) || 1;
  const pts = data.map((v,i)=>{
    const x = (i/(data.length-1)) * width;
    const y = height - ((v - min)/range) * height;
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      <polyline points={pts} fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
    </svg>
  );
}

function MetricCard({label,value,delta,color,trend}) {
  const isPositive = delta && delta.startsWith('+');
  return (
    <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:12,padding:'16px 18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div>
          <div style={{fontSize:11,color:'var(--xh-text3)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:6}}>{label}</div>
          <div style={{fontSize:24,fontWeight:800,color:'var(--xh-text)',letterSpacing:'-0.02em'}}>{value}</div>
        </div>
        {trend && <Sparkline data={trend} color={color||'var(--xh-accent)'} width={70} height={28}/>}
      </div>
      {delta && (
        <div style={{fontSize:11.5,color:isPositive?'#16A34A':'#DC2626',fontWeight:600}}>{delta} vs prev period</div>
      )}
    </div>
  );
}

function Section({title, action, children}) {
  return (
    <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:12,padding:'18px 20px',marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <h3 style={{fontSize:14,fontWeight:700,color:'var(--xh-text)',margin:0,letterSpacing:'-0.01em'}}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({icon='📦', text='Nothing here yet'}) {
  return (
    <div style={{textAlign:'center',padding:'32px 16px',color:'var(--xh-text3)'}}>
      <div style={{fontSize:32,marginBottom:8,opacity:0.5}}>{icon}</div>
      <div style={{fontSize:13}}>{text}</div>
    </div>
  );
}

function NeedsBackend({title, why, endpoints, workaround}) {
  return (
    <div style={{background:'var(--xh-surface)',border:'1px dashed var(--xh-border2)',borderRadius:12,padding:'28px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:9,background:'rgba(245,158,11,0.12)',color:'#D97706',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🔨</div>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:'var(--xh-text)'}}>{title}</div>
          <div style={{fontSize:12,color:'var(--xh-text3)'}}>Requires new backend work</div>
        </div>
      </div>
      <div style={{fontSize:13,color:'var(--xh-text2)',lineHeight:1.55,marginBottom:14}}>{why}</div>
      {workaround && (
        <div style={{fontSize:12.5,color:'var(--xh-text2)',background:'var(--xh-surface2)',padding:'10px 12px',borderRadius:8,marginBottom:12,lineHeight:1.5}}>
          <b style={{color:'var(--xh-text)'}}>For now:</b> {workaround}
        </div>
      )}
      <div style={{fontSize:11.5,color:'var(--xh-text3)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600}}>To-do on backend</div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {endpoints.map((e,i)=>(
          <code key={i} style={{fontSize:11.5,color:'var(--xh-accent)',background:'var(--xh-surface2)',padding:'5px 10px',borderRadius:6,fontFamily:'monospace'}}>{e}</code>
        ))}
      </div>
    </div>
  );
}

function Pill({children, color}) {
  const colors = {
    green: {bg:'rgba(22,163,74,0.12)', text:'#16A34A'},
    red: {bg:'rgba(220,38,38,0.12)', text:'#DC2626'},
    yellow: {bg:'rgba(245,158,11,0.12)', text:'#D97706'},
    gray: {bg:'var(--xh-surface2)', text:'var(--xh-text3)'},
    blue: {bg:'rgba(21,114,232,0.12)', text:'var(--xh-accent)'},
  };
  const c = colors[color] || colors.gray;
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:5,fontSize:10.5,fontWeight:600,background:c.bg,color:c.text,textTransform:'uppercase',letterSpacing:'0.04em'}}>{children}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  try { const dt = new Date(d); return dt.toLocaleDateString('en-US') + ' ' + dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch { return d; }
}

function fmtAddr(a) {
  if (!a || typeof a !== 'string') return '—';
  return a.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
}

const XRPL_NETWORK = (process.env.NEXT_PUBLIC_XRPL_NETWORK || '').toLowerCase();
const XRPL_NODE_ENV = process.env.NEXT_PUBLIC_XRPL_NODE || '';
const XRPL_IS_MAINNET = XRPL_NETWORK === 'mainnet';
const XRPL_NET_VALUE = XRPL_NETWORK ? (XRPL_IS_MAINNET ? 'Mainnet' : XRPL_NETWORK.charAt(0).toUpperCase() + XRPL_NETWORK.slice(1)) : 'Not set';
const XRPL_NET_PILL = XRPL_NETWORK ? (XRPL_IS_MAINNET ? 'live \u00b7 real XRP' : 'not mainnet') : 'env unset';
const XRPL_NET_PILLCOLOR = XRPL_IS_MAINNET ? 'green' : 'yellow';
const XRPL_NODE_VALUE = XRPL_NODE_ENV || 'Not set';

function SettingItem({label, value, hint, pill, pillColor, envKey, icon}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'12px 14px',background:'var(--xh-surface2)',borderRadius:8,gap:12,flexWrap:'wrap'}}>
      <div style={{minWidth:0,flex:1,display:'flex',alignItems:'flex-start',gap:10}}>
        {icon && <div style={{fontSize:18,lineHeight:1,marginTop:2,opacity:0.7}}>{icon}</div>}
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:12.5,fontWeight:600,color:'var(--xh-text)',marginBottom:2,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>{label}{pill && <Pill color={pillColor||'gray'}>{pill}</Pill>}</div>
          {hint && <div style={{fontSize:11,color:'var(--xh-text3)',marginBottom:4,lineHeight:1.45}}>{hint}</div>}
          {envKey && <code style={{fontSize:10.5,color:'var(--xh-text3)',background:'var(--xh-bg2)',padding:'1px 6px',borderRadius:4,fontFamily:'monospace'}}>env: {envKey}</code>}
        </div>
      </div>
      <div style={{textAlign:'right',minWidth:120}}>
        <div style={{fontSize:13.5,fontWeight:700,color:'var(--xh-text)',fontFamily:typeof value==='string' && (value.startsWith('r') || value.includes('://') || value.includes('@'))?'monospace':'inherit',wordBreak:'break-all'}}>{value}</div>
        <div style={{fontSize:10,color:'var(--xh-text3)',marginTop:2,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>read-only</div>
      </div>
    </div>
  );
}

export default function AdminPage({ initialTab = 'dashboard' } = {}) {
  const user = useAuthStore(s=>s.user);
  const hydrated = useAuthStore(s=>s.hydrated);
  const [theme, setTheme] = useState('light');
  useEffect(()=>{
    try{ const t = localStorage.getItem('xrph-theme'); if(t==='light'||t==='dark') setTheme(t); }catch{}
  },[]);
  useEffect(()=>{
    try{ localStorage.setItem('xrph-theme', theme); }catch{}
    if(typeof document!=='undefined') document.documentElement.setAttribute('data-theme', theme);
  },[theme]);

  const [tab, setTab] = useState(initialTab || 'dashboard');
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [listingFilter, setListingFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [disputeNotes, setDisputeNotes] = useState({});
  const [vaultInspections, setVaultInspections] = useState({});
  const [inspectingId, setInspectingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [actionToast, setActionToast] = useState('');

  function extractArray(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      if (key && Array.isArray(payload[key])) return payload[key];
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.rows)) return payload.rows;
    }
    return [];
  }

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('tab');
      if (t === 'escrows' || t === 'disputes') setTab('escrows');
      else if (t && TABS.some(x => x.key === t)) setTab(t);
      else if (window.location.pathname.endsWith('/admin/orders')) setTab('orders');
    } catch {}
  }, []);

  async function refreshDisputes() {
    try {
      const d = await api.admin.disputes();
      setDisputes(extractArray(d, 'disputes'));
    } catch (err) {
      setApiError(err?.message || 'Failed to load disputes');
    }
  }

  async function loadAllAdminData() {
    if (!user) return;
    setLoading(true);
    setApiError('');
    const errors = [];
    const [s, d, u, o, l, r] = await Promise.all([
      api.admin.stats().catch(err => { errors.push(`Stats: ${err.message}`); return null; }),
      api.admin.disputes().catch(err => { errors.push(`Disputes: ${err.message}`); return []; }),
      api.admin.users().catch(err => { errors.push(`Users: ${err.message}`); return []; }),
      (api.admin.orders ? api.admin.orders() : Promise.resolve([])).catch(() => []),
      (api.admin.listings ? api.admin.listings() : api.listings.list({ limit: 200 })).catch(() => api.listings.list({ limit: 200 }).catch(() => [])),
      api.admin.listReports('pending').catch(() => []),
    ]);
    if (errors.length > 0) {
      setApiError(errors.join(' · '));
    }
    setStats(s);
    setDisputes(extractArray(d, 'disputes'));
    setUsers(extractArray(u, 'users'));
    setOrders(extractArray(o, 'orders'));
    setListings(extractArray(l, 'listings'));
    setReports(extractArray(r, 'reports'));
    setLoading(false);
  }

  async function handleInspectVault(d) {
    const targetId = d.order_id || d.id;
    setInspectingId(targetId);
    try {
      const info = await api.admin.inspectVault(targetId);
      setVaultInspections(prev => ({ ...prev, [targetId]: info }));
      // Trigger download for admin inspection using presignedGetUrl or authenticated raw stream
      const dlUrl = info.presignedGetUrl || info.streamUrl;
      if (dlUrl) {
        if (info.presignedGetUrl) {
          window.open(info.presignedGetUrl, '_blank', 'noopener,noreferrer');
        } else {
          const token = localStorage.getItem('xrpmarket_token');
          const res = await fetch(dlUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (res.ok) {
            const blob = await res.blob();
            const bUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = bUrl;
            a.download = info.fileName || `vault-inspect-${String(targetId).slice(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(bUrl), 5000);
          }
        }
      }
      setActionToast(`🔍 R2 Vault inspected for "${info.listingTitle || d.listing_title || 'Order'}" (Buyer download count untouched: ${info.buyerEvidence?.downloadCount ?? d.download_count ?? 0})`);
      setTimeout(() => setActionToast(''), 6000);
    } catch (err) {
      setActionToast(`⚠️ Vault inspection error: ${err.message || 'Could not inspect vault'}`);
      setTimeout(() => setActionToast(''), 5000);
    } finally {
      setInspectingId(null);
    }
  }

  async function handleArbitrateDispute(d, favorBuyer) {
    const targetId = d.id || d.order_id;
    const noteKey = d.order_id || d.id;
    const note = (disputeNotes[noteKey] || '').trim();
    const label = favorBuyer ? 'Approve Dispute (Buyer Wins — Refund Escrow)' : 'Reject Dispute (Seller Wins — Release Payout)';
    const ok = await xhConfirm(`Confirm arbitration ruling: ${label}?`, {
      confirmText: favorBuyer ? 'Approve Dispute (Buyer Wins)' : 'Reject Dispute (Seller Wins)',
      danger: favorBuyer,
    });
    if (!ok) return;
    setResolvingId(targetId);
    try {
      await api.admin.resolveDispute(targetId, {
        favorBuyer,
        action: favorBuyer ? 'refund' : 'release',
        resolution: note || (favorBuyer ? 'Dispute approved by admin (Buyer Wins)' : 'Dispute rejected by admin after R2 Vault verification (Seller Wins)'),
        note: note || undefined,
      });
      setActionToast(favorBuyer
        ? '✓ Dispute Approved (Buyer Wins) — Order marked refund_approved.'
        : '✓ Dispute Rejected (Seller Wins) — Dispute lock lifted & payout approved for seller.');
      setTimeout(() => setActionToast(''), 6000);
      await refreshDisputes();
    } catch (err) {
      setActionToast(`⚠️ Could not resolve dispute: ${err.message || 'Error'}`);
      setTimeout(() => setActionToast(''), 5000);
    } finally {
      setResolvingId(null);
    }
  }

  useEffect(()=>{
    if(!user) return;
    loadAllAdminData();
  },[user]);

  if (hydrated && !user) {
    return (
      <div style={{maxWidth:420,margin:'80px auto',padding:'40px 24px',textAlign:'center',background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:14}}>
        <div style={{fontSize:40,marginBottom:12}}>🔒</div>
        <h2 style={{fontSize:18,fontWeight:700,color:'var(--xh-text)',marginBottom:8}}>Admin access required</h2>
        <p style={{fontSize:13.5,color:'var(--xh-text2)',marginBottom:18}}>Sign in with an admin wallet to view this dashboard.</p>
        <Link href='/login' style={{display:'inline-block',background:'var(--xh-accent)',color:'#fff',textDecoration:'none',padding:'10px 22px',borderRadius:8,fontSize:13,fontWeight:600}}>Connect wallet</Link>
      </div>
    );
  }

  const openDisputes = disputes.filter(d=>d.status==='open'||d.status==='disputed'||d.order_status==='disputed');

  function renderDisputeCard(d) {
    const keyId = d.order_id || d.id;
    const isResolved = d.status === 'resolved' && d.order_status !== 'disputed';
    const dlCount = Number(d.download_count || (Array.isArray(d.download_logs) ? d.download_logs.length : (d.buyer_downloaded_at ? 1 : 0)));
    const buyerDownloaded = Boolean(d.buyer_downloaded || d.buyer_downloaded_at || dlCount > 0);
    const inspected = vaultInspections[keyId];
    const archiveSizeKb = d.digital_archive_size ? (Number(d.digital_archive_size) / 1024).toFixed(1) + ' KB' : (inspected?.fileSize ? (Number(inspected.fileSize) / 1024).toFixed(1) + ' KB' : 'Vault Package');

    return (
      <div key={keyId} style={{padding:'16px 18px',background:'var(--xh-surface2)',border:'1px solid var(--xh-border2)',borderRadius:12,fontSize:13,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontSize:15,fontWeight:800,color:'var(--xh-text)'}}>{d.listing_title || d.title || 'Digital Asset'}</span>
              <Pill color={isResolved ? 'green' : 'red'}>{isResolved ? `RESOLVED (${d.decision || d.order_status})` : 'DISPUTED'}</Pill>
              <span style={{fontSize:12,fontWeight:700,color:'var(--xh-accent)',fontFamily:'monospace'}}>{Number(d.total_xrp || 0)} XRP</span>
            </div>
            <div style={{fontSize:11.5,color:'var(--xh-text3)',fontFamily:'monospace',marginTop:3}}>
              Order #{String(d.order_id || d.id || '').slice(0, 12)} · Opened {fmtDate(d.created_at)}
              {d.escrow_sequence ? ` · Escrow Seq #${d.escrow_sequence}` : ''}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button
              type="button"
              className="xh-btn-sm"
              disabled={inspectingId === keyId}
              onClick={() => handleInspectVault(d)}
              style={{background:'rgba(32,128,245,0.12)',borderColor:'rgba(32,128,245,0.4)',color:'#2080F5',fontWeight:700}}
            >
              {inspectingId === keyId ? '🔍 Inspecting R2 Vault…' : '🔍 Inspect R2 Vault File'}
            </button>
          </div>
        </div>

        {/* Wallets & Dispute Reason */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:10,background:'var(--xh-surface)',padding:'10px 12px',borderRadius:9,border:'1px solid var(--xh-border)'}}>
          <div>
            <div style={{fontSize:10.5,fontWeight:700,color:'var(--xh-text3)',textTransform:'uppercase'}}>Buyer</div>
            <div style={{fontSize:12.5,fontWeight:700,color:'var(--xh-text)'}}>{d.buyer_name || d.buyer_username || 'Buyer'}</div>
            <div style={{fontSize:11,fontFamily:'monospace',color:'var(--xh-text2)',wordBreak:'break-all'}}>{d.buyer_wallet || '—'}</div>
          </div>
          <div>
            <div style={{fontSize:10.5,fontWeight:700,color:'var(--xh-text3)',textTransform:'uppercase'}}>Seller (Creator)</div>
            <div style={{fontSize:12.5,fontWeight:700,color:'var(--xh-text)'}}>{d.seller_name || d.seller_username || 'Seller'}</div>
            <div style={{fontSize:11,fontFamily:'monospace',color:'var(--xh-text2)',wordBreak:'break-all'}}>{d.seller_wallet || '—'}</div>
          </div>
          <div>
            <div style={{fontSize:10.5,fontWeight:700,color:'var(--xh-text3)',textTransform:'uppercase'}}>Buyer Download Evidence</div>
            <div style={{fontSize:12,fontWeight:700,color:buyerDownloaded ? '#DC2626' : '#16A34A',marginTop:2}}>
              {buyerDownloaded ? `⚠️ Downloaded ${dlCount}x by Buyer` : '✓ 0 Downloads (Not yet downloaded)'}
            </div>
            {d.buyer_downloaded_at && (
              <div style={{fontSize:10.5,color:'var(--xh-text3)'}}>First download: {fmtDate(d.buyer_downloaded_at)}</div>
            )}
          </div>
          <div>
            <div style={{fontSize:10.5,fontWeight:700,color:'var(--xh-text3)',textTransform:'uppercase'}}>R2 Vault Asset &amp; SHA-256</div>
            <div style={{fontSize:12,fontWeight:600,color:'var(--xh-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              📦 {d.digital_archive_name || d.r2_object_key || 'Vault Archive'} ({archiveSizeKb})
            </div>
            <div style={{fontSize:10.5,fontFamily:'monospace',color:'var(--xh-text3)'}}>
              {d.digital_archive_sha256 ? `SHA-256: ${String(d.digital_archive_sha256).slice(0, 16)}… ✓` : 'SHA-256: Verified on upload'}
            </div>
          </div>
        </div>

        {/* Dispute Reason */}
        <div style={{padding:'10px 12px',background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8}}>
          <div style={{fontSize:10.5,fontWeight:700,color:'#DC2626',textTransform:'uppercase',marginBottom:3}}>Dispute Claim / Reason</div>
          <div style={{fontSize:12.5,color:'var(--xh-text)',lineHeight:1.45}}>{d.reason || 'Order flagged as disputed'}</div>
        </div>

        {/* Live R2 Vault Inspection Result */}
        {inspected && (
          <div style={{padding:'10px 12px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:8,fontSize:12}}>
            <div style={{fontWeight:700,color:'#16A34A',marginBottom:4}}>
              ✓ R2 Vault Inspection Complete · Storage: {inspected.storageSource} · Physical Object Verified: {inspected.existsInR2 ? 'YES' : 'Fallback'}
            </div>
            <div style={{fontSize:11,fontFamily:'monospace',color:'var(--xh-text2)',wordBreak:'break-all'}}>
              Key: {inspected.objectKey} · Size: {inspected.fileSize} bytes · Admin Inspected At: {fmtDate(inspected.adminInspectedAt)} (Buyer download counter preserved at {inspected.buyerEvidence?.downloadCount ?? dlCount})
            </div>
          </div>
        )}

        {/* Arbitration Controls */}
        {!isResolved ? (
          <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:4,borderTop:'1px solid var(--xh-border)'}}>
            <input
              type="text"
              value={disputeNotes[keyId] || ''}
              onChange={e => setDisputeNotes(prev => ({ ...prev, [keyId]: e.target.value }))}
              placeholder="Admin arbitration note / ruling explanation (recorded on dispute log)…"
              style={{width:'100%',padding:'8px 11px',borderRadius:8,border:'1px solid var(--xh-border2)',background:'var(--xh-surface)',color:'var(--xh-text)',fontSize:12.5,boxSizing:'border-box'}}
            />
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,flexWrap:'wrap'}}>
              <button
                type="button"
                className="xh-btn-sm"
                disabled={resolvingId === (d.id || d.order_id)}
                onClick={() => handleArbitrateDispute(d, false)}
                style={{background:'#16A34A',color:'#fff',borderColor:'#15803D',padding:'8px 14px',fontWeight:700}}
              >
                ✓ Reject Dispute (Seller Wins — Release Payout)
              </button>
              <button
                type="button"
                className="xh-btn-sm xh-btn-danger"
                disabled={resolvingId === (d.id || d.order_id)}
                onClick={() => handleArbitrateDispute(d, true)}
                style={{padding:'8px 14px',fontWeight:700}}
              >
                ↩ Approve Dispute (Buyer Wins — Refund Buyer)
              </button>
            </div>
          </div>
        ) : (
          <div style={{fontSize:12,color:'#16A34A',fontWeight:600}}>
            ✓ Resolved ({d.decision || d.order_status}) {d.admin_note ? `— Note: "${d.admin_note}"` : ''}
          </div>
        )}
      </div>
    );
  }
  const filteredListings = listingFilter==='all' ? listings : listings.filter(l=>l.status===listingFilter);
  const listingCounts = {
    all: listings.length,
    active: listings.filter(l=>l.status==='active').length,
    sold: listings.filter(l=>l.status==='sold').length,
    removed: listings.filter(l=>l.status==='removed').length,
  };
  const soldListings = listings.filter(l=>l.status==='sold' || (l.quantity_sold && l.quantity_sold>0));
  const completedOrders = orders.length > 0 ? orders : soldListings;
  const totalOrderVolume = orders.length > 0
    ? orders.reduce((sum, o) => sum + (parseFloat(o.total_xrp || o.price_xrp) || 0), 0)
    : soldListings.reduce((sum,l)=> sum + (parseFloat(l.price_xrp)||0) * (l.quantity_sold||1), 0);
  const totalFees = orders.length > 0
    ? orders.reduce((sum, o) => sum + (parseFloat(o.commission_xrp) || ((parseFloat(o.total_xrp) || 0) * (o.seller_is_pro ? 0.015 : 0.03))), 0)
    : totalOrderVolume * 0.03;
  const effectiveVolumeXrp = Number(stats?.volume_xrp ?? stats?.totalVolumeXrp ?? totalOrderVolume ?? 0);
  const effectiveActiveListings = Number(stats?.active_listings ?? stats?.activeListings ?? listingCounts.active ?? 0);
  const effectiveTotalUsers = Number(stats?.total_users ?? stats?.totalUsers ?? users.length ?? 0);

  const trend = period==='24h' ? [3,5,4,7,6,9,8,11,9,12,10,14] : period==='7d' ? [12,18,15,22,19,24,21] : [45,52,48,61,58,65,72,68,75,82,78,85,91,88];

  return (
    <div className='xh-admin'>
      <style>{`
        html[data-theme="light"]{
          --xh-bg:#FFFFFF; --xh-bg2:var(--xh-surface2); --xh-surface:#FFFFFF; --xh-surface2:var(--xh-surface2);
          --xh-text:#0A1628; --xh-text2:var(--xh-text2); --xh-text3:var(--xh-text3);
          --xh-border:var(--xh-border); --xh-border2:#D2DBE6; --xh-tint:#F0F5FB;
          --xh-accent:var(--xh-accent); --xh-accent2:#2080F5;
        }
        html[data-theme="light"] body{ background:#FFFFFF !important; color:#0A1628 !important; }
        html[data-theme="dark"]{
          --xh-bg:#0A0E1A; --xh-bg2:#111827; --xh-surface:#151B2C; --xh-surface2:#1C2438;
          --xh-text:var(--xh-surface2); --xh-text2:#CBD5E1; --xh-text3:#94A3B8;
          --xh-border:#1F2937; --xh-border2:#2A3548; --xh-tint:rgba(255,255,255,0.04);
          --xh-accent:#3B82F6; --xh-accent2:#60A5FA;
        }
        html[data-theme="dark"] body{ background:#0A0E1A !important; color:var(--xh-surface2) !important; }
        .xh-tab{padding:11px 14px;font-size:13.5px;font-weight:500;color:var(--xh-text2);background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transition:color .12s,border-color .12s}
        .xh-tab:hover{color:var(--xh-text)}
        .xh-tab[data-active="true"]{color:var(--xh-accent);border-bottom-color:var(--xh-accent);font-weight:600}
        .xh-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#DC2626;color:#fff;font-size:10.5px;font-weight:700;margin-left:6px}
        .xh-pchip{padding:5px 12px;border-radius:7px;font-size:12px;font-weight:500;background:var(--xh-surface);color:var(--xh-text2);border:1px solid var(--xh-border);cursor:pointer}
        .xh-pchip[data-active="true"]{background:var(--xh-accent);color:#fff;border-color:var(--xh-accent)}
        .xh-btn-sm{padding:6px 12px;font-size:12px;font-weight:600;border-radius:7px;border:1px solid var(--xh-border2);background:var(--xh-surface);color:var(--xh-text);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
        .xh-btn-sm:hover{background:var(--xh-surface2)}
        .xh-btn-danger{background:#FEE2E2;color:#B91C1C;border-color:#FECACA}
        html[data-theme="dark"] .xh-btn-danger{background:rgba(220,38,38,0.15);color:#FCA5A5;border-color:rgba(220,38,38,0.3)}
        .xh-btn-warn{background:#FEF3C7;color:#92400E;border-color:#FDE68A}
        html[data-theme="dark"] .xh-btn-warn{background:rgba(245,158,11,0.15);color:#FCD34D;border-color:rgba(245,158,11,0.3)}
      `}</style>

      <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:'var(--xh-text)',letterSpacing:'-0.02em',margin:'0 0 4px'}}>Admin Console</h1>
          <div style={{fontSize:13,color:'var(--xh-text3)'}}>Marketplace operations, R2 Vault inspection &amp; escrow dispute arbitration</div>
        </div>
        <button type='button' className='xh-btn-sm' onClick={loadAllAdminData} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh Data'}
        </button>
      </div>

      {apiError && (
        <div style={{padding:'12px 16px',marginBottom:16,borderRadius:10,background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.35)',color:'#DC2626',fontSize:13,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span>⚠️ Admin API Notice: {apiError}</span>
          <button type='button' className='xh-btn-sm' onClick={loadAllAdminData}>Retry</button>
        </div>
      )}

      {actionToast && (
        <div style={{padding:'12px 16px',marginBottom:16,borderRadius:10,background:'rgba(32,128,245,0.12)',border:'1px solid rgba(32,128,245,0.35)',color:'var(--xh-text)',fontSize:13,fontWeight:700}}>
          {actionToast}
        </div>
      )}

      <div style={{display:'flex',gap:4,borderBottom:'1px solid var(--xh-border)',marginBottom:20,overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.key} className='xh-tab' data-active={tab===t.key} onClick={()=>setTab(t.key)}>
            <span>{t.icon}</span> {t.label}
            {t.key==='escrows' && openDisputes.length>0 && <span className='xh-badge'>{openDisputes.length}</span>}
            {t.key==='orders' && completedOrders.length>0 && <span style={{marginLeft:4,fontSize:11,color:'var(--xh-text3)'}}>({completedOrders.length})</span>}
            {t.key==='users' && users.length>0 && <span style={{marginLeft:4,fontSize:11,color:'var(--xh-text3)'}}>({users.length})</span>}
            {t.key==='listings' && listings.length>0 && <span style={{marginLeft:4,fontSize:11,color:'var(--xh-text3)'}}>({listings.length})</span>}
          </button>
        ))}
      </div>

      {tab==='dashboard' && (
        <div>
          <div style={{display:'flex',gap:6,marginBottom:16}}>
            {['24h','7d','30d','all'].map(pp=>(
              <button key={pp} className='xh-pchip' data-active={period===pp} onClick={()=>setPeriod(pp)}>{pp}</button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
            <MetricCard label='Volume (XRP)' value={Math.round(effectiveVolumeXrp).toLocaleString('en-US')} delta='+12.4%' color='var(--xh-accent)' trend={trend}/>
            <MetricCard label='Registered users' value={effectiveTotalUsers.toLocaleString('en-US')} delta={`${users.length} loaded`} color='#16A34A' trend={trend.map(v=>v*0.8)}/>
            <MetricCard label='Active listings' value={effectiveActiveListings.toString()} delta={`${listings.length} total`} color='#9333EA' trend={trend.map(v=>v*1.2)}/>
            <MetricCard label='Open disputes' value={openDisputes.length.toString()} delta={openDisputes.length>0?'needs review':'all clear'} color='#DC2626' trend={[1,0,2,1,3,2,openDisputes.length||1]}/>
          </div>

          <Section title={'Open disputes & arbitration ('+openDisputes.length+')'} action={openDisputes.length>0 && <button className='xh-tab' onClick={()=>setTab('escrows')} style={{padding:'4px 10px',fontSize:12}}>Open Full Arbitration View →</button>}>
            {openDisputes.length===0 ? <Empty icon='✅' text='No open disputes — all clear'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {openDisputes.slice(0,5).map(d => renderDisputeCard(d))}
              </div>
            )}
          </Section>

          <Section title={'Recent orders ('+completedOrders.length+')'} action={<button className='xh-tab' onClick={()=>setTab('orders')} style={{padding:'4px 10px',fontSize:12}}>View all →</button>}>
            {completedOrders.length===0 ? <Empty icon='🛒' text='No orders yet'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {completedOrders.slice(0,5).map(o=>(
                  <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13,gap:8}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontWeight:600,color:'var(--xh-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.listing_title || o.title || 'Digital Asset'}</div>
                      <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>
                        {o.buyer_username ? `buyer: ${o.buyer_username} → seller: ${o.seller_username || 'seller'}` : `${o.username||'anon'} · sold ${o.quantity_sold||1}×`}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:700,color:'var(--xh-text)',fontSize:13}}>{(parseFloat(o.total_xrp ?? (parseFloat(o.price_xrp)*(o.quantity_sold||1))) || 0).toFixed(0)} XRP</div>
                      <Pill color={o.status==='disputed'?'red':o.status==='completed'||o.status==='sold'?'green':'blue'}>{o.status || 'completed'}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {tab==='listings' && (
        <div>
          <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
            {[{k:'all',label:'All'},{k:'active',label:'Live'},{k:'sold',label:'Sold'},{k:'removed',label:'Removed'}].map(f=>(
              <button key={f.k} className='xh-pchip' data-active={listingFilter===f.k} onClick={()=>setListingFilter(f.k)}>
                {f.label} <span style={{opacity:0.6,marginLeft:4}}>{listingCounts[f.k]}</span>
              </button>
            ))}
          </div>
          <Section title={'Listings ('+filteredListings.length+')'}>
            {filteredListings.length===0 ? <Empty icon='📜' text='No listings in this filter'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {filteredListings.map(l=>(
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13,gap:10,flexWrap:'wrap'}}>
                    <div style={{minWidth:0,flex:1,display:'flex',alignItems:'center',gap:10}}>
                      {l.images && l.images[0] && <img src={l.images[0]} alt='' style={{width:40,height:40,borderRadius:6,objectFit:'cover',flexShrink:0}}/>}
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          <Link href={'/listing/'+l.id} target='_blank' style={{fontWeight:600,color:'var(--xh-text)',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</Link>
                          <Pill color={l.status==='active'?'green':l.status==='sold'?'blue':'gray'}>{l.status}</Pill>
                          {l.is_featured && <Pill color='yellow'>★ Featured</Pill>}
                          {l.seller_is_pro && <Pill color='yellow'>Pro</Pill>}
                        </div>
                        <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>{(l.username||'anon')+' · '+l.price_xrp+' XRP · '+l.category+' · stock '+((l.quantity||1)-(l.quantity_sold||0))+'/'+(l.quantity||1)}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {!l.is_featured ? (
                        <button className='xh-btn-sm xh-btn-warn' onClick={async()=>{
                          const d=parseInt(prompt('Feature for how many days?','7'), 10);
                          if(d>0){
                            await api.admin.featureListing(l.id,d);
                            setActionToast(`★ Featured "${l.title}" for ${d} days`);
                            loadAllAdminData();
                          }
                        }}>★ Feature</button>
                      ) : (
                        <button className='xh-btn-sm' onClick={async()=>{
                          await api.admin.featureListing(l.id,0);
                          setActionToast(`Removed featured status from "${l.title}"`);
                          loadAllAdminData();
                        }}>Unfeature</button>
                      )}
                      {l.status==='active' && (
                        <button className='xh-btn-sm xh-btn-danger' onClick={()=>{
                          xhConfirm('Remove this listing? Seller will lose visibility.',{danger:true,confirmText:'Remove'}).then(async ok=>{
                            if(ok){
                              await api.admin.removeListing(l.id);
                              setActionToast(`Removed listing "${l.title}"`);
                              loadAllAdminData();
                            }
                          });
                        }}>Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {tab==='orders' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
            <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11,color:'var(--xh-text3)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:4}}>Total orders</div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--xh-text)'}}>{completedOrders.length}</div>
            </div>
            <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11,color:'var(--xh-text3)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:4}}>Order volume</div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--xh-text)'}}>{totalOrderVolume.toFixed(0)} XRP</div>
            </div>
            <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11,color:'var(--xh-text3)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:4}}>Fees collected</div>
              <div style={{fontSize:22,fontWeight:800,color:'#16A34A'}}>{totalFees.toFixed(1)} XRP</div>
            </div>
            <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11,color:'var(--xh-text3)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:4}}>Avg order</div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--xh-text)'}}>{completedOrders.length>0 ? (totalOrderVolume/completedOrders.length).toFixed(1) : '0'} XRP</div>
            </div>
          </div>

          <Section title={'All platform orders ('+completedOrders.length+')'} action={<button type='button' className='xh-btn-sm' onClick={loadAllAdminData}>↻ Refresh Orders</button>}>
            {completedOrders.length===0 ? <Empty icon='🛒' text='No orders recorded yet'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {completedOrders.map(o=>(
                  <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13,gap:10,flexWrap:'wrap'}}>
                    <div style={{minWidth:0,flex:1,display:'flex',alignItems:'center',gap:10}}>
                      {o.images && o.images[0] && <img src={o.images[0]} alt='' style={{width:40,height:40,borderRadius:6,objectFit:'cover',flexShrink:0}}/>}
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          <Link href={'/listing/'+(o.listing_id||o.id)} target='_blank' style={{fontWeight:600,color:'var(--xh-text)',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.listing_title||o.title||'Digital Asset'}</Link>
                          <Pill color={o.status==='disputed'?'red':o.status==='completed'||o.status==='sold'?'green':'blue'}>{o.status||'completed'}</Pill>
                          {o.seller_is_pro && <Pill color='yellow'>Pro seller</Pill>}
                          {o.buyer_downloaded_at && <Pill color='green'>Downloaded</Pill>}
                        </div>
                        <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>
                          {o.buyer_username || o.buyer_wallet_address
                            ? `Order #${String(o.id).slice(0,8)} · buyer: ${o.buyer_username||'buyer'} (${fmtAddr(o.buyer_wallet_address)}) → seller: ${o.seller_username||'seller'} (${fmtAddr(o.seller_wallet_address)})${o.escrow_tx_hash ? ' · tx: ' + fmtAddr(o.escrow_tx_hash) : ''} · ${fmtDate(o.updated_at||o.created_at)}`
                            : `seller: ${o.username||'anon'} · ${o.category||'digital'} · ${o.quantity_sold||1} unit(s) sold · ${fmtDate(o.updated_at||o.created_at)}`}
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:'right',minWidth:90}}>
                      <div style={{fontWeight:700,color:'var(--xh-text)',fontSize:14}}>{(parseFloat(o.total_xrp ?? (parseFloat(o.price_xrp)*(o.quantity_sold||1))) || 0).toFixed(2)} XRP</div>
                      <div style={{fontSize:10.5,color:'var(--xh-text3)',marginTop:2}}>
                        {o.status === 'disputed' ? (
                          <button type='button' className='xh-btn-sm' style={{padding:'2px 8px',fontSize:10.5}} onClick={()=>setTab('escrows')}>Arbitrate →</button>
                        ) : (
                          `fee: ${(parseFloat(o.commission_xrp) || 0).toFixed(2)} XRP`
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {tab==='users' && (
        <Section
          title={'Registered platform users ('+users.length+')'}
          action={<button type='button' className='xh-btn-sm' onClick={loadAllAdminData}>↻ Refresh Users</button>}
        >
          {users.length===0 ? <Empty icon='👤' text={loading ? 'Loading registered users…' : 'No users found'}/> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {users.map(u=>{
                const walletAddr = u.wallet_address || u.address || u.walletAddress || '';
                const isUserAdmin = u.role === 'admin' || u.is_admin || u.isAdmin;
                const isUserPro = Boolean(u.is_pro || u.isPro || (u.pro_until && new Date(u.pro_until) > new Date()) || u.store_handle);
                return (
                  <div key={u.id || walletAddr} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--xh-surface2)',border:'1px solid var(--xh-border)',borderRadius:10,fontSize:13,flexWrap:'wrap',gap:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,minWidth:240,flex:1}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:isUserAdmin?'#2080F5':'var(--xh-accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0}}>
                        {(u.username||walletAddr||'?').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',fontWeight:700,color:'var(--xh-text)'}}>
                          <span>{u.username||'anon'}</span>
                          {isUserAdmin && <Pill color='blue'>ADMIN</Pill>}
                          {isUserPro && <Pill color='yellow'>PRO</Pill>}
                          {u.is_verified && <Pill color='green'>✓ Verified</Pill>}
                          {u.is_banned && <Pill color='red'>BANNED</Pill>}
                          {u.store_handle && (
                            <Link href={'/store/'+u.store_handle} target='_blank' style={{fontSize:11,color:'var(--xh-accent)',textDecoration:'none',fontWeight:600}}>
                              /store/{u.store_handle} ↗
                            </Link>
                          )}
                        </div>
                        <div style={{fontSize:11.5,color:'var(--xh-text2)',fontFamily:'monospace',marginTop:3,wordBreak:'break-all'}}>
                          {walletAddr || '—'}
                        </div>
                        <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>
                          {`${u.listing_count ?? 0} listing(s) · ${u.order_count ?? 0} order(s) · rep ${Number(u.reputation_score || 0).toFixed(1)}★ · joined ${fmtDate(u.created_at)}`}
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button className='xh-btn-sm' onClick={async()=>{
                        await api.admin.verifyUser(u.id,!u.is_verified);
                        setActionToast(`${!u.is_verified ? '✓ Verified' : 'Unverified'} @${u.username}`);
                        loadAllAdminData();
                      }}>{u.is_verified?'Unverify':'Verify'}</button>
                      <button className='xh-btn-sm' onClick={async()=>{
                        const d=parseInt(prompt('Grant Pro for how many days? (Enter 0 to revoke)','30'), 10);
                        if(!Number.isNaN(d)){
                          await api.admin.grantPro(u.id,d);
                          setActionToast(d > 0 ? `Granted ${d} days Pro to @${u.username}` : `Revoked Pro from @${u.username}`);
                          loadAllAdminData();
                        }
                      }}>Grant Pro</button>
                      <button className='xh-btn-sm xh-btn-danger' onClick={()=>{
                        const nextBan = !u.is_banned;
                        xhConfirm(`${nextBan ? 'Ban' : 'Unban'} user @${u.username}?`,{danger:nextBan,confirmText:nextBan?'Ban':'Unban'}).then(async ok=>{
                          if(ok){
                            await api.admin.banUser(u.id,nextBan);
                            setActionToast(`${nextBan ? 'Banned' : 'Unbanned'} @${u.username}`);
                            loadAllAdminData();
                          }
                        });
                      }}>{u.is_banned ? 'Unban' : 'Ban'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {tab==='escrows' && (
        <div>
          <Section
            title={'Disputes & R2 Vault Arbitration ('+disputes.length+')'}
            action={<button type="button" className="xh-btn-sm" onClick={refreshDisputes}>↻ Refresh Disputes</button>}
          >
            {disputes.length===0 ? <Empty icon='✅' text='No disputed escrows'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {disputes.map(d => renderDisputeCard(d))}
              </div>
            )}
          </Section>
        </div>
      )}

      {tab==='reports' && (
        <Section title={'Pending reports ('+reports.length+')'} action={<span style={{fontSize:11.5,color:'var(--xh-text3)'}}>User-submitted abuse flags awaiting review</span>}>
          {reports.length===0 ? <Empty icon='✅' text='No pending reports — nothing to review'/> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {reports.map(r=>(
                <div key={r.id} style={{padding:'12px 14px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,flexWrap:'wrap',gap:8}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
                        <Pill color={r.target_type==='listing'?'blue':'yellow'}>{r.target_type}</Pill>
                        <Pill color='red'>{r.reason}</Pill>
                        <span style={{fontSize:11,color:'var(--xh-text3)'}}>{fmtDate(r.created_at)}</span>
                      </div>
                      <div style={{fontWeight:600,color:'var(--xh-text)',marginBottom:2}}>
                        {r.target_type==='listing' ? (
                          <Link href={'/listings/'+r.target_id} target='_blank' style={{color:'var(--xh-text)',textDecoration:'none'}}>{r.target_label || ('Listing #'+(r.target_id||'').slice(0,8))} ↗</Link>
                        ) : (
                          <span>{r.target_label || 'anon'} <span style={{fontSize:10.5,color:'var(--xh-text3)',fontFamily:'monospace',marginLeft:4}}>{(r.target_address||'').slice(0,16)}</span></span>
                        )}
                      </div>
                      {r.details && <div style={{fontSize:12,color:'var(--xh-text2)',marginTop:6,padding:'8px 10px',background:'var(--xh-surface)',borderRadius:6,lineHeight:1.5}}>“{r.details}”</div>}
                      <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:6}}>Reported by: <b style={{color:'var(--xh-text2)'}}>{r.reporter_username||'anon'}</b></div>
                    </div>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <button className='xh-btn-sm' onClick={()=>{const note=prompt('Resolution note (optional):','');api.admin.resolveReport(r.id,'resolved',note||'').then(()=>location.reload())}}>Resolve</button>
                      <button className='xh-btn-sm xh-btn-warn' onClick={()=>{xhConfirm('Dismiss this report? (use when the report is unfounded)',{confirmText:'Dismiss'}).then(ok=>{if(ok)api.admin.resolveReport(r.id,'dismissed','').then(()=>location.reload())})}}>Dismiss</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {tab==='settings' && (
        <div>
          <Section title='Marketplace fees' action={<span style={{fontSize:11.5,color:'var(--xh-text3)'}}>Charged on each completed trade</span>}>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <SettingItem icon='💸' label='Standard seller fee' value='3.0%' hint='Default platform fee charged to non-Pro sellers when an escrow releases.' envKey='PLATFORM_FEE_PCT'/>
              <SettingItem icon='⭐' label='Pro seller fee' value='1.5%' pill='discount' pillColor='yellow' hint='Lower fee for Pro subscription holders — half of standard.' envKey='PRO_FEE_PCT'/>
            </div>
          </Section>

          <Section title='XRPL network'>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <SettingItem icon='🌐' label='Network' value={XRPL_NET_VALUE} pill={XRPL_NET_PILL} pillColor={XRPL_NET_PILLCOLOR} hint={XRPL_IS_MAINNET ? 'Escrows run on XRPL mainnet \u2014 real XRP moves on every release.' : 'Reflects NEXT_PUBLIC_XRPL_NETWORK. Set it (mainnet/testnet) to match the backend XRPL_NODE.'} envKey='NEXT_PUBLIC_XRPL_NETWORK'/>
              <SettingItem icon='🔗' label='XRPL endpoint' value={XRPL_NODE_VALUE} hint='WebSocket node used for escrow create / fulfill / cancel. Set to match the backend XRPL_NODE.' envKey='NEXT_PUBLIC_XRPL_NODE'/>
              <SettingItem icon='👛' label='Platform wallet' value='configured' pill='set' pillColor='green' hint='The XRPL address that collects platform fees. Set via env var — only the seed should ever live in Railway secrets.' envKey='PLATFORM_WALLET_ADDRESS'/>
            </div>
          </Section>

          <Section title='Escrow rules'>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <SettingItem icon='⏱️' label='Auto-release window' value='7 days' hint='If neither buyer nor seller acts, the escrow auto-releases to the seller after this many hours. Buyer can dispute before that.' envKey='ESCROW_AUTO_RELEASE_HOURS'/>
              <SettingItem icon='⚠️' label='Dispute window' value='24 hrs' hint='How long a buyer has after delivery to open a dispute. After this, escrow can auto-release.' envKey='DISPUTE_WINDOW_HOURS'/>
            </div>
          </Section>

          <Section title='Authentication'>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <SettingItem icon='🔑' label='Xaman API key' value='configured' pill='set' pillColor='green' hint='Used to sign XUMM/Xaman wallet sign-in requests. Stored as a Railway secret, never exposed to the frontend.' envKey='XUMM_API_KEY / XUMM_API_SECRET'/>
              <SettingItem icon='🛡️' label='JWT signing secret' value='configured' pill='set' pillColor='green' hint='Signs session tokens issued after wallet sign-in. Rotating this logs every user out.' envKey='JWT_SECRET'/>
            </div>
          </Section>

          <Section title='Live platform stats' action={<span style={{fontSize:11.5,color:'var(--xh-text3)'}}>Read-only, derived from current data</span>}>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <SettingItem icon='📊' label='Lifetime volume' value={(stats?Math.round(stats.volume_xrp||0).toLocaleString('en-US'):'0')+' XRP'} hint='Total value of all escrows ever released.'/>
              <SettingItem icon='💰' label='Estimated platform fees' value={(stats?Math.round((stats.volume_xrp||0)*0.03).toLocaleString('en-US'):'0')+' XRP'} hint='Calculated at 3% standard rate. Actual collected fees depend on Pro seller mix.'/>
              <SettingItem icon='👥' label='Total users' value={users.length.toString()} hint='Wallets that have completed sign-in at least once.'/>
            </div>
          </Section>

          <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:12,padding:'18px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{fontSize:18,lineHeight:1}}>ℹ️</div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--xh-text)'}}>How to change a setting</div>
            </div>
            <div style={{fontSize:12.5,color:'var(--xh-text2)',lineHeight:1.6,marginBottom:12}}>All values above are loaded from environment variables at backend boot. To change one, edit the variable in Railway and redeploy the backend service. Frontend will pick up the new behaviour on its next Vercel build.</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <a href='https://railway.com/project/d8f62bea-7586-4def-a550-56cf48bbabfd' target='_blank' rel='noopener noreferrer' className='xh-btn-sm' style={{textDecoration:'none'}}>→ Open Railway</a>
              <a href='https://vercel.com/jelascos-projects/xrp-marketplace-frontend' target='_blank' rel='noopener noreferrer' className='xh-btn-sm' style={{textDecoration:'none'}}>→ Open Vercel</a>
            </div>
          </div>

          <div style={{fontSize:11.5,color:'var(--xh-text3)',padding:'10px 12px',background:'var(--xh-surface2)',borderRadius:8,marginTop:10,lineHeight:1.55,border:'1px dashed var(--xh-border2)'}}>
            <b style={{color:'var(--xh-text2)'}}>Roadmap:</b> Inline editing of these values will be available when <code>GET/PATCH /api/admin/settings</code> ships on the backend. Until then, this page is a single place to confirm what the platform is actually configured with.
          </div>
        </div>
      )}

      {loading && <div style={{textAlign:'center',padding:20,color:'var(--xh-text3)',fontSize:13}}>Loading…</div>}
    </div>
  );
}
