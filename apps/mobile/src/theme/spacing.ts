/**
 * Anywhere Spacing Scale
 *
 * Based on a 4pt base unit — all layout values are multiples of 4.
 * Use these tokens via the theme object: theme.spacing.md
 */

export const spacing = {
  none:  0,
  xs:    4,
  sm:    8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
} as const;

export type SpacingToken = keyof typeof spacing;
