/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable React Strict Mode to prevent double-rendering in dev
  webpack: (config, { isServer }) => {
    // Handle GLSL shader files
    config.module.rules.push({
      test: /\.(glsl|frag|vert)$/,
      use: 'raw-loader',
      exclude: /node_modules/,
    });

    // Handle JSON files (for font files)
    config.module.rules.push({
      test: /\.json$/,
      type: 'asset/resource',
    });

    return config;
  },
  // Add empty turbopack config to silence Next.js 16 warning
  // Webpack config is still needed for GLSL shader file handling
  turbopack: {},
  images: {
    unoptimized: true, // Disable image optimization for WebGL textures
  },
};

module.exports = nextConfig;

