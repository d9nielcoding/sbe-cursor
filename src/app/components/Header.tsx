"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NetworkStatus from "../../components/NetworkStatus";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

interface HeaderProps {
  currentPage: string;
}

export default function Header({ currentPage }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchError(null);
    setIsSearching(true);

    try {
      // 1. Pure numbers are treated as block height
      if (/^\d+$/.test(query)) {
        router.push(`/blocks/${query}`);
        return;
      }

      // 2. Base58 strings are treated as transaction hashes
      const isValidBase58 = /^[A-HJ-NP-Za-km-z1-9]+$/.test(query);

      if (isValidBase58) {
        // All Base58 inputs are treated as transaction hashes
        router.push(`/transactions/${query}`);
        return;
      }

      // If the search format is invalid, display an error message
      setSearchError(
        "Invalid search format. Please enter a valid block height or transaction hash."
      );
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("An error occurred during search.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-blue-600 font-bold text-xl mr-2 flex items-center"
              >
                <span className="text-blue-500 mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                Solana Explorer
              </Link>
              <span className="ml-2">
                <NetworkStatus />
              </span>
            </div>
            <nav className="hidden md:flex space-x-6 ml-6">
              <Link
                href="/blocks"
                className={cn(
                  "text-gray-600 hover:text-blue-600 font-medium transition-colors",
                  currentPage === "Blocks" && "text-blue-600"
                )}
              >
                Blocks
              </Link>
            </nav>
          </div>

          <div className="w-full max-w-md">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search by block height or transaction hash..."
                className={cn(
                  "pr-10",
                  searchError && "border-red-300 focus-visible:ring-red-500"
                )}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError(null);
                }}
                disabled={isSearching}
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-500 p-1 h-auto"
                disabled={isSearching}
              >
                {isSearching ? (
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              </Button>
            </form>
            {searchError && (
              <div className="text-red-500 text-xs mt-1">{searchError}</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
