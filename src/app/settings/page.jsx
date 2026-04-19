'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const setAuth = useAuthStore(s => s.setAuth);
  const token = useAuthStore(s => s.token);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    setUsername(user.username || '');
    setBio(user.bio || '');
    setAvatarUrl(user.avatar_url || '');
  }, [user, loading]);

  const handleSave = async () => {
    setError(''); setSuccess(false);
    if (!username.trim()) { setError('Username cannot be empty'); return; }
    setSaving(true);
    try {
      const updated = await api.users.update({ username: username.trim(), bio: bio.trim(), avatar_url: avatarUrl.trim() || null });
      setAuth(token, { ...user, username: updated.username, bio: updated.bio, avatar_url: updated.avatar_url });
      setSuccess(true);
      setTimeout(() => router.push('/profile/' + user.id), 1000);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'40vh'}}><div style={{width:32,height:32,border:'2px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;
  if (!user) return null;
  const initials = username ? username.slice(0,2).toUpperCase() : '??';
  return (
    <div style={{maxWidth:480,margin:'0 auto'}}>
      <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
        <button onClick={() => router.push('/profile/' + user.id)} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:20,padding:0}}>&#8592;</button>
        <h1 style={{fontSize:20,fontWeight:700,color:'#e8eaf0',margin:0}}>Edit Profile</h1>
      </div>
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:28,display:'flex',flexDirection:'column',gap:24}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <div style={{width:80,height:80,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'#fff'}}>
            {avatarUrl.trim() ? <img src={avatarUrl.trim()} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}}/> : initials}
          </div>
          <div style={{fontSize:12,color:'#4a5568'}}>Paste an image URL below to set your photo</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={{fontSize:12,fontWeight:600,color:'#8892a4',letterSpacing:'0.05em',textTransform:'uppercase'}}>Photo URL</label>
          <input value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://example.com/photo.jpg" style={{background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 12px',color:'#e8eaf0',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={{fontSize:12,fontWeight:600,color:'#8892a4',letterSpacing:'0.05em',textTransform:'uppercase'}}>Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} maxLength={40} placeholder="your_username" style={{background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 12px',color:'#e8eaf0',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={{fontSize:12,fontWeight:600,color:'#8892a4',letterSpacing:'0.05em',textTransform:'uppercase'}}>Bio</label>
          <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} maxLength={300} placeholder="Tell people about yourself..." style={{background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'10px 12px',color:'#e8eaf0',fontSize:14,fontFamily:'inherit',outline:'none',resize:'vertical'}}/>
          <div style={{fontSize:11,color:'#4a5568',textAlign:'right'}}>{bio.length}/300</div>
        </div>
        {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'10px 14px',color:'#f87171',fontSize:13}}>{error}</div>}
        {success && <div style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'10px 14px',color:'#34d399',fontSize:13}}>Saved! Redirecting...</div>}
        <button onClick={handleSave} disabled={saving} style={{background:saving?'#1a2030':'#3b82f6',color:saving?'#4a5568':'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:600,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
