'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { sanitizeImageUrl } from '../../lib/sanitizeUrl';
import {
  CURATED_AVATARS,
  PRO_LIVE_AVATARS,
  PRO_FRAME_STYLES,
  isAnimatedImage,
  uploadAvatarOrLogoFile,
} from '../../lib/avatars';

const PREF_LABELS = {
  new_order: 'Someone buys your listing',
  order_completed: 'Escrow released / payment received',
  dispute_opened: 'A dispute is opened on your order',
  dispute_resolved: 'Admin resolves a dispute',
  new_review: 'Buyer leaves you a review',
};

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFrame, setAvatarFrame] = useState('gold');
  const [prefs, setPrefs] = useState({
    new_order: true,
    order_completed: true,
    dispute_opened: true,
    dispute_resolved: true,
    new_review: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const isPro = Boolean(
    user &&
      ((user.proUntil && new Date(user.proUntil) > new Date()) ||
        (user.pro_until && new Date(user.pro_until) > new Date()) ||
        user.store_handle ||
        user.role === 'admin')
  );

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setUsername(user.username || '');
    setBio(user.bio || '');
    setAvatarUrl(user.avatar_url || '');
    const savedFrame =
      (user.notification_prefs && user.notification_prefs.avatar_frame) ||
      user.avatar_frame ||
      (isPro ? 'gold' : 'none');
    setAvatarFrame(savedFrame);
    if (user.notification_prefs && typeof user.notification_prefs === 'object') {
      setPrefs((p) => ({ ...p, ...user.notification_prefs }));
    }
  }, [user, isPro, router]);

  if (!user) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const uploadedUrl = await uploadAvatarOrLogoFile(file, isPro);
      setAvatarUrl(uploadedUrl);
    } catch (err) {
      setError(err.message || 'Could not upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);
    if (isAnimatedImage(avatarUrl) && !isPro) {
      setError('Animated GIF & Live Avatars are an exclusive PRO membership perk. Upgrade to Pro to unlock!');
      return;
    }
    setSaving(true);
    try {
      const nextPrefs = {
        ...prefs,
        avatar_frame: isPro ? avatarFrame : 'none',
      };
      const updated = await api.users.update({
        username,
        bio,
        avatar_url: avatarUrl,
        notification_prefs: nextPrefs,
        avatar_frame: isPro ? avatarFrame : 'none',
      });
      setUser({ ...user, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const safePreviewAvatar = sanitizeImageUrl(avatarUrl);
  const showAnimatedRing = isPro && avatarFrame && avatarFrame !== 'none';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Profile Settings</h1>
        {isPro && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', padding: '5px 12px', borderRadius: 999 }}>
            <span className="xh-pro" style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>PRO</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Animated GIFs & Orbit Frames Unlocked</span>
          </div>
        )}
      </div>

      {/* Avatar & Frame Card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Avatar & Animated Frame</div>

        {/* Live Avatar Preview Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20, padding: 16, background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div
            className={showAnimatedRing ? `xh-pro-ring frame-${avatarFrame}` : ''}
            style={{
              borderRadius: '50%',
              flexShrink: 0,
              ...(showAnimatedRing ? {} : { padding: 3, border: isPro ? '2px solid #f59e0b' : '2px solid var(--border2)' }),
            }}
          >
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', overflow: 'hidden' }}>
              {safePreviewAvatar ? (
                <img src={safePreviewAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                username ? username.slice(0, 2).toUpperCase() : '??'
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{username || 'Trader'}</span>
              {isPro && <span className="xh-pro" style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>PRO</span>}
              {isAnimatedImage(avatarUrl) && (
                <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fontWeight: 700, background: 'rgba(32,128,245,0.14)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 5 }}>
                  ⚡ LIVE / GIF
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
              {isPro
                ? 'PRO active: Upload any animated .GIF, pick a Live Orbit avatar, or customize your glowing 360° frame.'
                : 'Choose a curated Web3 avatar below, upload a PNG/JPG, or upgrade to PRO for animated .GIFs & frames.'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept={isPro ? 'image/gif,image/png,image/jpeg,image/webp' : 'image/png,image/jpeg,image/webp'}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploading}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer' }}
              >
                {uploading ? 'Uploading...' : isPro ? '📤 Upload Animated .GIF / Image' : '📤 Upload Photo (PNG/JPG)'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
                >
                  Reset to Initials
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Curated Web3 / Cyber / Pixel-Art Presets */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Curated Web3 & Cyber Avatars
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 10, marginBottom: 20 }}>
          {CURATED_AVATARS.map((item) => {
            const active = avatarUrl === item.url;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAvatarUrl(item.url)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 6px',
                  borderRadius: 12,
                  border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'rgba(32,128,245,0.08)' : 'var(--surface2)',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <img src={item.url} alt={item.label} style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* PRO Exclusive: Animated Live Avatars */}
        <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(32,128,245,0.06))', border: '1px solid rgba(245,158,11,0.32)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="xh-pro" style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>PRO</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Animated Live Avatars & .GIF Support</span>
            </div>
            {!isPro && (
              <Link href="/pro" style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textDecoration: 'none' }}>
                Unlock with Pro →
              </Link>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 10, marginBottom: 16 }}>
            {PRO_LIVE_AVATARS.map((item) => {
              const active = avatarUrl === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      setError('Animated Live Avatars require a PRO membership. Upgrade to Pro to equip!');
                      return;
                    }
                    setError('');
                    setAvatarUrl(item.url);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px',
                    borderRadius: 12,
                    border: active ? '2px solid #f59e0b' : '1px solid var(--border)',
                    background: active ? 'rgba(245,158,11,0.14)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    opacity: isPro ? 1 : 0.78,
                  }}
                >
                  <img src={item.url} alt={item.label} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontFamily: 'DM Mono,monospace', fontWeight: 800, color: '#d97706', marginBottom: 2 }}>● {item.tag}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>{item.label}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* PRO Animated Frame Selector */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Animated 360° Avatar Frame Style
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {PRO_FRAME_STYLES.map((fr) => {
              const active = avatarFrame === fr.id;
              return (
                <button
                  key={fr.id}
                  type="button"
                  onClick={() => {
                    if (!isPro && fr.id !== 'none') {
                      setError('Animated 360° Avatar Frames require a PRO membership.');
                      return;
                    }
                    setError('');
                    setAvatarFrame(fr.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '9px 11px',
                    borderRadius: 10,
                    border: active ? '2px solid #f59e0b' : '1px solid var(--border)',
                    background: active ? 'rgba(245,158,11,0.12)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: fr.previewGrad, flexShrink: 0, border: '2px solid rgba(255,255,255,0.6)' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>{fr.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fr.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Image / GIF URL Input */}
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
          Or paste a custom image {isPro ? 'or animated .GIF ' : ''}URL:
        </div>
        <input
          value={avatarUrl && avatarUrl.startsWith('data:') ? '' : avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder={isPro ? 'https://media.giphy.com/.../avatar.gif or https://...' : 'https://...'}
          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>

      {/* Profile Info */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Profile Info</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={280} placeholder="Tell buyers a bit about yourself..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', marginTop: 4 }}>{bio.length}/280</div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Notifications</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(PREF_LABELS).map(([k, label]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
              <span>{label}</span>
              <input type="checkbox" checked={!!prefs[k]} onChange={(e) => setPrefs((p) => ({ ...p, [k]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 14 }}>
          {error}
        </div>
      )}
      {saved && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#34d399', marginBottom: 14 }}>
          ✓ Changes saved
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
