/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true
  },
  images: {
    domains: ["avatar.vercel.sh", "placehold.co"],
  },
};

module.exports = nextConfig;
