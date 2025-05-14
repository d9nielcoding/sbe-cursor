"use client";

import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [network, setNetwork] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // 直接從環境變數獲取網絡
    const envNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "";
    // 使用預設值或驗證環境變數值
    const validNetwork = ["devnet", "testnet", "mainnet"].includes(
      envNetwork.toLowerCase()
    )
      ? envNetwork.toLowerCase()
      : "devnet"; // 預設使用 devnet

    setNetwork(validNetwork);
  }, []);

  if (!isClient) return null;

  // 為不同網絡使用不同的樣式
  const getBadgeStyle = () => {
    switch (network) {
      case "mainnet":
        return "bg-green-100 text-green-800 border-green-300";
      case "devnet":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "testnet":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // 為不同網絡使用不同的狀態圖標
  const getStatusIcon = () => {
    return (
      <span className="mr-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-2.5 w-2.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <circle cx="10" cy="10" r="8" />
        </svg>
      </span>
    );
  };

  const networkDisplayName = () => {
    switch (network) {
      case "mainnet":
        return "Mainnet";
      case "devnet":
        return "Devnet";
      case "testnet":
        return "Testnet";
      default:
        return network.charAt(0).toUpperCase() + network.slice(1);
    }
  };

  return (
    <div
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border pointer-events-none cursor-default select-none ${getBadgeStyle()}`}
      aria-label={`Current network: ${networkDisplayName()}`}
    >
      {getStatusIcon()}
      {networkDisplayName()}
    </div>
  );
}
