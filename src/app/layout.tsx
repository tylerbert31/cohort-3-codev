import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/lib/query-provider';
import { Outfit, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono-face',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WanderList — Make room for the good part',
  description:
    'Plan trips together with shared packing lists, assigned gear, and live progress. WanderList keeps every traveler in sync from the first plan to the final pack.',
  applicationName: 'WanderList',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  openGraph: {
    type: 'website',
    siteName: 'WanderList',
    title: 'WanderList — Make room for the good part',
    description:
      'Plan trips together with shared packing lists, assigned gear, and live progress. Keep every traveler in sync from the first plan to the final pack.',
  },
  twitter: {
    card: 'summary',
    title: 'WanderList — Make room for the good part',
    description:
      'Plan trips together with shared packing lists, assigned gear, and live progress. Keep every traveler in sync from the first plan to the final pack.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      allowedRedirectOrigins={[
        'http://localhost:*',
        'http://127.0.0.1:*',
        'http://192.168.*:*',
        'http://10.*:*',
        'http://172.16.*:*',
        '*.local:*',
        '*.local',
      ]}
      appearance={{
        variables: {
          colorPrimary: '#547a27',
          colorBackground: '#fffefa',
          borderRadius: '0.7rem',
        },
        elements: {
          card: 'border border-canvas-border bg-white shadow-xl',
          formButtonPrimary: 'bg-pine-600 hover:bg-pine-700 text-white min-h-[46px] transition-colors',
        },
      }}
    >
      <html lang="en" className={`h-full ${outfit.variable} ${plexMono.variable}`}>
        <body className="min-h-full flex flex-col font-sans bg-canvas text-ink antialiased">
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
