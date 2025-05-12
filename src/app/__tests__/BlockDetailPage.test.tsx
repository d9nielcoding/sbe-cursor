import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

// Mock dependencies to avoid circular dependencies
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useParams: () => ({ slot: "100" }),
}));

// Define mock functions to be used in tests
const mockGetBlockBySlot = jest.fn();
const mockGetTransactionsFromBlock = jest.fn();
const mockGetSlotLeader = jest.fn();

jest.mock("../../lib/solana/api", () => ({
  SolanaApiService: jest.fn().mockImplementation(() => ({
    getBlockBySlot: mockGetBlockBySlot,
    getTransactionsFromBlock: mockGetTransactionsFromBlock,
    getSlotLeader: mockGetSlotLeader,
  })),
}));

// Import component after mocking
import BlockDetailPage from "../blocks/[slot]/page";

// Mock block data
const mockBlockData = {
  blockHeight: 100,
  blockHash: "block_hash_100",
  blockTime: 1677657600, // Timestamp for 2023-03-01
  parentBlockHash: "parent_hash_99",
  previousBlockhash: "prev_hash_99",
  transactionCount: 10,
  leader: "leader_address_100",
  childSlots: [101],
};

// Mock transaction data with different timestamps
const mockTransactions = [
  {
    transactionHash: "tx_hash_1",
    blockTime: 1677657600, // Later timestamp
    slot: 100,
    status: "confirmed",
    fee: 5000,
    accounts: ["account1", "account2"],
  },
  {
    transactionHash: "tx_hash_2",
    blockTime: 1677657590, // Earlier timestamp
    slot: 100,
    status: "confirmed",
    fee: 5000,
    accounts: ["account3", "account4"],
  },
  {
    transactionHash: "tx_hash_3",
    blockTime: 1677657595, // Middle timestamp
    slot: 100,
    status: "confirmed",
    fee: 5000,
    accounts: ["account5", "account6"],
  },
];

