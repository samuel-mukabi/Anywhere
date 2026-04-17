/**
 * app/page.tsx — Marketing home page
 * =====================================
 * This file lives at the root of `app/` (not inside a route group) because
 * Next.js does not allow two page files to serve the same route `/`.
 * The home page therefore imports NavBar and Footer directly rather than
 * relying on a wrapping layout.
 *
 * All other marketing pages (/destinations, /blog, /pricing) live inside
 * app/(marketing)/ and receive NavBar + Footer from the group layout.
 */
import type { Metadata } from 'next';
import { NavBar } from '@/components/navigation/NavBar';
import { Footer } from '@/components/navigation/Footer';
import Hero from '@/app/components/section/Hero';

export const metadata: Metadata = {
  title: 'Anywhere — Travel Within Your Budget',
  description:
    'Stop falling in love with destinations you can\'t afford. Anywhere ' +
    'reverses the search: enter your budget and see exactly where the world ' +
    'can take you — with real-time flights, cost of living, and climate data.',
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1 flex flex-col pt-[--aw-space-navbar]">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
