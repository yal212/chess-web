import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude debug/test pages from production builds
  ...(process.env.NODE_ENV === 'production' && {
    async rewrites() {
      return [
        {
          source: '/debug/:path*',
          destination: '/404',
        },
        {
          source: '/test-sync/:path*',
          destination: '/404',
        },
        {
          source: '/test-chess/:path*',
          destination: '/404',
        },
      ];
    },
  }),

  // Optimize images
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google OAuth avatars
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
