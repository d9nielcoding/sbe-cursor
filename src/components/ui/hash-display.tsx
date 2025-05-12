"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";

interface HashDisplayProps {
  hash: string;
  truncateLength?: number;
  className?: string;
  showCopyButton?: boolean;
}

export function HashDisplay({
  hash,
  truncateLength = 16,
  className,
  showCopyButton = true,
}: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  // 截斷 hash 值
  const truncatedHash =
    hash.length > truncateLength
      ? `${hash.substring(0, truncateLength)}...`
      : hash;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);

      // 2秒後重置複製狀態
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <div
        className="font-mono text-sm group relative cursor-pointer"
        title={hash}
      >
        <span className="truncate">{truncatedHash}</span>
        <div className="absolute z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bottom-full left-0 mb-2 bg-gray-800 text-white p-2 rounded text-xs max-w-xs break-all">
          {hash}
        </div>
      </div>

      {showCopyButton && (
        <button
          onClick={copyToClipboard}
          className="text-gray-500 hover:text-blue-500 transition-colors"
          aria-label="Copy hash"
          title="Copy hash"
        >
          {copied ? (
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
      )}
    </div>
  );
}
