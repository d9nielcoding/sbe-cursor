"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SolanaApiService,
  TransactionDetailData,
} from "../../../lib/solana/api";
import Header from "../../components/Header";

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
        setError("Invalid transaction signature");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const apiService = new SolanaApiService();
        const txData = await apiService.getTransactionBySignature(signature);

        if (!txData) {
          setError(`Transaction data not found for ${signature}`);
        } else {
          setTransaction(txData);
        }
      } catch (err) {
        setError(
          `Failed to fetch transaction data: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionDetail();
  }, [signature]);

  // Format timestamp
  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <>
        <Header currentPage="Transaction Details" />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header currentPage="Transaction Details" />
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

  if (!transaction) {
    return (
      <>
        <Header currentPage="Transaction Details" />
        <div className="container mx-auto px-4 py-10 text-center">
          <div className="text-xl">Transaction data not found</div>
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
      <Header
        currentPage={`Transaction ${transaction.transactionHash.substring(
          0,
          8
        )}...`}
      />
      <div className="page-container">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold">Transaction Details</h2>
            <Link
              href={`/blocks/${transaction.slot}`}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              View Block
            </Link>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Transaction Hash
                </div>
                <div className="mt-1 text-sm font-mono break-all">
                  {transaction.transactionHash}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Status</div>
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
                <div className="text-sm font-medium text-gray-500">
                  Block Height
                </div>
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
                <div className="text-sm font-medium text-gray-500">
                  Timestamp
                </div>
                <div className="mt-1">
                  {formatBlockTime(transaction.blockTime)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Transaction Fee
                </div>
                <div className="mt-1">{transaction.fee} SOL</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Accounts Involved</h3>
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
                <div className="text-gray-500">No accounts information</div>
              )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              {transaction.instructions &&
              transaction.instructions.length > 0 ? (
                <div className="space-y-4">
                  {transaction.instructions.map((instruction, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded"
                    >
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          Program ID:
                        </span>
                        <div className="font-mono text-sm break-all">
                          {instruction.programId}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          Accounts:
                        </span>
                        <div className="pl-2 text-sm">
                          {instruction.accounts.length > 0 ? (
                            instruction.accounts.map((account, idx) => (
                              <div
                                key={idx}
                                className="font-mono text-xs break-all my-1"
                              >
                                {idx + 1}. {account}
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500">No accounts</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">
                          Data:
                        </span>
                        <div className="font-mono text-xs break-all overflow-x-auto">
                          {instruction.data || "No data"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No instructions information</div>
              )}
            </div>
          </div>

          {transaction.logs && transaction.logs.length > 0 && (
            <div className="bg-white shadow-md rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Transaction Logs</h3>
              <div className="bg-gray-800 text-gray-200 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs">
                  {transaction.logs.map((log, index) => (
                    <div key={index} className="my-1">
                      {log}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
