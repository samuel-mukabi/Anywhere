import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const setupBundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Required security headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Prevent clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Note: Mapbox requires some specific CSP rules; keeping this
            // relatively tolerant for the initial build, but will tighten
            // down before public release.
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },

  images: {
    // We allow optimizing images from the following trusted CDNs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**', // Destination hero images
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**', // User uploaded avatars, trip cover images
      },
    ],
    // Vercel edge caching settings for images
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Transpile the local UI package so Tailwind v4 processes its tokens
  transpilePackages: ['@repo/ui'],
  
  // React ecosystem
  reactStrictMode: true,
};

export default setupBundleAnalyzer(nextConfig);
