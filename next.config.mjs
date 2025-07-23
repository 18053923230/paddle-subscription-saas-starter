/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'cdn.simpleicons.org',
      'localhost',
      // 从环境变量获取当前站点域名
      process.env.NEXT_PUBLIC_BASE_URL || 'localhost',
      // 主站点域名（用于共享资源）
      'paddle-subscription-saas-starter.vercel.app',
      // 其他分支站点域名
      'nexttestsaas.vercel.app',
    ].filter(Boolean), // 过滤掉空值
  },
};

export default nextConfig;
