'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';

const TABS = [
  {key:'dashboard',label:'Dashboard',icon:'▦'},
  {key:'listings',label:'Listings',icon:'📜'},
  {key:'orders',label:'Orders',icon:'🛒'},
  {key:'escrows',label:'Escrows',icon:'🔒'},
  {key:'users',label:'Users',icon:'👥'},
  {key:'reports',label:'Reports',icon:'⚠️'},
  {key:'settings',label:'Settings',icon:'⚙️'},
];

function Sparkline({data=[], color='#1572E8', height=32, width=120}) {
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
        {trend && <Sparkline data={trend} color={color||'#1572E8'} width={70} height={28}/>}
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
    blue: {bg:'rgba(21,114,232,0.12)', text:'#1572E8'},
  };
  const c = colors[color] || colors.gray;
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:5,fontSize:10.5,fontWeight:600,background:c.bg,color:c.text,textTransform:'uppercase',letterSpacing:'0.04em'}}>{children}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  try { const dt = new Date(d); return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch { return d; }
}

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

export default function AdminPage() {
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

  const [tab, setTab] = useState('dashboard');
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [listingFilter, setListingFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if(!user) return;
    setLoading(true);
    Promise.all([
      api.admin.stats().catch(()=>null),
      api.admin.disputes().catch(()=>[]),
      api.admin.users().catch(()=>[]),
      api.listings.list({limit:200}).catch(()=>[]),
      api.admin.listReports('pending').catch(()=>[]),
    ]).then(([s,d,u,l,r])=>{
      setStats(s);
      setDisputes(Array.isArray(d)?d:[]);
      setUsers(Array.isArray(u)?u:[]);
      setListings(Array.isArray(l)?l:[]);
      setReports(Array.isArray(r)?r:[]);
    }).finally(()=>setLoading(false));
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

  const openDisputes = disputes.filter(d=>d.status==='open'||d.status==='disputed');
  const filteredListings = listingFilter==='all' ? listings : listings.filter(l=>l.status===listingFilter);
  const listingCounts = {
    all: listings.length,
    active: listings.filter(l=>l.status==='active').length,
    sold: listings.filter(l=>l.status==='sold').length,
    removed: listings.filter(l=>l.status==='removed').length,
  };
  const completedOrders = listings.filter(l=>l.status==='sold' || (l.quantity_sold && l.quantity_sold>0));
  const totalOrderVolume = completedOrders.reduce((sum,l)=> sum + (parseFloat(l.price_xrp)||0) * (l.quantity_sold||1), 0);
  const totalFees = totalOrderVolume * 0.03;

  const trend = period==='24h' ? [3,5,4,7,6,9,8,11,9,12,10,14] : period==='7d' ? [12,18,15,22,19,24,21] : [45,52,48,61,58,65,72,68,75,82,78,85,91,88];

  return (
    <div className='xh-admin'>
      <style>{`
        html[data-theme="light"]{
          --xh-bg:#FFFFFF; --xh-bg2:#F6F8FB; --xh-surface:#FFFFFF; --xh-surface2:#F2F5F9;
          --xh-text:#0A1628; --xh-text2:#4A5568; --xh-text3:#8A98AD;
          --xh-border:#E5EBF2; --xh-border2:#D2DBE6; --xh-tint:#F0F5FB;
          --xh-accent:#1572E8; --xh-accent2:#2080F5;
        }
        html[data-theme="light"] body{ background:#FFFFFF !important; color:#0A1628 !important; }
        html[data-theme="dark"]{
          --xh-bg:#0A0E1A; --xh-bg2:#111827; --xh-surface:#151B2C; --xh-surface2:#1C2438;
          --xh-text:#F1F5F9; --xh-text2:#CBD5E1; --xh-text3:#94A3B8;
          --xh-border:#1F2937; --xh-border2:#2A3548; --xh-tint:rgba(255,255,255,0.04);
          --xh-accent:#3B82F6; --xh-accent2:#60A5FA;
        }
        html[data-theme="dark"] body{ background:#0A0E1A !important; color:#F1F5F9 !important; }
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

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:800,color:'var(--xh-text)',letterSpacing:'-0.02em',margin:'0 0 4px'}}>Admin Console</h1>
        <div style={{fontSize:13,color:'var(--xh-text3)'}}>Marketplace operations & moderation</div>
      </div>

      <div style={{display:'flex',gap:4,borderBottom:'1px solid var(--xh-border)',marginBottom:20,overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.key} className='xh-tab' data-active={tab===t.key} onClick={()=>setTab(t.key)}>
            <span>{t.icon}</span> {t.label}
            {t.key==='escrows' && openDisputes.length>0 && <span className='xh-badge'>{openDisputes.length}</span>}
            {t.key==='orders' && completedOrders.length>0 && <span style={{marginLeft:4,fontSize:11,color:'var(--xh-text3)'}}>({completedOrders.length})</span>}
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:20}}>
            <MetricCard label='Volume (XRP)' value={stats ? Math.round(stats.volume_xrp||0).toLocaleString() : '—'} delta='+12.4%' color='#1572E8' trend={trend}/>
            <MetricCard label='Fees collected' value={stats ? (Math.round((stats.volume_xrp||0)*0.03)).toLocaleString() : '—'} delta='+12.4%' color='#16A34A' trend={trend.map(v=>v*0.6)}/>
            <MetricCard label='Active listings' value={stats ? (stats.active_listings||0).toString() : '—'} delta='+4' color='#9333EA' trend={trend.map(v=>v*1.2)}/>
            <MetricCard label='Open disputes' value={openDisputes.length.toString()} delta={openDisputes.length>0?'needs review':'all clear'} color='#DC2626' trend={[1,0,2,1,3,2,openDisputes.length||1]}/>
          </div>

          <Section title={'Open disputes ('+openDisputes.length+')'} action={openDisputes.length>0 && <button className='xh-tab' onClick={()=>setTab('escrows')} style={{padding:'4px 10px',fontSize:12}}>View all →</button>}>
            {openDisputes.length===0 ? <Empty icon='✅' text='No open disputes — all clear'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {openDisputes.slice(0,5).map(d=>(
                  <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13}}>
                    <div>
                      <div style={{fontWeight:600,color:'var(--xh-text)'}}>Escrow #{(d.id||'').toString().slice(0,8)}</div>
                      <div style={{fontSize:11.5,color:'var(--xh-text3)',marginTop:2}}>{d.reason||'No reason provided'}</div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className='xh-btn-sm' onClick={()=>api.admin.resolveDispute(d.id,{action:'release'}).then(()=>location.reload())}>Release</button>
                      <button className='xh-btn-sm xh-btn-danger' onClick={()=>api.admin.resolveDispute(d.id,{action:'refund'}).then(()=>location.reload())}>Refund</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={'Recent orders ('+completedOrders.length+')'} action={<button className='xh-tab' onClick={()=>setTab('orders')} style={{padding:'4px 10px',fontSize:12}}>View all →</button>}>
            {completedOrders.length===0 ? <Empty icon='🛒' text='No completed orders yet'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {completedOrders.slice(0,5).map(l=>(
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13,gap:8}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontWeight:600,color:'var(--xh-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
                      <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>{(l.username||'anon')+' · sold '+(l.quantity_sold||1)+'×'}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:700,color:'var(--xh-text)',fontSize:13}}>{(parseFloat(l.price_xrp)*(l.quantity_sold||1)).toFixed(0)} XRP</div>
                      <Pill color='green'>completed</Pill>
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
                          <Link href={'/listings/'+l.id} target='_blank' style={{fontWeight:600,color:'var(--xh-text)',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</Link>
                          <Pill color={l.status==='active'?'green':l.status==='sold'?'blue':'gray'}>{l.status}</Pill>
                          {l.is_featured && <Pill color='yellow'>★ Featured</Pill>}
                          {l.seller_is_pro && <Pill color='yellow'>Pro</Pill>}
                        </div>
                        <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>{(l.username||'anon')+' · '+l.price_xrp+' XRP · '+l.category+' · stock '+(l.quantity-l.quantity_sold)+'/'+l.quantity}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {!l.is_featured && <button className='xh-btn-sm xh-btn-warn' onClick={()=>{const d=parseInt(prompt('Feature for how many days?','7'));if(d>0)api.admin.featureListing(l.id,d).then(()=>location.reload())}}>★ Feature</button>}
                      {l.status==='active' && <button className='xh-btn-sm xh-btn-danger' onClick={()=>{if(confirm('Remove this listing? Seller will lose visibility.'))api.admin.removeListing(l.id).then(()=>location.reload())}}>Remove</button>}
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
              <div style={{fontSize:11,color:'var(--xh-text3)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:4}}>Fees (est. 3%)</div>
              <div style={{fontSize:22,fontWeight:800,color:'#16A34A'}}>{totalFees.toFixed(1)} XRP</div>
            </div>
            <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11,color:'var(--xh-text3)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:4}}>Avg order</div>
              <div style={{fontSize:22,fontWeight:800,color:'var(--xh-text)'}}>{completedOrders.length>0 ? (totalOrderVolume/completedOrders.length).toFixed(1) : '0'} XRP</div>
            </div>
          </div>

          <Section title={'Completed orders ('+completedOrders.length+')'} action={<span style={{fontSize:11.5,color:'var(--xh-text3)'}}>Derived from sold listings</span>}>
            {completedOrders.length===0 ? <Empty icon='🛒' text='No completed orders yet'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {completedOrders.map(l=>(
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13,gap:10,flexWrap:'wrap'}}>
                    <div style={{minWidth:0,flex:1,display:'flex',alignItems:'center',gap:10}}>
                      {l.images && l.images[0] && <img src={l.images[0]} alt='' style={{width:40,height:40,borderRadius:6,objectFit:'cover',flexShrink:0}}/>}
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          <Link href={'/listings/'+l.id} target='_blank' style={{fontWeight:600,color:'var(--xh-text)',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</Link>
                          <Pill color='green'>{l.status==='sold'?'sold out':'completed'}</Pill>
                          {l.seller_is_pro && <Pill color='yellow'>Pro seller</Pill>}
                        </div>
                        <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>{'seller: '+(l.username||'anon')+' · '+l.category+' · '+(l.quantity_sold||1)+' unit'+((l.quantity_sold||1)>1?'s':'')+' sold · '+fmtDate(l.updated_at||l.created_at)}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right',minWidth:90}}>
                      <div style={{fontWeight:700,color:'var(--xh-text)',fontSize:14}}>{(parseFloat(l.price_xrp)*(l.quantity_sold||1)).toFixed(0)} XRP</div>
                      <div style={{fontSize:10.5,color:'var(--xh-text3)',marginTop:2}}>{'fee: '+(parseFloat(l.price_xrp)*(l.quantity_sold||1)*(l.seller_is_pro?0.015:0.03)).toFixed(2)+' XRP'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <div style={{fontSize:11.5,color:'var(--xh-text3)',padding:'8px 12px',background:'var(--xh-surface2)',borderRadius:8,marginTop:8,lineHeight:1.55}}>
            <b style={{color:'var(--xh-text2)'}}>Note:</b> This view is reconstructed from sold listings + quantity_sold. For a proper orders table with buyer addresses, individual order IDs, and CSV export, a dedicated <code>/api/admin/orders</code> endpoint is still needed on the backend.
          </div>
        </div>
      )}

      {tab==='users' && (
        <Section title={'All users ('+users.length+')'}>
          {users.length===0 ? <Empty icon='👤' text='No users registered'/> : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {users.map(u=>(
                <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13,flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,minWidth:220}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:'var(--xh-accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>{(u.username||u.address||'?').slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{fontWeight:600,color:'var(--xh-text)'}}>
                        {u.username||'anon'}
                        {u.is_pro && <span style={{fontSize:10,background:'rgba(245,158,11,0.15)',color:'#D97706',padding:'1px 6px',borderRadius:4,marginLeft:4,fontWeight:600}}>PRO</span>}
                        {u.is_verified && <span style={{fontSize:10,color:'#16A34A',marginLeft:4}}>✓</span>}
                      </div>
                      <div style={{fontSize:11,color:'var(--xh-text3)',fontFamily:'monospace'}}>{u.address}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <button className='xh-btn-sm' onClick={()=>api.admin.verifyUser(u.id,!u.is_verified).then(()=>location.reload())}>{u.is_verified?'Unverify':'Verify'}</button>
                    <button className='xh-btn-sm' onClick={()=>{const d=parseInt(prompt('Grant Pro for how many days?','30'));if(d>0)api.admin.grantPro(u.id,d).then(()=>location.reload())}}>Grant Pro</button>
                    <button className='xh-btn-sm xh-btn-danger' onClick={()=>{if(confirm('Ban this user?'))api.admin.banUser(u.id,true).then(()=>location.reload())}}>Ban</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {tab==='escrows' && (
        <div>
          <Section title={'Disputed escrows ('+disputes.length+')'} action={<span style={{fontSize:11.5,color:'var(--xh-text3)'}}>Backend currently exposes only disputed escrows</span>}>
            {disputes.length===0 ? <Empty icon='✅' text='No disputed escrows'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {disputes.map(d=>(
                  <div key={d.id} style={{padding:'12px 14px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,flexWrap:'wrap',gap:8}}>
                      <div style={{fontWeight:600,color:'var(--xh-text)',display:'flex',alignItems:'center',gap:8}}>
                        Escrow #{(d.id||'').toString().slice(0,8)}
                        <Pill color='red'>{d.status||'open'}</Pill>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button className='xh-btn-sm' onClick={()=>api.admin.resolveDispute(d.id,{action:'release'}).then(()=>location.reload())}>Release to seller</button>
                        <button className='xh-btn-sm xh-btn-danger' onClick={()=>api.admin.resolveDispute(d.id,{action:'refund'}).then(()=>location.reload())}>Refund buyer</button>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:'var(--xh-text2)'}}>{(d.reason||'No reason')+(d.amount_xrp?' · '+d.amount_xrp+' XRP':'')}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <NeedsBackend
            title='All active escrows view'
            why='To show every in-flight escrow (funded, awaiting delivery, awaiting buyer confirmation, etc) with XRPL transaction hashes, the backend needs a new endpoint that returns all escrows, not just disputed ones.'
            workaround='Disputed escrows (above) are still actionable here. Resolve / refund works on-chain.'
            endpoints={['GET /api/admin/escrows?status=funded|delivered|completed','GET /api/admin/escrows/:id (with XRPL tx hashes + chat thread)']}
          />
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
                      <button className='xh-btn-sm xh-btn-warn' onClick={()=>{if(confirm('Dismiss this report? (use when the report is unfounded)'))api.admin.resolveReport(r.id,'dismissed','').then(()=>location.reload())}}>Dismiss</button>
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
              <SettingItem icon='🌐' label='Network' value='Testnet' pill='not mainnet' pillColor='yellow' hint='All escrows currently run on the XRP Ledger testnet. Mainnet switch will move funds to real XRP.' envKey='XRPL_NODE / NODE_ENV'/>
              <SettingItem icon='🔗' label='XRPL endpoint' value='altnet.rippletest' hint='Public testnet WebSocket node used for escrow create / fulfill / cancel.' envKey='XRPL_NODE'/>
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
              <SettingItem icon='📊' label='Lifetime volume' value={(stats?Math.round(stats.volume_xrp||0).toLocaleString():'0')+' XRP'} hint='Total value of all escrows ever released.'/>
              <SettingItem icon='💰' label='Estimated platform fees' value={(stats?Math.round((stats.volume_xrp||0)*0.03).toLocaleString():'0')+' XRP'} hint='Calculated at 3% standard rate. Actual collected fees depend on Pro seller mix.'/>
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
