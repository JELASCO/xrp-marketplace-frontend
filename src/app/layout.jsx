import './globals.css';
import { Syne } from 'next/font/google';
import Providers from '../components/Providers';
import Navbar    from '../components/Navbar';

const syne = Syne({ subsets: ['latin'], weight: ['400','500','600','700','800'] });

export const metadata = {
  title: 'XRPMarket — P2P Game & Digital Items Marketplace',
  description: 'Buy and sell game skins, coins, battle passes and more. Secured by XRP Ledger escrow.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={syne.className} style={{background:'#080a0e',minHeight:'100vh'}}>
        <Providers>
          <Navbar />
          <main style={{maxWidth:1200,margin:'0 auto',padding:'24px 16px'}}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
