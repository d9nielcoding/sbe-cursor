import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  // 取消靜態導出設置，以便在 Vercel 上啟用 SSR
  // output: "export",
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true, // Enable React strict mode
  trailingSlash: false, // 不在URL末尾添加斜線

  // 移除 Cloudflare 特定配置
  // staticPageGenerationTimeout: 120,
  images: {
    // 啟用 Vercel 的圖片優化
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // 使用 rewrites 來處理動態路由
  async rewrites() {
    return [
      {
        source: "/blocks/:slot",
        destination: "/blocks/[slot]",
      },
      {
        source: "/blocks/:slot/transactions",
        destination: "/blocks/[slot]/transactions",
      },
      {
        source: "/transactions/:signature",
        destination: "/transactions/[signature]",
      },
    ];
  },
};

export default nextConfig;
