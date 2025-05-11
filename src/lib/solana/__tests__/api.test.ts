// 第一步：先定義我們期望的介面，但還沒有實作

// 匯入我們的實作和類型
import { BlockData, SolanaApiService } from "../api";

// 模擬 Connection 類
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

describe("SolanaApiService", () => {
  describe("getRecentBlocks", () => {
    it("should return recent blocks", async () => {
      // 1. 創建 SolanaApiService 實例
      const apiService = new SolanaApiService("mock_endpoint");

      // 2. 調用方法並獲取結果
      const blocks = await apiService.getRecentBlocks(3);

      // 3. 驗證結果
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
      // 1. 創建帶有失敗方法的模擬連接
      const mockConnection = {
        getSlot: jest.fn().mockRejectedValue(new Error("Network error")),
        getBlock: jest.fn(),
      };

      // 2. 創建 API 服務並替換連接
      const apiService = new SolanaApiService("mock_endpoint");
      (apiService as any).connection = mockConnection;

      // 3. 驗證錯誤處理
      await expect(apiService.getRecentBlocks()).rejects.toThrow(
        "Failed to fetch recent blocks"
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
      };

      const apiService = new SolanaApiService("mock_endpoint");
      (apiService as any).connection = mockConnection;

      await expect(apiService.getBlockBySlot(95)).rejects.toThrow(
        "Failed to fetch block at slot 95"
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
      };

      const apiService = new SolanaApiService("mock_endpoint");
      (apiService as any).connection = mockConnection;

      await expect(apiService.getTransactionsFromBlock(95)).rejects.toThrow(
        "Failed to fetch transactions for block at slot 95"
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
      };

      const apiService = new SolanaApiService("mock_endpoint");
      (apiService as any).connection = mockConnection;

      await expect(
        apiService.getTransactionBySignature("signature_95_1")
      ).rejects.toThrow("Failed to fetch transaction signature_95_1");
    });
  });
});
