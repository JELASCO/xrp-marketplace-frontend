export default function Loading() {
  return (
    <div style={{minHeight:'50vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'40px 20px'}}>
      <div style={{width:34,height:34,borderRadius:'50%',border:'3px solid var(--border)',borderTopColor:'var(--accent)',animation:'xhspin .8s linear infinite'}}/>
      <span style={{fontSize:13,color:'var(--text3)'}}>Loading…</span>
      <style>{'@keyframes xhspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
