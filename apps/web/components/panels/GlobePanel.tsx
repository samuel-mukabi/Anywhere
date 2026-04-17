'use client';

/**
 * GlobePanel — Right-side map/globe panel placeholder
 * ====================================================
 * This component is the right half of the 50/50 split-screen layout
 * used by the (app) route group (explore, dashboard, etc.)
 *
 * The actual Mapbox GL JS BudgetMap (ADR-005) will replace the decorative
 * globe below. This placeholder:
 *  - Matches the midnight color palette of the real map
 *  - Shows a CSS-animated atmospheric sphere so the layout feels alive
 *  - Renders a "budget slider coming soon" overlay
 *
 * Import pattern (lazy-loaded from app layout to avoid SSR):
 *  const GlobePanel = dynamic(() => import('@/components/panels/GlobePanel')
 *    .then(m => m.GlobePanel), { ssr: false })
 */
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function GlobePanel({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle latitude-line animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    let t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const r  = Math.min(w, h) * 0.36;

      // Globe outline
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(238, 235, 217, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Latitude lines (animated)
      for (let lat = -75; lat <= 75; lat += 25) {
        const latRad = (lat * Math.PI) / 180;
        const ry     = r * Math.cos(latRad);
        const y      = cy + r * Math.sin(latRad);
        const phase  = t * 0.4 + lat * 0.05;
        const alpha  = 0.06 + 0.04 * Math.sin(phase);

        ctx.beginPath();
        ctx.ellipse(cx, y, ry, ry * 0.28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(238, 235, 217, ${alpha})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }

      // Longitude lines
      for (let lng = 0; lng < 180; lng += 30) {
        const lngRad = (lng * Math.PI) / 180 + t * 0.08;
        const alpha  = 0.04 + 0.03 * Math.abs(Math.sin(lngRad));

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(lngRad);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.15, r, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(238, 235, 217, ${alpha})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
        ctx.restore();
      }

      // Destination dots (static placeholder positions)
      const destinations = [
        { latV: -0.22, lngV: 0.18, label: 'Lisbon',    cost: '$487' },
        { latV:  0.12, lngV: 0.55, label: 'Bangkok',   cost: '$392' },
        { latV: -0.08, lngV: 0.30, label: 'Tbilisi',   cost: '$341' },
        { latV:  0.25, lngV: 0.12, label: 'Edinburgh', cost: '$498' },
        { latV: -0.18, lngV: 0.72, label: 'Bali',      cost: '$445' },
      ];

      destinations.forEach(({ latV, lngV, label, cost }) => {
        const dx = cx + r * lngV * Math.cos(t * 0.06 + lngV);
        const dy = cy + r * latV;
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.2 + lngV * 5);

        // Dot
        ctx.beginPath();
        ctx.arc(dx, dy, 5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${0.85 * pulse})`; // --aw-affordable
        ctx.fill();

        // Glow ring
        ctx.beginPath();
        ctx.arc(dx, dy, 10 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.25 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.font = `500 11px ui-sans-serif, system-ui`;
        ctx.fillStyle = 'rgba(238, 235, 217, 0.75)';
        ctx.fillText(`${label}  ${cost}`, dx + 12, dy + 4);
      });

      t += 0.015;
      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden bg-midnight-800',
        className,
      )}
      aria-hidden // decorative — screen readers use the left panel
    >
      {/* Atmospheric radial градиент */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(58,82,107,0.45)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_50%,rgba(144,72,20,0.08)_0%,transparent_60%)]" />

      {/* Globe canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Top-left: map attribution placeholder */}
      <div className="absolute bottom-4 left-4 text-[10px] font-cera text-parchment-400/60">
        Map powered by Mapbox © Anywhere
      </div>

      {/* Budget prompt overlay — will be replaced by actual BudgetMap controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        <div className="bg-midnight-700/80 backdrop-blur-sm border border-midnight-500 rounded-card px-5 py-3 text-center shadow-map-popup">
          <p className="text-[0.7rem] font-cera font-medium uppercase tracking-widest text-parchment-400 mb-0.5">
            Your budget
          </p>
          <p className="text-2xl font-cera font-bold text-parchment-100 tabular-nums">
            $500
          </p>
        </div>
        <p className="text-[0.65rem] font-cera text-parchment-400/70">
          ↑ Set a budget to light up destinations
        </p>
      </div>
    </div>
  );
}
