# Global Design System

This document outlines the strict global design patterns established for both the Anywhere web platform and the cross-platform mobile application.

## Typography
We utilize a dual-typeface structure to establish brand hierarchy and functionality.

**`Astoria` (Display Typeface)**
- **Usage**: Used exclusively for hero headlines, section headings, destination names, and the brand wordmark.
- **Rules**: Never use Astoria below `18px`. 
- **Wordmark Exception**: The wordmark `"Anywhere."` is always set in Astoria. The trailing period is the only visual accent, colored `#C4713A`. The wordmark is never placed on a dark background except in the navigation when the page hero is dark.

**`Cera` (Functional Typeface)**
- **Usage**: Used for all navigation, body copy, labels, captions, button texts, pricing values, and tabular metadata.
- **Rules**: Never use Cera above `16px` for body paragraphs.

---

## Color Palette

| Name | Hex | Usage |
|---|---|---|
| **Warm Parchment Cream** | `#EEEBD9` | The primary page background. Used on all light sections. |
| **Near-Black** | `#282427` | Primary text color on light backgrounds. Used as full background for pricing. |
| **Terracotta** | `#C4713A` | Brand Action Color. (CTAs, slider fills, pin markers, nav hover underlines, "Anywhere." period, price tags, active borders). |
| **Muted Sage** | `#3D6B5E` | Secondary Accent. (Active filter tags, "Pro" subscription badges, feature checkmarks, subtle success indicators). |
| **Deep Ocean Midnight** | `#1C2B36` | Background of the globe/map hero panel, landing page hero, and Group Travel hero. |
| **Near-Cream** | `#F5F2E6` | Slightly lighter parchment used for hovered card states, input fields, and blog article cards. |

**Transparencies / Structural Dividers**:
- `rgba(40,36,39,0.08)`: Hairline dividers between grid cells, section separators, and card borders.
- `rgba(238,235,217,0.07)`: Subtle surface lift inside dark (`#1C2B36` or `#282427`) backgrounds (plan cards, feature rows).

---

## Component Rules

### Navigation
- Identical on every page (sticky).
- Background: `#EEEBD9`.
- Border-bottom: `1px solid rgba(40,36,39,0.08)`.
- Padding: `48px` horizontal, `20px` vertical.
- Links: Cera, `11px`, `1.5px` letter-spacing, uppercase, color `rgba(40,36,39,0.5)`.
- **Get Started CTA**: Always on far right (`#282427` fill, `#EEEBD9` text, `8px` radius, `8px` V-padding, `20px` H-padding).

### Section Structure
- Every section contains a muted eyebrow label: Cera, `10px`, `3px` letter-spacing, uppercase, `rgba(40,36,39,0.35)`. Can be centered above the main heading.
- Headings are set in Astoria.
- Body paragraphs: Cera, `14px`, `rgba(40,36,39,0.6)`, line-height `1.7`.
- **Rule**: No section has a colored background except pricing (`#282427`) and hero elements (`#1C2B36`).

### Button Variants
Buttons come in three strict variants only. All buttons feature: `8px` border radius, Cera typeface, `11-12px`, `2px` letter-spacing, uppercase text, **no shadow**.
1. **Dark Fill**: Background `#282427`, Text `#EEEBD9`.
2. **Terracotta Fill**: Background `#C4713A`, Text `#EEEBD9`. (Extremely important CTAs on dark backgrounds).
3. **Ghost Buttons**: Transparent background, `1px solid rgba(40,36,39,0.3)` border, `#282427` text.

### Footer
- Identical on every page.
- Background: `#282427`.
- Layout: 3 Columns. (Wordmark + tagline left, Navigation center [Product/Company/Resources], Newsletter right).
- Newsletter block features *one text input and one Terracotta button*.
- Footer Text: Cera, `12px`, `rgba(238,235,217,0.4)`.
- Bottom Strip: Unified copyright line and legal links.
