/** @type {import('next').NextConfig} */
const nextConfig = {
  output: {
    // ワークスペースのルートを明示的に指定
    outputFileTracingRoot: __dirname,
  },
  // 画像ドメインの設定
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
}

module.exports = nextConfig