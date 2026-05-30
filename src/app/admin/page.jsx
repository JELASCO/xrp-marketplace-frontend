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
    ]).then(([s,d,u,l])=>{
      setStats(s);
      setDisputes(Array.isArray(d)?d:[]);
      setUsers(Array.isArray(u)?u:[]);
      setListings(Array.isArray(l)?l:[]);
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

          <Section title={'Recent listings ('+listings.length+')'} action={<button className='xh-tab' onClick={()=>setTab('listings')} style={{padding:'4px 10px',fontSize:12}}>Manage →</button>}>
            {listings.length===0 ? <Empty icon='📜' text='No listings yet'/> : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {listings.slice(0,5).map(l=>(
                  <div key={l.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--xh-surface2)',borderRadius:8,fontSize:13,gap:8}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontWeight:600,color:'var(--xh-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
                      <div style={{fontSize:11,color:'var(--xh-text3)',marginTop:2}}>{(l.username||'anon')+' · '+l.price_xrp+' XRP · '+l.category}</div>
                    </div>
                    <Pill color={l.status==='active'?'green':l.status==='sold'?'blue':'gray'}>{l.status}</Pill>
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

      {tab==='orders' && (
        <NeedsBackend
          title='Order history'
          why='Orders (completed trades) need their own collection on the backend so admins can search, filter, export CSV, and audit historical activity. Right now only escrows + listings are queryable, and there is no joined view of buyer + seller + amount + time.'
          workaround='Listings tab shows sold listings (which represent completed orders) as a stopgap.'
          endpoints={['GET /api/admin/orders?status=completed|refunded|disputed','GET /api/admin/orders/export.csv','GET /api/admin/orders/:id']}
        />
      )}

      {tab==='reports' && (
        <NeedsBackend
          title='Abuse reports & moderation queue'
          why='There is no abuse report system yet. Users currently have no way to flag a listing or a seller, so there is nothing for admins to review.'
          workaround='Use the Users tab to ban bad actors directly, and Listings tab to remove problem listings.'
          endpoints={['POST /api/reports (user-facing flag endpoint)','GET /api/admin/reports?status=pending','PATCH /api/admin/reports/:id/resolve']}
        />
      )}

      {tab==='settings' && (
        <NeedsBackend
          title='Platform settings'
          why='Settings like fee percentages, escrow auto-release window, testnet/mainnet toggle, and platform wallet address are currently hardcoded in env vars. Moving them to a database table + admin endpoint would let you change them live without a redeploy.'
          workaround='Fees and network are configured via Railway environment variables. Edit them there and redeploy.'
          endpoints={['GET /api/admin/settings','PATCH /api/admin/settings (fee_pct, pro_fee_pct, auto_release_hours, xrpl_network)']}
        />
      )}

      {loading && <div style={{textAlign:'center',padding:20,color:'var(--xh-text3)',fontSize:13}}>Loading…</div>}
    </div>
  );
}
