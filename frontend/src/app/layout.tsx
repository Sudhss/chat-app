import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title:       'Flux — Real-time Messaging',
  description: 'Fast, secure, real-time chat application',
  themeColor:  '#0f1117',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-flux-bg text-flux-text antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
