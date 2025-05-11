import { Connection, ConnectionConfig } from "@solana/web3.js";

// 定義區塊數據格式
export interface BlockData {
  blockHeight: number;
  blockHash: string;
  blockTime: number | null;
  parentBlockHash: string;
  previousBlockhash: string;
  transactionCount: number;
}

// 定義交易數據格式
export interface TransactionData {
  transactionHash: string;
  blockTime: number | null;
  slot: number;
  status: "confirmed" | "finalized" | "processed" | "failed";
  fee: number;
  accounts: string[];
}

// 定義交易詳情數據格式
export interface TransactionDetailData extends TransactionData {
  instructions: {
    programId: string;
    accounts: string[];
    data: string;
  }[];
  logs: string[];
}

// RPC 端點列表
const RPC_ENDPOINTS = {
  DEVNET: "https://api.devnet.solana.com",
  TESTNET: "https://api.testnet.solana.com",
  MAINNET_BETA: "https://api.mainnet-beta.solana.com",
  // 備用公共端點
  BACKUP_DEVNET: "https://solana-devnet-rpc.publicnode.com",
  BACKUP_MAINNET: "https://solana-mainnet-rpc.publicnode.com",
};

// 重試配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 秒

// 延遲函數
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SolanaApiService 提供與 Solana 區塊鏈互動的方法
 */
export class SolanaApiService {
  private connection: Connection;
  private fallbackConnection: Connection | null = null;

  constructor(
    endpoint: string = RPC_ENDPOINTS.DEVNET,
    fallbackEndpoint: string | null = RPC_ENDPOINTS.BACKUP_DEVNET
  ) {
    const connectionConfig: ConnectionConfig = {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000, // 60 seconds
      disableRetryOnRateLimit: false,
    };

    this.connection = new Connection(endpoint, connectionConfig);

    // 初始化備用連接（如果提供）
    if (fallbackEndpoint) {
      this.fallbackConnection = new Connection(
        fallbackEndpoint,
        connectionConfig
      );
    }
  }

