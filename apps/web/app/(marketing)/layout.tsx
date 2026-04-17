/**
 * (marketing) layout — public-facing pages
 * ==========================================
 * Wraps all routes inside app/(marketing)/:
 *   /destinations, /destinations/[slug]
 *   /blog, /blog/[slug]
 *   /pricing
 *   /about, /careers, /press
 *
 * Provides:
 *  - Persistent NavBar (scroll-aware, glassmorphism)
 *  - Footer with full link columns
 *  - Proper scroll-margin for anchor links below the fixed navbar
 *
 * Note: The home page (/) lives at app/page.tsx (outside this group)
 * and imports NavBar/Footer directly to avoid a route conflict.
 */
import type { Metadata } from 'next';
import { NavBar } from '@/components/navigation/NavBar';
import { Footer } from '@/components/navigation/Footer';

export const metadata: Metadata = {
  // Narrow default for marketing sub-pages — each page overrides as needed
  openGraph: { type: 'website', siteName: 'Anywhere' },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />

      {/* Offset content below fixed navbar */}
      <main
        className="flex-1 pt-[--aw-space-navbar]"
        id="main-content"  // skip-to-main landmark target
      >
        {children}
      </main>

      <Footer />
    </div>
  );
}
