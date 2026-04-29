import './globals.css';
import { DM_Sans } from 'next/font/google';
import Providers from '../components/Providers';
import Navbar from '../components/Navbar';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500','600','700'] });

export const metadata = {
  title: 'XRPMarket — P2P Game & Digital Items Marketplace',
  description: 'Buy and sell game skins, coins, battle passes and more. Secured by XRP Ledger escrow.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={dmSans.className} style={{background:'#080a0e',minHeight:'100vh'}}>
        <Providers>
          <Navbar />
          <div style={{background:"rgba(245,158,11,0.15)",borderBottom:"1px solid rgba(245,158,11,0.3)",padding:"8px 16px",fontSize:12,color:"#fbbf24",textAlign:"center"}}><strong>Demo Mode:</strong> Bu uygulama testnet uzerinde simulation modunda calisir. Gercek deger transferi yapilmaz.</div><main style={{maxWidth:1200,margin:'0 auto',padding:'24px 16px'}}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
