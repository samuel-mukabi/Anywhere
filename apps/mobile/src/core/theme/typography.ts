/**
 * Anywhere Typography Scale
 *
 * Font families:
 *   Display / Headings → 'Astoria' (custom serif) → fallback: Georgia, serif
 *   Body / UI          → 'Cera' (custom sans-serif) → fallback: System, sans-serif
 *
 * Font sizes follow a modular scale tuned for mobile legibility.
 * Line heights are unitless multipliers (React Native style).
 */

export const fontFamilies = {
  display: 'Astoria',
  displayFallback: 'Georgia',
  body:    'CeraPro-Regular',
  bodyMedium: 'CeraPro-Medium',
  bodyBold: 'CeraPro-Bold',
  bodyFallback: 'System',
  mono:    'Courier New',
} as const;

export const fontSizes = {
  xs:      11,
  sm:      12,
  md:      14,
  lg:      16,
  xl:      20,
  xxl:     28,
  display: 36,
  hero:    48,
} as const;

export const lineHeights = {
  xs:      15,
  sm:      16,
  md:      20,
  lg:      24,
  xl:      28,
  xxl:     36,
  display: 44,
  hero:    56,
} as const;

export const fontWeights = {
  regular: '400',
  medium:  '500',
  semibold:'600',
  bold:    '700',
} as const;

export const letterSpacings = {
  tight:  -0.5,
  normal:  0,
  wide:    0.5,
  wider:   1.0,
  widest:  2.0,  // for ALL CAPS labels / eyebrows
} as const;

export const typography = {
  fontFamilies,
  fontSizes,
  lineHeights,
  fontWeights,
  letterSpacings,
} as const;

export type FontSizeToken = keyof typeof fontSizes;
export type LineHeightToken = keyof typeof lineHeights;
