import { NetworkType } from "@/lib/solana/api";
import { NextRequest, NextResponse } from "next/server";

// 從伺服器環境變數獲取網絡設定
const SERVER_NETWORK: NetworkType = (() => {
  const envNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "";

  // 驗證環境變數中的網絡設定
  const validNetwork = ["devnet", "testnet", "mainnet"].includes(
    envNetwork.toLowerCase()
  )
    ? (envNetwork.toLowerCase() as NetworkType)
    : "devnet"; // 預設使用 devnet

  // 僅在初始化時記錄一次，而不是每次請求都記錄
  console.log(
    `[SERVER] Initialized with network: "${validNetwork}" from env: "${envNetwork}"`
  );
  return validNetwork;
})();

// 從環境變數獲取 RPC URL (帶有 API 密鑰)
const getRpcUrl = (network: string, isPrimary: boolean = true): string => {
  const envKey = isPrimary
    ? `SOLANA_RPC_URL_${network.toUpperCase()}`
    : `SOLANA_FALLBACK_URL_${network.toUpperCase()}`;

  const url = process.env[envKey];

  // 確認 URL 有效且非空
  if (!url || url === "%" || !url.startsWith("http")) {
    console.warn(
      `[SERVER] Invalid or missing URL for ${envKey}, using default endpoint`
    );
    return getDefaultEndpoint(network, isPrimary);
  }

  return url;
};

// 獲取默認的公共端點（不包含 API 密鑰的後備方案）
const getDefaultEndpoint = (
  network: string,
  isPrimary: boolean = true
): string => {
  const endpoints: Record<string, { primary: string; fallback: string }> = {
    devnet: {
      primary: "https://api.devnet.solana.com",
      fallback: "https://explorer-api.devnet.solana.com",
    },
    testnet: {
      primary: "https://api.testnet.solana.com",
      fallback: "https://explorer-api.testnet.solana.com",
    },
    mainnet: {
      primary: "https://solana-mainnet-rpc.publicnode.com",
      fallback: "https://solana-mainnet.g.alchemy.com/v2/demo",
    },
  };

  const networkEndpoints = endpoints[network] || endpoints.devnet;
  return isPrimary ? networkEndpoints.primary : networkEndpoints.fallback;
};

export async function POST(request: NextRequest) {
  try {
    // 解析請求體
    const body = await request.json();
    let { method, params } = body;

    // 忽略客戶端的 useFallback 參數，服務器自行決定
    let useFallback = false;

    // 始終使用伺服器端環境變數定義的網絡
    const network = SERVER_NETWORK;

    if (!method) {
      return NextResponse.json(
        { error: "Missing required parameters: method" },
        { status: 400 }
      );
    }

    // 首先嘗試使用主要端點
    try {
      // 獲取適當的 RPC 端點 URL（帶有 API 密鑰的）
      const primaryRpcUrl = getRpcUrl(network, true); // 使用主要端點

      // 紀錄使用的端點 (但不顯示 API key)
      const sanitizedUrl = primaryRpcUrl
        .replace(/([?&]api[kK]ey=)[^&]+/, "$1[REDACTED]")
        .replace(/\/[a-zA-Z0-9]{20,}(?=\/|$)/, "/[REDACTED]")
        .replace(/dkey=[a-zA-Z0-9]+/, "dkey=[REDACTED]");

      // 使用更簡潔的日誌格式，減少噪音
      console.log(`[SERVER] RPC ${method} to ${network} endpoint`);

      // 構建 RPC 請求
      const rpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method,
        params: params || [],
      };

      // 發送請求到實際的 Solana RPC 端點
      const response = await fetch(primaryRpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rpcRequest),
      });

      // 如果主要端點成功響應，直接返回結果
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          ...data,
          network,
        });
      }

      // 如果主要端點失敗，記錄錯誤並嘗試後備端點
      const errorText = await response.text();
      console.warn(
        `[SERVER] Primary endpoint error: ${errorText.substring(0, 100)}${
          errorText.length > 100 ? "..." : ""
        }`
      );
      useFallback = true;
    } catch (error) {
      // 主要端點出現異常，嘗試後備端點
      console.warn(`[SERVER] Primary endpoint failed: ${error}`);
      useFallback = true;
    }

    // 如果到這裡，說明主要端點失敗，嘗試使用後備端點
    if (useFallback) {
      // 獲取後備端點 URL
      const fallbackRpcUrl = getRpcUrl(network, false);

      // 僅記錄嘗試使用後備端點的信息，無需詳細 URL
      console.log(`[SERVER] Trying fallback ${network} endpoint for ${method}`);

      // 構建 RPC 請求
      const rpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method,
        params: params || [],
      };

      // 發送請求到後備 Solana RPC 端點
      const fallbackResponse = await fetch(fallbackRpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rpcRequest),
      });

      // 處理後備端點響應
      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        console.error(
          `[SERVER] Fallback endpoint also failed: ${errorText.substring(
            0,
            100
          )}${errorText.length > 100 ? "..." : ""}`
        );
        return NextResponse.json(
          {
            error: `Both primary and fallback RPC endpoints failed`,
            network,
            method,
          },
          { status: fallbackResponse.status }
        );
      }

      // 後備端點成功
      const data = await fallbackResponse.json();
      return NextResponse.json({
        ...data,
        network,
      });
    }
  } catch (error) {
    console.error("[SERVER] API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
