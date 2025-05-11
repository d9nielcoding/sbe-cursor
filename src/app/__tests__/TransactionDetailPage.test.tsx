import { act, render, screen, waitFor } from "@testing-library/react";

// 先模擬依賴，避免循環引用問題
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useParams: () => ({ signature: "test_signature" }),
}));

jest.mock("../../lib/solana/api", () => ({
  SolanaApiService: jest.fn().mockImplementation(() => ({
    getTransactionBySignature: jest.fn(),
  })),
}));

// 在模擬之後再導入組件
import { SolanaApiService } from "../../lib/solana/api";
import TransactionDetailPage from "../transactions/[signature]/page";

// 模擬數據
const mockTransactionDetail = {
  transactionHash: "test_signature",
  slot: 100,
  blockTime: 1677657600,
  status: "success",
  fee: 5000,
  accounts: ["account1", "account2", "account3"],
  programIds: ["program1", "program2"],
  instructions: [
    {
      programId: "program1",
      accounts: ["account1", "account2"],
      data: "0x123456",
    },
    {
      programId: "program2",
      accounts: ["account2", "account3"],
      data: "0x789abc",
    },
  ],
  logs: ["Log message 1", "Log message 2", "Log message 3"],
};

describe("TransactionDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 在這裡設置每個測試的模擬實現
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionBySignature: jest
        .fn()
        .mockResolvedValue(mockTransactionDetail),
    }));
  });

  it("顯示交易詳情", async () => {
    await act(async () => {
      render(<TransactionDetailPage />);
    });

    // 等待頁面標題顯示，表示頁面已經載入完成
    await waitFor(() => {
      expect(screen.getByText("交易詳情")).toBeDefined();
    });

    // 檢查交易基本信息
    expect(screen.getByText("success")).toBeDefined();
    expect(screen.getByText("5000 SOL")).toBeDefined();

    // 檢查指令信息
    expect(screen.getAllByText("程式 ID")[0]).toBeDefined();
    expect(screen.getByText("program1")).toBeDefined();
    expect(screen.getByText("program2")).toBeDefined();

    // 檢查賬戶信息
    expect(screen.getByText("涉及的帳戶")).toBeDefined();
    expect(screen.getAllByText("account1")[0]).toBeDefined();
    expect(screen.getAllByText("account2")[0]).toBeDefined();
    expect(screen.getAllByText("account3")[0]).toBeDefined();

    // 檢查所屬區塊按鈕
    const blockLink = screen.getByText("查看所屬區塊");
    expect(blockLink.getAttribute("href")).toBe("/blocks/100");
  });

  it("處理找不到交易的情況", async () => {
    // 模擬無效交易簽名
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionBySignature: jest.fn().mockResolvedValue(null),
    }));

    await act(async () => {
      render(<TransactionDetailPage />);
    });

    // 等待錯誤訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/找不到交易.*的資料/i)).toBeDefined();
    });

    // 檢查返回按鈕
    expect(screen.getByText("返回")).toBeDefined();
  });

  it("處理 API 錯誤", async () => {
    // 模擬 API 錯誤
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionBySignature: jest
        .fn()
        .mockRejectedValue(new Error("API Error")),
    }));

    await act(async () => {
      render(<TransactionDetailPage />);
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
