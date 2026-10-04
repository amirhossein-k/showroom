/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
    serverActions: { bodySizeLimit: '10mb' },
  },
};
export default nextConfig;
