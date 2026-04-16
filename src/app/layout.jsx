import './globals.css';
import { Inter } from 'next/font/google';
import Providers from '../components/Providers';
import Navbar    from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'XRP Market — P2P Game & Digital Items Marketplace',
  description: 'Secure P2P trading on XRP Ledger. Buy and sell game skins, coins, battle passes and more.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
