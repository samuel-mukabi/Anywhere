/**
 * fonts.ts — Custom font loading with next/font/local
 * =====================================================
 * Astoria: editorial serif — headings, display text, hero labels
 * Cera:    geometric sans  — body copy, UI labels, numbers
 *
 * Both are loaded with display: 'swap' to prevent invisible text during
 * font loading (FOIT). The browser renders fallback text immediately and
 * swaps to the custom font when downloaded — critical for CLS scores.
 *
 * Variables injected into <html>:
 *   --font-astoria  →  font-astoria  (Tailwind utility via @theme)
 *   --font-cera     →  font-cera / font-sans
 *
 * Usage in layout.tsx:
 *   <html className={cn(astoria.variable, cera.variable)}>
 */
import localFont from 'next/font/local';

export const astoria = localFont({
  display: 'swap',
  variable: '--font-astoria',
  src: [
    {
      path: './astoria/AstoriaEXTRALIGHT.ttf',
      weight: '200',
      style: 'normal',
    },
    {
      path: './astoria/AstoriaExtraLightItalic.ttf',
      weight: '200',
      style: 'italic',
    },
    {
      path: './astoria/AstoriaLight.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './astoria/AstoriaLightItalic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: './astoria/AstoriaRoman.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './astoria/Astoria-RomanItalic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './astoria/AstoriaMedium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './astoria/AstoriaMediumItalic.ttf',
      weight: '500',
      style: 'italic',
    },
    {
      path: './astoria/zAstoriaBold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './astoria/AstoriaBoldItalic.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: './astoria/AstoriaExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: './astoria/AstoriaExtraBoldItalic.ttf',
      weight: '800',
      style: 'italic',
    },
  ],
});

export const cera = localFont({
  display: 'swap',
  variable: '--font-cera',
  src: [
    {
      path: './cera/Cera-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './cera/Cera-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './cera/Cera-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './cera/Cera-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './cera/Cera-Black.ttf',
      weight: '900',
      style: 'normal',
    },
    {
      path: './cera/Cera-BlackItalic.ttf',
      weight: '900',
      style: 'italic',
    },
  ],
});
