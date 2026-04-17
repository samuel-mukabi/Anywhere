import type { Metadata } from 'next';

/**
 * (auth) layout — login / signup / forgot-password
 * ==================================================
 * Minimal shell: centred card, no NavBar, no Footer clutter.
 * A subtle parchment background with a terracotta brand mark.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      {/* Subtle brand mark */}
      <div className="pt-8 pb-6 flex-center">
        <a
          href="/"
          className="font-astoria text-2xl font-light tracking-tight text-nearblack hover:text-terracotta transition-colors"
          aria-label="Anywhere — home"
        >
          Anywhere
        </a>
      </div>

      {/* Auth card */}
      <main className="flex-1 flex-center px-4 pb-16" id="main-content">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="py-6 text-center">
        <p className="text-xs font-cera text-nearblack-600">
          &copy; {new Date().getFullYear()} Anywhere Travel, Inc.
          {' · '}
          <a href="/privacy" className="hover:text-nearblack underline underline-offset-2">Privacy</a>
          {' · '}
          <a href="/terms" className="hover:text-nearblack underline underline-offset-2">Terms</a>
        </p>
      </footer>
    </div>
  );
}
