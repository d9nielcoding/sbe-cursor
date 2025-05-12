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

jest.mock("../../lib/solana/api", () => ({
  SolanaApiService: jest.fn().mockImplementation(() => ({
    getBlockBySlot: mockGetBlockBySlot,
    getTransactionsFromBlock: mockGetTransactionsFromBlock,
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
    expect(screen.getByText("block_hash_100")).toBeTruthy();
    expect(screen.getByText("parent_hash_99")).toBeTruthy();
    expect(screen.getByText("prev_hash_99")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();

    // Check navigation buttons
    const prevBlockLink = screen.getByText("Previous Block");
    const nextBlockLink = screen.getByText("Next Block");
    const blockListLink = screen.getByText("Block List");

    expect(prevBlockLink.getAttribute("href")).toBe("/blocks/99");
    expect(nextBlockLink.getAttribute("href")).toBe("/blocks/101");
    expect(blockListLink.getAttribute("href")).toBe("/blocks");

    // Check transaction list section
    expect(screen.getByText("Transactions")).toBeTruthy();

    // Check table headers
    expect(screen.getByText("Transaction Hash")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Fee")).toBeTruthy();

    // Check transaction data
    expect(screen.getAllByText("confirmed").length).toBe(
      mockTransactions.length
    );

    // Check detail links
    const detailLinks = screen.getAllByText("View");
    expect(detailLinks.length).toBe(mockTransactions.length);

    // 確保所有的交易鏈接都存在，但不再檢查特定順序
    expect(screen.getByText(/tx_hash_...x_hash_1/)).toBeTruthy();
    expect(screen.getByText(/tx_hash_...x_hash_2/)).toBeTruthy();
    expect(screen.getByText(/tx_hash_...x_hash_3/)).toBeTruthy();
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

    // Wait for sorting to complete
    await waitFor(() => {
      const sortedRows = screen.getAllByRole("row");
      // Verify first row after header contains the earliest timestamp transaction (tx_hash_2)
      const firstDataRow = sortedRows[1];
      expect(firstDataRow.textContent).toContain("tx_hash_...x_hash_2");
    });

    // Click again to sort descending
    fireEvent.click(timestampHeader);

    // Should now be in descending order
    expect(timestampHeader).toHaveTextContent("▼");

    // Wait for sorting to complete
    await waitFor(() => {
      const sortedRows = screen.getAllByRole("row");
      // Verify first row after header contains the latest timestamp transaction (tx_hash_1)
      const firstDataRow = sortedRows[1];
      expect(firstDataRow.textContent).toContain("tx_hash_...x_hash_1");
    });
  });
});
