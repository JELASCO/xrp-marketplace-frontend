import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', marginTop: 48 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 16px 0', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 40 }} className="cr-footgrid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }}>
            <svg width="28" height="28" viewBox="0 0 34 34" fill="none" style={{ color: 'var(--beacon)' }} aria-hidden="true">
              <circle cx="17" cy="17" r="15.5" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17" cy="9.4" r="2.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M17 12v13.4M12.4 15.2h9.2M9.2 20.2c.6 3.6 3.8 6 7.8 6s7.2-2.4 7.8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M9.2 20.2l-1.9-1.4M9.2 20.2l2.3-.4M24.8 20.2l1.9-1.4M24.8 20.2l-2.3-.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span style={{ fontWeight: 700, letterSpacing: '-.01em', color: '#2080F5' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600 }}>XRP</span>
              <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 20, marginLeft: 1 }}>Harbor</span>
            </span>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 14, maxWidth: '34ch', marginTop: 14 }}>
            The peer-to-peer marketplace for digital goods, secured by native escrow on the XRP Ledger.
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20, fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: 999, padding: '7px 14px' }}>
            <span className="cr-dot" /> BUILT ON THE XRP LEDGER
          </span>
        </div>
        {[
          { h: 'Market', links: [['Browse listings', '/listings'], ['Pro membership', '/pro'], ['Favorites', '/favorites']] },
          { h: 'Sellers', links: [['Start selling', '/listings/new'], ['Create store', '/store/create'], ['Dashboard', '/dashboard']] },
          { h: 'Harbor', links: [['Orders', '/orders'], ['Terms', '/tos'], ['Privacy', '/privacy']] },
        ].map(col => (
          <div key={col.h}>
            <h4 style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16 }}>{col.h}</h4>
            {col.links.map(([label, href]) => (
              <Link key={href} href={href} style={{ display: 'block', fontSize: 14, color: 'var(--text2)', marginBottom: 10, textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        ))}
      </div>
      <div className="cr-plate" style={{ marginTop: 44 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <span>XRPHarbor — Chart № 001 · Edition {year}</span>
          <span>Soundings in XRP</span>
          <span>41°00′N 28°58′E · © {year} XRPHarbor</span>
        </div>
      </div>
    </footer>
  );
}
