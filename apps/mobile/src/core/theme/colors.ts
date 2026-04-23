/**
 * Anywhere Brand Color Tokens
 *
 * Palette derived from the brand identity:
 *   Parchment  — warm off-white background
 *   Near-Black — primary text / UI chrome
 *   Terracotta — primary accent / CTA
 *   Sage       — secondary accent / nature
 *   Ocean      — tertiary / travel destinations
 */

const palette = {
  // ── Core Brand ───────────────────────────────────────────────────────────
  parchment:   '#EEEBD9',
  nearBlack:   '#282427',
  terracotta:  '#C4713A',
  sage:        '#7A957A',
  ocean:       '#3B6E8F',

  // ── Neutrals ─────────────────────────────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  grey100:     '#F5F4EF',   // near-parchment surface
  grey200:     '#E8E5D8',   // dividers / subtle borders
  grey300:     '#C9C4B0',   // disabled text
  grey400:     '#9E9A8A',   // placeholder text
  grey500:     '#6D6A5E',   // secondary text
  grey600:     '#3E3B33',   // body text on light

  // ── Semantic ─────────────────────────────────────────────────────────────
  success:     '#4A8C5C',   // confirmation green
  warning:     '#D4882B',   // alert amber (warm)
  error:       '#C0392B',   // error red
  info:        '#3B6E8F',   // same as ocean
} as const;

export const Colors = {
  ...palette,

  // ── Opacity variants (use with rgba helper or react-native opacity) ────────
  terracottaLight: 'rgba(196, 113, 58, 0.12)',   // subtle tint for backgrounds
  terracottaMid:   'rgba(196, 113, 58, 0.32)',   // icon badges, pill borders
  sageLight:       'rgba(122, 149, 122, 0.12)',
  oceanLight:      'rgba(59, 110, 143, 0.12)',
  nearBlackDim:    'rgba(40, 36, 39, 0.56)',     // scrim / overlay
  nearBlackScrim:  'rgba(40, 36, 39, 0.72)',     // modal backdrop

  // ── Semantic aliases (components reference these, not raw palette) ─────────
  background:      palette.parchment,
  surface:         palette.grey100,
  surfaceElevated: palette.white,
  text:            palette.nearBlack,
  textSecondary:   palette.grey500,
  textDisabled:    palette.grey300,
  textInverted:    palette.parchment,
  border:          palette.grey200,
  borderFocus:     palette.terracotta,
  primary:         palette.terracotta,
  primaryText:     palette.white,
  secondary:       palette.sage,
  accent:          palette.ocean,
  card:            palette.white,
  cardBorder:      palette.grey200,
  tabBar:          palette.nearBlack,
  tabBarActive:    palette.terracotta,
  tabBarInactive:  palette.grey400,
  statusBar:       palette.parchment,

  // ── Transparent ───────────────────────────────────────────────────────────
  transparent:     'transparent',
} as const;

export type ColorToken = keyof typeof Colors;
