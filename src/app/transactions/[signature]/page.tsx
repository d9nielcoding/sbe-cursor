"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SolanaApiService,
  TransactionDetailData,
} from "../../../lib/solana/api";

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const signature = params.signature as string;

  const [transaction, setTransaction] = useState<TransactionDetailData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetail = async () => {
      if (!signature) {
        setError("無效的交易簽名");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const apiService = new SolanaApiService();
        const txData = await apiService.getTransactionBySignature(signature);

        if (!txData) {
          setError(`找不到交易 ${signature} 的資料`);
        } else {
          setTransaction(txData);
        }
      } catch (err) {
        setError(
          `無法獲取交易資料：${err instanceof Error ? err.message : "未知錯誤"}`
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionDetail();
  }, [signature]);

  // 格式化時間戳
  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 text-xl">{error}</div>
        <div className="mt-4 flex justify-center space-x-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            重試
          </button>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            onClick={() => router.back()}
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-10">
        <div className="text-xl">找不到交易資料</div>
        <button
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          onClick={() => router.back()}
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">交易詳情</h1>
        <Link
          href={`/blocks/${transaction.slot}`}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          查看所屬區塊
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">交易概覽</h2>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-500">交易哈希</div>
            <div className="mt-1 text-sm font-mono break-all">
              {transaction.transactionHash}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">狀態</div>
            <div className="mt-1">
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  transaction.status === "confirmed" ||
                  transaction.status === "finalized"
                    ? "bg-green-100 text-green-800"
                    : transaction.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {transaction.status}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">區塊高度</div>
            <div className="mt-1">
              <Link
                href={`/blocks/${transaction.slot}`}
                className="text-blue-600 hover:underline"
              >
                {transaction.slot.toLocaleString()}
              </Link>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">時間戳</div>
            <div className="mt-1">{formatBlockTime(transaction.blockTime)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">交易費用</div>
            <div className="mt-1">{transaction.fee} SOL</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">涉及的帳戶</h2>
          {transaction.accounts && transaction.accounts.length > 0 ? (
            <div className="space-y-2">
              {transaction.accounts.map((account, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 rounded font-mono text-sm break-all"
                >
                  {account}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">無帳戶資料</div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">指令詳情</h2>
          {transaction.instructions && transaction.instructions.length > 0 ? (
            <div className="space-y-4">
              {transaction.instructions.map((instruction, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="font-medium text-blue-600 mb-2">
                    指令 #{index + 1}
                  </div>
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-500">
                      程式 ID
                    </div>
                    <div className="text-sm font-mono break-all">
                      {instruction.programId}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-500">
                      帳戶
                    </div>
                    {instruction.accounts.length > 0 ? (
                      <div className="space-y-1 mt-1">
                        {instruction.accounts.map((account, accIndex) => (
                          <div
                            key={accIndex}
                            className="text-sm font-mono break-all"
                          >
                            {account}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">無帳戶</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500">
                      資料
                    </div>
                    <div className="text-sm font-mono break-all">
                      {instruction.data || "(空)"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">無指令資料</div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">交易日誌</h2>
        {transaction.logs && transaction.logs.length > 0 ? (
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {transaction.logs.join("\n")}
            </pre>
          </div>
        ) : (
          <div className="text-gray-500">無日誌資料</div>
        )}
      </div>
    </div>
  );
}
