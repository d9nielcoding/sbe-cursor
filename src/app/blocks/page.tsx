"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BlockData, SolanaApiService } from "../../lib/solana/api";
import Header from "../components/Header";

export default function BlockListPage() {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        setIsLoading(true);
        const apiService = new SolanaApiService();
        const blockData = await apiService.getRecentBlocks(15);
        setBlocks(blockData);
      } catch (error) {
        setError("Failed to fetch block data. Please try again later.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocks();
  }, []);

  // Format timestamp
  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <>
        <Header currentPage="Blocks" />
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
        <Header currentPage="Blocks" />
        <div className="container mx-auto px-4 py-10 text-center">
          <div className="text-red-500 text-xl">{error}</div>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header currentPage="Blocks" />
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">Recent Blocks</h2>

          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Block Height
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Block Hash
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blocks.map((block) => (
                    <tr key={block.blockHash} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">
                          {block.blockHeight.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 font-mono">
                          {block.blockHash.substring(0, 12)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatBlockTime(block.blockTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {block.transactionCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/blocks/${block.blockHeight}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
