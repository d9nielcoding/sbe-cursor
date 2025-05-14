import { Connection, ConnectionConfig } from "@solana/web3.js";

// Block data interface
export interface BlockData {
  blockHeight: number;
  blockHash: string;
  blockTime: number | null;
  parentBlockHash: string;
  previousBlockhash: string;
  transactionCount: number;
  leader?: string; // 區塊生產者的公鑰
  childSlots?: number[]; // 子區塊的 slot 編號列表
}

// Transaction data interface
export interface TransactionData {
  transactionHash: string;
  blockTime: number | null;
  slot: number;
  status: "confirmed" | "finalized" | "processed" | "failed";
  fee: number;
  accounts: string[];
}

// Transaction detail data interface
export interface TransactionDetailData extends TransactionData {
  instructions: {
    programId: string;
    accounts: string[];
    data: string;
  }[];
  logs: string[];
}

// Environment variable helper function for client-side
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof window !== "undefined") {
    // Client-side: Check window.__ENV__ first (for runtime injected values)
    const clientValue = (window as any).__ENV__?.[key];
    if (clientValue) return clientValue;
  }

  // Use process.env for SSR and as fallback
  return process.env[key] || defaultValue;
};

// Network types
export type NetworkType = "devnet" | "testnet" | "mainnet";

// API proxy constants
const API_PROXY_URL = "/api/solana";

// Retry configuration
const MAX_RETRIES = parseInt(getEnvVar("NEXT_PUBLIC_SOLANA_MAX_RETRIES", "3"));
const RETRY_DELAY = parseInt(
  getEnvVar("NEXT_PUBLIC_SOLANA_RETRY_DELAY", "1000")
); // milliseconds

// Sleep function for delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SolanaApiService 提供與 Solana 區塊鏈交互的方法
 * 使用伺服器端代理以保護 API 密鑰
 */
export class SolanaApiService {
  private connection: Connection;
  private fallbackConnection: Connection | null = null;
  private network: NetworkType | null = null;

  constructor() {
    // 初始化連接對象，使用公共端點（僅用於備用）
    const connectionConfig: ConnectionConfig = {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000, // 60 秒
      disableRetryOnRateLimit: false,
    };

    // 創建臨時連接（具體網絡從伺服器獲取）
    // 注意：這些連接僅用於緊急/開發環境下的後備
    this.connection = new Connection(
      "https://api.devnet.solana.com", // 臨時使用 devnet
      connectionConfig
    );

    this.fallbackConnection = new Connection(
      "https://solana-devnet-rpc.publicnode.com",
      connectionConfig
    );

    // 在構造函數中調用異步方法來初始化網絡
    this.initializeNetwork();
  }

  /**
   * 異步初始化網絡設定，從伺服器獲取
   */
  private async initializeNetwork(): Promise<void> {
    try {
      // 使用一個簡單查詢來獲取網絡信息
      const result = await this.makeRpcRequest("getSlot", []);

      // 網絡信息會從伺服器響應中的網絡標頭中獲取
      // 此時 this.network 已被 makeRpcRequest 設置

      if (this.network) {
        this.logNetworkEnvironment();
      }
    } catch (error) {
      console.warn("Failed to initialize network:", error);
      // 如果初始化失敗，使用 devnet 作為後備
      this.network = "devnet";
      this.logNetworkEnvironment();
    }
  }

  /**
   * Log the current network environment to the console
   */
  private logNetworkEnvironment(): void {
    if (!this.network) {
      console.log("Network not yet initialized");
      return;
    }

    const networkName = this.network.toUpperCase();
    const styleMap = {
      MAINNET:
        "background: #059669; color: white; padding: 2px 6px; border-radius: 4px;",
      DEVNET:
        "background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px;",
      TESTNET:
        "background: #eab308; color: black; padding: 2px 6px; border-radius: 4px;",
    };

    const style =
      styleMap[networkName as keyof typeof styleMap] ||
      "background: #6b7280; color: white; padding: 2px 6px; border-radius: 4px;";

    // 獲取處理環境 (客戶端或服務器端)
    const environment = typeof window !== "undefined" ? "CLIENT" : "SERVER";

    console.log(
      `%c SOLANA ${networkName} (${environment}) `,
      style,
      `Connected to Solana ${this.network} network`
    );
  }

