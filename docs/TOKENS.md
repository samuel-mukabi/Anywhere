# Anywhere Design Token Reference

> **Source file**: [`packages/ui/tokens.css`](../packages/ui/tokens.css)  
> **Tailwind mapping**: [`apps/web/app/globals.css`](../apps/web/app/globals.css) `@theme inline` block  
> **Last Updated**: 2026-04-17

Anywhere uses a **three-layer token architecture**:

```
Layer 1 — Primitives   --aw-parchment-300, --aw-terracotta-700 …
Layer 2 — Semantics    --aw-surface-page, --aw-text-primary …
Layer 3 — Tailwind     bg-parchment, text-nearblack, accent-terracotta …
```

Components should reference **Layer 3 (Tailwind classes)** in JSX and **Layer 2 (semantic vars)** in raw CSS. Never hardcode hex values.

---

## Note on Tailwind v4

This project uses **Tailwind CSS v4**, which is **CSS-config only** — there is no `tailwind.config.ts`. All theme extensions live in the `@theme inline` block inside `globals.css`. Every `--color-{name}` registered there automatically generates the full suite of color utilities: `bg-{name}`, `text-{name}`, `border-{name}`, `ring-{name}`, `accent-{name}`, `fill-{name}`, `stroke-{name}`.

---

## Color Tokens

### Parchment — Warm Off-White Backgrounds

| Token (CSS) | Hex | Tailwind Class | Use |
|-------------|-----|---------------|-----|
| `--aw-parchment-300` | `#EEEBD9` | `bg-parchment` | **Page background** — the primary canvas |
| `--aw-parchment-200` | `#F5F2E6` | `bg-parchment-200` | **Card surfaces** — slightly lighter than page |
| `--aw-parchment-100` | `#F9F7EE` | `bg-parchment-100` | Elevated surfaces, modal backgrounds |
| `--aw-parchment-50`  | `#FDFCF7` | `bg-parchment-50`  | Highest elevation, tooltips |
| `--aw-parchment-400` | `#E5E1CA` | `bg-parchment-400` | Subtle rule lines, dividers |
| `--aw-parchment-500` | `#D8D3B8` | `bg-parchment-500` | Stronger dividers, skeleton states |

> **Rule**: Use `bg-parchment` for `<body>` and full-page sections. Use `bg-parchment-200` for cards and side panels. Never use white (`#fff`) as a background — it clashes with the warm palette.

---

### Nearblack — Warm Dark Text

| Token (CSS) | Hex | Tailwind Class | Use |
|-------------|-----|---------------|-----|
| `--aw-nearblack-800` | `#282427` | `text-nearblack` | **Primary text** — headings and body copy |
| `--aw-nearblack-700` | `#3D3940` | `text-nearblack-700` | Secondary headings |
| `--aw-nearblack-600` | `#5C5860` | `text-nearblack-600` | Secondary body text, captions |
| `--aw-nearblack-900` | `#1A181B` | `text-nearblack-900` | Maximum contrast (use sparingly) |

> **Rule**: Never use `text-black` or `#000000` — it reads as harsh against the parchment palette. `text-nearblack` (`#282427`) is the darkest text colour used anywhere on a light surface.

---

### Terracotta — Primary Brand / CTA

| Token (CSS) | Hex | Tailwind Class | Use |
|-------------|-----|---------------|-----|
| `--aw-terracotta-700` | `#904814` | `bg-terracotta` / `text-terracotta` / `accent-terracotta` | **Primary buttons, key CTAs, active nav state** |
| `--aw-terracotta-600` | `#AF602A` | `bg-terracotta-600` | Button hover state |
| `--aw-terracotta-900` | `#6B340D` | `bg-terracotta-900` | Button pressed / active state |
| `--aw-terracotta-500` | `#C87840` | `text-terracotta-500` | Light accent text on dark surfaces |
| `--aw-terracotta-400` | `#E09A62` | `text-terracotta-400` | Very subtle accent, warm highlights |
| `--aw-terracotta-100` | `#F9EDE3` | `bg-terracotta-100` | **Muted backgrounds** — hover states on secondary buttons, badge fills |

