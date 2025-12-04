/**
 * useOperationsWithPolling Hook - 获取任务列表并轮询进度
 *
 * 由于后端没有提供 operations 列表接口，此 hook 结合：
 * 1. useOperationsStore - 获取本地存储的 operation ID 列表
 * 2. useQueries - 并行获取每个 operation 的详情
 * 3. 轮询 - 对进行中的任务自动轮询，已完成的任务停止轮询
 */

import { useEffect, useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useSdk } from "../api/provider";
import { useOperationsStore } from "../stores/operations-store";
import { OPERATIONS_QUERY_KEY } from "./useOperation";
import { STORIES_QUERY_KEY } from "./useStories";
import { SHOTS_QUERY_KEY } from "./useShots";
import type { Operation, OperationStatus } from "../types/domain";

/** 默认轮询间隔（5秒） */
const DEFAULT_POLL_INTERVAL = 5000;

/** 判断操作是否已完成 */
function isOperationComplete(status: OperationStatus): boolean {
  return status === "succeeded" || status === "failed";
}

/** Hook 返回值类型 */
export interface UseOperationsWithPollingResult {
  /** 所有 operation 详情列表（按创建时间倒序） */
  operations: Operation[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否有任何查询出错 */
  isError: boolean;
  /** 错误信息列表 */
  errors: (Error | null)[];
  /** 手动刷新所有 operations */
  refetchAll: () => void;
  /** 进行中的任务数量 */
  pendingCount: number;
  /** 已完成的任务数量 */
  completedCount: number;
  /** 失败的任务数量 */
  failedCount: number;
}

export interface UseOperationsWithPollingOptions {
  /** 轮询间隔（毫秒），默认 5000 */
  pollInterval?: number;
  /** 是否启用查询，默认 true */
  enabled?: boolean;
  /** 在组件挂载时自动清理过期任务，默认 true */
  autoCleanup?: boolean;
  /** 清理阈值（毫秒），默认 7 天 */
  cleanupMaxAge?: number;
}

/**
 * 获取任务列表并轮询进度
 *
 * @example
 * ```tsx
 * const { operations, isLoading, pendingCount } = useOperationsWithPolling();
 *
 * return (
 *   <div>
 *     {isLoading ? <Spinner /> : null}
 *     <p>进行中: {pendingCount}</p>
 *     {operations.map(op => (
 *       <OperationCard key={op.id} operation={op} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useOperationsWithPolling(
  options?: UseOperationsWithPollingOptions
): UseOperationsWithPollingResult {
  const sdk = useSdk();
  const queryClient = useQueryClient();

  const pollInterval = options?.pollInterval ?? DEFAULT_POLL_INTERVAL;
  const enabled = options?.enabled !== false;
  const autoCleanup = options?.autoCleanup !== false;
  const cleanupMaxAge = options?.cleanupMaxAge;

  // 从 store 获取存储的 operations
  const storedOperations = useOperationsStore((state) => state.operations);
  const cleanupOldOperations = useOperationsStore((state) => state.cleanupOldOperations);

  // 自动清理过期任务
  useEffect(() => {
    if (autoCleanup) {
      cleanupOldOperations(cleanupMaxAge);
    }
  }, [autoCleanup, cleanupMaxAge, cleanupOldOperations]);

  // 获取所有 operation IDs
  const operationIds = useMemo(
    () => storedOperations.map((op) => op.id),
    [storedOperations]
  );

  // 使用 useQueries 并行获取所有 operation 详情
  const queries = useQueries({
    queries: operationIds.map((id) => ({
      queryKey: [OPERATIONS_QUERY_KEY, id],
      queryFn: async () => {
        const result = await sdk.operations.get(id);

        // 操作完成时使相关查询失效
        if (isOperationComplete(result.status)) {
          if (result.type === "story_create") {
            queryClient.invalidateQueries({ queryKey: [STORIES_QUERY_KEY] });
          } else if (result.type === "shot_regen") {
            queryClient.invalidateQueries({
              queryKey: [SHOTS_QUERY_KEY, "detail", result.story_id, result.shot_id],
            });
            queryClient.invalidateQueries({
              queryKey: [SHOTS_QUERY_KEY, "list", result.story_id],
            });
          } else if (result.type === "video_render") {
            queryClient.invalidateQueries({
              queryKey: [STORIES_QUERY_KEY, "detail", result.story_id],
            });
          }
        }

        return result;
      },
      enabled: enabled && !!id,
      // 仅对未完成的任务启用轮询
      refetchInterval: (query: { state: { data?: Operation } }) => {
        if (!query.state.data) return pollInterval;
        return isOperationComplete(query.state.data.status) ? false : pollInterval;
      },
      // 避免后台刷新时显示加载状态
      staleTime: pollInterval / 2,
    })),
  });

  // 合并所有查询结果
  const operations = useMemo(() => {
    const result: Operation[] = [];
    for (const query of queries) {
      if (query.data) {
        result.push(query.data);
      }
    }
    // 按创建时间倒序排列
    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [queries]);

  // 计算统计信息
  const stats = useMemo(() => {
    let pendingCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      if (op.status === "succeeded") {
        completedCount++;
      } else if (op.status === "failed") {
        failedCount++;
      } else {
        pendingCount++;
      }
    }

    return { pendingCount, completedCount, failedCount };
  }, [operations]);

  // 刷新所有 operations
  const refetchAll = () => {
    for (const query of queries) {
      query.refetch();
    }
  };

  return {
    operations,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    errors: queries.map((q) => q.error),
    refetchAll,
    ...stats,
  };
}
