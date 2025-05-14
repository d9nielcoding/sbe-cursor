"use client";

import { solanaApiService } from "@/lib/solana/api";
import { useEffect, useState } from "react";

export default function DebugPage() {
  const [clientEnv, setClientEnv] = useState<any>(null);
  const [serverEnv, setServerEnv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiTest, setApiTest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // 獲取服務器環境變數
  const fetchServerEnv = async () => {
    try {
      const res = await fetch(`/api/debug-env?t=${Date.now()}`);
      const data = await res.json();
      setServerEnv(data);
    } catch (err) {
      console.error("Error fetching server env:", err);
      setError("Error fetching server env");
    }
  };

  // 測試 Solana API
  const testApi = async () => {
    setLoading(true);
    try {
      // 使用一個簡單的 RPC 調用
      const result = await fetch("/api/solana", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          network: solanaApiService.getNetwork(),
          method: "getSlot",
          params: [],
        }),
      });
      const data = await result.json();
      setApiTest({
        slot: data.result,
        success: true,
        network: solanaApiService.getNetwork(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("API test error:", err);
      setApiTest({ error: String(err), success: false });
    } finally {
      setLoading(false);
    }
  };

  // 刷新所有數據
  const refreshAll = () => {
    // 更新客戶端環境變數
    setClientEnv({
      NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
      network: solanaApiService.getNetwork(),
      isBrowser: typeof window !== "undefined",
      timestamp: new Date().toISOString(),
    });

    // 更新伺服器環境信息
    fetchServerEnv();

    // 重新測試 API
    testApi();

    // 更新刷新計數
    setRefreshCount((prev) => prev + 1);
  };

  useEffect(() => {
    // 初始化客戶端環境變數
    setClientEnv({
      NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
      network: solanaApiService.getNetwork(),
      isBrowser: typeof window !== "undefined",
      timestamp: new Date().toISOString(),
    });

    // 初始加載
    fetchServerEnv();
    testApi();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">環境變數調試</h1>

      <div className="mb-4">
        <button
          onClick={refreshAll}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          刷新所有數據 ({refreshCount})
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">客戶端環境</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(clientEnv, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">服務器環境</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {serverEnv ? JSON.stringify(serverEnv, null, 2) : "載入中..."}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">API 測試</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {loading ? "測試中..." : JSON.stringify(apiTest, null, 2)}
        </pre>
      </div>
    </div>
  );
}
