/**
 * Anywhere Border Radius Scale
 *
 * Used for cards, buttons, inputs, chips, and avatars.
 */

export const radii = {
  none:  0,
  xs:    2,
  sm:    4,
  md:    8,
  lg:   12,
  xl:   20,
  full: 9999,  // pill / circle
} as const;

export type RadiiToken = keyof typeof radii;
