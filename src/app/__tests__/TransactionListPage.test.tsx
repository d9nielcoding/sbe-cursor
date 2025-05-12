import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";

// Mock dependencies to avoid circular reference issues
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

// Import component after mocking
import { SolanaApiService } from "../../lib/solana/api";
import BlockTransactionsPage from "../blocks/[slot]/transactions/page";

// Mock data
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
    // Set up mock implementation for each test
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionsFromBlock: jest.fn().mockResolvedValue(mockTransactions),
    }));
  });

  it("displays block transactions list", async () => {
    await act(async () => {
      render(<BlockTransactionsPage />);
    });

    // Wait for page title to appear, indicating the page has loaded
    await waitFor(() => {
      expect(screen.getByText(/Transactions in Block #100/i)).toBeTruthy();
    });

    // Check table headers
    expect(screen.getByText("Transaction Hash")).toBeTruthy();
    expect(screen.getByText("Timestamp")).toBeTruthy();
    expect(screen.getByText("Block")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Fee")).toBeTruthy();

    // Check transaction data
    expect(screen.getAllByText("success")).toBeTruthy();
    expect(screen.getAllByText("5000 SOL")).toBeTruthy();
    expect(screen.getAllByText("View").length).toBe(3);

    // Check back button
    const blockDetailLink = screen.getByText("Back to Block Details");
    expect(blockDetailLink.getAttribute("href")).toBe("/blocks/100");
  });

  it("handles empty transaction list", async () => {
    // Mock empty data
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionsFromBlock: jest.fn().mockResolvedValue([]),
    }));

    await act(async () => {
      render(<BlockTransactionsPage />);
    });

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/Transactions in Block #100/i)).toBeTruthy();
    });

    // Check no transactions message
    expect(screen.getByText("No transactions in this block")).toBeTruthy();
  });

  it("handles API errors", async () => {
    // Mock API error
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionsFromBlock: jest
        .fn()
        .mockRejectedValue(new Error("API Error")),
    }));

    await act(async () => {
      render(<BlockTransactionsPage />);
    });

    // Wait for error message
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch transaction data/i)
      ).toBeTruthy();
    });

    // Check retry button
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
  });
});