  /**
   * Get the current network
   */
  public getNetwork(): NetworkType {
    // 如果網絡尚未初始化，返回一個預設值
    return this.network || ("unknown" as NetworkType);
  }

  /**
   * Make RPC request via proxy API route to protect API keys
   */
  private async makeRpcRequest(method: string, params: any[]): Promise<any> {
    try {
      const response = await fetch(API_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          params,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 從響應中獲取網絡信息（如果有）
      if (
        data.network &&
        ["devnet", "testnet", "mainnet"].includes(data.network)
      ) {
        // 只有在網絡更改時才更新和記錄
        if (this.network !== data.network) {
          this.network = data.network;
          // this.logNetworkEnvironment(); // 避免過多日誌
        }
      }

      if (data.error) {
        throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error) {
      // 如果發生錯誤，直接拋出，不再嘗試 fallback（服務器已處理 fallback）
      throw error;
    }
  }

  /**
   * Execute operation with retry mechanism
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    retries = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMsg = lastError.message || "";

        // Check if rate limit error
        const isRateLimitError =
          errorMsg.includes("429") ||
          errorMsg.includes("403") ||
          errorMsg.includes("Too many requests");

        // If last attempt or not a rate limit error we can retry, throw
        if (attempt === retries - 1 || !isRateLimitError) {
          throw lastError;
        }

        // Wait and retry
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `API request failed, retrying in ${delay}ms (${
            attempt + 1
          }/${retries})`,
          lastError
        );
        await sleep(delay);
      }
    }

    throw lastError || new Error(errorMessage);
  }

  /**
   * Get the slot leader for a specific slot
   * @param slot Block height
   * @returns The leader's public key as string or null if not found
   */
  async getSlotLeader(slot: number): Promise<string | null> {
    return this.executeWithRetry(async () => {
      try {
        const result = await this.makeRpcRequest("getSlotLeader", [slot]);
        return result || null;
      } catch (error) {
        console.warn(`Unable to fetch slot leader for ${slot}`, error);
        return null;
      }
    }, `Failed to fetch slot leader for slot ${slot}`);
  }

  /**
   * Get the first child slot for a given slot
   * @param slot Block height
   * @returns First child slot number or null if none found
   */
  async getChildSlots(slot: number): Promise<number[]> {
    return this.executeWithRetry(async () => {
      try {
        const result = await this.makeRpcRequest("getBlocks", [
          slot + 1,
          slot + 2,
        ]);
        return result.length > 0 ? [result[0]] : [];
      } catch (error) {
        console.warn(`Unable to fetch child slot for ${slot}`, error);
        return [];
      }
    }, `Failed to fetch child slot for slot ${slot}`);
  }

  /**
   * Get recent blocks
   * @param limit Number of blocks to fetch
   * @returns Array of block data
   */
  async getRecentBlocks(limit: number = 10): Promise<BlockData[]> {
    return this.executeWithRetry(async () => {
      // Get current block height
      const currentSlot = await this.makeRpcRequest("getSlot", []);

      // Fetch blocks in descending order
      const blocks: BlockData[] = [];

      for (let i = 0; i < limit; i++) {
        const targetSlot = currentSlot - i;
        if (targetSlot < 0) break;

        try {
          const block = await this.makeRpcRequest("getBlock", [
            targetSlot,
            {
              maxSupportedTransactionVersion: 0,
            },
          ]);

          if (block) {
            // Get slot leader (optional)
            let leader: string | null = null;
            try {
              leader = await this.getSlotLeader(targetSlot);
            } catch {
              console.warn(`Could not fetch leader for slot ${targetSlot}`);
            }

            blocks.push({
              blockHeight: targetSlot,
              blockHash: block.blockhash,
              blockTime: block.blockTime,
              parentBlockHash: block.parentSlot.toString(),
              previousBlockhash: block.previousBlockhash,
              transactionCount: (block.transactions || []).length,
              leader: leader || undefined,
              // We don't fetch child slots for the recent blocks list
              // as it would require too many API calls
            });
          }
        } catch (error) {
          console.warn(`Unable to fetch block ${targetSlot}, skipping`, error);
          // Continue to next block instead of failing completely
        }
      }

      return blocks;
    }, "Failed to fetch recent blocks");
  }

  /**
   * Get block data by slot (block height)
   * @param slot Block height
   * @returns Block data or null if not found
   */
  async getBlockBySlot(slot: number): Promise<BlockData | null> {
    return this.executeWithRetry(async () => {
      const block = await this.makeRpcRequest("getBlock", [
        slot,
        {
          maxSupportedTransactionVersion: 0,
        },
      ]);

      if (!block) {
        return null;
      }

      // Get slot leader
      let leader: string | null = null;
      try {
        leader = await this.getSlotLeader(slot);
      } catch {
        console.warn(`Could not fetch leader for slot ${slot}`);
      }

      // Get child slots
      let childSlots: number[] = [];
      try {
        childSlots = await this.getChildSlots(slot);
      } catch {
        console.warn(`Could not fetch child slots for slot ${slot}`);
      }

      return {
        blockHeight: slot,
        blockHash: block.blockhash,
        blockTime: block.blockTime,
        parentBlockHash: block.parentSlot.toString(),
        previousBlockhash: block.previousBlockhash,
        transactionCount: (block.transactions || []).length,
        leader: leader || undefined,
        childSlots: childSlots.length > 0 ? childSlots : undefined,
      };
    }, `Failed to fetch block at slot ${slot}`);
  }

  /**
   * Get all transactions from a specific block
   * @param slot Block height
   * @returns Array of transaction data
   */
  async getTransactionsFromBlock(slot: number): Promise<TransactionData[]> {
    return this.executeWithRetry(async () => {
      const block = await this.makeRpcRequest("getBlock", [
        slot,
        {
          maxSupportedTransactionVersion: 0,
        },
      ]);

      if (!block || !block.transactions) {
        return [];
      }

      return block.transactions.map((tx: any) => {
        const { transaction, meta } = tx;

        return {
          transactionHash: transaction.signatures[0],
          blockTime: block.blockTime,
          slot: slot,
          status: meta?.err ? "failed" : "confirmed",
          fee: meta?.fee || 0,
          accounts: transaction.message.accountKeys || [],
        };
      });
    }, `Failed to fetch transactions for block at slot ${slot}`);
  }

  /**
   * Get transaction details by signature
   * @param signature Transaction signature (hash)
   * @returns Transaction details or null if not found
   */
  async getTransactionBySignature(
    signature: string
  ): Promise<TransactionDetailData | null> {
    return this.executeWithRetry(async () => {
      const transaction = await this.makeRpcRequest("getTransaction", [
        signature,
        {
          maxSupportedTransactionVersion: 0,
        },
      ]);

      if (!transaction) {
        return null;
      }

      const { blockTime, slot, meta } = transaction;

      // Process and convert instruction information
      const instructions = transaction.transaction.message.instructions.map(
        (ix: any) => {
          return {
            programId: ix.programId,
            accounts: ix.accounts || [],
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
        accounts: transaction.transaction.message.accountKeys || [],
        instructions,
        logs: meta?.logMessages || [],
      };
    }, `Failed to fetch transaction ${signature}`);
  }
}

// Singleton instance
console.log("Creating SolanaApiService singleton");
export const solanaApiService = new SolanaApiService();
