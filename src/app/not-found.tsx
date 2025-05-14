"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          頁面未找到
        </h2>
        <p className="text-gray-600 mb-8">
          您嘗試訪問的頁面不存在。這可能是因為您直接訪問了一個動態路由，請從首頁開始瀏覽。
        </p>
        <Link
          href="/"
          className="px-5 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          返回首頁
        </Link>
      </div>
      <div className="mt-12 text-sm text-gray-500">
        <p>
          Solana 區塊鏈瀏覽器使用客戶端導航。當直接訪問 URL
          時，某些頁面可能無法正確載入。
        </p>
      </div>
    </div>
  );
}
