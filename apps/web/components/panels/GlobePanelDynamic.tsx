'use client';

import dynamic from 'next/dynamic';

export const GlobePanel = dynamic(
  () => import('./GlobePanel').then((m) => m.GlobePanel),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-midnight-800 animate-pulse flex-center">
        <span className="sr-only">Loading map…</span>
      </div>
    ),
  }
);
