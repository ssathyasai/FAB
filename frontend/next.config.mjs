/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Output standalone for better performance on Render
  output: 'standalone',
  // Disable image optimization for free tier
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
  