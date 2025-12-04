/**
 * Operations Store - 全局任务状态管理
 *
 * 由于后端没有提供获取 operations 列表的接口，
 * 前端需要自行管理已创建任务的 ID 列表，并通过轮询单个 operation 接口获取详情。
 *
 * 功能：
 * - 存储已创建的 operation ID 列表
 * - 支持持久化到 localStorage/AsyncStorage
 * - 提供添加、移除、清理等操作
 */

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

/** 存储的单个 operation 记录 */
export interface StoredOperation {
  /** Operation ID (从 operation_name 中提取，如 "operations/xxx" -> "xxx") */
  id: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 关联的 story ID（可选） */
  storyId?: string;
  /** 关联的 shot ID（可选） */
  shotId?: string;
  /** 任务类型 */
  type?: "story_create" | "shot_regen" | "video_render";
}

/** Store 状态 */
interface OperationsStoreState {
  /** 已存储的 operation 列表（按创建时间倒序） */
  operations: StoredOperation[];
}

/** Store 操作 */
interface OperationsStoreActions {
  /**
   * 添加新的 operation
   * @param operationName - 后端返回的 operation_name（如 "operations/xxx"）
   * @param meta - 额外的元信息
   */
  addOperation: (
    operationName: string,
    meta?: { storyId?: string; shotId?: string; type?: StoredOperation["type"] }
  ) => void;

  /**
   * 移除指定的 operation
   * @param operationId - Operation ID
   */
  removeOperation: (operationId: string) => void;

  /**
   * 清理过期的 operations（默认保留最近 7 天）
   * @param maxAge - 最大保留时间（毫秒），默认 7 天
   */
  cleanupOldOperations: (maxAge?: number) => void;

  /**
   * 清空所有 operations
   */
  clearAll: () => void;

  /**
   * 获取所有 operation IDs
   */
  getOperationIds: () => string[];
}

type OperationsStore = OperationsStoreState & OperationsStoreActions;

/** 从 operation_name 中提取 ID（"operations/xxx" -> "xxx"） */
function extractOperationId(operationName: string | undefined | null): string {
  if (!operationName) {
    console.warn("[OperationsStore] extractOperationId received empty operationName");
    return "";
  }
  if (operationName.startsWith("operations/")) {
    return operationName.slice("operations/".length);
  }
  return operationName;
}

/** 7 天（毫秒） */
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** 最大保存的 operation 数量 */
const MAX_OPERATIONS = 100;

/**
 * 创建跨平台存储适配器
 * - Web/Desktop: 使用 localStorage
 * - Mobile (React Native): 需要传入 AsyncStorage 适配器
 */
const createStorage = (): StateStorage => {
  // 默认使用 localStorage（Web/Desktop 环境）
  if (typeof window !== "undefined" && window.localStorage) {
    return {
      getItem: (name) => {
        const value = localStorage.getItem(name);
        return value ?? null;
      },
      setItem: (name, value) => {
        localStorage.setItem(name, value);
      },
      removeItem: (name) => {
        localStorage.removeItem(name);
      },
    };
  }

  // SSR 或其他环境：返回内存存储
  const memoryStorage = new Map<string, string>();
  return {
    getItem: (name) => memoryStorage.get(name) ?? null,
    setItem: (name, value) => {
      memoryStorage.set(name, value);
    },
    removeItem: (name) => {
      memoryStorage.delete(name);
    },
  };
};

/**
 * Operations Store
 *
 * @example
 * ```tsx
 * import { useOperationsStore } from "@story2video/core";
 *
 * // 添加 operation
 * const { addOperation } = useOperationsStore();
 * addOperation(response.operation_name, { storyId, type: "story_create" });
 *
 * // 获取所有 operation IDs
 * const ids = useOperationsStore((state) => state.getOperationIds());
 * ```
 */
export const useOperationsStore = create<OperationsStore>()(
  persist(
    (set, get) => ({
      // 状态
      operations: [],

      // 操作
      addOperation: (operationName, meta) => {
        const id = extractOperationId(operationName);
        // 如果 ID 为空，不添加
        if (!id) {
          console.warn("[OperationsStore] addOperation skipped: empty operation ID");
          return;
        }
        const newOperation: StoredOperation = {
          id,
          createdAt: Date.now(),
          storyId: meta?.storyId,
          shotId: meta?.shotId,
          type: meta?.type,
        };

        set((state) => {
          // 检查是否已存在
          if (state.operations.some((op) => op.id === id)) {
            return state;
          }

          // 添加到列表开头，并限制最大数量
          const updated = [newOperation, ...state.operations].slice(0, MAX_OPERATIONS);
          return { operations: updated };
        });
      },

      removeOperation: (operationId) => {
        set((state) => ({
          operations: state.operations.filter((op) => op.id !== operationId),
        }));
      },

      cleanupOldOperations: (maxAge = SEVEN_DAYS_MS) => {
        const now = Date.now();
        set((state) => ({
          operations: state.operations.filter((op) => now - op.createdAt < maxAge),
        }));
      },

      clearAll: () => {
        set({ operations: [] });
      },

      getOperationIds: () => {
        return get().operations.map((op) => op.id);
      },
    }),
    {
      name: "story2video-operations",
      storage: createJSONStorage(createStorage),
      // 只持久化 operations 数组
      partialize: (state) => ({ operations: state.operations }),
    }
  )
);

/**
 * 直接获取 store（用于非 React 环境）
 */
export const operationsStore = useOperationsStore;
