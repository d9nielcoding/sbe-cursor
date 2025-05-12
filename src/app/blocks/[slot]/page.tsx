"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BlockData,
  SolanaApiService,
  TransactionData,
} from "../../../lib/solana/api";
import Header from "../../components/Header";

export default function BlockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slot = Number(params.slot);

  const [block, setBlock] = useState<BlockData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockData = async () => {
      if (isNaN(slot)) {
        setError("Invalid block height");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const apiService = new SolanaApiService();

        // Fetch block details and transaction list in parallel
        const [blockData, txData] = await Promise.all([
          apiService.getBlockBySlot(slot),
          apiService.getTransactionsFromBlock(slot),
        ]);

        if (!blockData) {
          setError(`Block data not found for height ${slot}`);
        } else {
          setBlock(blockData);
          setTransactions(txData);
        }
      } catch (err) {
        setError(
          `Failed to fetch block data: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockData();
  }, [slot]);

  // Format timestamp
  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Truncate hash for display
  const truncateHash = (hash: string, length: number = 8): string => {
    if (!hash) return "";
    return `${hash.substring(0, length)}...${hash.substring(
      hash.length - length
    )}`;
  };

  if (isLoading) {
    return (
      <>
        <Header currentPage={`Block #${slot}`} />
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
        <Header currentPage="Block Details" />
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

  if (!block) {
    return (
      <>
        <Header currentPage="Block Details" />
        <div className="container mx-auto px-4 py-10 text-center">
          <div className="text-xl">Block data not found</div>
          <button
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            onClick={() => router.back()}
          >
            Back
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header currentPage={`Block #${block.blockHeight.toLocaleString()}`} />
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                Block #{block.blockHeight.toLocaleString()}
              </h2>
            </div>
            <div className="space-x-2">
              <Link
                href={`/blocks/${block.blockHeight - 1}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Previous Block
              </Link>
              <Link
                href={`/blocks/${block.blockHeight + 1}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Next Block
              </Link>
              <Link
                href="/blocks"
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Block List
              </Link>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Block Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">
                    Block Height
                  </div>
                  <div className="mt-1 text-lg">
                    {block.blockHeight.toLocaleString()}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">
                    Block Hash
                  </div>
                  <div className="mt-1 text-sm font-mono break-all">
                    {block.blockHash}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">
                    Timestamp
                  </div>
                  <div className="mt-1">{formatBlockTime(block.blockTime)}</div>
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">
                    Previous Block Hash
                  </div>
                  <div className="mt-1 text-sm font-mono break-all">
                    {block.previousBlockhash}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">
                    Parent Block
                  </div>
                  <div className="mt-1">
                    <Link
                      href={`/blocks/${block.parentBlockHash}`}
                      className="text-blue-600 hover:underline"
                    >
                      {block.parentBlockHash}
                    </Link>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-500">
                    Transaction Count
                  </div>
                  <div className="mt-1">{block.transactionCount}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Transactions in this Block
            </h3>
            {transactions.length === 0 ? (
              <div className="text-gray-500 py-4 text-center">
                No transactions in this block
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction Hash
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx.transactionHash} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                          {truncateHash(tx.transactionHash)}
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
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.fee}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/transactions/${tx.transactionHash}`}
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
