'use client';

/**
 * NavBar — Primary global navigation
 * ====================================
 * Design:
 *  - Transparent at page top → frosted-glass on scroll
 *  - Astoria logotype + Cera nav links
 *  - Active link highlighted with terracotta tint
 *  - Responsive: desktop row / mobile full-screen drawer
 *  - Accessible: aria-expanded, focus-visible rings, reduced-motion aware
 *
 * Token usage:
 *  bg-parchment/90 backdrop-blur  → glassy header on scroll
 *  text-terracotta bg-terracotta-100 → active nav link
 *  bg-terracotta rounded-pill      → primary CTA button
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/explore',      label: 'Explore'      },
  { href: '/destinations', label: 'Destinations' },
  { href: '/blog',         label: 'Stories'      },
  { href: '/pricing',      label: 'Pricing'      },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const [isScrolled,    setIsScrolled]    = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);

  // Scroll listener — passive for performance
  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 24);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-[--aw-z-navbar] transition-all duration-300 ease-out',
          isScrolled
            ? 'bg-parchment/92 backdrop-blur-md shadow-sm border-b border-parchment-400'
            : 'bg-transparent',
        )}
      >
        <nav
          className="container-page flex items-center justify-between h-[--aw-space-navbar]"
          aria-label="Main navigation"
        >
          {/* ── Logotype ── */}
          <Link
            href="/"
            className={cn(
              'font-astoria text-[1.6rem] font-light tracking-[-0.02em] leading-none',
              'text-nearblack hover:text-terracotta transition-colors duration-200',
              'focus-visible:outline-none focus-visible:shadow-focus rounded-sm',
            )}
            aria-label="Anywhere — home"
          >
            Anywhere
          </Link>

          {/* ── Desktop link list ── */}
          <ul
            className="hidden md:flex items-center gap-0.5"
            role="list"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'relative px-3.5 py-2 rounded-md text-[0.875rem] font-cera font-medium',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    isActive(href)
                      ? 'text-terracotta bg-terracotta-100'
                      : 'text-nearblack-600 hover:text-nearblack hover:bg-parchment-400',
                  )}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  {label}
                  {/* Active underline accent */}
                  {isActive(href) && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-3.5 right-3.5 h-px bg-terracotta/40 rounded-full"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Desktop right actions ── */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/login"
              className={cn(
                'px-4 py-2 text-[0.875rem] font-cera font-medium text-nearblack-600',
                'hover:text-nearblack transition-colors duration-150',
                'focus-visible:outline-none focus-visible:shadow-focus rounded-md',
              )}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={cn(
                'px-5 py-2.5 bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-900',
                'text-parchment-50 text-[0.875rem] font-cera font-semibold',
                'rounded-pill shadow-sm hover:shadow-card',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:shadow-glow-terracotta',
              )}
            >
              Get started
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
            className={cn(
              'md:hidden p-2 rounded-md text-nearblack-700',
              'hover:bg-parchment-400 transition-colors duration-150',
              'focus-visible:outline-none focus-visible:shadow-focus',
            )}
          >
            <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            {mobileOpen
              ? <X size={20} aria-hidden />
              : <Menu size={20} aria-hidden />
            }
          </button>
        </nav>
      </header>

      {/* ── Mobile drawer ── */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'md:hidden fixed inset-0 z-[calc(var(--aw-z-navbar)-1)] flex flex-col',
          'transition-all duration-300 ease-out',
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 bg-nearblack/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer panel — slides from top, below the navbar */}
        <nav
          className={cn(
            'relative mt-[--aw-space-navbar] mx-3 rounded-modal',
            'bg-parchment/98 backdrop-blur-md shadow-modal',
            'border border-parchment-400',
            'p-5 transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-y-0' : '-translate-y-4',
          )}
        >
          <ul className="flex flex-col gap-1 mb-5" role="list">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-lg',
                    'text-base font-cera font-medium transition-colors duration-150',
                    isActive(href)
                      ? 'text-terracotta bg-terracotta-100'
                      : 'text-nearblack-700 hover:bg-parchment-400',
                  )}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t border-parchment-400 flex flex-col gap-2.5">
            <Link
              href="/login"
              className="text-center px-4 py-3 border border-parchment-500 rounded-md text-sm font-cera font-medium text-nearblack-700 hover:bg-parchment-400 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-center px-4 py-3 bg-terracotta hover:bg-terracotta-600 text-parchment-50 text-sm font-cera font-semibold rounded-pill transition-colors duration-200"
            >
              Get started — it&apos;s free
            </Link>
          </div>

          {/* Brand tagline */}
          <p className="mt-5 text-center text-xs font-cera text-nearblack-600 flex items-center justify-center gap-1.5">
            <Compass size={12} aria-hidden className="text-terracotta" />
            Budget-first travel discovery
          </p>
        </nav>
      </div>
    </>
  );
}
