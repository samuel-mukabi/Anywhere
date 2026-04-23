/**
 * Anywhere Design System — Theme Barrel
 *
 * Single import point for all design tokens:
 *   import { theme } from '@/core/theme';
 */

import { Colors } from './colors';
import { spacing } from './spacing';
import { radii } from './radii';
import { typography } from './typography';

export const theme = {
  colors:     Colors,
  spacing,
  radii,
  typography,
} as const;

export type Theme = typeof theme;

// Re-export individual token objects for tree-shaking when needed
export { Colors } from './colors';
export { spacing } from './spacing';
export { radii } from './radii';
export { typography } from './typography';
export type { ColorToken } from './colors';
export type { SpacingToken } from './spacing';
export type { RadiiToken } from './radii';
export type { FontSizeToken, LineHeightToken } from './typography';
