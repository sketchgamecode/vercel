/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    outputFileTracingIncludes: {
      '/api/weapon/generate': ['./data/weapon-config.json'],
      '/api/admin/config': ['./data/weapon-config.json']
    }
  }
};

export default nextConfig;
