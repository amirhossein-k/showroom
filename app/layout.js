import './globals.css';
import { Vazirmatn } from 'next/font/google';
import Shell from '@/components/Shell';

const vazir = Vazirmatn({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-vazir', display: 'swap' });

export const metadata = {
  title: 'اتودار | مدیریت نمایشگاه خودرو',
  description: 'موجودی، سود واقعی، چک‌ها، مشتریان و قیمت بازار نمایشگاه خودرو',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#161b21' };

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body className="font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
