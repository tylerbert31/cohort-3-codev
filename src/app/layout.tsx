import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'cohort · Expedition & Group Trip Packing',
  description: 'Tactile, collaborative packing coordination for group adventures and expeditions.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#23523B',
          colorBackground: '#FAF8F5',
          borderRadius: '0.5rem',
        },
        elements: {
          card: 'border border-canvas-border bg-white',
          formButtonPrimary:
            'bg-pine-600 hover:bg-pine-700 text-white min-h-[44px] transition-colors',
        },
      }}
    >
      <html lang="en" className={`h-full ${fraunces.variable} ${inter.variable}`}>
        <body className="min-h-full flex flex-col font-sans bg-canvas text-ink antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
