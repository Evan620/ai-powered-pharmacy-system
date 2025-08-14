import type { Metadata } from 'next';
import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LoadingBar } from '@/components/ui/LoadingBar';
import { HydrationFix } from '@/components/ui/HydrationFix';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Pharmo — Pharmacy POS & Inventory',
  description: 'AI-powered pharmacy inventory & billing system',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <HydrationFix />
        <LoadingBar />
        <AuthProvider>
          <QueryProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}