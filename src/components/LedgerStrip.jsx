'use client';
import { useState, useEffect, useRef } from 'react';
import { useXrpPrice } from '../lib/xrpPrice';

// Thin admiralty "ledger strip" that sits above the navbar.
// Shows the live XRP/USD (shared source) and a ledger index that
// advances on the real XRPL ledger stream when the socket is reachable,
// falling back to a quiet local tick when it isn't (sandbox / offline).
const ENDPOINTS = ['wss://s1.ripple.com', 'wss://xrplcluster.com', 'wss://s2.ripple.com'];

export default function LedgerStrip() {
  const { price, change, dir } = useXrpPrice();
  const [ledger, setLedger] = useState(null);
  const [closeS, setCloseS] = useState('3.9');
  const [fee, setFee] = useState('10');
  const [live, setLive] = useState(false);
  const wsRef = useRef(null);
  const simRef = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    let epIdx = 0, retries = 0, killed = false, ws = null;

    function stopSim() { if (simRef.current) { clearInterval(simRef.current); simRef.current = null; } }
    function startSim() {
      if (simRef.current) return;
      setLive(false);
      let idx = 96481220;
      simRef.current = setInterval(() => {
        idx += 1;
        setLedger(idx);
        setCloseS((3.6 + Math.random() * 0.7).toFixed(1));
      }, 3950);
    }
    function onLedger(m) {
      const idx = Number(m.ledger_index);
      if (!isFinite(idx)) return;
      setLedger(idx);
      if (lastTimeRef.current != null && m.ledger_time > lastTimeRef.current)
        setCloseS((m.ledger_time - lastTimeRef.current).toFixed(1));
      lastTimeRef.current = m.ledger_time;
      if (m.fee_base) setFee(String(m.fee_base));
    }
    function connect() {
      if (killed) return;
      if (retries > 6) { startSim(); return; }
      const url = ENDPOINTS[epIdx % ENDPOINTS.length];
      let opened = false;
      try { ws = new WebSocket(url); } catch (e) { epIdx++; retries++; return connect(); }
      wsRef.current = ws;
      const guard = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) {} } }, 5000);
      ws.onopen = () => { opened = true; clearTimeout(guard); ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] })); };
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type === 'ledgerClosed') { setLive(true); stopSim(); onLedger(m); }
        else if (m.result && m.result.ledger_index) { setLive(true); stopSim(); onLedger(m.result); }
      };
      ws.onclose = () => { clearTimeout(guard); if (killed) return; setLive(false); startSim(); epIdx++; retries++; setTimeout(connect, 900 + retries * 400); };
      ws.onerror = () => {};
    }

    startSim();
    connect();
    return () => { killed = true; stopSim(); try { if (wsRef.current) wsRef.current.close(); } catch (e) {} };
  }, []);

  const chgColor = change == null ? 'var(--text3)' : change >= 0 ? 'var(--starboard)' : 'var(--port)';
  const priceColor = dir === 'up' ? 'var(--starboard)' : dir === 'down' ? 'var(--port)' : 'var(--text2)';

  return (
    <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--text3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', gap: 16, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span className="cr-dot" style={{ background: live ? 'var(--starboard)' : 'var(--beacon)' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            XRPL&nbsp;LEDGER <b style={{ color: 'var(--text2)', fontWeight: 500 }}>#{ledger ? ledger.toLocaleString('en-US') : '—'}</b>
            <span style={{ opacity: .55 }}> · </span>CLOSED <b style={{ color: 'var(--text2)', fontWeight: 500 }}>{closeS}s</b>
            <span style={{ marginLeft: 8, color: live ? 'var(--starboard)' : 'var(--faint)', fontSize: 9, letterSpacing: '.18em' }}>{live ? 'LIVE' : 'SIM'}</span>
          </span>
        </span>
        <span style={{ flexShrink: 0 }}>
          XRP/USD <b style={{ color: priceColor, fontWeight: 500, transition: 'color .3s' }}>{price ? price.toFixed(price < 10 ? 3 : 2) : '—'}</b>
          {change != null && <span style={{ color: chgColor, marginLeft: 6 }}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%</span>}
          <span style={{ opacity: .55 }}>&nbsp;·&nbsp;</span>FEE <b style={{ color: 'var(--text2)', fontWeight: 500 }}>{fee} drops</b>
        </span>
      </div>
    </div>
  );
}
