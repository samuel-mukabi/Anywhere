/**
 * cn — conditional class composition
 * ====================================
 * Combines clsx (conditional class logic) with tailwind-merge (deduplication
 * of conflicting Tailwind utilities). This is the ONLY way to compose classes
 * across Anywhere components — never use raw string concatenation.
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-terracotta', className)
 *   cn({ 'opacity-50': isDisabled, 'cursor-not-allowed': isDisabled })
 *
 * Import from:
 *   import { cn } from '@repo/ui'          (other packages)
 *   import { cn } from '@/lib/utils'       (within apps/web)
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
