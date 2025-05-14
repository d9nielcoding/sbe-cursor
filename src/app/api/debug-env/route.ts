import { NextResponse } from "next/server";

export async function GET() {
  // 檢查是否包含了 SOLANA_RPC_URL_* 的配置
  // 過濾掉可能包含 API 密鑰的內容，僅保留一般信息
  const rpcEnvVars = Object.entries(process.env)
    .filter(([key]) => key.startsWith("SOLANA_RPC_URL_"))
    .reduce((acc, [key]) => {
      acc[key] = "configured"; // 不顯示實際 URL，僅顯示是否已配置
      return acc;
    }, {} as Record<string, string>);

  // 收集環境變數（排除可能的敏感值）
  const envVars = {
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
    NODE_ENV: process.env.NODE_ENV,
    // 添加此標記，確定是從服務器端執行
    SERVER_SIDE: true,
    // 添加 RPC URL 配置狀態
    rpcEndpoints: rpcEnvVars,
    // 添加一個時間戳，以確保每次請求都是新鮮的
    timestamp: new Date().toISOString(),
  };

  // 返回環境變數資訊
  return NextResponse.json(envVars);
}
