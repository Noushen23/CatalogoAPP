import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración para Docker
  output: 'standalone',
  
  // Transpilar paquetes que necesitan ser procesados
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  
  // Optimizaciones de rendimiento
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },
  
  // Compresión
  compress: true,
  
  // Optimización de imágenes
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.168.3.6',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.3.104',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '181.49.225.64',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/uploads/**',
      },
    ],
  },
  
  // Optimización del bundle
  webpack: (config, { dev, isServer }) => {
    // Optimizaciones para producción
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      }
    }
    
    return config
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Variables de entorno
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Configuración de TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configuración de ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
