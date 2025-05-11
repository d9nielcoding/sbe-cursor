import { Connection } from "@solana/web3.js";

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

/**
 * SolanaApiService 提供與 Solana 區塊鏈互動的方法
 */
export class SolanaApiService {
  private connection: Connection;

  constructor(endpoint: string = "https://api.mainnet-beta.solana.com") {
    this.connection = new Connection(endpoint);
  }

  /**
   * 獲取最近的區塊
   * @param limit 要獲取的區塊數量
   * @returns 區塊數據陣列
   */
  async getRecentBlocks(limit: number = 10): Promise<BlockData[]> {
    try {
      // 獲取當前區塊高度
      const currentSlot = await this.connection.getSlot();

      // 向後獲取區塊
      const blocks: BlockData[] = [];

      for (let i = 0; i < limit; i++) {
        const targetSlot = currentSlot - i;
        if (targetSlot < 0) break;

        const block = await this.connection.getBlock(targetSlot);
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
      }

      return blocks;
    } catch (error) {
      console.error("Error fetching recent blocks:", error);
      throw new Error("Failed to fetch recent blocks");
    }
  }

  /**
   * 根據區塊高度獲取特定區塊
   * @param slot 區塊高度
   * @returns 區塊數據或 null（如果找不到）
   */
  async getBlockBySlot(slot: number): Promise<BlockData | null> {
    try {
      const block = await this.connection.getBlock(slot);

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
    } catch (error) {
      console.error(`Error fetching block at slot ${slot}:`, error);
      throw new Error(`Failed to fetch block at slot ${slot}`);
    }
  }

  /**
   * 獲取特定區塊中的所有交易
   * @param slot 區塊高度
   * @returns 交易數據陣列
   */
  async getTransactionsFromBlock(slot: number): Promise<TransactionData[]> {
    try {
      const block = await this.connection.getBlock(slot, {
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
    } catch (error) {
      console.error(
        `Error fetching transactions for block at slot ${slot}:`,
        error
      );
      throw new Error(`Failed to fetch transactions for block at slot ${slot}`);
    }
  }

  /**
   * 根據交易簽名獲取交易詳情
   * @param signature 交易簽名（哈希）
   * @returns 交易詳情或 null（如果找不到）
   */
  async getTransactionBySignature(
    signature: string
  ): Promise<TransactionDetailData | null> {
    try {
      const transaction = await this.connection.getParsedTransaction(
        signature,
        {
          maxSupportedTransactionVersion: 0,
        }
      );

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
    } catch (error) {
      console.error(`Error fetching transaction ${signature}:`, error);
      throw new Error(`Failed to fetch transaction ${signature}`);
    }
  }
}
