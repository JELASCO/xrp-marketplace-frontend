import Link from 'next/link';

export const metadata = { title: 'Page not found · XRPHarbor' };

export default function NotFound() {
  return (
    <div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:13,fontWeight:600,letterSpacing:1,color:'var(--accent)',marginBottom:8}}>404</div>
      <h1 style={{fontSize:26,fontWeight:700,color:'var(--text)',margin:'0 0 8px'}}>Lost at sea</h1>
      <p style={{fontSize:14,color:'var(--text2)',maxWidth:400,margin:'0 0 20px',lineHeight:1.55}}>This page drifted off the map. The link may be broken, or the listing may have been removed.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        <Link href="/" style={{background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:9,padding:'10px 18px',fontSize:14,fontWeight:600}}>Back to harbor</Link>
        <Link href="/listings" style={{border:'1px solid var(--border)',color:'var(--text)',textDecoration:'none',borderRadius:9,padding:'10px 18px',fontSize:14,fontWeight:600}}>Browse listings</Link>
      </div>
    </div>
  );
}