> **Rules**:
> - `bg-terracotta` always pairs with `text-parchment-50` (not white).
> - Use `bg-terracotta-100` for pill/badge backgrounds rather than the full terracotta — it's less aggressive for informational elements.
> - The `accent-terracotta` class sets `accent-color` — use it on `<input type="checkbox">`, `<input type="range">` (budget slider) for branded form controls.

#### Button pattern
```tsx
// Primary CTA
<button className="bg-terracotta hover:bg-terracotta-600 active:bg-terracotta-900
                   text-parchment-50 rounded-pill px-6 py-3 font-cera font-medium
                   transition-colors duration-200 shadow-sm hover:shadow-card">
  Search Destinations
</button>
```

---

### Sage — Secondary / Nature

| Token (CSS) | Hex | Tailwind Class | Use |
|-------------|-----|---------------|-----|
| `--aw-sage-700` | `#3D6B5E` | `bg-sage` / `text-sage` | **Secondary actions**, Pro feature badges, nature filters |
| `--aw-sage-600` | `#4F8275` | `bg-sage-600` | Hover state |
| `--aw-sage-500` | `#5A8A7B` | `text-sage-500` | Lighter accent on dark |
| `--aw-sage-100` | `#E6F0EE` | `bg-sage-100` | Muted sage background, success states |
| `--aw-sage-900` | `#294840` | `bg-sage-900` | Dark sage (map overlay panels) |

> **Rule**: Sage is used for "Group Sync" features, climate/nature filter chips, and the secondary button style. It should never compete with terracotta on the same visual element.

---

### Midnight — Map Globe / Dark Surfaces

| Token (CSS) | Hex | Tailwind Class | Use |
|-------------|-----|---------------|-----|
| `--aw-midnight-800` | `#1C2B36` | `bg-midnight` | **Map globe background**, dark panel mode |
| `--aw-midnight-700` | `#243344` | `bg-midnight-700` | Slightly lighter dark surface |
| `--aw-midnight-600` | `#2E4258` | `bg-midnight-600` | Map overlay panel background |
| `--aw-midnight-500` | `#3A526B` | `bg-midnight-500` | Dark card borders / dividers |
| `--aw-midnight-900` | `#0E1820` | `bg-midnight-900` | Deepest dark (footer, map edges) |

> **Rule**: Midnight surfaces always use `text-parchment-100` or `text-parchment-200` for body text. Never use dark text on midnight backgrounds.

---

### Gold — Pro Tier Accent

| Token (CSS) | Hex | Tailwind Class | Use |
|-------------|-----|---------------|-----|
| `--aw-gold-500` | `#D4A017` | `bg-gold` / `text-gold` | **Pro badge**, upgrade prompts, starred features |
| `--aw-gold-400` | `#E8B84B` | `text-gold-400` | Pro icon fills |
| `--aw-gold-100` | `#FDF7E3` | `bg-gold-100` | Muted Pro feature background |
| `--aw-gold-600` | `#B8860B` | `text-gold-600` | Darker gold for text on light surfaces |

> **Rule**: Gold is **exclusively** for Pro tier communication. Using it in free-tier UI devalues the Pro upsell.

---

### Map Status Colors

| Token (CSS) | Tailwind Class | Use |
|-------------|---------------|-----|
| `--aw-affordable` (`#22C55E`) | `bg-affordable` / `text-affordable` | Destination marker — within budget |
| `--aw-overbudget` (`#EF4444`) | `bg-overbudget` / `text-overbudget` | Destination marker — over budget |
| `--aw-map-cluster` (`#6366F1`) | `bg-map-cluster` | Clustered destination group |

> **Rule**: These colors are used **exclusively** in the Mapbox GL layer via `setPaintProperty`. Do not repurpose them for general UI states (success/error) — use shadcn's `--destructive` and `--muted` for that. The map colors must remain consistent across the entire map surface.

---

## Shadow Tokens

