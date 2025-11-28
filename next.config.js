/** @type {import('next').NextConfig} */
const nextConfig = {
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
  images: {
    unoptimized: true, // Disable image optimization for WebGL textures
  },
};

module.exports = nextConfig;

