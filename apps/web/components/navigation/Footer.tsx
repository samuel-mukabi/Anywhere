import Link from 'next/link';
import { Compass } from 'lucide-react';

const TwitterIcon = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>;
const InstagramIcon = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
const LinkedinIcon = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>;
const GithubIcon = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>;

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/explore',      label: 'Explore Destinations' },
      { href: '/pricing',      label: 'Pricing'              },
      { href: '/group-trips',  label: 'Group Trips'          },
      { href: '/changelog',    label: 'What\'s New'          },
    ],
  },
  {
    title: 'Destinations',
    links: [
      { href: '/destinations/europe',        label: 'Europe'          },
      { href: '/destinations/southeast-asia', label: 'Southeast Asia' },
      { href: '/destinations/africa',        label: 'Africa'          },
      { href: '/destinations/latin-america', label: 'Latin America'   },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about',   label: 'About'    },
      { href: '/blog',    label: 'Stories'  },
      { href: '/careers', label: 'Careers'  },
      { href: '/press',   label: 'Press'    },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy',  label: 'Privacy Policy'  },
      { href: '/terms',    label: 'Terms of Service' },
      { href: '/cookies',  label: 'Cookie Policy'   },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  { href: 'https://twitter.com/anywhere_travel',   label: 'Twitter',   Icon: TwitterIcon   },
  { href: 'https://instagram.com/anywhere_travel', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://linkedin.com/company/anywhere', label: 'LinkedIn',  Icon: LinkedinIcon  },
  { href: 'https://github.com/anywhere-travel',    label: 'GitHub',    Icon: GithubIcon    },
] as const;

export function Footer() {
  const now = new Date();
  const year = now.getFullYear();

  return (
    <footer
      className="bg-nearblack text-parchment-200"
      aria-label="Site footer"
    >
      {/* ── Top section: brand + columns ── */}
      <div className="container-page py-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8">

        {/* Brand column */}
        <div className="col-span-2 md:col-span-3 lg:col-span-1 flex flex-col gap-4">
          <Link
            href="/"
            className="font-astoria text-2xl font-light tracking-tight text-parchment-100 hover:text-terracotta-400 transition-colors"
            aria-label="Anywhere — home"
          >
            Anywhere
          </Link>
          <p className="text-sm font-cera text-parchment-400 leading-relaxed max-w-[220px]">
            Budget-first travel discovery.{' '}
            <span className="text-parchment-200">
              See where the world can take you for what you can actually spend.
            </span>
          </p>

          {/* Social links */}
          <div className="flex items-center gap-3 mt-1">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="p-2 rounded-md text-parchment-400 hover:text-parchment-100 hover:bg-midnight-600 transition-colors duration-150"
              >
                <Icon size={16} aria-hidden />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {FOOTER_COLUMNS.map(({ title, links }) => (
          <div key={title} className="flex flex-col gap-3">
            <h3 className="text-[0.7rem] font-cera font-semibold uppercase tracking-widest text-parchment-400">
              {title}
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm font-cera text-parchment-300 hover:text-parchment-100 transition-colors duration-150"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-midnight-600" />

      {/* ── Bottom bar ── */}
      <div className="container-page py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs font-cera text-parchment-400 flex items-center gap-1.5">
          <Compass size={12} aria-hidden className="text-terracotta-500" />
          &copy; {year} Anywhere Travel, Inc. All rights reserved.
        </p>
        <p className="text-xs font-cera text-parchment-500">
          Made with{' '}
          <span aria-label="love" role="img">♥</span>
          {' '}for budget-curious travellers worldwide.
        </p>
      </div>
    </footer>
  );
}
