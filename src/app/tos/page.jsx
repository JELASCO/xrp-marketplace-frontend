'use client';
import Link from 'next/link';
export default function TosPage() {
  return (
    <div style={{maxWidth:800,margin:'40px auto',padding:'0 20px',color:'#e8eaf0',lineHeight:1.8}}>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:8}}>Terms of Service</h1>
      <p style={{color:'#4a5568',marginBottom:32,fontSize:13}}>Last updated: May 2025</p>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>1. Acceptance of Terms</h2><p style={{color:'#8892a4'}}>By accessing and using XRPMarket, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>2. Platform Description</h2><p style={{color:'#8892a4'}}>XRPMarket is a peer-to-peer marketplace for digital game items and assets. We facilitate transactions using XRP Ledger escrow technology. We do not guarantee item delivery.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>3. Eligibility</h2><p style={{color:'#8892a4'}}>You must be at least 18 years old to use XRPMarket. By using the platform, you confirm you meet this requirement.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>4. Fees</h2><p style={{color:'#8892a4'}}>XRPMarket charges a 3% commission on completed sales, automatically deducted from seller proceeds via escrow.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>5. Prohibited Conduct</h2><p style={{color:'#8892a4'}}>You may not list fraudulent items, manipulate prices, impersonate users, or violate any applicable laws.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>6. Disputes</h2><p style={{color:'#8892a4'}}>Disputes may be opened within 72 hours of delivery. Admins will review evidence and make a final decision.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>7. Limitation of Liability</h2><p style={{color:'#8892a4'}}>XRPMarket is provided as-is. We are not liable for lost items, failed transactions, or XRP price fluctuations.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'#c8ccd6'}}>8. Contact</h2><p style={{color:'#8892a4'}}>For questions, contact us through the platform support channels.</p></section>
      <div style={{marginTop:40}}><Link href='/' style={{color:'#3b82f6',textDecoration:'none'}}>← Back to Home</Link></div>
    </div>
  );
}
