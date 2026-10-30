/** @type {import('next').NextConfig} */
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' data: blob: https://xumm.app https://*.xaman.app https://i.ibb.co https://images.unsplash.com https://api.dicebear.com https://media.giphy.com https://*.giphy.com https://media.tenor.com https://i.imgur.com https://challenges.cloudflare.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://public-files.gumroad.com https://assets.gumroad.com https://*.gumroad.com https://img.itch.zone https://*.itch.zone; " +
  "connect-src 'self' https: wss: https://api.coinbase.com https://api.exchange.coinbase.com wss://ws-feed.exchange.coinbase.com https://api.binance.com wss://stream.binance.com:9443 wss://stream.binance.com https://api.kraken.com https://api.coingecko.com https://xrpharbor.com https://*.xrpharbor.com https://xrp-marketplace-backend-production.up.railway.app wss://xrp-marketplace-backend-production.up.railway.app https://xumm.app wss://xumm.app https://*.xaman.app wss://*.xaman.app wss://*.xrpl.org https://*.xrpl.org wss://s1.ripple.com https://s1.ripple.com wss://s2.ripple.com https://s2.ripple.com wss://xrplcluster.com https://xrplcluster.com; " +
  "frame-src 'self' https://xumm.app https://*.xaman.app https://challenges.cloudflare.com blob:; " +
  "worker-src 'self' blob:; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "frame-ancestors 'self'";

const SECURITY_HEADERS = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: CONTENT_SECURITY_POLICY,
  },
  {
    key: 'Access-Control-Allow-Origin',
    value: 'https://xrpharbor.com',
  },
  {
    key: 'Vary',
    value: 'Origin',
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/upgrade',
        destination: '/pro',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

module.exports = nextConfig;
