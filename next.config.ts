import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize static pages
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'react-body-highlighter'],
  },
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Compress output
  compress: true,
  // Power optimizations
  poweredByHeader: false,
  // Turbopack configuration (empty config to use Turbopack by default)
  turbopack: {},
};

export default nextConfig;
