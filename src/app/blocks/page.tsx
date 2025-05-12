"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useRecentBlocks } from "../../lib/hooks/useData";
import Header from "../components/Header";

export default function BlockListPage() {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { blocks, isLoading, isError, mutate } = useRecentBlocks(15);

  const formatBlockTime = (timestamp: number | null): string => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp * 1000);

    // 格式化為 "MM-DD-YYYY HH:MM:SS" UTC 時間
    return date
      .toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      })
      .replace(",", "");
  };

  const handleTimestampSort = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  if (isLoading) {
    return (
      <>
        <Header currentPage="Blocks" />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"
              role="status"
            >
              <span className="sr-only">Loading...</span>
            </div>
            <p className="text-gray-500">Loading block data...</p>
          </div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header currentPage="Blocks" />
        <div className="container mx-auto px-4 py-10 flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-500">Error</CardTitle>
              <CardDescription>
                We encountered a problem while fetching block data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Failed to fetch block data. Please try again later.
              </p>
              <Button onClick={() => mutate()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // 使用 blocks 數組進行排序
  const getSortedBlocks = () => {
    return [...blocks].sort((a, b) => {
      const timeA = a.blockTime || 0;
      const timeB = b.blockTime || 0;

      return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
    });
  };

  const sortedBlocks = getSortedBlocks();

  return (
    <>
      <Header currentPage="Blocks" />
      <div className="page-container">
        <div className="container mx-auto px-6 py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Blocks</h1>
            <p className="text-gray-500 mt-1">
              Browse recent blocks on the Solana blockchain
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Blocks</CardTitle>
              <CardDescription>
                The most recent blocks added to the Solana blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Block Hash</TableHead>
                      <TableHead className="w-24">Slot</TableHead>
                      <TableHead
                        className="cursor-pointer select-none w-40"
                        onClick={handleTimestampSort}
                      >
                        <div className="flex items-center">
                          Time (UTC)
                          <span className="ml-1 text-xs">
                            {sortDirection === "asc" ? "▲" : "▼"}
                          </span>
                        </div>
                      </TableHead>
                      <TableHead className="w-20 text-center">
                        Tx Count
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBlocks.map((block) => (
                      <TableRow key={block.blockHash}>
                        <TableCell className="font-mono text-sm overflow-hidden">
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/blocks/${block.blockHeight}`}
                              className="text-blue-600 hover:underline font-mono text-sm"
                            >
                              <span className="truncate">
                                {block.blockHash.length > 12
                                  ? `${block.blockHash.substring(0, 12)}...`
                                  : block.blockHash}
                              </span>
                            </Link>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(block.blockHash)
                              }
                              className="text-gray-500 hover:text-blue-500 transition-colors"
                              aria-label="Copy hash"
                              title="Copy hash"
                            >
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
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/blocks/${block.blockHeight}`}
                            className="text-blue-600 hover:underline"
                          >
                            {block.blockHeight.toLocaleString()}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {formatBlockTime(block.blockTime)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {block.transactionCount}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
