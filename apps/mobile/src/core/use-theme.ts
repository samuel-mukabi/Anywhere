/**
 * useTheme — Global design token access hook
 *
 * Returns the full theme object. Use this in every component
 * instead of hardcoded values or local color constants.
 *
 * Usage:
 *   const { colors, spacing, radii, typography } = useTheme();
 *   <View style={{ backgroundColor: colors.background, padding: spacing.md }} />
 */

import { theme, Theme } from '@/core/theme';

export function useTheme(): Theme {
  return theme;
}
