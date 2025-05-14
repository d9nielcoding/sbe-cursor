"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { HashDisplay } from "../../../../components/ui/hash-display";
import { useTransactionsFromBlock } from "../../../../lib/hooks/useData";
import Header from "../../../components/Header";

// 為靜態導出生成所有應該預先渲染的路徑參數
export async function generateStaticParams() {
  // 返回一個空數組，這樣在首次訪問時會動態生成頁面
  // 或者你可以返回一組預先知道的 slot 值
  return [];
}

export default function BlockTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const slot = Number(params.slot);

  // 使用 SWR hook 獲取交易數據
  const { transactions, isLoading, isError } = useTransactionsFromBlock(slot);

  // 排序狀態
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // 錯誤信息
  const error = isError
    ? "Failed to fetch transaction data"
    : isNaN(slot)
    ? "Invalid block height"
    : null;

  // Format timestamp with UTC indicator
  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp * 1000);
    return (
      date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }) + " UTC"
    );
  };

  // Handle timestamp column click for sorting
  const handleTimestampSort = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  // Get sorted transactions based on sort direction
  const getSortedTransactions = () => {
    return [...transactions].sort((a, b) => {
      const timeA = a.blockTime || 0;
      const timeB = b.blockTime || 0;

      return sortDirection === "asc"
        ? timeA - timeB // Ascending: earlier timestamps first
        : timeB - timeA; // Descending: later timestamps first
    });
  };

  if (isLoading) {
    return (
      <>
        <Header
          currentPage={`Transactions in Block #${slot.toLocaleString()}`}
        />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
            role="status"
          >
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header currentPage="Block Transactions" />
        <div className="container mx-auto px-4 py-10 text-center">
          <div className="text-red-500 text-xl">{error}</div>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              onClick={() => router.back()}
            >
              Back
            </button>
          </div>
        </div>
      </>
    );
  }

  // Get sorted transactions
  const sortedTransactions = getSortedTransactions();

  return (
    <>
      <Header currentPage={`Transactions in Block #${slot.toLocaleString()}`} />
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              Transactions in Block #{slot.toLocaleString()}
            </h1>
            <Link
              href={`/blocks/${slot}`}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Block Details
            </Link>
          </div>

          {sortedTransactions.length === 0 ? (
            <div className="bg-gray-50 p-6 text-center rounded-lg shadow-md">
              <p className="text-gray-600">No transactions in this block</p>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction Signature
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                        onClick={handleTimestampSort}
                      >
                        <div className="flex items-center">
                          Timestamp
                          <span className="ml-1">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee (SOL)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTransactions.map((tx) => (
                      <tr key={tx.transactionHash} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/transactions/${tx.transactionHash}`}
                            className="text-blue-600 hover:underline"
                          >
                            <HashDisplay
                              hash={tx.transactionHash}
                              showCopyButton={true}
                              truncateLength={12}
                            />
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatBlockTime(tx.blockTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              tx.status === "confirmed" ||
                              tx.status === "finalized"
                                ? "bg-green-100 text-green-800"
                                : tx.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {tx.status.charAt(0).toUpperCase() +
                              tx.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.fee
                            ? (Number(tx.fee) / 1000000000).toFixed(9)
                            : "0.000000000"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
