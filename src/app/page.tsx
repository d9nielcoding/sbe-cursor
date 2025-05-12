"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "./components/Header";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to blocks list page
    router.push("/blocks");
  }, [router]);

  return (
    <>
      <Header currentPage="Home" />
      <div className="page-container">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
            role="status"
          >
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    </>
  );
}
