/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'rijytzcvtfszqvbxesej.supabase.co',
      'd1fdloi71mui9q.cloudfront.net',
      'i.ibb.co',
      'imagedelivery.net',
    ],
  },
  httpAgentOptions: {
    keepAlive: true,
  },
}

module.exports = nextConfig
