/**
 * utils — class composition helpers for apps/web
 * ================================================
 * All class merging in this app uses cn(). Never concatenate class strings
 * manually — twMerge is required to resolve conflicts like
 * `cn('px-4', 'px-6')` → 'px-6' (last wins, no duplicate).
 *
 * cn()    — primary utility: merges clsx logic + tailwind-merge dedup
 * cvax()  — thin wrapper around cva() that lets you pass a className override
 *           at the call-site while still applying variant resolution.
 *
 * Both are also exported from @repo/ui for use in other packages.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Conditionally compose Tailwind classes with conflict resolution.
 *
 * @example
 * cn('px-4 py-2 bg-parchment', isActive && 'ring-2 ring-terracotta', className)
 * cn({ 'opacity-50 cursor-not-allowed': isDisabled })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Re-export cva and VariantProps so component files can import from one place.
 *
 * @example
 * const buttonVariants = cva('base-classes', {
 *   variants: { intent: { primary: 'bg-terracotta text-parchment-50' } },
 *   defaultVariants: { intent: 'primary' },
 * });
 */
export { cva, type VariantProps };
