'use client';
import { useState, useEffect, useRef } from 'react';

// "Radio room" — live XRPL transaction feed.
// Subscribes to the transactions + ledger streams on a public XRPL node and
// renders each validated tx as a row. Falls back to a clearly-labelled
// simulation if the socket is blocked (sandboxed preview / offline).
const ENDPOINTS = ['wss://s1.ripple.com', 'wss://xrplcluster.com', 'wss://s2.ripple.com'];
const SHOW_TYPES = {
  Payment:            { label: 'PAY',      color: 'var(--starboard)' },
  EscrowCreate:       { label: 'ESCROW+',  color: 'var(--beacon)' },
  EscrowFinish:       { label: 'ESCROW\u2713', color: 'var(--beacon)' },
  EscrowCancel:       { label: 'ESCROW\u00D7', color: 'var(--port)' },
  OfferCreate:        { label: 'DEX',      color: 'var(--tide)' },
  AMMDeposit:         { label: 'AMM+',     color: 'var(--tide)' },
  AMMWithdraw:        { label: 'AMM\u2212', color: 'var(--tide)' },
  NFTokenAcceptOffer: { label: 'NFT',      color: 'var(--tide)' },
  NFTokenCreateOffer: { label: 'NFT+',     color: 'var(--tide)' },
};

function fmtXRP(drops) {
  const x = Number(drops) / 1e6;
  if (!isFinite(x)) return '';
  if (x >= 1000) return Math.round(x).toLocaleString('en-US') + ' XRP';
  if (x >= 1) return (Math.round(x * 10) / 10) + ' XRP';
  return x.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + ' XRP';
}
function fmtIOU(a) {
  let c = a.currency || 'IOU';
  if (c.length > 3) {
    try {
      c = c.replace(/0+$/, '').match(/../g).map(h => String.fromCharCode(parseInt(h, 16))).join('').replace(/[^\x20-\x7E]/g, '').trim() || 'IOU';
    } catch (e) { c = 'IOU'; }
  }
  const v = Number(a.value);
  const s = v >= 1000 ? Math.round(v).toLocaleString('en-US') : v >= 1 ? String(Math.round(v * 100) / 100) : v.toPrecision(2);
  return s + ' ' + c.slice(0, 6);
}
function fmtAmount(a) {
  if (a == null) return '';
  if (typeof a === 'string') return fmtXRP(a);
  if (typeof a === 'object' && a.value != null) return fmtIOU(a);
  return '';
}
const shortHash = h => (h || '').slice(0, 6).toUpperCase() + '\u2026';

