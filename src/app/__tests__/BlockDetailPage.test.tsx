import { act, render, screen, waitFor } from "@testing-library/react";

// 先模擬依賴，避免循環引用問題
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useParams: () => ({ slot: "100" }),
}));

jest.mock("../../lib/solana/api", () => ({
  SolanaApiService: jest.fn().mockImplementation(() => ({
    getBlockBySlot: jest.fn(),
  })),
}));

// 在模擬之後再導入組件
import { SolanaApiService } from "../../lib/solana/api";
import BlockDetailPage from "../blocks/[slot]/page";

// 模擬數據
const mockBlockData = {
  blockHeight: 100,
  blockHash: "block_hash_100",
  blockTime: 1677657600, // 2023-03-01 時間戳
  parentBlockHash: "parent_hash_99",
  previousBlockhash: "prev_hash_99",
  transactionCount: 10,
};

describe("BlockDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 在這裡設置每個測試的模擬實現
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getBlockBySlot: jest.fn().mockImplementation((slot: number) => {
        if (slot === 100) {
          return Promise.resolve(mockBlockData);
        }
        return Promise.resolve(null);
      }),
    }));
  });

  it("顯示區塊詳情", async () => {
    await act(async () => {
      render(<BlockDetailPage />);
    });

    // 等待區塊標題顯示，表示頁面已經載入完成
    await waitFor(() => {
      expect(screen.getByText(/區塊 #100/i)).toBeDefined();
    });

    // 檢查區塊資訊
    expect(screen.getByText("block_hash_100")).toBeDefined();
    expect(screen.getByText("parent_hash_99")).toBeDefined();
    expect(screen.getByText("prev_hash_99")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();

    // 檢查導航按鈕
    const prevBlockLink = screen.getByText("上一區塊");
    const nextBlockLink = screen.getByText("下一區塊");
    const blockListLink = screen.getByText("區塊列表");

    expect(prevBlockLink.getAttribute("href")).toBe("/blocks/99");
    expect(nextBlockLink.getAttribute("href")).toBe("/blocks/101");
    expect(blockListLink.getAttribute("href")).toBe("/blocks");
  });

  it("處理找不到區塊的情況", async () => {
    // 模擬無效區塊編號
    jest
      .spyOn(require("next/navigation"), "useParams")
      .mockReturnValue({ slot: "999" });
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getBlockBySlot: jest.fn().mockResolvedValue(null),
    }));

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // 等待錯誤訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/找不到區塊高度 999 的資料/i)).toBeDefined();
    });

    // 檢查返回按鈕
    expect(screen.getByText("返回")).toBeDefined();
  });

  it("處理 API 錯誤", async () => {
    // 模擬 API 錯誤
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getBlockBySlot: jest.fn().mockRejectedValue(new Error("API Error")),
    }));

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // 等待錯誤訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/無法獲取區塊資料：API Error/i)).toBeDefined();
    });

    // 檢查重試和返回按鈕
    expect(screen.getByText("重試")).toBeDefined();
    expect(screen.getByText("返回")).toBeDefined();
  });
});
