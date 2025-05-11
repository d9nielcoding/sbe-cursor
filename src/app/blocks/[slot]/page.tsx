"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BlockData, SolanaApiService } from "../../../lib/solana/api";

export default function BlockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slot = Number(params.slot);

  const [block, setBlock] = useState<BlockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockDetail = async () => {
      if (isNaN(slot)) {
        setError("無效的區塊高度");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const apiService = new SolanaApiService();
        const blockData = await apiService.getBlockBySlot(slot);

        if (!blockData) {
          setError(`找不到區塊高度 ${slot} 的資料`);
        } else {
          setBlock(blockData);
        }
      } catch (err) {
        setError(
          `無法獲取區塊資料：${err instanceof Error ? err.message : "未知錯誤"}`
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockDetail();
  }, [slot]);

  // 格式化時間戳
  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
          role="status"
        >
          <span className="sr-only">載入中...</span>
        </div>
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

  if (!block) {
    return (
      <div className="text-center py-10">
        <div className="text-xl">找不到區塊資料</div>
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
        <h1 className="text-3xl font-bold">
          區塊 #{block.blockHeight.toLocaleString()}
        </h1>
        <div className="space-x-2">
          <Link
            href={`/blocks/${block.blockHeight - 1}`}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            上一區塊
          </Link>
          <Link
            href={`/blocks/${block.blockHeight + 1}`}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            下一區塊
          </Link>
          <Link
            href="/blocks"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            區塊列表
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">區塊資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500">區塊高度</div>
              <div className="mt-1 text-lg">
                {block.blockHeight.toLocaleString()}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500">區塊哈希</div>
              <div className="mt-1 text-sm font-mono break-all">
                {block.blockHash}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500">時間戳</div>
              <div className="mt-1">{formatBlockTime(block.blockTime)}</div>
            </div>
          </div>
          <div>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500">
                前一區塊哈希
              </div>
              <div className="mt-1 text-sm font-mono break-all">
                {block.previousBlockhash}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500">
                父區塊哈希
              </div>
              <div className="mt-1 text-sm font-mono break-all">
                {block.parentBlockHash}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-500">交易數量</div>
              <div className="mt-1">
                {block.transactionCount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">區塊交易</h2>
          <Link
            href={`/blocks/${block.blockHeight}/transactions`}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            查看所有交易
          </Link>
        </div>
        {block.transactionCount > 0 ? (
          <div className="text-gray-600">
            此區塊包含 {block.transactionCount.toLocaleString()} 筆交易
          </div>
        ) : (
          <div className="text-gray-600">此區塊沒有交易</div>
        )}
      </div>
    </div>
  );
}
