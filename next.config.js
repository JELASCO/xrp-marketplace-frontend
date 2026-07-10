/** @type {import('next').NextConfig} */
const nextConfig = {
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
