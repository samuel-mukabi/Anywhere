import localFont from 'next/font/local'

export const astoria = localFont({
  src: [
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
  variable: '--font-astoria'
})

export const cera = localFont({
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
  variable: '--font-cera'
})
