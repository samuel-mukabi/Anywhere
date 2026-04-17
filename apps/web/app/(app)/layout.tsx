import type { Metadata } from 'next';
import { NavBar } from '@/components/navigation/NavBar';
import { GlobePanel } from '@/components/panels/GlobePanelDynamic';
import { cn } from '@/lib/utils';

/**
 * (app) layout — authenticated split-screen shell
 * =================================================
 * The core product layout for auth-gated pages:
 *   /explore         — interactive budget map (primary feature)
 *   /dashboard       — user's saved trips and search history
 *   /trips/[id]      — individual trip room (group sync)
 *   /account         — subscription and profile settings
 *
 * Structure:
 * ┌─────────────────┬────────────────────────────────────┐
 * │   NavBar (full width, fixed, above both panels)       │
 * ├─────────────────┬────────────────────────────────────┤
 * │  LEFT PANEL     │           RIGHT PANEL              │
 * │  (40% width)    │           (60% width)              │
 * │  Scrollable     │           Fixed / overflow hidden  │
 * │  Budget slider  │           Mapbox GL globe          │
 * │  Filters        │           Price markers            │
 * │  Results list   │           (GlobePanel placeholder) │
 * └─────────────────┴────────────────────────────────────┘
 *
 * Responsive:
 *  - Mobile (<lg):  left panel fills full width; globe hidden
 *  - Tablet (lg+):  40/60 split; globe visible
 *
 * GlobePanel is lazy-loaded (dynamic import) because:
 *  1. Mapbox GL JS (~260KB gz) should not block the left panel render
 *  2. It cannot run on the server (WebGL + DOM dependency)
 */

// GlobePanel is loaded dynamically within GlobePanelDynamic to prevent WebGL import on the server.

export const metadata: Metadata = {
  // App routes are not indexed — they require auth
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * h-screen prevents body scroll — only the left panel scrolls internally.
     * This keeps the globe fixed while the user browses the results list.
     */
    <div className="h-screen overflow-hidden flex flex-col bg-parchment">

      {/* Fixed navbar spans full width above both panels */}
      <NavBar />

      {/* Split content area — offset below fixed navbar */}
      <div
        className="flex flex-1 overflow-hidden"
        style={{ paddingTop: 'var(--aw-space-navbar)' }}
      >

        {/* ── LEFT PANEL — controls + results ── */}
        <div
          className={cn(
            'w-full lg:w-[42%] xl:w-[38%]',
            'h-full overflow-y-auto',
            'flex flex-col',
            'bg-parchment',
            // Subtle right border to separate from globe
            'border-r border-parchment-400',
          )}
          id="left-panel"
        >
          {children}
        </div>

        {/* ── RIGHT PANEL — interactive globe/map ── */}
        <div
          className="hidden lg:block flex-1 h-full relative"
          id="globe-panel"
          aria-label="Interactive destination map"
        >
          <GlobePanel className="absolute inset-0" />
        </div>

      </div>
    </div>
  );
}
