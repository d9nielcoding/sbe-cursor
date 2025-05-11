"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-10">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-bold mb-6">
          Solana 區塊鏈瀏覽器
        </h1>
        <p className="text-lg sm:text-xl mb-10 text-gray-600">
          探索 Solana 區塊鏈上的區塊、交易和帳戶資訊。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <Link
            href="/blocks"
            className="flex flex-col items-center bg-white p-6 rounded-xl shadow-lg transition hover:shadow-xl hover:scale-105"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">瀏覽最新區塊</h2>
            <p className="text-gray-600 text-center">
              查看最新確認的區塊及其交易。
            </p>
          </Link>

          <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
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
            </div>
            <h2 className="text-xl font-semibold mb-2">搜尋區塊或交易</h2>
            <p className="text-gray-600 text-center">
              即將推出搜尋功能，敬請期待。
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">關於此項目</h2>
          <p className="text-gray-600 mb-4">
            這是一個使用 Next.js、TypeScript 和 Solana Web3.js 庫構建的 Solana
            區塊鏈瀏覽器。 它提供了一個簡單直觀的界面來探索 Solana
            區塊鏈上的數據。
          </p>
          <p className="text-gray-600">
            目前功能包括區塊列表、區塊詳情和交易詳情。未來將加入更多功能，包括帳戶查詢和搜尋功能。
          </p>
        </div>
      </div>
    </main>
  );
}
