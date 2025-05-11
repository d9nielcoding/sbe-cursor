import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solana 區塊鏈瀏覽器",
  description: "瀏覽 Solana 區塊鏈上的區塊、交易和帳戶資訊",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
