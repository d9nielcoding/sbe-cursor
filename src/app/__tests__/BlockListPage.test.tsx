import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
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

    // Check detail links
    const links = screen.getAllByText("View");
    expect(links).toHaveLength(3);
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
    expect(screen.getByRole("button", { name: /Retry/i })).toBeTruthy();
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
    const timestampHeader = screen.getByText("Timestamp", {
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
});
