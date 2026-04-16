/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.xrpmarket.app', 'localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `https://xrp-marketplace-backend-production.up.railway.app/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
