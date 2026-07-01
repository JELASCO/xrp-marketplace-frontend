'use client';
import Link from 'next/link';
export default function PrivacyPage() {
  return (
    <div style={{maxWidth:800,margin:'40px auto',padding:'0 20px',color:'var(--text)',lineHeight:1.8}}>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:8}}>Privacy Policy</h1>
      <p style={{color:'var(--text3)',marginBottom:32,fontSize:13}}>Last updated: June 2026</p>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>1. Information We Collect</h2><p style={{color:'var(--text2)'}}>We collect your XRPL wallet address, username, optional bio and avatar, transaction history on our platform, and usage data.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>2. How We Use It</h2><p style={{color:'var(--text2)'}}>We use your information to facilitate transactions, display your public profile, resolve disputes, prevent fraud, and improve the platform.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>3. Public Information</h2><p style={{color:'var(--text2)'}}>Your username, reputation score, and listing history are publicly visible. Transactions are recorded on the XRP Ledger, a public blockchain.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>4. Data Sharing</h2><p style={{color:'var(--text2)'}}>We do not sell your data. We share wallet addresses with counterparties in transactions and use XUMM/Xaman for payment processing.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>5. Security</h2><p style={{color:'var(--text2)'}}>We use industry-standard security. We do not store private keys. You are solely responsible for your wallet security.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>6. Cookies</h2><p style={{color:'var(--text2)'}}>We use essential cookies for authentication only. We do not use tracking or advertising cookies.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>7. Your Rights</h2><p style={{color:'var(--text2)'}}>You may request account deletion at any time. Blockchain transaction records are permanent and cannot be deleted.</p></section>
      <section style={{marginBottom:28}}><h2 style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--text3)'}}>8. Contact</h2><p style={{color:'var(--text2)'}}>For privacy requests, contact us through the platform support channels.</p></section>
      <div style={{marginTop:40}}><Link href='/' style={{color:'var(--accent)',textDecoration:'none'}}>← Back to Home</Link></div>
    </div>
  );
}
