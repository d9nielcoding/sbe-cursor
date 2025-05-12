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

// 定義會在測試中使用的模擬函數
const mockGetBlockBySlot = jest.fn();
const mockGetTransactionsFromBlock = jest.fn();

jest.mock("../../lib/solana/api", () => ({
  SolanaApiService: jest.fn().mockImplementation(() => ({
    getBlockBySlot: mockGetBlockBySlot,
    getTransactionsFromBlock: mockGetTransactionsFromBlock,
  })),
}));

// 在模擬之後再導入組件
import BlockDetailPage from "../blocks/[slot]/page";

// 模擬區塊數據
const mockBlockData = {
  blockHeight: 100,
  blockHash: "block_hash_100",
  blockTime: 1677657600, // 2023-03-01 時間戳
  parentBlockHash: "parent_hash_99",
  previousBlockhash: "prev_hash_99",
  transactionCount: 10,
};

// 模擬交易數據
const mockTransactions = [
  {
    transactionHash: "tx_hash_1",
    blockTime: 1677657600,
    slot: 100,
    status: "confirmed",
    fee: 5000,
    accounts: ["account1", "account2"],
  },
  {
    transactionHash: "tx_hash_2",
    blockTime: 1677657590,
    slot: 100,
    status: "confirmed",
    fee: 5000,
    accounts: ["account3", "account4"],
  },
];

describe("BlockDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 設置默認模擬實現
    mockGetBlockBySlot.mockResolvedValue(mockBlockData);
    mockGetTransactionsFromBlock.mockResolvedValue(mockTransactions);
  });

  it("顯示區塊詳情和交易列表", async () => {
    await act(async () => {
      render(<BlockDetailPage />);
    });

    // 等待區塊標題顯示，表示頁面已經載入完成
    await waitFor(() => {
      expect(screen.getByText(/區塊 #100/i)).toBeTruthy();
    });

    // 檢查區塊資訊
    expect(screen.getByText("block_hash_100")).toBeTruthy();
    expect(screen.getByText("parent_hash_99")).toBeTruthy();
    expect(screen.getByText("prev_hash_99")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();

    // 檢查導航按鈕
    const prevBlockLink = screen.getByText("上一區塊");
    const nextBlockLink = screen.getByText("下一區塊");
    const blockListLink = screen.getByText("區塊列表");

    expect(prevBlockLink.getAttribute("href")).toBe("/blocks/99");
    expect(nextBlockLink.getAttribute("href")).toBe("/blocks/101");
    expect(blockListLink.getAttribute("href")).toBe("/blocks");

    // 檢查交易列表
    expect(screen.getByText("區塊交易")).toBeTruthy();

    // 檢查表頭
    expect(screen.getByText("交易哈希")).toBeTruthy();
    expect(screen.getByText("時間戳")).toBeTruthy();
    expect(screen.getByText("狀態")).toBeTruthy();
    expect(screen.getByText("手續費")).toBeTruthy();

    // 檢查交易數據
    expect(screen.getAllByText("confirmed").length).toBe(2);

    // 檢查詳情連結
    const detailLinks = screen.getAllByText("詳情");
    expect(detailLinks.length).toBe(2);
    expect(detailLinks[0].getAttribute("href")).toBe("/transactions/tx_hash_1");
    expect(detailLinks[1].getAttribute("href")).toBe("/transactions/tx_hash_2");
  });

  it("顯示區塊詳情但沒有交易", async () => {
    // 模擬沒有交易的情況
    mockGetTransactionsFromBlock.mockResolvedValue([]);

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // 等待區塊標題顯示
    await waitFor(() => {
      expect(screen.getByText(/區塊 #100/i)).toBeTruthy();
    });

    // 檢查交易列表為空的提示
    expect(screen.getByText("此區塊沒有交易")).toBeTruthy();
  });

  it("處理找不到區塊的情況", async () => {
    // 模擬無效區塊編號
    jest
      .spyOn(require("next/navigation"), "useParams")
      .mockReturnValue({ slot: "999" });
    mockGetBlockBySlot.mockResolvedValue(null);

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // 等待錯誤訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/找不到區塊高度 999 的資料/i)).toBeTruthy();
    });

    // 檢查返回按鈕
    expect(screen.getByText("返回")).toBeTruthy();
  });

  it("處理 API 錯誤", async () => {
    // 模擬 API 錯誤
    mockGetBlockBySlot.mockRejectedValue(new Error("API Error"));

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // 等待錯誤訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/無法獲取區塊資料：API Error/i)).toBeTruthy();
    });

    // 檢查重試和返回按鈕
    expect(screen.getByText("重試")).toBeTruthy();
    expect(screen.getByText("返回")).toBeTruthy();
  });
});
