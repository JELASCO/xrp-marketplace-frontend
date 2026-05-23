'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../lib/store';
import { api } from '../../../../lib/api';

const TITLE_MAX = 120;
const DESC_MAX = 2000;

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);
  const [title, setTitle] = useState('');
  const [priceXrp, setPriceXrp] = useState('');
  const [description, setDescription] = useState('');
  const [isDigital, setIsDigital] = useState(false);
  const [digitalContent, setDigitalContent] = useState('');
  const [digitalLink, setDigitalLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [featureModal, setFeatureModal] = useState(null);
  const [featPricing, setFeatPricing] = useState(null);
  const [featVerifying, setFeatVerifying] = useState(false);

  useEffect(() => { api.upgrades.pricing().then(setFeatPricing).catch(() => {}); }, []);

  async function startFeature() {
    setError('');
    try {
      const r = await api.upgrades.payload('featured', id);
      if (r.uuid || r.qrUrl) setFeatureModal({ qrUrl: r.qrUrl, deepLink: r.deepLink, paymentId: r.paymentId, days: r.days });
      else setError(r.error || 'Could not start payment');
    } catch (e) { setError(e.message); }
  }

  async function verifyFeature() {
    if (!featureModal) return;
    setFeatVerifying(true); setError('');
    try {
      const r = await api.upgrades.verify(featureModal.paymentId);
      if (r.ok) { setFeatureModal(null); router.push('/listing/' + id); }
      else setError(r.error || 'Not verified yet');
    } catch (e) { setError(e.message); }
    setFeatVerifying(false);
  }

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push('/'); return; }
    api.listings.get(id).then(l => {
      if (l.seller_id !== user.id) { router.push('/listing/' + id); return; }
      setTitle(l.title || '');
      setPriceXrp(String(l.price_xrp || ''));
      setDescription(l.description || '');
      setIsDigital(!!l.is_digital);
      setDigitalContent(l.digital_content || '');
      setDigitalLink(l.digital_link || '');
    }).catch(() => router.push('/listing/' + id));
  }, [id, user, hydrated]);

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Title required'); return; }
    setSaving(true);
    try {
      await api.listings.update(id, { title: title.trim(), description: description.trim() || null, price_xrp: Number(priceXrp), isDigital, digitalContent: digitalContent || null, digitalLink: digitalLink || null });
      router.push('/listing/' + id);
    } catch (e) {
      setError(e.message || 'Failed to save');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError(''); setDeleting(true);
    try {
      await api.listings.remove(id);
      router.push('/profile/' + user.id);
    } catch (e) {
      setError(e.message || 'Failed to delete');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!hydrated) return null;
  if (!user) return null;

  return (
    <div style={{maxWidth:480,margin:'0 auto',padding:'20px'}}>
      <h1 style={{color:'var(--text)',marginBottom:24}}>Edit Listing</h1>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div>
          <label style={{color:'var(--text2)',fontSize:12,display:'block',marginBottom:4}}>TITLE</label>
          <input value={title} maxLength={TITLE_MAX+10} onChange={e=>{setTitle(e.target.value);setFieldErrors(fe=>({...fe,title:null}));}} style={{width:'100%',background:'var(--bg)',border:'1px solid '+(fieldErrors.title?'rgba(248,113,113,0.5)':'var(--border2)'),borderRadius:8,padding:'10px',color:'var(--text)',fontSize:14,boxSizing:'border-box'}} />
        {fieldErrors.title && <div style={{fontSize:11,color:'#f87171',marginTop:3}}>{fieldErrors.title}</div>}
        <div style={{textAlign:'right',fontSize:11,color:title.length>TITLE_MAX?'#f87171':'var(--text3)'}}>{title.length}/{TITLE_MAX}</div>
        </div>
        <div>
          <label style={{color:'var(--text2)',fontSize:12,display:'block',marginBottom:4}}>PRICE (XRP)</label>
          <input value={priceXrp} onChange={e=>{setPriceXrp(e.target.value);setFieldErrors(fe=>({...fe,priceXrp:null}));}} type='number' style={{width:'100%',background:'var(--bg)',border:'1px solid '+(fieldErrors.priceXrp?'rgba(248,113,113,0.5)':'var(--border2)'),borderRadius:8,padding:'10px',color:'var(--text)',fontSize:14,boxSizing:'border-box'}} />
        {fieldErrors.priceXrp && <div style={{fontSize:11,color:'#f87171',marginTop:3}}>{fieldErrors.priceXrp}</div>}
        </div>
        <div>
          <label style={{color:'var(--text2)',fontSize:12,display:'block',marginBottom:4}}>DESCRIPTION</label>
          <textarea value={description} maxLength={DESC_MAX+50} onChange={e=>{setDescription(e.target.value);setFieldErrors(fe=>({...fe,description:null}));}} rows={4} style={{width:'100%',background:'var(--bg)',border:'1px solid '+(fieldErrors.description?'rgba(248,113,113,0.5)':'var(--border2)'),borderRadius:8,padding:'10px',color:'var(--text)',fontSize:14,boxSizing:'border-box',resize:'vertical'}} />
        {fieldErrors.description && <div style={{fontSize:11,color:'#f87171',marginTop:3}}>{fieldErrors.description}</div>}
        <div style={{textAlign:'right',fontSize:11,color:description.length>DESC_MAX?'#f87171':'var(--text3)'}}>{description.length}/{DESC_MAX}</div>
        </div>
        <div style={{border:'1px solid var(--border)',borderRadius:10,padding:14,background:'var(--surface)'}}>
          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
            <input type="checkbox" checked={isDigital} onChange={e=>setIsDigital(e.target.checked)} style={{width:18,height:18,cursor:'pointer'}}/>
            <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Digital product — instant delivery</span>
          </label>
          {isDigital && (
            <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{color:'var(--text2)',fontSize:12,display:'block',marginBottom:4}}>DELIVERY CONTENT (key, login, code…)</label>
                <textarea value={digitalContent} onChange={e=>setDigitalContent(e.target.value)} rows={3} placeholder="e.g. Steam key: XXXXX-XXXXX-XXXXX" style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'10px',color:'var(--text)',fontSize:13,fontFamily:'monospace',boxSizing:'border-box',resize:'vertical'}} />
              </div>
              <div>
                <label style={{color:'var(--text2)',fontSize:12,display:'block',marginBottom:4}}>DOWNLOAD LINK (optional)</label>
                <input type="url" value={digitalLink} onChange={e=>setDigitalLink(e.target.value)} placeholder="https://..." style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'10px',color:'var(--text)',fontSize:14,boxSizing:'border-box'}} />
              </div>
            </div>
          )}
        </div>
        {error && <div style={{color:'#f87171',fontSize:13}}>{error}</div>}
        <button onClick={handleSave} disabled={saving} style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'12px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <div style={{borderTop:'1px solid var(--border)',marginTop:8,paddingTop:20}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',marginBottom:8}}>🔥 BOOST</div>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:10}}>Feature this listing to pin it to the top of the marketplace{featPricing ? ` for ${featPricing.featured.days} days (${featPricing.featured.xrp} XRP)` : ''}.</div>
          <button onClick={startFeature} style={{width:'100%',background:'rgba(245,158,11,0.12)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:8,padding:'11px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            Feature this listing
          </button>
        </div>

        <div style={{borderTop:'1px solid var(--border)',marginTop:8,paddingTop:20}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--text2)',marginBottom:8}}>DANGER ZONE</div>
          {!confirmDelete ? (
            <button onClick={()=>setConfirmDelete(true)} style={{width:'100%',background:'transparent',color:'#f87171',border:'1px solid rgba(248,113,113,0.4)',borderRadius:8,padding:'11px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Delete listing
            </button>
          ) : (
            <div style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:8,padding:14}}>
              <div style={{fontSize:13,color:'var(--text)',marginBottom:12}}>Permanently delete this listing? This cannot be undone.</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setConfirmDelete(false)} disabled={deleting} style={{flex:1,background:'var(--surface)',color:'var(--text2)',border:'1px solid var(--border2)',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
                <button onClick={handleDelete} disabled={deleting} style={{flex:1,background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:700,cursor:'pointer'}}>{deleting?'Deleting...':'Yes, delete'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {featureModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20,backdropFilter:'blur(4px)'}} onClick={e=>{if(e.target===e.currentTarget)setFeatureModal(null);}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,padding:28,maxWidth:360,width:'100%',textAlign:'center'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:4}}>Feature for {featureModal.days} days</div>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>Scan with Xumm to pay. Your listing jumps to the top right after.</div>
            {featureModal.qrUrl && <div style={{background:'#fff',padding:12,borderRadius:12,display:'inline-block',marginBottom:16}}><img src={featureModal.qrUrl} alt="QR" style={{width:192,height:192,display:'block'}}/></div>}
            {featureModal.deepLink && <a href={featureModal.deepLink} style={{display:'block',background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:600,marginBottom:12}}>Open in Xumm App</a>}
            <button onClick={verifyFeature} disabled={featVerifying} style={{width:'100%',background:featVerifying?'var(--surface2)':'rgba(245,158,11,0.12)',color:featVerifying?'var(--text3)':'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:8,padding:'11px',fontSize:13,fontWeight:600,cursor:featVerifying?'default':'pointer'}}>{featVerifying?'Checking…':"I've paid — activate"}</button>
            <button onClick={()=>setFeatureModal(null)} style={{width:'100%',marginTop:8,background:'none',border:'none',color:'var(--text3)',fontSize:12,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
