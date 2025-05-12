import { act, render, screen, waitFor } from "@testing-library/react";

// Mock dependencies to avoid circular reference issues
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

// Import component after mocking
import { SolanaApiService } from "../../lib/solana/api";
import TransactionDetailPage from "../transactions/[signature]/page";

// Mock data
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
    // Set mock implementation for each test
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionBySignature: jest
        .fn()
        .mockResolvedValue(mockTransactionDetail),
    }));
  });

  it("displays transaction details", async () => {
    await act(async () => {
      render(<TransactionDetailPage />);
    });

    // Wait for page title to appear, indicating the page has loaded
    await waitFor(() => {
      expect(screen.getByText("Transaction Details")).toBeTruthy();
    });

    // Check basic transaction info
    expect(screen.getByText("Success")).toBeTruthy();
    expect(screen.getByText("5000 SOL")).toBeTruthy();

    // Check instruction information
    expect(screen.getAllByText("Program ID:")[0]).toBeTruthy();
    expect(screen.getAllByText("program1")[0]).toBeTruthy();
    expect(screen.getAllByText("program2")[0]).toBeTruthy();

    // Check accounts information
    expect(screen.getByText("Accounts Involved")).toBeTruthy();
    expect(screen.getAllByText("account1")[0]).toBeTruthy();
    expect(screen.getAllByText("account2")[0]).toBeTruthy();
    expect(screen.getAllByText("account3")[0]).toBeTruthy();

    // Check block link
    const blockLink = screen.getByText("View Block");
    expect(blockLink.getAttribute("href")).toBe("/blocks/100");
  });

  it("handles case when transaction is not found", async () => {
    // Mock invalid transaction signature
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionBySignature: jest.fn().mockResolvedValue(null),
    }));

    await act(async () => {
      render(<TransactionDetailPage />);
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(/Transaction data not found for test_signature/i)
      ).toBeTruthy();
    });

    // Check back button
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("handles API errors", async () => {
    // Mock API error
    (SolanaApiService as jest.Mock).mockImplementation(() => ({
      getTransactionBySignature: jest
        .fn()
        .mockRejectedValue(new Error("API Error")),
    }));

    await act(async () => {
      render(<TransactionDetailPage />);
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch transaction data/i)
      ).toBeTruthy();
    });

    // Check retry and back buttons
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
  });
});
