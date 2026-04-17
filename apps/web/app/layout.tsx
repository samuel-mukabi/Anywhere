import type { Metadata } from 'next';
import { astoria, cera } from '@/public/fonts/fonts';
import './globals.css';
import { QueryProvider } from './providers';
import { cn } from '@/lib/utils';

/**
 * Root layout — minimal shell
 * ============================
 * Responsibilities:
 *  1. Inject CSS font variables into <html> via next/font/local className
 *  2. Wrap all children with the TanStack Query provider
 *  3. Set site-wide default metadata (overridden per-page/layout)
 *
 * NOT responsible for:
 *  - Navigation (lives in (marketing)/layout.tsx and (app)/layout.tsx)
 *  - Footer (lives in (marketing)/layout.tsx)
 *
 * Font variables injected:
 *  --font-astoria  →  font-astoria  (Tailwind: headings)
 *  --font-cera     →  font-cera / font-sans  (Tailwind: body)
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_URL ?? 'https://anywhere.travel',
  ),
  title: {
    default:  'Anywhere — Travel Within Your Budget',
    template: '%s | Anywhere',
  },
  description:
    'Discover destinations that fit your budget. Enter what you can spend — ' +
    'see where the world can take you. Real-time flights, cost of living, and ' +
    'climate data in one reverse-search travel planner.',
  keywords: ['budget travel', 'travel planning', 'cheap flights', 'destinations', 'backpacking'],
  openGraph: {
    type:        'website',
    siteName:    'Anywhere',
    title:       'Anywhere — Travel Within Your Budget',
    description: 'Budget-first travel discovery. See where the world can take you.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image',
    site:        '@anywhere_travel',
    creator:     '@anywhere_travel',
  },
  robots: {
    index:  true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Font CSS variables — picked up by Tailwind @theme mappings in globals.css
      className={cn(astoria.variable, cera.variable, 'h-full antialiased')}
      suppressHydrationWarning // tolerate browser extension class injections
    >
      <body className="min-h-full font-cera bg-parchment text-nearblack">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
