'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CAT_BG = {
  games:    'linear-gradient(135deg,#dbeafe,#eff6ff)',
  graphics: 'linear-gradient(135deg,#ede9fe,#faf5ff)',
  software: 'linear-gradient(135deg,#ccfbf1,#f0fdfa)',
  accounts: 'linear-gradient(135deg,#f1f5f9,#f8fafc)',
  other:    'linear-gradient(135deg,#fef3c7,#fffbeb)',
};
const CAT_ICON  = { games:'🎮', graphics:'🎨', software:'💻', accounts:'👤', other:'📦' };
const CAT_LABEL = { games:'GAMES', graphics:'GRAPHICS', software:'SOFTWARE', accounts:'ACCOUNTS', other:'OTHER' };

const MONO = '"JetBrains Mono",ui-monospace,monospace';
const BODY = '"Inter",system-ui,-apple-system,"Segoe UI",sans-serif';

export default function ListingCard({ listing, isFavorited, onToggleFavorite }) {
  const {
    id, title, category, game, price_xrp, images, is_featured,
    username, reputation_score, is_verified, store_handle,
    status, quantity, quantity_sold, seller_is_pro,
  } = listing;

  const router = useRouter();
  const [hover, setHover] = useState(false);

  const stockLeft = (quantity != null && quantity_sold != null) ? Math.max(0, quantity - quantity_sold) : null;
  const soldOut   = status === 'sold' || stockLeft === 0;
  const catKey    = category || 'other';
  const goToStore = (e) => { e.preventDefault(); e.stopPropagation(); if (store_handle) router.push('/store/' + store_handle); };
  const avInitial = (username || '?').slice(0, 1).toUpperCase();

  return (
    <Link href={'/listing/' + id} style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: '#fff',
          border: '1px solid ' + (is_featured ? '#bfdbfe' : '#e7e9ed'),
          borderRadius: 14,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
          position: 'relative',
          transform: hover ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hover ? '0 16px 32px -14px rgba(20,22,26,0.18)' : 'none',
          fontFamily: BODY,
        }}
      >
        {/* Thumb */}
        <div style={{
          aspectRatio: '4 / 3',
          background: CAT_BG[catKey] || CAT_BG.other,
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {images?.[0]
            ? <img src={images[0]} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 36, opacity: 0.6 }}>{CAT_ICON[catKey] || CAT_ICON.other}</span>}

          {/* category badge — top left */}
          <span style={{
            position: 'absolute', top: 10, left: 10,
            fontFamily: MONO, fontSize: 10.5,
            background: 'rgba(11,27,51,0.85)', color: '#fff',
            padding: '4px 9px', borderRadius: 6,
            letterSpacing: '0.04em',
          }}>{CAT_LABEL[catKey] || 'ITEM'}</span>

          {/* pro / featured — top right */}
          {seller_is_pro && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              fontFamily: MONO, fontSize: 10,
              background: '#f59e0b', color: '#fff',
              padding: '4px 8px', borderRadius: 6,
              fontWeight: 500, letterSpacing: '0.04em',
            }}>PRO</span>
          )}
          {is_featured && !seller_is_pro && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              fontFamily: MONO, fontSize: 10,
              background: '#1d4ed8', color: '#fff',
              padding: '4px 8px', borderRadius: 6,
              fontWeight: 500, letterSpacing: '0.04em',
            }}>FEATURED</span>
          )}

          {/* favorite — bottom right, hover-only */}
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(id); }}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              style={{
                position: 'absolute', bottom: 10, right: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e7e9ed',
                display: 'grid', placeItems: 'center',
                cursor: 'pointer', fontSize: 14,
                color: isFavorited ? '#ef4444' : '#5b6472',
                opacity: (hover || isFavorited) ? 1 : 0,
                transition: 'opacity 0.15s',
              }}
            >{isFavorited ? '♥' : '♡'}</button>
          )}

          {/* sold-out overlay */}
          {soldOut && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(11,27,51,0.6)',
              display: 'grid', placeItems: 'center',
            }}>
              <span style={{
                fontFamily: MONO, background: '#ef4444', color: '#fff',
                borderRadius: 6, padding: '4px 12px',
                fontSize: 12, fontWeight: 500, letterSpacing: '0.06em',
              }}>SOLD OUT</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px' }}>
          {/* Title */}
          <div style={{
            fontWeight: 600, fontSize: 14.5,
            marginBottom: 5, color: '#14161a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{title}</div>

          {/* Seller row */}
          <div style={{
            fontSize: 12, color: '#5b6472', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            minWidth: 0,
          }}>
            <span
              onClick={store_handle ? goToStore : undefined}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                background: '#3b82f6', color: '#fff',
                fontSize: 9, display: 'grid', placeItems: 'center',
                fontWeight: 600, cursor: store_handle ? 'pointer' : 'default',
                flexShrink: 0,
              }}
            >{avInitial}</span>
            <span
              onClick={store_handle ? goToStore : undefined}
              style={{
                cursor: store_handle ? 'pointer' : 'default',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 110,
              }}
            >{username || 'unknown'}</span>
            {reputation_score > 0 && (
              <span style={{ color: '#f59e0b', flexShrink: 0 }}>★ {Number(reputation_score).toFixed(1)}</span>
            )}
            {is_verified && (
              <span title="Verified seller" style={{ color: '#10b981', fontWeight: 600, flexShrink: 0 }}>✓</span>
            )}
            {game && (
              <span style={{ color: '#a8b0bc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>· {game}</span>
            )}
          </div>

          {/* Price + escrow row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: MONO, fontWeight: 500, fontSize: 14.5,
              color: '#1d4ed8',
            }}>{Number(price_xrp).toLocaleString('en-US')} XRP</span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#10b981',
              background: 'rgba(16,185,129,0.1)',
              padding: '3px 8px', borderRadius: 6,
              whiteSpace: 'nowrap',
            }}>🛡 escrow</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