| Token | Tailwind Class | Use |
|-------|---------------|-----|
| `--aw-shadow-xs` | `shadow-xs` | Subtle lift (chips, tags) |
| `--aw-shadow-sm` | `shadow-sm` | Default small UI shadow |
| `--aw-shadow-card` | `shadow-card` | **Destination cards** at rest |
| `--aw-shadow-card-hover` | `shadow-card-hover` | Destination cards on hover |
| `--aw-shadow-dropdown` | `shadow-dropdown` | Dropdowns, autocomplete list |
| `--aw-shadow-modal` | `shadow-modal` | Modal overlays |
| `--aw-shadow-map` | `shadow-map` | Map container drop shadow |
| `--aw-shadow-map-popup` | `shadow-map-popup` | Price popup on map |
| `--aw-shadow-glow-terracotta` | `shadow-glow-terracotta` | Focus ring on primary buttons |
| `--aw-shadow-glow-sage` | `shadow-glow-sage` | Focus ring on secondary buttons |
| `--aw-shadow-focus` | `shadow-focus` | Keyboard focus indicator (2px offset) |

> **Rule**: Use `shadow-focus` on **all keyboard-interactive elements** for accessibility. Never suppress focus styles.

---

## Border Radius Tokens

| Token | Tailwind Class | Value | Use |
|-------|---------------|-------|-----|
| `--aw-radius-xs` | `rounded-xs` | 4px | Micro elements (checkboxes, dots) |
| `--aw-radius-sm` | `rounded-sm` | 8px | Tags, badges, tooltips |
| `--aw-radius-md` | `rounded-md` | 12px | Inputs, secondary buttons |
| `--aw-radius-lg` | `rounded-lg` | 16px | Map popups, compact cards |
| `--aw-radius-xl` | `rounded-xl` | 20px | Standard cards |
| `--aw-radius-2xl` | `rounded-2xl` | 24px | Feature cards, large panels |
| `--aw-radius-3xl` | `rounded-3xl` | 32px | Hero sections, page-level cards |
| `--aw-radius-pill` | `rounded-pill` | 9999px | **Primary buttons**, filter chips, Pro badge |
| `--aw-radius-card` | `rounded-card` | 20px | Semantic alias for destination cards |
| `--aw-radius-modal` | `rounded-modal` | 24px | Semantic alias for modals / sheets |

> **Rule**: Primary CTA buttons always use `rounded-pill`. Secondary/outline buttons use `rounded-md`. Never use sharp corners (`rounded-none`) on user-facing UI — it conflicts with the warm editorial aesthetic.

---

## Typography Tokens

### Font Families

| Token | Tailwind Class | Use |
|-------|---------------|-----|
| `--font-astoria` | `font-astoria` | All headings (`h1`–`h6`), display text, hero labels |
| `--font-cera` | `font-cera` / `font-sans` | Body copy, UI labels, navigation, numbers, form inputs |

> **Rules:**
> - `font-astoria` has editorial warmth — use it for anything the user *reads as content* (destination names, page titles).
> - `font-cera` is geometric and precise — use it for anything the user *acts on* (buttons, labels, prices, filters).
> - **Never** use Astoria for body copy below `18px` — it loses legibility at small sizes.
> - **Never** use Cera for primary headings above the fold — it lacks the editorial character Anywhere projects.

### Recommended Pairings

```tsx
// Hero heading
<h1 className="font-astoria font-light text-5xl tracking-tight text-nearblack">
  Where can you go for <span className="text-terracotta">$500</span>?
</h1>

// Eyebrow label above heading
<p className="font-cera font-medium text-xs tracking-widest uppercase text-nearblack-600">
  Budget Travel Reinvented
</p>

// Price display
<span className="font-cera font-bold text-3xl text-nearblack tabular-nums">
  $487
</span>

// Body copy
<p className="font-cera font-normal text-base text-nearblack-700 leading-relaxed">
  Lisbon offers incredible value for budget-conscious travellers…
</p>
```

---

## Spacing Tokens (Semantic)

These are CSS custom properties for use in raw CSS / Tailwind's `@apply`. For spacing in JSX, use standard Tailwind spacing scale (`p-4`, `gap-6`, etc.).

