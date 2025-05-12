import useSWR, { SWRConfiguration } from "swr";
import { SolanaApiService } from "../solana/api";

// 創建 API 服務實例
const apiService = new SolanaApiService();

// 緩存配置
export const CACHE_CONFIG = {
  // 不變的歷史數據
  IMMUTABLE: {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
    dedupingInterval: 24 * 60 * 60 * 1000, // 24小時
  } as SWRConfiguration,

  // 最新區塊數據
  RECENT_BLOCKS: {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30 * 1000, // 30秒刷新一次
    dedupingInterval: 10 * 1000, // 10秒内不重複請求
  } as SWRConfiguration,
};

// 提供手動重新驗證的 key 生成器
const generateKey = (prefix: string, id: string | number | null) => {
  return id !== null ? `${prefix}:${id}` : null;
};

// 區塊詳情 hook
export function useBlock(slot: number) {
  const { data, error, isLoading, mutate } = useSWR(
    generateKey("block", slot),
    () => apiService.getBlockBySlot(slot),
    CACHE_CONFIG.IMMUTABLE
  );

  return {
    block: data,
    isLoading,
    isError: error,
    mutate, // 提供給用戶手動刷新的功能
  };
}

// 區塊內的交易列表 hook
export function useTransactionsFromBlock(slot: number) {
  const { data, error, isLoading, mutate } = useSWR(
    generateKey("blockTxs", slot),
    () => apiService.getTransactionsFromBlock(slot),
    CACHE_CONFIG.IMMUTABLE
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

// 交易詳情 hook
export function useTransaction(signature: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    generateKey("tx", signature),
    () => (signature ? apiService.getTransactionBySignature(signature) : null),
    CACHE_CONFIG.IMMUTABLE
  );

  return {
    transaction: data,
    isLoading,
    isError: error,
    mutate,
  };
}

// Slot Leader hook
export function useSlotLeader(slot: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    generateKey("slotLeader", slot),
    () => (slot !== null ? apiService.getSlotLeader(slot) : null),
    CACHE_CONFIG.IMMUTABLE
  );

  return {
    slotLeader: data,
    isLoading,
    isError: error,
    mutate,
  };
}

// 最近區塊列表 hook
export function useRecentBlocks(limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR(
    `recentBlocks:${limit}`,
    () => apiService.getRecentBlocks(limit),
    CACHE_CONFIG.RECENT_BLOCKS
  );

  return {
    blocks: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}
