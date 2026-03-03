/** @type {import('next').NextConfig} */
const nextConfig = {
  // swcMinify is removed as it is now default in Next.js 14+
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fveosuladewjtqoqhdbl.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;