'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { sanitizeImageUrl } from '../../lib/sanitizeUrl';

const STORE_CATEGORY_PILLS = [
  { key: 'all', label: 'All', keywords: [] },
  { key: 'graphics', label: '3D & Design', keywords: ['graphics', 'games', '3d', 'shader', 'blender', 'design', 'godot', 'vfx', 'icon'] },
  { key: 'templates', label: 'Templates', keywords: ['templates', 'ui', 'figma', 'kit', 'notion', 'boilerplate', 'starter'] },
  { key: 'audio', label: 'Audio', keywords: ['audio', 'sfx', 'sound', 'music', 'wav', 'synth'] },
  { key: 'prompts', label: 'Prompts', keywords: ['prompts', 'ai', 'midjourney', 'flux', 'lut'] },
  { key: 'education', label: 'Education', keywords: ['education', 'guide', 'playbook', 'course', 'ebook', 'tutorial'] },
  { key: 'software', label: 'Code', keywords: ['software', 'code', 'typescript', 'nextjs', 'xrpl', 'dex', 'sdk', 'dev'] },
];

const FALLBACK_STORES = [
  {
    handle: 'aether-forge',
    activeListingsCount: 3,
    store: {
      name: 'AetherForge 3D & Shaders',
      tagline: 'Production-ready Blender 4.2 shaders, Godot/Unity VFX & indie game asset packs',
      announcement: '🟢 v2.4 Cyberpunk Shader Pack is live — enter code HARBOR10 at checkout for an instant 10% creator discount!',
      about: 'Independent technical artists building procedural shaders, trim sheets, and game-ready 3D kits. Every purchase unlocks instant SHA-256 verified archive downloads backed by XRPL conditional escrow.',
      categories: ['graphics', 'games', 'audio'],
      accentColor: '#2563eb',
      frameStyle: 'gold',
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80',
    },
    seller: {
      username: 'aether_forge',
      bio: 'Indie 3D & game-dev studio crafting Blender 4.2 shader nodes, Godot 4 / Unity VFX packs, and procedural pixel-art kits.',
      reputation_score: 4.95,
      total_sales: 84,
      is_verified: true,
      seller_is_pro: true,
    },
  },
  {
    handle: 'prism-ui',
    activeListingsCount: 3,
    store: {
      name: 'Prism UI & Design Systems',
      tagline: 'Figma design systems, 3D glassmorphic icon kits & AI visual prompt libraries',
      announcement: '⚡ Instant Vault Delivery — use code PRISM15 or HARBOR10 at checkout for up to 15% off any design system!',
      about: 'Crafting high-craft Figma component libraries, variables-first UI kits, and cinematic LUT/prompt systems for modern product teams and indie creators.',
      categories: ['templates', 'graphics', 'prompts', 'education'],
      accentColor: '#0ea5e9',
      frameStyle: 'cyber',
      bannerUrl: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=1400&q=80',
    },
    seller: {
      username: 'prism_ui',
      bio: 'Design engineer & AI prompt architect. Creator of the FinTech & Web3 Figma UI Kit, Midjourney v6 LUT systems, and creator Notion playbooks.',
      reputation_score: 4.98,
      total_sales: 164,
      is_verified: true,
      seller_is_pro: true,
    },
  },
  {
    handle: 'xrpl-labs',
    activeListingsCount: 2,
    store: {
      name: 'XRPL Labs & Boilerplates',
      tagline: 'Production Next.js + XRPL SaaS starter kits, TypeScript SDKs & DEX engines',
      announcement: '🔥 Next.js 15 + Xaman SaaS Starter v2.1 released — 0% buyer fee & instant source archive download!',
      about: 'Clean, audited TypeScript codebases for indie hackers and Web3 engineers. Skip weeks of wallet auth, conditional escrow, and ledger indexing boilerplate.',
      categories: ['software', 'templates', 'education'],
      accentColor: '#6366f1',
      frameStyle: 'plasma',
      bannerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
    },
    seller: {
      username: 'xrpl_labs',
      bio: 'Full-stack Web3 & XRPL engineering collective. Shipping Next.js 15 + Xaman SaaS boilerplates, TypeScript DEX analytics engines, and developer tooling.',
      reputation_score: 4.92,
      total_sales: 96,
      is_verified: true,
      seller_is_pro: true,
    },
  },
];