  /**
   * 使用重試機制執行請求，如有需要，嘗試使用備用連接
   */
  private async executeWithRetry<T>(
    operation: (conn: Connection) => Promise<T>,
    errorMessage: string,
    retries = MAX_RETRIES
  ): Promise<T> {
    let lastError;

    // 嘗試使用主要連接
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation(this.connection);
      } catch (error: any) {
        lastError = error;

        // 檢查是否是速率限制或交易版本錯誤
        const isRateLimitError =
          error.message?.includes("429") ||
          error.message?.includes("403") ||
          error.message?.includes("Too many requests");

        const isVersionError =
          error.message?.includes("Transaction version") ||
          error.code === -32015;

        // 如果有備用連接並且遇到速率限制，立即嘗試備用連接
        if (
          this.fallbackConnection &&
          (isRateLimitError || attempt === retries - 1)
        ) {
          console.warn("切換到備用 RPC 端點...");
          try {
            return await operation(this.fallbackConnection);
          } catch (fallbackError: any) {
            console.error("備用 RPC 端點也失敗:", fallbackError);
            lastError = fallbackError;
          }
        }

        // 如果是交易版本錯誤，直接拋出不再重試
        if (isVersionError) {
          throw error;
        }

        // 如果不是速率限制錯誤，且已經重試到最後一次，直接拋出
        if (!isRateLimitError && attempt === retries - 1) {
          throw error;
        }

        // 等待後重試
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `API 請求失敗，${delay}ms 後重試 (${attempt + 1}/${retries})`,
          error
        );
        await sleep(delay);
      }
    }

    throw lastError || new Error(errorMessage);
  }

  /**
   * 獲取最近的區塊
   * @param limit 要獲取的區塊數量
   * @returns 區塊數據陣列
   */
  async getRecentBlocks(limit: number = 10): Promise<BlockData[]> {
    return this.executeWithRetry(async (conn) => {
      // 獲取當前區塊高度
      const currentSlot = await conn.getSlot();

      // 向後獲取區塊
      const blocks: BlockData[] = [];

      for (let i = 0; i < limit; i++) {
        const targetSlot = currentSlot - i;
        if (targetSlot < 0) break;

        try {
          const block = await conn.getBlock(targetSlot, {
            maxSupportedTransactionVersion: 0,
          });
          if (block) {
            blocks.push({
              blockHeight: targetSlot,
              blockHash: block.blockhash,
              blockTime: block.blockTime,
              parentBlockHash: block.parentSlot.toString(),
              previousBlockhash: block.previousBlockhash,
              transactionCount: (block.transactions || []).length,
            });
          }
        } catch (error) {
          console.warn(`無法獲取區塊 ${targetSlot}，跳過`, error);
          // 繼續獲取下一個區塊而不是完全失敗
        }
      }

      return blocks;
    }, "Failed to fetch recent blocks");
  }

  /**
   * 根據區塊高度獲取特定區塊
   * @param slot 區塊高度
   * @returns 區塊數據或 null（如果找不到）
   */
  async getBlockBySlot(slot: number): Promise<BlockData | null> {
    return this.executeWithRetry(async (conn) => {
      const block = await conn.getBlock(slot, {
        maxSupportedTransactionVersion: 0,
      });

      if (!block) {
        return null;
      }

      return {
        blockHeight: slot,
        blockHash: block.blockhash,
        blockTime: block.blockTime,
        parentBlockHash: block.parentSlot.toString(),
        previousBlockhash: block.previousBlockhash,
        transactionCount: (block.transactions || []).length,
      };
    }, `Failed to fetch block at slot ${slot}`);
  }

  /**
   * 獲取特定區塊中的所有交易
   * @param slot 區塊高度
   * @returns 交易數據陣列
   */
  async getTransactionsFromBlock(slot: number): Promise<TransactionData[]> {
    return this.executeWithRetry(async (conn) => {
      const block = await conn.getBlock(slot, {
        maxSupportedTransactionVersion: 0,
      });

      if (!block || !block.transactions) {
        return [];
      }

      return block.transactions.map((tx) => {
        const { transaction, meta } = tx;

        return {
          transactionHash: transaction.signatures[0],
          blockTime: block.blockTime,
          slot: slot,
          status: meta?.err ? "failed" : "confirmed",
          fee: meta?.fee || 0,
          accounts: transaction.message.getAccountKeys?.()
            ? transaction.message
                .getAccountKeys()
                .keySegments()
                .flat()
                .map((key) => key.toString())
            : [],
        };
      });
    }, `Failed to fetch transactions for block at slot ${slot}`);
  }

  /**
   * 根據交易簽名獲取交易詳情
   * @param signature 交易簽名（哈希）
   * @returns 交易詳情或 null（如果找不到）
   */
  async getTransactionBySignature(
    signature: string
  ): Promise<TransactionDetailData | null> {
    return this.executeWithRetry(async (conn) => {
      const transaction = await conn.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        return null;
      }

      const { blockTime, slot, meta } = transaction;

      // 遍歷並轉換指令資訊
      const instructions = transaction.transaction.message.instructions.map(
        (ix: any) => {
          return {
            programId: ix.programId.toString(),
            accounts: ix.accounts
              ? ix.accounts.map((account: any) => account.toString())
              : [],
            data: ix.data || "",
          };
        }
      );

      return {
        transactionHash: signature,
        blockTime: blockTime || null,
        slot: slot || 0,
        status: meta?.err ? "failed" : slot ? "confirmed" : "processed",
        fee: meta?.fee || 0,
        accounts: transaction.transaction.message.accountKeys.map((key: any) =>
          key.pubkey.toString()
        ),
        instructions,
        logs: meta?.logMessages || [],
      };
    }, `Failed to fetch transaction ${signature}`);
  }
}
