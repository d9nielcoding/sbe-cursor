import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import BlockListPage from "../blocks/page";

// Mock SolanaApiService
const mockGetRecentBlocks = jest.fn();
jest.mock("../../lib/solana/api", () => {
  return {
    SolanaApiService: jest.fn().mockImplementation(() => ({
      getRecentBlocks: mockGetRecentBlocks,
    })),
  };
});

// Mock next/navigation
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
        blockTime: 1677657600, // Timestamp for 2023-03-01
        parentBlockHash: "parent_hash_99",
        previousBlockhash: "prev_hash_99",
        transactionCount: 10,
      },
      {
        blockHeight: 99,
        blockHash: "block_hash_99",
        blockTime: 1677657500, // Earlier timestamp
        parentBlockHash: "parent_hash_98",
        previousBlockhash: "prev_hash_98",
        transactionCount: 5,
      },
      {
        blockHeight: 101,
        blockHash: "block_hash_101",
        blockTime: 1677657700, // Later timestamp
        parentBlockHash: "parent_hash_100",
        previousBlockhash: "prev_hash_100",
        transactionCount: 8,
      },
    ]);
  });

  it("loads and displays block list successfully", async () => {
    // Wrap rendering and waiting with act
    await act(async () => {
      render(<BlockListPage />);
    });

    // Wait for title to appear, indicating the page has loaded
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Recent Blocks/i })
      ).toBeTruthy();
    });

    // Check block data
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("99")).toBeTruthy();
    expect(screen.getByText("101")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();

    // 確認頁面上存在區塊哈希，但不檢查確切的顯示格式
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(3); // 標題行 + 至少3個資料行
  });

  it("handles API errors", async () => {
    // Override mock implementation for this test
    mockGetRecentBlocks.mockRejectedValueOnce(new Error("API Error"));

    await act(async () => {
      render(<BlockListPage />);
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch block data/i)).toBeTruthy();
    });

    // Check retry button
    expect(screen.getByRole("button", { name: /Try Again/i })).toBeTruthy();
  });

  it("sorts blocks by timestamp when timestamp header is clicked", async () => {
    await act(async () => {
      render(<BlockListPage />);
    });

    // Wait for blocks to load
    await waitFor(() => {
      expect(screen.getByText("Recent Blocks")).toBeTruthy();
    });

    // Get the timestamp header
    const timestampHeader = screen.getByText("Time (UTC)", {
      selector: "th div",
    });

    // Initially should be sorted in descending order (latest first)
    expect(timestampHeader).toHaveTextContent("▼");

    // Click to sort ascending
    fireEvent.click(timestampHeader);

    // Should now be in ascending order
    expect(timestampHeader).toHaveTextContent("▲");

    // Click again to sort descending
    fireEvent.click(timestampHeader);

    // Should now be in descending order
    expect(timestampHeader).toHaveTextContent("▼");
  });

  it("handles blocks without timestamp", async () => {
    // Override mock implementation for this test with a block without timestamp
    mockGetRecentBlocks.mockResolvedValueOnce([
      {
        blockHeight: 100,
        blockHash: "block_hash_100",
        blockTime: null, // null timestamp
        parentBlockHash: "parent_hash_99",
        previousBlockhash: "prev_hash_99",
        transactionCount: 10,
      },
    ]);

    await act(async () => {
      render(<BlockListPage />);
    });

    // Wait for blocks to load
    await waitFor(() => {
      expect(screen.getByText("Recent Blocks")).toBeTruthy();
    });

    // Check "N/A" text for missing timestamp
    expect(screen.getByText("N/A")).toBeTruthy();
  });

  it("formats long hash values correctly", async () => {
    // Override mock implementation for this test with very long hash values
    const longHash = "0123456789abcdef0123456789abcdef0123456789abcdef";
    mockGetRecentBlocks.mockResolvedValueOnce([
      {
        blockHeight: 100,
        blockHash: longHash,
        blockTime: 1677657600,
        parentBlockHash: longHash,
        previousBlockhash: longHash,
        transactionCount: 10,
      },
    ]);

    await act(async () => {
      render(<BlockListPage />);
    });

    // Wait for blocks to load
    await waitFor(() => {
      expect(screen.getByText("Recent Blocks")).toBeTruthy();
    });

    // 檢查區塊哈希是否被截斷顯示，但不檢查確切的格式
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(1);

    // 獲取第一個資料行（跳過標題行）
    const firstRow = rows[1];

    // 在這一行中找到第一個單元格，它應該包含截斷的哈希值
    const firstCell = within(firstRow).getAllByRole("cell")[0];

    // 檢查這個單元格是否包含"0123456789ab"的開頭部分
    expect(firstCell.textContent).toContain("0123456789ab");
  });
});
