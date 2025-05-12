import { Connection, ConnectionConfig } from "@solana/web3.js";

// Block data interface
export interface BlockData {
  blockHeight: number;
  blockHash: string;
  blockTime: number | null;
  parentBlockHash: string;
  previousBlockhash: string;
  transactionCount: number;
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

// RPC endpoints
const RPC_ENDPOINTS = {
  DEVNET: "https://api.devnet.solana.com",
  TESTNET: "https://api.testnet.solana.com",
  MAINNET_BETA: "https://api.mainnet-beta.solana.com",
  // Backup public endpoints
  BACKUP_DEVNET: "https://solana-devnet-rpc.publicnode.com",
  BACKUP_MAINNET: "https://solana-mainnet-rpc.publicnode.com",
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Sleep function for delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SolanaApiService provides methods for interacting with the Solana blockchain
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

    // Initialize backup connection if provided
    if (fallbackEndpoint) {
      this.fallbackConnection = new Connection(
        fallbackEndpoint,
        connectionConfig
      );
    }
  }

  /**
   * Execute operation with retry mechanism, using backup connection if needed
   */
  private async executeWithRetry<T>(
    operation: (conn: Connection) => Promise<T>,
    errorMessage: string,
    retries = MAX_RETRIES
  ): Promise<T> {
    let lastError;

    // Try with primary connection
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation(this.connection);
      } catch (error: any) {
        lastError = error;

        // Check if rate limit or transaction version error
        const isRateLimitError =
          error.message?.includes("429") ||
          error.message?.includes("403") ||
          error.message?.includes("Too many requests");

        const isVersionError =
          error.message?.includes("Transaction version") ||
          error.code === -32015;

        // If backup connection available and rate limit hit, try backup
        if (
          this.fallbackConnection &&
          (isRateLimitError || attempt === retries - 1)
        ) {
          console.warn("Switching to backup RPC endpoint...");
          try {
            return await operation(this.fallbackConnection);
          } catch (fallbackError: any) {
            console.error("Backup RPC endpoint also failed:", fallbackError);
            lastError = fallbackError;
          }
        }

        // If transaction version error, fail immediately
        if (isVersionError) {
          throw error;
        }

        // If not rate limit and last attempt, fail
        if (!isRateLimitError && attempt === retries - 1) {
          throw error;
        }

        // Wait and retry
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        console.warn(
          `API request failed, retrying in ${delay}ms (${
            attempt + 1
          }/${retries})`,
          error
        );
        await sleep(delay);
      }
    }

    throw lastError || new Error(errorMessage);
  }

  /**
   * Get recent blocks
   * @param limit Number of blocks to fetch
   * @returns Array of block data
   */
  async getRecentBlocks(limit: number = 10): Promise<BlockData[]> {
    return this.executeWithRetry(async (conn) => {
      // Get current block height
      const currentSlot = await conn.getSlot();

      // Fetch blocks in descending order
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
   * Get all transactions from a specific block
   * @param slot Block height
   * @returns Array of transaction data
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
   * Get transaction details by signature
   * @param signature Transaction signature (hash)
   * @returns Transaction details or null if not found
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

      // Process and convert instruction information
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
