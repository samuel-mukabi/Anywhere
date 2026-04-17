/**
 * @repo/ui — Shared UI Utilities
 * ================================
 * Public exports for the Anywhere shared UI package.
 *
 * CSS tokens are exported as a CSS file, not from here:
 *   @import "@repo/ui/tokens.css"   ← in your app's globals.css
 */

// Class composition utility
export { cn } from './cn';

// Re-export cva for consistent variant authoring across apps
export { cva, type VariantProps } from 'class-variance-authority';
