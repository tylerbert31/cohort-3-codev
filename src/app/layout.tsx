import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Outing & Packing Checklist',
  description: 'Collaborative outing and packing checklists for group trips and adventures.',
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
          card: 'border border-canvas-border shadow-xs bg-white',
          formButtonPrimary:
            'bg-pine-600 hover:bg-pine-700 text-white min-h-[44px] transition-colors',
        },
      }}
    >
      <html lang="en" className="h-full">
        <body className="min-h-full flex flex-col font-sans bg-canvas text-ink antialiased">
          <QueryProvider>
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