export default function RadioRoom() {
  const [rows, setRows] = useState([]);
  const [live, setLive] = useState(false);
  const [host, setHost] = useState('');
  const [ledger, setLedger] = useState(null);
  const [txCount, setTxCount] = useState(null);
  const [flash, setFlash] = useState(false);
  const queueRef = useRef([]);
  const idRef = useRef(0);

  useEffect(() => {
    let killed = false, ws = null, epIdx = 0, retries = 0, simTx = null, simLedger = null, simIdx = 96481220;

    const push = (t) => { queueRef.current.push(t); if (queueRef.current.length > 12) queueRef.current.shift(); };
    function onTx(tx, topHash) {
      const cfg = SHOW_TYPES[tx.TransactionType];
      if (!cfg) return;
      push({ label: cfg.label, color: cfg.color, hash: shortHash(topHash || tx.hash || ''), amt: fmtAmount(tx.Amount || tx.DeliverMax) || (tx.Fee ? fmtXRP(tx.Fee) + ' fee' : '') });
    }
    function onLedger(m) {
      const idx = Number(m.ledger_index);
      if (isFinite(idx)) setLedger(idx);
      if (m.txn_count != null) setTxCount(m.txn_count);
      setFlash(true); setTimeout(() => { if (!killed) setFlash(false); }, 650);
    }

    const drain = setInterval(() => {
      const t = queueRef.current.shift();
      if (!t || killed) return;
      const id = ++idRef.current;
      setRows(prev => [{ id, ...t }, ...prev].slice(0, 6));
    }, 700);

    function stopSim() { clearInterval(simTx); clearInterval(simLedger); simTx = simLedger = null; }
    function startSim() {
      if (simTx) return;
      setLive(false);
      const types = Object.keys(SHOW_TYPES);
      const pick = () => { const r = Math.random(); if (r < .68) return 'Payment'; if (r < .82) return 'OfferCreate'; if (r < .9) return Math.random() < .5 ? 'EscrowCreate' : 'EscrowFinish'; return types[Math.floor(Math.random() * types.length)]; };
      const hex = n => Array.from({ length: n }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
      simTx = setInterval(() => { onTx({ TransactionType: pick(), Amount: String(Math.round(Math.exp(Math.random() * 9 + 6))), hash: hex(64) }); }, 1100);
      simLedger = setInterval(() => { simIdx += 1; onLedger({ ledger_index: simIdx, txn_count: 18 + Math.floor(Math.random() * 70) }); }, 3950);
    }
    function connect() {
      if (killed) return;
      if (retries > 6) { startSim(); return; }
      const url = ENDPOINTS[epIdx % ENDPOINTS.length];
      let opened = false;
      try { ws = new WebSocket(url); } catch (e) { epIdx++; retries++; return connect(); }
      const guard = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) {} } }, 5000);
      ws.onopen = () => { opened = true; clearTimeout(guard); setHost(url.replace('wss://', '')); ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger', 'transactions'] })); };
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type === 'ledgerClosed') { setLive(true); stopSim(); onLedger(m); }
        else if (m.type === 'transaction' && m.validated !== false) { setLive(true); stopSim(); const t = m.tx_json || m.transaction; if (t) onTx(t, m.hash); }
      };
      ws.onclose = () => { clearTimeout(guard); if (killed) return; setLive(false); startSim(); epIdx++; retries++; setTimeout(connect, 900 + retries * 400); };
      ws.onerror = () => {};
    }

    startSim();
    connect();
    return () => { killed = true; clearInterval(drain); stopSim(); try { if (ws) ws.close(); } catch (e) {} };
  }, []);

  return (
    <section style={{ margin: '8px 0 40px' }}>
      <div className="cr-eyebrow" style={{ marginBottom: 10 }}>Radio room</div>
      <h2 className="font-display" style={{ fontSize: 'clamp(24px,3vw,32px)', margin: '0 0 6px', color: 'var(--text)' }}>The ledger, live.</h2>
      <p style={{ color: 'var(--text2)', fontSize: 15, margin: '0 0 20px', maxWidth: '60ch' }}>
        Real transactions settling on the XRP Ledger right now — the same rails every XRPHarbor escrow runs on.
      </p>

      <div style={{ border: '1px solid var(--border2)', borderRadius: 18, background: 'radial-gradient(80% 130% at 0% 0%, var(--chart-glow), transparent 55%), var(--surface)', overflow: 'hidden', boxShadow: '0 18px 44px -18px rgba(2,10,18,.35)', transition: 'border-color .4s', borderColor: flash ? 'var(--beacon)' : 'var(--border2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '15px 22px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text2)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cr-dot" style={{ background: live ? 'var(--starboard)' : 'var(--beacon)' }} />
            Harbor traffic
            <span style={{ fontSize: 9, letterSpacing: '.18em', padding: '2px 7px', borderRadius: 3, border: '1px solid var(--border2)', color: live ? 'var(--starboard)' : 'var(--faint)', borderColor: live ? 'color-mix(in srgb, var(--starboard) 45%, transparent)' : 'var(--border2)' }}>{live ? 'LIVE' : 'SIM'}</span>
          </span>
          <span style={{ color: 'var(--text3)', letterSpacing: '.08em' }}>
            Ledger #{ledger ? ledger.toLocaleString('en-US') : '—'} · {txCount != null ? txCount : '—'} tx
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 282 }} aria-live="polite">
          {rows.length === 0 && (
            <div style={{ padding: '40px 22px', textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--text3)' }}>Tuning in…</div>
          )}
          {rows.map(r => (
            <div key={r.id} className="cr-reveal" style={{ display: 'grid', gridTemplateColumns: '14px 96px minmax(0,1fr) auto', gap: 16, alignItems: 'center', padding: '13px 22px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--f-mono)', fontSize: 12.5, color: 'var(--text2)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, justifySelf: 'center' }} />
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{r.label}</span>
              <span style={{ color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.hash}</span>
              <span style={{ color: 'var(--text)', whiteSpace: 'nowrap', justifySelf: 'end' }}>{r.amt}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '13px 22px', borderTop: '1px solid var(--border)', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--faint)', textTransform: 'uppercase' }}>
          {live ? 'Source ' + host + ' — every row is a validated mainnet transaction' : 'Simulated feed — live socket unavailable here. Opens LIVE on the deployed site.'}
        </div>
      </div>
    </section>
  );
}
