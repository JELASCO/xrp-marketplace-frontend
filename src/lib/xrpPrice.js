'use client';
import { useState, useEffect } from 'react';

// Single shared real-time XRP/USD price source (WebSocket + HTTP fallback)
// so the navbar and the homepage ticker always show live tick-by-tick updates.
let state = { price: null, change: null, dir: null };
let last = null;
let ref = null;
let started = false;
let dirTimer = null;
const subs = new Set();

function emit() {
  subs.forEach(function (fn) {
    fn(state);
  });
}

function applySpotPrice(p, explicitChange) {
  if (typeof p !== 'number' || isNaN(p) || p <= 0) return;
  let dir = state.dir;
  if (last != null && Math.abs(p - last) >= 0.00005) {
    dir = p > last ? 'up' : 'down';
    if (dirTimer) clearTimeout(dirTimer);
    dirTimer = setTimeout(function () {
      state = { price: state.price, change: state.change, dir: null };
      emit();
    }, 1400);
  }
  last = p;
  let change = state.change;
  if (typeof explicitChange === 'number' && !isNaN(explicitChange)) {
    change = explicitChange;
  } else if (ref && ref > 0) {
    change = ((p - ref) / ref) * 100;
  }
  state = { price: p, change: change, dir: dir };
  emit();
}

function fetchSpot() {
  // 1. Try Binance 24hr ticker (gives both live lastPrice and exact 24h priceChangePercent)
  fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('binance http ' + r.status);
      return r.json();
    })
    .then(function (b) {
      if (b && b.lastPrice) {
        const p = parseFloat(b.lastPrice);
        const chg = b.priceChangePercent != null ? parseFloat(b.priceChangePercent) : undefined;
        if (b.openPrice) {
          const op = parseFloat(b.openPrice);
          if (!isNaN(op) && op > 0) ref = op;
        }
        applySpotPrice(p, chg);
        return;
      }
      throw new Error('invalid binance payload');
    })
    .catch(function () {
      // 2. Fallback to Coinbase spot API
      fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot', { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('coinbase http ' + r.status);
          return r.json();
        })
        .then(function (d) {
          if (d && d.data && d.data.amount) {
            applySpotPrice(parseFloat(d.data.amount));
            return;
          }
          throw new Error('invalid coinbase payload');
        })
        .catch(function () {
          // 3. Fallback to same-origin server endpoint (/api/xrp-price)
          fetch('/api/xrp-price', { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (s) {
              if (s && s.price) applySpotPrice(parseFloat(s.price), s.change != null ? parseFloat(s.change) : undefined);
            })
            .catch(function () {});
        });
    });
}

function connectLiveWebSocket() {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
  let ws = null;
  let reconnectTimer = null;

  function openCoinbaseWs() {
    try {
      ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      ws.onopen = function () {
        try {
          ws.send(JSON.stringify({
            type: 'subscribe',
            product_ids: ['XRP-USD'],
            channels: ['ticker'],
          }));
        } catch (e) {}
      };
      ws.onmessage = function (evt) {
        try {
          const msg = JSON.parse(evt.data);
          if (msg && msg.type === 'ticker' && msg.price) {
            const p = parseFloat(msg.price);
            if (msg.open_24h) {
              const op = parseFloat(msg.open_24h);
              if (!isNaN(op) && op > 0) ref = op;
            }
            applySpotPrice(p);
          }
        } catch (e) {}
      };
      ws.onclose = function () {
        reconnectTimer = setTimeout(openCoinbaseWs, 5000);
      };
      ws.onerror = function () {
        try { ws.close(); } catch (e) {}
      };
    } catch (e) {}
  }

  openCoinbaseWs();
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  fetchSpot();
  connectLiveWebSocket();
  setInterval(fetchSpot, 4000);
}

export function subscribeXrp(fn) {
  subs.add(fn);
  start();
  if (state.price != null) fn(state);
  return function () { subs.delete(fn); };
}

export function useXrpPrice() {
  const [s, setS] = useState(state);
  useEffect(function () { return subscribeXrp(setS); }, []);
  return s;
}
