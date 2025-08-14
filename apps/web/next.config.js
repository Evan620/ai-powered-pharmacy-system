/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Experimental features (appDir is now stable in Next.js 14)
  experimental: {
    // Add any experimental features here if needed
  },
  
  // Environment variables that should be available on the client side
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size in production
    if (!dev && !isServer) {
      // Remove React Query Devtools from production bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@tanstack/react-query-devtools': false,
      };
    }
    
    return config;
  },
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Output configuration
  output: 'standalone',
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Generate ETags for caching
  generateEtags: true,
  
  // Trailing slash configuration
  trailingSlash: false,
};

export default nextConfig;
