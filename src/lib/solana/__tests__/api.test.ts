// First step: Define the expected interfaces before implementation

// Import our implementations and types
import { Connection } from "@solana/web3.js";
import { BlockData, SolanaApiService } from "../api";

// Mock Connection class
jest.mock("@solana/web3.js", () => {
  return {
    Connection: jest.fn().mockImplementation(() => ({
      getSlot: jest.fn().mockResolvedValue(100),
      getBlock: jest.fn().mockImplementation((slot: number) => {
        if (slot < 0 || slot > 100) return Promise.resolve(null);

        return Promise.resolve({
          blockhash: `blockhash_${slot}`,
          blockTime: Date.now() / 1000,
          parentSlot: slot - 1,
          previousBlockhash: `blockhash_${slot - 1}`,
          transactions: [
            {
              transaction: {
                signatures: [`signature_${slot}_1`],
                message: {
                  getAccountKeys: () => ({
                    keySegments: () => [
                      [{ toString: () => `account_${slot}_1` }],
                    ],
                  }),
                },
              },
              meta: {
                err: null,
                fee: 5000,
              },
            },
          ],
        });
      }),
      // Mock getting recent finalized block, usable for block hash queries
      getRecentBlockhash: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          blockhash: "blockhash_100",
          lastValidBlockHeight: 100,
        });
      }),
      // Mock querying block time by slot
      getBlockTime: jest.fn().mockImplementation((slot: number) => {
        if (slot < 0 || slot > 100) return Promise.resolve(null);
        return Promise.resolve(Date.now() / 1000);
      }),
      // Mock getting blocks within a range
      getBlocks: jest.fn().mockImplementation((startSlot, endSlot) => {
        const blocks = [];
        for (let i = startSlot; i <= endSlot && i <= 100; i++) {
          if (i >= 0) blocks.push(i);
        }
        return Promise.resolve(blocks);
      }),
      // Mock getting slot leaders
      getSlotLeaders: jest.fn().mockImplementation((startSlot, limit) => {
        const leaders = [];
        for (let i = 0; i < limit; i++) {
          const slot = startSlot + i;
          if (slot < 0 || slot > 100) continue;
          leaders.push({ toString: () => `leader_${slot}` });
        }
        return Promise.resolve(leaders);
      }),
      getParsedTransaction: jest
        .fn()
        .mockImplementation((signature: string) => {
          if (signature === "invalid_signature") return Promise.resolve(null);

          const slot = parseInt(signature.split("_")[1]);

          return Promise.resolve({
            blockTime: Date.now() / 1000,
            slot,
            meta: {
              err: signature.includes("error")
                ? { error: "Transaction failed" }
                : null,
              fee: 5000,
              logMessages: [`Log message for ${signature}`],
            },
            transaction: {
              message: {
                accountKeys: [
                  { pubkey: { toString: () => `account_${slot}_1` } },
                ],
                instructions: [
                  {
                    programId: {
                      toString: () => "program_id_1",
                    },
                    accounts: [{ toString: () => `account_${slot}_1` }],
                    data: "test_data",
                  },
                ],
              },
            },
          });
        }),
    })),
  };
});

// 為測試創建一個 SolanaApiService 的子類，允許訪問私有成員
class TestSolanaApiService extends SolanaApiService {
  // 創建訪問私有屬性的方法
  setTestConnection(connection: Connection): void {
    // @ts-expect-error - 允許在測試中訪問私有屬性
    this.connection = connection;
  }

  setTestFallbackConnection(connection: Connection | null): void {
    // @ts-expect-error - 允許在測試中訪問私有屬性
    this.fallbackConnection = connection;
  }
}

