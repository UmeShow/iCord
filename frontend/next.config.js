/** @type {import('next').NextConfig} */
const nextConfig = {
  // 画像ドメインの設定
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  // 出力設定
  output: 'standalone'
}

module.exports = nextConfig