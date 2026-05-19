import './globals.css';
import Navbar from '../components/Navbar';
import Providers from '../components/Providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://xrpharbor.com';
const SITE_NAME = 'XRPHarbor';
const TITLE = 'XRPHarbor - P2P Game & Digital Items Marketplace';
const DESCRIPTION = 'Buy and sell game skins, coins, accounts, and digital items with XRP Ledger escrow protection. Secure peer-to-peer marketplace powered by the XRP Ledger.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | ' + SITE_NAME },
  description: DESCRIPTION,
  keywords: ['XRP', 'XRPL', 'marketplace', 'game items', 'skins', 'CS2', 'Valorant', 'crypto marketplace', 'P2P', 'escrow'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/xrpharbor.jpg', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/xrpharbor.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/favicon.ico', apple: '/apple-icon.png' },
  alternates: { canonical: SITE_URL },
};

export const viewport = {
  themeColor: 'var(--bg)',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <Providers>
          <Navbar />
          <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
