"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HashDisplay } from "../../../components/ui/hash-display";
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
  // Add state for sorting and copy feedback
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [copiedParentSlot, setCopiedParentSlot] = useState(false);
  const [copiedChildSlot, setCopiedChildSlot] = useState(false);
  // Add state for parent and child slot leaders
  const [parentSlotLeader, setParentSlotLeader] = useState<string | null>(null);
  const [childSlotLeader, setChildSlotLeader] = useState<string | null>(null);

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

          // Fetch parent slot leader
          if (blockData.blockHeight > 0) {
            try {
              const parentLeader = await apiService.getSlotLeader(
                blockData.blockHeight - 1
              );
              setParentSlotLeader(parentLeader);
            } catch (err) {
              console.warn(`Failed to fetch parent slot leader: ${err}`);
            }
          }

          // Fetch child slot leader if child slots exist
          if (blockData.childSlots && blockData.childSlots.length > 0) {
            try {
              const childLeader = await apiService.getSlotLeader(
                blockData.childSlots[0]
              );
              setChildSlotLeader(childLeader);
            } catch (err) {
              console.warn(`Failed to fetch child slot leader: ${err}`);
            }
          }
        }
      } catch (err) {
        setError(
          `Failed to fetch block data: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        if (process.env.NODE_ENV !== "test") {
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockData();
  }, [slot]);

  // 複製文本到剪貼板
  const copyToClipboard = (text: string, type: "parent" | "child") => {
    navigator.clipboard.writeText(text);
    if (type === "parent") {
      setCopiedParentSlot(true);
      setTimeout(() => setCopiedParentSlot(false), 2000);
    } else {
      setCopiedChildSlot(true);
      setTimeout(() => setCopiedChildSlot(false), 2000);
    }
  };

  // Format timestamp with UTC indicator
  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp * 1000);
    // Format the date part
    const formattedDate = date
      .toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      .replace(",", "");

    // Format the time part
    const formattedTime = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });

    return `${formattedDate} at ${formattedTime} UTC`;
  };

  // Format timestamp in local time
  const formatLocalBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";

    const date = new Date(timestamp * 1000);
    // Format the date part
    const formattedDate = date
      .toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      .replace(",", "");

    // Format the time part
    const formattedTime = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Add the timezone indicator (GMT+X)
    const timeZoneOffset = date.getTimezoneOffset();
    const timeZoneHours = Math.abs(Math.floor(timeZoneOffset / 60));
    const timeZoneSign = timeZoneOffset <= 0 ? "+" : "-"; // Note: getTimezoneOffset returns negative for GMT+

    return `${formattedDate} at ${formattedTime} GMT${timeZoneSign}${timeZoneHours}`;
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
        <Header currentPage={`Block #${slot.toLocaleString()}`} />
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

  // Get sorted transactions
  const sortedTransactions = getSortedTransactions();
  // Limit to first 10 transactions on the details page
  const limitedTransactions = sortedTransactions.slice(0, 10);

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
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="text-sm font-medium text-gray-500">
                Block Hash
              </div>
              <div className="text-sm font-mono overflow-x-auto break-all">
                {block.blockHash}
              </div>

              <div className="text-sm font-medium text-gray-500">
                Block Height (Slot)
              </div>
              <div className="text-sm font-mono">
                {block.blockHeight.toLocaleString()}
              </div>

              {block.leader && (
                <>
                  <div className="text-sm font-medium text-gray-500">
                    Slot Leader
                  </div>
                  <div className="text-sm font-mono overflow-x-auto break-all">
                    {block.leader}
                  </div>
                </>
              )}

              <div className="text-sm font-medium text-gray-500">
                Timestamp (Local)
              </div>
              <div className="text-sm">
                {formatLocalBlockTime(block.blockTime)}
              </div>

              <div className="text-sm font-medium text-gray-500">
                Timestamp (UTC)
              </div>
              <div className="text-sm">{formatBlockTime(block.blockTime)}</div>

              <div className="text-sm font-medium text-gray-500">
                Parent Block Hash
              </div>
              <div className="text-sm font-mono overflow-x-auto break-all">
                {block.previousBlockhash}
              </div>

              <div className="text-sm font-medium text-gray-500">
                Parent Slot
              </div>
              <div className="text-sm font-mono flex items-center">
                <button
                  onClick={() =>
                    copyToClipboard(
                      (block.blockHeight - 1).toString(),
                      "parent"
                    )
                  }
                  className="mr-2 text-gray-500 hover:text-blue-500 transition-colors"
                  aria-label="Copy parent slot number"
                  title="Copy slot number"
                >
                  {copiedParentSlot ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
                <Link
                  href={`/blocks/${block.blockHeight - 1}`}
                  className="text-blue-600 hover:underline"
                >
                  {(block.blockHeight - 1).toLocaleString()}
                </Link>
              </div>

              {parentSlotLeader && (
                <>
                  <div className="text-sm font-medium text-gray-500">
                    Parent Slot Leader
                  </div>
                  <div className="text-sm font-mono overflow-x-auto break-all">
                    {parentSlotLeader}
                  </div>
                </>
              )}

              {block.childSlots && block.childSlots.length > 0 && (
                <>
                  <div className="text-sm font-medium text-gray-500">
                    Child Slot
                  </div>
                  <div className="text-sm font-mono flex items-center">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          block.childSlots?.[0]?.toString() || "",
                          "child"
                        )
                      }
                      className="mr-2 text-gray-500 hover:text-blue-500 transition-colors"
                      aria-label="Copy child slot number"
                      title="Copy slot number"
                    >
                      {copiedChildSlot ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                    <Link
                      href={`/blocks/${block.childSlots[0]}`}
                      className="text-blue-600 hover:underline"
                    >
                      {Number(block.childSlots[0]).toLocaleString()}
                    </Link>
                  </div>
                </>
              )}

              {childSlotLeader && (
                <>
                  <div className="text-sm font-medium text-gray-500">
                    Child Slot Leader
                  </div>
                  <div className="text-sm font-mono overflow-x-auto break-all">
                    {childSlotLeader}
                  </div>
                </>
              )}

              <div className="text-sm font-medium text-gray-500">
                Transaction Count
              </div>
              <div className="text-sm">
                <span className="font-bold">
                  {block.transactionCount.toLocaleString()}
                </span>{" "}
                {block.transactionCount === 1 ? "transaction" : "transactions"}
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4" id="transactions">
              Transactions
            </h3>
            <div className="overflow-x-auto">
              {sortedTransactions.length === 0 ? (
                <div className="bg-gray-50 p-4 text-center rounded-md border border-gray-200">
                  <p className="text-gray-500">No transactions in this block</p>
                </div>
              ) : (
                <>
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
                      {limitedTransactions.map((tx) => (
                        <tr
                          key={tx.transactionHash}
                          className="hover:bg-gray-50"
                        >
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

                  {sortedTransactions.length > 10 && (
                    <div className="mt-4 text-center">
                      <Link
                        href={`/blocks/${slot}/transactions`}
                        className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                      >
                        View All {sortedTransactions.length} Transactions
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
