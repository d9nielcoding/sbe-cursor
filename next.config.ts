import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  // 啟用靜態導出，以便 Cloudflare Pages 部署
  output: "export",
  poweredByHeader: false, // Remove X-Powered-By header
  reactStrictMode: true, // Enable React strict mode
  trailingSlash: false, // 不在URL末尾添加斜線

  // 為 Cloudflare 環境優化配置
  staticPageGenerationTimeout: 120, // Give more time for static page generation (in seconds)
  images: {
    unoptimized: true, // Required for Cloudflare
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // 使用 rewrites 來處理動態路由 - 注意：在 output: 'export' 模式下 rewrites 不可用
  // 改用 _routes.json 處理路由重定向
  /* 
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
  */
};

export default nextConfig;