describe("SolanaApiService", () => {
  describe("getRecentBlocks", () => {
    it("should return recent blocks", async () => {
      // 1. Create SolanaApiService instance
      const apiService = new SolanaApiService("mock_endpoint");

      // 2. Call method and get results
      const blocks = await apiService.getRecentBlocks(3);

      // 3. Validate results
      expect(blocks).toHaveLength(3);
      expect(blocks[0].blockHeight).toBe(100);
      expect(blocks[1].blockHeight).toBe(99);
      expect(blocks[2].blockHeight).toBe(98);

      blocks.forEach((block: BlockData) => {
        expect(block).toHaveProperty("blockHash");
        expect(block).toHaveProperty("blockTime");
        expect(block).toHaveProperty("parentBlockHash");
        expect(block).toHaveProperty("previousBlockhash");
        expect(block).toHaveProperty("transactionCount");
      });
    });

    it("should handle errors gracefully", async () => {
      // 1. Create mock connection with failing method
      const mockConnection = {
        getSlot: jest.fn().mockRejectedValue(new Error("Network error")),
        getBlock: jest.fn(),
      } as unknown as Connection;

      // 2. Create API service and replace both connections
      const apiService = new TestSolanaApiService("mock_endpoint");
      apiService.setTestConnection(mockConnection);
      apiService.setTestFallbackConnection(mockConnection); // Also make fallback fail

      // 3. Validate error handling
      await expect(apiService.getRecentBlocks()).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getBlockBySlot", () => {
    it("should return block data for valid slot", async () => {
      const apiService = new SolanaApiService("mock_endpoint");

      const block = await apiService.getBlockBySlot(95);

      expect(block).not.toBeNull();
      if (block) {
        expect(block.blockHeight).toBe(95);
        expect(block.blockHash).toBe("blockhash_95");
        expect(block.transactionCount).toBe(1);
        expect(block.leader).toBe("leader_95");
        expect(block.childSlots).toEqual([96]);
      }
    });

    it("should return null for invalid slot", async () => {
      const apiService = new SolanaApiService("mock_endpoint");

      const block = await apiService.getBlockBySlot(101);
      expect(block).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      const mockConnection = {
        getBlock: jest.fn().mockRejectedValue(new Error("Network error")),
      } as unknown as Connection;

      const apiService = new TestSolanaApiService("mock_endpoint");
      apiService.setTestConnection(mockConnection);
      apiService.setTestFallbackConnection(mockConnection);

      await expect(apiService.getBlockBySlot(95)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getTransactionsFromBlock", () => {
    it("should return transactions from a block", async () => {
      const apiService = new SolanaApiService("mock_endpoint");

      const transactions = await apiService.getTransactionsFromBlock(95);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].transactionHash).toBe("signature_95_1");
      expect(transactions[0].slot).toBe(95);
      expect(transactions[0].status).toBe("confirmed");
      expect(transactions[0].fee).toBe(5000);
      expect(transactions[0].accounts).toContain("account_95_1");
    });

    it("should return empty array for invalid block", async () => {
      const apiService = new SolanaApiService("mock_endpoint");

      const transactions = await apiService.getTransactionsFromBlock(101);
      expect(transactions).toEqual([]);
    });

    it("should handle errors gracefully", async () => {
      const mockConnection = {
        getBlock: jest.fn().mockRejectedValue(new Error("Network error")),
      } as unknown as Connection;

      const apiService = new TestSolanaApiService("mock_endpoint");
      apiService.setTestConnection(mockConnection);
      apiService.setTestFallbackConnection(mockConnection);

      await expect(apiService.getTransactionsFromBlock(95)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getTransactionBySignature", () => {
    it("should return transaction details for valid signature", async () => {
      const apiService = new SolanaApiService("mock_endpoint");

      const transaction = await apiService.getTransactionBySignature(
        "signature_95_1"
      );

      expect(transaction).not.toBeNull();
      if (transaction) {
        expect(transaction.transactionHash).toBe("signature_95_1");
        expect(transaction.slot).toBe(95);
        expect(transaction.status).toBe("confirmed");
        expect(transaction.fee).toBe(5000);
        expect(transaction.accounts).toContain("account_95_1");
        expect(transaction.instructions).toHaveLength(1);
        expect(transaction.logs).toContain("Log message for signature_95_1");
      }
    });

    it("should return null for invalid signature", async () => {
      const apiService = new SolanaApiService("mock_endpoint");

      const transaction = await apiService.getTransactionBySignature(
        "invalid_signature"
      );
      expect(transaction).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      const mockConnection = {
        getParsedTransaction: jest
          .fn()
          .mockRejectedValue(new Error("Network error")),
      } as unknown as Connection;

      const apiService = new TestSolanaApiService("mock_endpoint");
      apiService.setTestConnection(mockConnection);
      apiService.setTestFallbackConnection(mockConnection);

      await expect(
        apiService.getTransactionBySignature("signature_95_1")
      ).rejects.toThrow("Network error");
    });
  });
});