| Token | Value | Use |
|-------|-------|-----|
| `--aw-space-section-y` | `5rem` | Vertical padding for `<section>` elements |
| `--aw-space-section-x` | `clamp(1.5rem, 5vw, 6rem)` | Horizontal container inset (responsive) |
| `--aw-space-card` | `1.5rem` | Card internal padding |
| `--aw-space-navbar` | `4rem` | Fixed navbar height — use for `scroll-mt-navbar` |
| `--aw-space-budget-bar` | `5.5rem` | Budget slider bar height |

---

## Motion Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--aw-duration-fast` | `120ms` | Hover colour changes, focus rings |
| `--aw-duration-base` | `200ms` | Most UI transitions |
| `--aw-duration-slow` | `350ms` | Modals, drawers, page transitions |
| `--aw-duration-map` | `800ms` | Map marker animations (budget slider) |
| `--aw-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default — snappy deceleration |
| `--aw-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Micro-interaction overshoot (map popup appear) |
| `--aw-ease-map` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Map pan/zoom transitions |

---

## Z-Index Tokens

| Token | Value | Layer |
|-------|-------|-------|
| `--aw-z-base` | `0` | Default content |
| `--aw-z-raised` | `10` | Floating cards, sticky elements |
| `--aw-z-dropdown` | `100` | Dropdowns, autocomplete |
| `--aw-z-sticky` | `200` | Sticky headers within page |
| `--aw-z-navbar` | `300` | Global navigation bar |
| `--aw-z-overlay` | `400` | Map price overlay |
| `--aw-z-modal` | `500` | Modals and full-screen overlays |
| `--aw-z-toast` | `600` | Toast notifications |
| `--aw-z-tooltip` | `700` | Tooltips (must always be on top) |

---

## Class Composition — `cn()` and `cva`

### cn() — conditional classes

```tsx
import { cn } from '@/lib/utils'; // in apps/web
import { cn } from '@repo/ui';    // in other packages

// Conditional classes
<div className={cn('rounded-card shadow-card bg-parchment-200 p-6',
                   isHovered && 'shadow-card-hover',
                   isSelected && 'ring-2 ring-terracotta',
                   className)} />
```

### cva() — component variants

```tsx
import { cva, type VariantProps } from '@/lib/utils';

const button = cva(
  // Base classes (always applied)
  'inline-flex items-center gap-2 font-cera font-medium transition-colors duration-200 focus-visible:shadow-focus',
  {
    variants: {
      intent: {
        primary:   'bg-terracotta hover:bg-terracotta-600 text-parchment-50 rounded-pill shadow-sm',
        secondary: 'bg-sage hover:bg-sage-600 text-parchment-50 rounded-pill shadow-sm',
        outline:   'border border-terracotta text-terracotta hover:bg-terracotta-100 rounded-md',
        ghost:     'text-nearblack-700 hover:bg-parchment-400 rounded-md',
        pro:       'bg-gold text-nearblack font-bold rounded-pill shadow-sm',
      },
      size: {
        sm:  'text-sm px-4 py-1.5',
        md:  'text-base px-6 py-2.5',
        lg:  'text-lg px-8 py-3',
        xl:  'text-xl px-10 py-4',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>
  & VariantProps<typeof button>;

export function Button({ intent, size, className, ...props }: ButtonProps) {
  return <button className={cn(button({ intent, size }), className)} {...props} />;
}
```

---

## Anti-Patterns (Do Not Do)

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| `style={{ color: '#904814' }}` | `className="text-terracotta"` |
| `className="bg-white"` | `className="bg-parchment-50"` |
| `className="text-black"` | `className="text-nearblack"` |
| `className="rounded-full"` | `className="rounded-pill"` (primary btn) or `className="rounded-card"` (card) |
| `className="bg-green-500"` | `className="bg-affordable"` (map) or `className="bg-sage-100"` (UI success) |
| `className={'p-4 ' + (active ? 'bg-terracotta' : '')}` | `className={cn('p-4', active && 'bg-terracotta')}` |
| Mixing `font-astoria` with body-size copy | Use `font-cera` for anything below `18px` |