export default function StoresDirectoryPage() {
  const { user } = useAuthStore();
  const [stores, setStores] = useState(FALLBACK_STORES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.stores
      .list()
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res) && res.length > 0) {
          const byHandle = new Map();
          res.forEach((st) => {
            if (st && st.handle) byHandle.set(st.handle, st);
          });
          FALLBACK_STORES.forEach((fb) => {
            if (!byHandle.has(fb.handle)) byHandle.set(fb.handle, fb);
          });
          setStores(Array.from(byHandle.values()));
        } else {
          setStores(FALLBACK_STORES);
        }
      })
      .catch(() => {
        if (active) setStores(FALLBACK_STORES);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    const catMeta = STORE_CATEGORY_PILLS.find((c) => c.key === activeCategory);

    return stores.filter((st) => {
      const sObj = st.store || st;
      const selObj = st.seller || {};
      const handle = String(st.handle || '').toLowerCase();
      const name = String(sObj.name || st.name || handle).toLowerCase();
      const tagline = String(sObj.tagline || sObj.about || st.tagline || selObj.bio || '').toLowerCase();
      const announcement = String(sObj.announcement || st.announcement || '').toLowerCase();
      const username = String(selObj.username || st.sellerUsername || '').toLowerCase();
      const cats = Array.isArray(sObj.categories) ? sObj.categories.map((c) => String(c).toLowerCase()) : [];

      if (q) {
        const cleanQ = q.replace(/^@/, '');
        const matchText =
          name.includes(cleanQ) ||
          handle.includes(cleanQ) ||
          username.includes(cleanQ) ||
          tagline.includes(cleanQ) ||
          announcement.includes(cleanQ);
        if (!matchText) return false;
      }

      if (activeCategory !== 'all' && catMeta) {
        const directCatMatch = cats.includes(activeCategory);
        const keywordMatch = catMeta.keywords.some(
          (kw) => cats.includes(kw) || name.includes(kw) || tagline.includes(kw) || announcement.includes(kw)
        );
        if (!directCatMatch && !keywordMatch) return false;
      }

      return true;
    });
  }, [stores, search, activeCategory]);

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 64px', minWidth: 0 }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1b33 0%, #132c4e 60%, #1e3a8a 100%)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 20,
          padding: '28px 24px',
          marginBottom: 28,
          color: '#fff',
          boxShadow: '0 16px 40px -16px rgba(10,22,40,0.45)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: 'DM Mono, monospace',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#fbbf24',
                background: 'rgba(245,158,11,0.16)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 999,
                padding: '4px 12px',
                marginBottom: 12,
              }}
            >
              ★ VERIFIED PRO STORES · OFFICIAL DOCKS
            </div>
            <h1
              style={{
                fontSize: 'clamp(24px, 3.6vw, 36px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: '0 0 10px',
                color: '#fff',
              }}
            >
              The harbor&rsquo;s verified Pro storefronts
            </h1>
            <p
              style={{
                fontSize: 14.5,
                color: '#cbd5e1',
                lineHeight: 1.55,
                maxWidth: 620,
                margin: 0,
              }}
            >
              Explore custom branded docks operated by verified XRPHarbor creators — featuring instant SHA-256 vault delivery, live creator promo codes, and non-custodial XRPL escrow.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <Link
              href="/pro"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#0b192c',
                fontWeight: 800,
                fontSize: 13.5,
                padding: '12px 20px',
                borderRadius: 11,
                textDecoration: 'none',
                boxShadow: '0 6px 18px rgba(245,158,11,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Open your Pro Store →</span>
            </Link>
            {user && (
              <Link
                href="/store/create"
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#93c5fd',
                  textDecoration: 'none',
                  paddingLeft: 4,
                }}
              >
                Customize my storefront →
              </Link>
            )}
          </div>
        </div>

        {/* Search + Category Filter Bar */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ position: 'relative', maxWidth: 520, width: '100%' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores by name, @handle, or bio…"
              aria-label="Search stores"
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px 0 38px',
                borderRadius: 11,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(10,22,40,0.65)',
                color: '#fff',
                fontSize: 13.5,
                outline: 'none',
              }}
            />
            <svg
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: '#94a3b8',
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {STORE_CATEGORY_PILLS.map((pill) => {
              const active = activeCategory === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setActiveCategory(pill.key)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    border: active ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.16)',
                    background: active ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                    color: active ? '#0b192c' : '#e2e8f0',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Store Cards Grid */}
      {loading && stores.length === 0 ? (
        <div className="xh-stores-grid">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                height: 310,
                borderRadius: 16,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            />
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '56px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏬</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            No storefronts match your filter
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text2)', marginBottom: 18 }}>
            Try clearing your search query or switching back to All categories.
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setActiveCategory('all');
            }}
            style={{
              background: '#2080F5',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="xh-stores-grid">
          {filteredStores.map((st) => {
            const sObj = st.store || st;
            const selObj = st.seller || {};
            const storeName = sObj.name || st.name || st.handle;
            const storeTagline =
              sObj.tagline ||
              sObj.about ||
              st.tagline ||
              selObj.bio ||
              'Official verified Pro storefront on XRPHarbor.';
            const storeAnnouncement = sObj.announcement || st.announcement || '';
            const accent = sObj.accentColor || st.accentColor || '#2563eb';
            const rawBanner = sObj.bannerUrl || st.bannerUrl || '';
            const rawLogo = sObj.logoUrl || st.logoUrl || selObj.avatar_url || '';
            const safeBanner = rawBanner ? sanitizeImageUrl(rawBanner) : '';
            const safeLogo = rawLogo ? sanitizeImageUrl(rawLogo) : '';
            const trades =
              selObj.total_sales != null
                ? selObj.total_sales
                : st.sellerTotalSales != null
                ? st.sellerTotalSales
                : 0;
            const ratingVal = selObj.reputation_score || st.sellerRating;
            const rating = ratingVal ? Number(ratingVal).toFixed(1) : '5.0';
            const itemsCount = st.activeListingsCount != null ? st.activeListingsCount : '—';

            return (
              <Link
                key={st.handle}
                href={`/store/${st.handle}`}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid rgba(245,158,11,0.32)',
                  borderRadius: 16,
                  boxShadow: '0 1px 2px rgba(10,35,66,.06), 0 12px 28px -8px rgba(10,35,66,.16)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  textDecoration: 'none',
                  transition: 'transform .18s, box-shadow .18s',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    height: 82,
                    background: safeBanner
                      ? `linear-gradient(180deg, rgba(10,22,40,0.25) 0%, rgba(10,22,40,0.72) 100%), url(${safeBanner}) center/cover no-repeat`
                      : `linear-gradient(135deg, #0A1628 0%, ${accent} 100%)`,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      background: 'rgba(10,22,40,0.72)',
                      backdropFilter: 'blur(6px)',
                      color: '#e2e8f0',
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  >
                    @{st.handle}
                  </span>
                  <span
                    className="xh-pro"
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      padding: '3px 8px',
                      borderRadius: 6,
                      boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                    }}
                  >
                    ★ PRO STORE
                  </span>
                </div>

                <div
                  style={{
                    padding: '0 18px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 12,
                      marginTop: -22,
                      position: 'relative',
                      zIndex: 2,
                      minWidth: 0,
                    }}
                  >
                    <div
                      className={
                        sObj.frameStyle !== 'none' ? `xh-pro-ring frame-${sObj.frameStyle || 'gold'}` : ''
                      }
                      style={{ borderRadius: 15, padding: 3, flex: 'none' }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #2080F5, #f59e0b)',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 18,
                          display: 'grid',
                          placeItems: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {safeLogo ? (
                          <img
                            src={safeLogo}
                            alt={storeName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          (storeName || st.handle || 'ST').slice(0, 2).toUpperCase()
                        )}
                      </div>
                    </div>

                    <div style={{ minWidth: 0, paddingBottom: 2, flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 800,
                          fontSize: 15.5,
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeName}</span>
                        <span
                          style={{ color: '#f59e0b', display: 'inline-flex', flexShrink: 0 }}
                          title="Verified Pro Storefront"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 3 5 6v5.2c0 4 2.9 7.2 7 8.8 4.1-1.6 7-4.8 7-8.8V6z" />
                            <path d="m9.3 12 1.9 1.9L15 10" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  {storeAnnouncement && (
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#b45309',
                        background: 'rgba(245,158,11,0.10)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {storeAnnouncement}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text2)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    {storeTagline}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      background: 'var(--bg2)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {Number(trades) >= 5 ? (
                      <div
                        style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: 'var(--text)',
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          {trades}
                        </div>
                        <div
                          style={{
                            fontFamily: 'DM Mono, monospace',
                            fontSize: 9,
                            letterSpacing: '0.04em',
                            color: 'var(--text3)',
                          }}
                        >
                          TRADES
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 12.5,
                            color: '#10b981',
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          ✨ NEW
                        </div>
                        <div
                          style={{
                            fontFamily: 'DM Mono, monospace',
                            fontSize: 9,
                            letterSpacing: '0.04em',
                            color: 'var(--text3)',
                          }}
                        >
                          STORE
                        </div>
                      </div>
                    )}
                    <div
                      style={{
                        padding: '10px 6px',
                        textAlign: 'center',
                        borderRight: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14.5,
                          color: '#f59e0b',
                          lineHeight: 1,
                          marginBottom: 4,
                        }}
                      >
                        ★ {rating}
                      </div>
                      <div
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 9,
                          letterSpacing: '0.04em',
                          color: 'var(--text3)',
                        }}
                      >
                        RATING
                      </div>
                    </div>
                    <div style={{ padding: '10px 6px', textAlign: 'center' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14.5,
                          color: '#10b981',
                          lineHeight: 1,
                          marginBottom: 4,
                        }}
                      >
                        {itemsCount}
                      </div>
                      <div
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 9,
                          letterSpacing: '0.04em',
                          color: 'var(--text3)',
                        }}
                      >
                        ITEMS
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 11,
                      marginTop: 'auto',
                      borderTop: '1px solid var(--border)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: '#2080F5',
                    }}
                  >
                    <span>Visit Storefront →</span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
