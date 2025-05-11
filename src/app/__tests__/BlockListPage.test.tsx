import { act, render, screen, waitFor } from "@testing-library/react";
import BlockListPage from "../blocks/page";

// 模擬 SolanaApiService
const mockGetRecentBlocks = jest.fn();
jest.mock("../../lib/solana/api", () => {
  return {
    SolanaApiService: jest.fn().mockImplementation(() => ({
      getRecentBlocks: mockGetRecentBlocks,
    })),
  };
});

// 模擬 next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useParams: jest.fn().mockReturnValue({}),
}));

describe("BlockListPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRecentBlocks.mockResolvedValue([
      {
        blockHeight: 100,
        blockHash: "block_hash_100",
        blockTime: 1677657600, // 2023-03-01 時間戳
        parentBlockHash: "parent_hash_99",
        previousBlockhash: "prev_hash_99",
        transactionCount: 10,
      },
      {
        blockHeight: 99,
        blockHash: "block_hash_99",
        blockTime: 1677657500,
        parentBlockHash: "parent_hash_98",
        previousBlockhash: "prev_hash_98",
        transactionCount: 5,
      },
    ]);
  });

  it("成功載入並顯示區塊列表", async () => {
    // 使用 act 包裹渲染和等待
    await act(async () => {
      render(<BlockListPage />);
    });

    // 等待標題顯示表示頁面已經載入完成
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /最新區塊/i })
      ).toBeInTheDocument();
    });

    // 檢查區塊資料
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("99")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    // 檢查詳情連結
    const links = screen.getAllByText("詳情");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/blocks/100");
  });

  it("處理 API 錯誤", async () => {
    // 為這個測試覆寫模擬實現
    mockGetRecentBlocks.mockRejectedValueOnce(new Error("API Error"));

    await act(async () => {
      render(<BlockListPage />);
    });

    // 等待錯誤訊息顯示
    await waitFor(() => {
      expect(screen.getByText(/無法獲取區塊數據/i)).toBeInTheDocument();
    });

    // 檢查重試按鈕
    expect(screen.getByRole("button", { name: /重試/i })).toBeInTheDocument();
  });
});
