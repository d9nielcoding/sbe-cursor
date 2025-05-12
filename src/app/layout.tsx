import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solana Blockchain Explorer",
  description:
    "Browse blocks, transactions, and accounts on the Solana blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased bg-white">{children}</body>
    </html>
  );
}
