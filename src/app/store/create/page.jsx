'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../../lib/store';

export default function CreateStorePage() {
  const { user } = useAuthStore(s => s);
  const [storeName, setStoreName] = useState('');
  const [handle, setHandle] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [autoEscrow, setAutoEscrow] = useState(true);
  const [requireScreenshot, setRequireScreenshot] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [responseTime, setResponseTime] = useState('Within 4 hours');
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [destTag, setDestTag] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);

  const categories = ['CS2','Valorant','Fortnite','Dota 2','Rocket League','WoW','LoL','Apex Legends','Minecraft','Physical'];
  const toggleCat = cat => setSelectedCats(prev => prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev,cat]);
  const initials = storeName ? storeName.substring(0,2).toUpperCase() : 'RV';

  const sty = {
    wrap: { maxWidth:1280, margin:'0 auto', padding:'40px 24px 120px' },
    back: { display:'inline-flex', alignItems:'center', gap:6, color:'var(--text2)', textDecoration:'none', fontSize:14, marginBottom:24 },
    eyebrow: { fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text2)', marginBottom:6 },
    h1: { fontSize:28, fontWeight:700, letterSpacing:'-0.4px', color:'var(--text)', marginBottom:8 },
    sub: { fontSize:15, color:'var(--text2)', maxWidth:560, marginBottom:32 },
    grid: { display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:40, alignItems:'start' },
    sec: { background:'var(--bg)', border:'1px solid var(--border2)', borderRadius:16, padding:24, marginBottom:16 },
    secTitle: { fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:2 },
    secDesc: { fontSize:13, color:'var(--text2)', marginBottom:16 },
    lbl: { display:'block', fontSize:13, fontWeight:600, marginBottom:6, color:'var(--text)' },
    hint: { fontSize:12, color:'var(--text2)', marginTop:6 },
    inp: { width:'100%', padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--border2)', borderRadius:10, fontSize:14, color:'var(--text)', minHeight:44, fontFamily:'inherit' },
    ta: { width:'100%', padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--border2)', borderRadius:10, fontSize:14, color:'var(--text)', minHeight:96, resize:'vertical', lineHeight:1.5, fontFamily:'inherit' },
    sel: { width:'100%', padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--border2)', borderRadius:10, fontSize:14, color:'var(--text)', minHeight:44, fontFamily:'inherit' },
    prefWrap: { display:'flex', alignItems:'stretch', border:'1px solid var(--border2)', borderRadius:10, overflow:'hidden' },
    prefLabel: { padding:'0 12px', fontSize:13, color:'var(--text2)', background:'var(--surface)', borderRight:'1px solid var(--border2)', display:'flex', alignItems:'center', fontFamily:'monospace' },
    prefInp: { border:'none', flex:1, padding:'10px 12px', minHeight:44, fontSize:14, fontFamily:'inherit', outline:'none', color:'var(--text)', background:'var(--bg)' },
    togRow: { display:'flex', alignItems:'flex-start', gap:12, padding:'14px 0', borderBottom:'1px solid var(--border)' },
    togTitle: { fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:2 },
    togDesc: { fontSize:12.5, color:'var(--text2)', lineHeight:1.5 },
    preWrap: { position:'sticky', top:80 },
    preLbl: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text2)', marginBottom:12 },
    preCard: { background:'var(--bg)', border:'1px solid var(--border2)', borderRadius:16, overflow:'hidden' },
    preBanner: { aspectRatio:'3/1', background:'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
    preBody: { padding:'0 16px 16px', position:'relative' },
    preLogo: { width:64, height:64, borderRadius:12, background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, border:'3px solid var(--bg)', position:'relative', marginTop:-28, boxShadow:'0 2px 6px rgba(0,0,0,0.08)' },
    preName: { fontSize:18, fontWeight:700, marginTop:12, color:'var(--text)' },
    preTag: { fontSize:13, color:'var(--text2)', marginTop:2 },
    preStats: { display:'flex', gap:16, padding:'10px 0', marginTop:10, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', fontSize:12, color:'var(--text2)' },
    preAbout: { paddingTop:10, fontSize:13, color:'var(--text)', lineHeight:1.6 },
    preNote: { fontSize:12, color:'var(--text2)', marginTop:12, textAlign:'center', lineHeight:1.5 },
    bar: { position:'fixed', bottom:0, left:0, right:0, background:'var(--bg)', borderTop:'1px solid var(--border2)', zIndex:40 },
    barInner: { maxWidth:1280, margin:'0 auto', padding:'12px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' },
    barInfo: { fontSize:13, color:'var(--text2)', display:'inline-flex', alignItems:'center', gap:6 },
    btnSec: { background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border2)', padding:'10px 18px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit', minHeight:44 },
    btnPri: { background:'var(--accent)', color:'#fff', border:'none', padding:'10px 22px', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', minHeight:44 },
  };

  return (
    <div>
      <div style={sty.wrap}>
        <Link href="/dashboard" style={sty.back}>← Back to dashboard</Link>
        <div style={{marginBottom:32}}>
          <div style={sty.eyebrow}>Seller setup</div>
          <h1 style={sty.h1}>Create your store</h1>
          <p style={sty.sub}>Set up a storefront buyers can discover and follow. Everything here is editable later — nothing is locked in until your first listing sells.</p>
        </div>
        <div style={sty.grid}>
          <form>
            <section style={sty.sec}>
              <div style={sty.secTitle}>Store identity</div>
              <div style={{...sty.secDesc}}>How your store appears on XRPHarbor.</div>
              <div style={{marginBottom:16}}><label style={sty.lbl}>Store name</label><input style={sty.inp} type="text" value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="e.g. Ripple Vault" maxLength={40}/><div style={sty.hint}>Max 40 characters.</div></div>
              <div style={{marginBottom:16}}><label style={sty.lbl}>Handle</label><div style={sty.prefWrap}><span style={sty.prefLabel}>xrpharbor.com/@</span><input style={sty.prefInp} type="text" value={handle} onChange={e=>setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="ripple_vault" maxLength={24}/></div><div style={sty.hint}>Cannot be changed after first sale.</div></div>
              <div style={{marginBottom:16}}><label style={sty.lbl}>Store logo</label><div style={{display:'flex',gap:16,alignItems:'center'}}><div style={{width:72,height:72,borderRadius:10,background:'var(--surface)',border:'1.5px dashed var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>⬆</div><button type="button" style={{...sty.btnSec,minHeight:36,padding:'8px 14px',fontSize:13}}>Upload logo</button></div></div>
              <div><label style={sty.lbl}>Banner</label><div style={{aspectRatio:'3/1',background:'var(--surface)',border:'1.5px dashed var(--border2)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:4,color:'var(--text2)',cursor:'pointer'}}><span style={{fontSize:20}}>🖼</span><span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>Click to upload banner</span><span style={{fontSize:11}}>1500 × 500px · max 5 MB</span></div></div>
            </section>
            <section style={sty.sec}>
              <div style={sty.secTitle}>Store profile</div>
              <div style={sty.secDesc}>Help buyers understand who you are and what you sell.</div>
              <div style={{marginBottom:16}}><label style={sty.lbl}>Categories</label><div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>{categories.map(cat=>(<button key={cat} type="button" onClick={()=>toggleCat(cat)} style={{padding:'7px 13px',background:selectedCats.includes(cat)?'var(--text)':'var(--bg)',border:`1px solid ${selectedCats.includes(cat)?'var(--text)':'var(--border2)'}`,borderRadius:999,fontSize:13,fontWeight:500,color:selectedCats.includes(cat)?'#fff':'var(--text)',cursor:'pointer',fontFamily:'inherit'}}>{cat}</button>))}</div><div style={sty.hint}>Select all that apply.</div></div>
              <div style={{marginBottom:16}}><label style={sty.lbl}>Tagline</label><input style={sty.inp} type="text" value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="CS2 knives, escrowed in XRP." maxLength={80}/><div style={sty.hint}>Max 80 characters.</div></div>
              <div><label style={sty.lbl}>About</label><textarea style={sty.ta} value={about} onChange={e=>setAbout(e.target.value)} placeholder="Tell buyers about your store..."/></div>
            </section>
            <section style={sty.sec}>
              <div style={sty.secTitle}>Policies & commitments</div>
              <div style={sty.secDesc}>What buyers can count on.</div>
              {[{val:autoEscrow,set:setAutoEscrow,title:'Auto-accept escrow offers',desc:'Buyer commits → funds lock in escrow without you confirming first.'},{val:requireScreenshot,set:setRequireScreenshot,title:'Require Steam-profile screenshot',desc:'Adds a verified-source badge to your items.'},{val:vacationMode,set:setVacationMode,title:'Vacation mode',desc:"Hide your listings without removing them."}].map((item,i,arr)=>(<div key={i} style={{...sty.togRow,borderBottom:i<arr.length-1?'1px solid var(--border)':'none',paddingBottom:i<arr.length-1?14:0}}><div style={{flex:1}}><div style={sty.togTitle}>{item.title}</div><div style={sty.togDesc}>{item.desc}</div></div><div onClick={()=>item.set(!item.val)} style={{position:'relative',width:40,height:24,borderRadius:999,background:item.val?'var(--accent)':'var(--border2)',cursor:'pointer',flexShrink:0,transition:'background 0.15s'}}><div style={{position:'absolute',top:2,left:item.val?18:2,width:20,height:20,background:'#fff',borderRadius:'50%',transition:'left 0.15s',boxShadow:'0 1px 2px rgba(0,0,0,0.15)'}}/></div></div>))}
              <div style={{marginTop:16}}><label style={sty.lbl}>Response-time commitment</label><select style={sty.sel} value={responseTime} onChange={e=>setResponseTime(e.target.value)}><option>Within 4 hours (business hours)</option><option>Within 12 hours</option><option>Within 24 hours</option><option>Within 48 hours</option></select><div style={sty.hint}>Shown publicly on your listings.</div></div>
            </section>
            <section style={{...sty.sec,marginBottom:0}}>
              <div style={sty.secTitle}>Payout</div>
              <div style={sty.secDesc}>Where escrowed XRP settles when a buyer confirms delivery.</div>
              <div style={{marginBottom:16}}><label style={sty.lbl}>XRP Ledger address</label><input style={{...sty.inp,fontFamily:'monospace',fontSize:13}} type="text" value={walletAddress} onChange={e=>setWalletAddress(e.target.value)} placeholder="r..."/><div style={sty.hint}>Public r-address only. Never paste your secret key.</div></div>
              <div><label style={sty.lbl}>Destination tag <span style={{color:'var(--text2)',fontWeight:500}}>(optional)</span></label><input style={{...sty.inp,fontFamily:'monospace',fontSize:13}} type="text" value={destTag} onChange={e=>setDestTag(e.target.value)} placeholder="e.g. 4827"/><div style={sty.hint}>Required if your wallet is hosted on an exchange.</div></div>
            </section>
          </form>
          <aside style={sty.preWrap}>
            <div style={sty.preLbl}>👁️ What buyers will see</div>
            <div style={sty.preCard}>
              <div style={sty.preBanner}/>
              <div style={sty.preBody}>
                <div style={sty.preLogo}>{initials}</div>
                <div style={sty.preName}>{storeName||'Your store name'}</div>
                <div style={sty.preTag}>{tagline||'Your tagline will appear here.'}</div>
                <div style={sty.preStats}><span><strong>0</strong> sales</span><span><strong>New</strong> store</span><span><strong>{responseTime.split(' ').slice(1,3).join(' ')}</strong></span></div>
                <div style={sty.preAbout}>{about?about.substring(0,120)+(about.length>120?'…':''):'Your about section will appear here.'}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}><button style={{background:'var(--text)',color:'#fff',border:'none',padding:9,borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Follow store</button><button style={{background:'var(--bg)',color:'var(--text)',border:'1px solid var(--border2)',padding:9,borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Message</button></div>
              </div>
            </div>
            <p style={sty.preNote}>Listings appear once you publish your first item.</p>
          </aside>
        </div>
      </div>
      <div style={sty.bar}>
        <div style={sty.barInner}>
          <div style={sty.barInfo}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block'}}/><strong>Draft saved</strong> · a few seconds ago</div>
          <div style={{display:'flex',gap:8}}><button style={sty.btnSec} type="button">Preview live</button><button style={sty.btnPri} type="button">Publish store</button></div>
        </div>
      </div>
    </div>
  );
}