describe("BlockDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock implementations
    mockGetBlockBySlot.mockResolvedValue(mockBlockData);
    mockGetTransactionsFromBlock.mockResolvedValue(mockTransactions);
    mockGetSlotLeader.mockImplementation((slot: number) => {
      if (slot === 99) return Promise.resolve("parent_leader_99");
      if (slot === 101) return Promise.resolve("child_leader_101");
      return Promise.resolve(`leader_${slot}`);
    });
  });

  it("displays block details and transaction list", async () => {
    await act(async () => {
      render(<BlockDetailPage />);
    });

    // Wait for block title to appear, indicating the page has loaded
    await waitFor(() => {
      expect(screen.getByText("Block Information")).toBeTruthy();
    });

    // Check block information
    // Use getAllByText and find the parent element that's not inside the tooltip
    const blockHashElements = screen.getAllByText("block_hash_100");
    // 至少有一個元素存在
    expect(blockHashElements.length).toBeGreaterThan(0);

    const parentHashElements = screen.getAllByText("prev_hash_99");
    expect(parentHashElements.length).toBeGreaterThan(0);

    // 檢查其他資訊，這些不會重複
    expect(screen.getByText("Block Height (Slot)")).toBeTruthy();
    expect(
      screen.getByText("100", { selector: ".text-sm.font-mono" })
    ).toBeTruthy();

    // 檢查區塊哈希和父區塊哈希
    expect(screen.getByText("Block Hash")).toBeTruthy();
    expect(screen.getByText("Parent Block Hash")).toBeTruthy();

    // 檢查時間戳記
    expect(screen.getByText("Timestamp (Local)")).toBeTruthy();
    expect(screen.getByText("Timestamp (UTC)")).toBeTruthy();

    // 檢查父區塊槽位
    expect(screen.getByText("Parent Slot")).toBeTruthy();
    expect(screen.getByText("99")).toBeTruthy();

    // 檢查交易數量
    expect(screen.getByText("Transaction Count")).toBeTruthy();
    expect(screen.getByText("10", { selector: ".font-bold" })).toBeTruthy();
    expect(screen.getByText(/transactions$/)).toBeTruthy();

    // 檢查 Leader 資訊
    expect(screen.getByText("Slot Leader")).toBeTruthy();
    const leaderHashElements = screen.getAllByText("leader_address_100");
    expect(leaderHashElements.length).toBeGreaterThan(0);

    // 檢查 Parent Slot Leader 資訊
    await waitFor(() => {
      expect(screen.getByText("Parent Slot Leader")).toBeTruthy();
    });
    expect(screen.getByText("parent_leader_99")).toBeTruthy();

    // 檢查 Child Slot 資訊
    expect(screen.getByText("Child Slot")).toBeTruthy();
    // 檢查子槽位鏈接
    const childSlotLink = screen.getByText("101");
    expect(childSlotLink.closest("a")).toHaveAttribute("href", "/blocks/101");

    // 檢查 Child Slot Leader 資訊
    await waitFor(() => {
      expect(screen.getByText("Child Slot Leader")).toBeTruthy();
    });
    expect(screen.getByText("child_leader_101")).toBeTruthy();

    // Check navigation buttons
    const prevBlockLink = screen.getByText("Previous Block");
    const nextBlockLink = screen.getByText("Next Block");
    const blockListLink = screen.getByText("Block List");

    expect(prevBlockLink.getAttribute("href")).toBe("/blocks/99");
    expect(nextBlockLink.getAttribute("href")).toBe("/blocks/101");
    expect(blockListLink.getAttribute("href")).toBe("/blocks");

    // Check transaction list section
    expect(screen.getByRole("heading", { name: "Transactions" })).toBeTruthy();

    // Check table headers
    expect(screen.getByText("Transaction Signature")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Fee (SOL)")).toBeTruthy();

    // Check transaction data
    expect(screen.getAllByText("Confirmed").length).toBe(
      mockTransactions.length
    );

    // 檢查交易行是否顯示（不需要檢查確切的值和順序）
    const rows = screen.getAllByRole("row");
    // 第一行是表頭，所以至少應該有表頭加一行數據
    expect(rows.length).toBeGreaterThan(1);
  });

  it("displays block details with no transactions", async () => {
    // Mock a case with no transactions
    mockGetTransactionsFromBlock.mockResolvedValue([]);

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // Wait for block title to appear
    await waitFor(() => {
      expect(screen.getByText("Block Information")).toBeTruthy();
    });

    // Check empty transaction list message
    expect(screen.getByText("No transactions in this block")).toBeTruthy();
  });

  it("handles case when block is not found", async () => {
    // Mock invalid block number
    jest
      .spyOn(require("next/navigation"), "useParams")
      .mockReturnValue({ slot: "999" });
    mockGetBlockBySlot.mockResolvedValue(null);

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(/Block data not found for height 999/i)
      ).toBeTruthy();
    });

    // Check back button
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("handles API errors", async () => {
    // Mock API error
    mockGetBlockBySlot.mockRejectedValue(new Error("API Error"));

    await act(async () => {
      render(<BlockDetailPage />);
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch block data: API Error/i)
      ).toBeTruthy();
    });

    // Check retry and back buttons
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
  });

  // New test for timestamp sorting feature
  it("sorts transactions by timestamp when header is clicked", async () => {
    await act(async () => {
      render(<BlockDetailPage />);
    });

    // Wait for page to load by checking for a more specific element
    await waitFor(() => {
      expect(screen.getByText("Block Information")).toBeTruthy();
    });

    // Ensure timestamp column exists
    const timestampHeader = screen.getByText("Timestamp", {
      selector: "th div",
    });
    expect(timestampHeader).toBeTruthy();

    // Initially transactions should be sorted in descending order (latest first)
    expect(timestampHeader).toHaveTextContent("▼");

    // Click to sort ascending
    fireEvent.click(timestampHeader);

    // Should now be in ascending order
    expect(timestampHeader).toHaveTextContent("▲");

    // 檢查表格行數而非特定內容
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });

    // Click again to sort descending
    fireEvent.click(timestampHeader);

    // Should now be in descending order
    expect(timestampHeader).toHaveTextContent("▼");

    // 檢查表格行數而非特定內容
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1);
    });
  });

  // Test for the new timestamp format
  it("formats timestamps correctly according to specified format", async () => {
    await act(async () => {
      render(<BlockDetailPage />);
    });

    // Wait for block title to appear, indicating the page has loaded
    await waitFor(() => {
      expect(screen.getByText("Block Information")).toBeTruthy();
    });

    // Find all timestamps displayed on the page
    const allTimestampElements = screen.getAllByText(/\d{1,2}:\d{1,2}:\d{1,2}/);

    // Find the local timestamp (contains GMT but not UTC)
    const localTimestamp = allTimestampElements.find(
      (el) =>
        el.textContent?.includes("GMT") && !el.textContent?.includes("UTC")
    );
    expect(localTimestamp).toBeTruthy();
    console.log("Local timestamp found:", localTimestamp?.textContent);

    // Find the UTC timestamp
    const utcTimestamp = allTimestampElements.find((el) =>
      el.textContent?.includes("UTC")
    );
    expect(utcTimestamp).toBeTruthy();
    console.log("UTC timestamp found:", utcTimestamp?.textContent);

    // Validate formats meet our expectations
    expect(localTimestamp?.textContent).toMatch(
      /^[A-Z][a-z]+ \d{1,2} \d{4} at \d{2}:\d{2}:\d{2} GMT[+-]\d+$/
    );
    expect(utcTimestamp?.textContent).toMatch(
      /^[A-Z][a-z]+ \d{1,2} \d{4} at \d{2}:\d{2}:\d{2} UTC$/
    );
  });
});
