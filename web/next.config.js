/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tailwindcss.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'nguyentuanlongtable-production.up.railway.app',
        pathname: '/uploads/**',
      },
    ],
  },
  eslint: {
    // ❗ Cho phép build dù có lỗi ESLint
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig


