'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';
 
const AVATAR_STYLES = ['avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah', 'notionists', 'personas', 'pixel-art'];
const AVATAR_SEEDS = ['Felix', 'Aneka', 'Mittens', 'Zoe', 'Kira', 'Max', 'Luna', 'Buddy'];
const NOTIF_TYPES = [
  { key: 'new_order', label: 'New orders', desc: 'When someone buys your listing' },
  { key: 'order_completed', label: 'Order completed', desc: 'When an order is fulfilled' },
  { key: 'dispute_opened', label: 'Disputes opened', desc: 'When a dispute is filed against you' },
  { key: 'dispute_resolved', label: 'Disputes resolved', desc: 'When admin resolves a dispute' },
  { key: 'new_review', label: 'New reviews', desc: 'When a buyer leaves a review' }
];


function buildAvatarUrl(style, seed) {
  return 'https://api.dicebear.com/7.x/' + style + '/svg?seed=' + seed;
}

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const fetchMe = useAuthStore(s => s.fetchMe);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [prefs, setPrefs] = useState({ new_order:true, order_completed:true, dispute_opened:true, dispute_resolved:true, new_review:true });

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    setUsername(user.username || '');
    setBio(user.bio || '');
    setAvatarUrl(user.avatar_url || user.avatarUrl || '');
    if (user.notification_prefs && typeof user.notification_prefs === 'object') {
      setPrefs(p => ({ ...p, ...user.notification_prefs }));
    }
  }, [user, loading]);

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    if (!username.trim()) { setError('Username required'); return; }
    setSaving(true);
    try {
      await api.users.update({ username: username.trim(), bio: bio.trim() || null, avatar_url: avatarUrl.trim() || null, notification_prefs: prefs });
      setSuccess(true);
      if (fetchMe) await fetchMe();
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!user) return null;

  const avatars = AVATAR_STYLES.map((style, i) => buildAvatarUrl(style, AVATAR_SEEDS[i] || 'User'));

  return (
    <div style={{maxWidth:520,margin:'40px auto',padding:'20px'}}>
      <h1 style={{color:'#e8eaf0',marginBottom:24,fontSize:28}}>Settings</h1>
      <div style={{display:'flex',flexDirection:'column',gap:20}}>

        <div>
          <label style={{color:'#8892a4',fontSize:12,display:'block',marginBottom:8,letterSpacing:1}}>USERNAME</label>
          <input value={username} onChange={e => setUsername(e.target.value)} style={{width:'100%',background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px',color:'#e8eaf0',fontSize:14,boxSizing:'border-box'}} />
        </div>

        <div>
          <label style={{color:'#8892a4',fontSize:12,display:'block',marginBottom:8,letterSpacing:1}}>BIO</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell others about yourself..." style={{width:'100%',background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px',color:'#e8eaf0',fontSize:14,boxSizing:'border-box',resize:'vertical',fontFamily:'inherit'}} />
        </div>

        <div>
          <label style={{color:'#8892a4',fontSize:12,display:'block',marginBottom:8,letterSpacing:1}}>PICK AN AVATAR</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:10,marginBottom:12}}>
            {avatars.map((url, i) => {
              const isSelected = avatarUrl === url;
              return (
                <button key={i} type="button" onClick={() => setAvatarUrl(url)} style={{background:'#0a0e1a',border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:8,cursor:'pointer',transition:'all 0.15s',aspectRatio:'1'}}>
                  <img src={url} alt="avatar" style={{width:'100%',height:'100%',borderRadius:8,display:'block'}} />
                </button>
              );
            })}
          </div>
          <label style={{color:'#8892a4',fontSize:11,display:'block',marginBottom:6}}>OR ENTER A CUSTOM URL</label>
          <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." style={{width:'100%',background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px',color:'#e8eaf0',fontSize:13,boxSizing:'border-box'}} />
        </div>

        
        <div>
          <label style={{color:'#8892a4',fontSize:12,display:'block',marginBottom:8,letterSpacing:1}}>NOTIFICATIONS</label>
          <div style={{background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden'}}>
            {NOTIF_TYPES.map((nt, i) => (
              <label key={nt.key} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom: i < NOTIF_TYPES.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',cursor:'pointer'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:'#e8eaf0',fontWeight:500}}>{nt.label}</div>
                  <div style={{fontSize:11,color:'#4a5568',marginTop:2}}>{nt.desc}</div>
                </div>
                <input type="checkbox" checked={prefs[nt.key] !== false} onChange={e => setPrefs(p => ({ ...p, [nt.key]: e.target.checked }))} style={{width:18,height:18,accentColor:'#3b82f6',cursor:'pointer',flexShrink:0}}/>
              </label>
            ))}
          </div>
        </div>
        {error && <div style={{color:'#f87171',fontSize:13,padding:'8px 12px',background:'rgba(248,113,113,0.1)',borderRadius:6}}>{error}</div>}
        {success && <div style={{color:'#34d399',fontSize:13,padding:'8px 12px',background:'rgba(52,211,153,0.1)',borderRadius:6}}>Saved successfully!</div>}

        <button onClick={handleSave} disabled={saving} style={{background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,padding:'12px',fontSize:14,fontWeight:600,cursor: saving ? 'wait' : 'pointer',opacity: saving ? 0.6 : 1}}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
