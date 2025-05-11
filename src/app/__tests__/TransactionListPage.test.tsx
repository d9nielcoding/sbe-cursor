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
    getTransactionsFromBlock: jest.fn(),
  })),
}));

// 在模擬之後再導入組件
import { SolanaApiService } from "../../lib/solana/api";
import BlockTransactionsPage from "../blocks/[slot]/transactions/page";

// 模擬數據
const mockTransactions = [
  {
    transactionHash: "tx_signature_1",
    slot: 100,
    blockTime: 1677657600,
    status: "success",
    fee: 5000,
  },
  {
    transactionHash: "tx_signature_2",
    slot: 100,
    blockTime: 1677657590,
    status: "success",
    fee: 5000,
  },
  {
    transactionHash: "tx_signature_3",
    slot: 100,
    blockTime: 1677657580,
    status: "success",
    fee: 5000,
  },
];

describe("BlockTransactionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 在這裡設置每個測試的模擬實現
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionsFromBlock: jest.fn().mockResolvedValue(mockTransactions),
    }));
  });

  it("顯示區塊交易列表", async () => {
    await act(async () => {
      render(<BlockTransactionsPage />);
    });

    // 等待頁面標題顯示，表示頁面已經載入完成
    await waitFor(() => {
      expect(screen.getByText(/區塊 #100 的交易/i)).toBeDefined();
    });

    // 檢查表格標題
    expect(screen.getByText("交易哈希")).toBeDefined();
    expect(screen.getByText("時間戳")).toBeDefined();
    expect(screen.getByText("區塊")).toBeDefined();
    expect(screen.getByText("狀態")).toBeDefined();
    expect(screen.getByText("手續費")).toBeDefined();

    // 檢查交易資料
    expect(screen.getAllByText("success")).toBeDefined();
    expect(screen.getAllByText("5000 SOL")).toBeDefined();
    expect(screen.getAllByText("詳情").length).toBe(3);

    // 檢查返回按鈕
    const blockDetailLink = screen.getByText("返回區塊詳情");
    expect(blockDetailLink.getAttribute("href")).toBe("/blocks/100");
  });

  it("處理空交易列表", async () => {
    // 模擬空數據
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionsFromBlock: jest.fn().mockResolvedValue([]),
    }));

    await act(async () => {
      render(<BlockTransactionsPage />);
    });

    // 等待頁面載入完成
    await waitFor(() => {
      expect(screen.getByText(/區塊 #100 的交易/i)).toBeDefined();
    });

    // 檢查無交易訊息
    expect(screen.getByText("此區塊沒有交易")).toBeDefined();
  });

  it("處理 API 錯誤", async () => {
    // 模擬 API 錯誤
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionsFromBlock: jest
        .fn()
        .mockRejectedValue(new Error("API Error")),
    }));

    await act(async () => {
      render(<BlockTransactionsPage />);
    });

    // 等待錯誤訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/無法獲取交易資料/i)).toBeDefined();
    });

    // 檢查重試按鈕
    expect(screen.getByText("重試")).toBeDefined();
    expect(screen.getByText("返回")).toBeDefined();
  });
});
