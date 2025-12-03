import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSdk } from "../api/provider";
import type { Operation, OperationStatus, OperationCreatedResponse, CreateStoryRequest } from "../types/domain";
import { STORIES_QUERY_KEY } from "./useStories";
import { SHOTS_QUERY_KEY } from "./useShots";

/**
 * 查询键前缀
 */
export const OPERATIONS_QUERY_KEY = "operations";

/**
 * 默认轮询间隔（5秒）
 */
const DEFAULT_POLL_INTERVAL = 5000;

/**
 * 判断操作是否已完成
 */
function isOperationComplete(status: OperationStatus): boolean {
  return status === "succeeded" || status === "failed";
}

/**
 * 从 operation_name 中提取操作 ID
 * @param operationName 格式: "operations/{uuid}"
 */
export function extractOperationId(operationName: string): string {
  const parts = operationName.split("/");
  return parts[parts.length - 1];
}

/**
 * 操作轮询查询 Hook
 * - 每 5 秒轮询一次直到操作完成（succeeded 或 failed）
 * 
 * @param operationId 操作 ID（可以是完整的 operation_name 或纯 ID）
 * @param options 可选配置
 */
export function useOperationQuery(
  operationId: string | null | undefined,
  options?: {
    enabled?: boolean;
    pollInterval?: number;
    onSuccess?: (data: Operation) => void;
    onError?: (error: Error) => void;
  }
) {
  const sdk = useSdk();
  const queryClient = useQueryClient();
  const pollInterval = options?.pollInterval ?? DEFAULT_POLL_INTERVAL;

  // 处理 operation_name 格式
  const id = operationId ? extractOperationId(operationId) : null;

  const query = useQuery<Operation>({
    queryKey: [OPERATIONS_QUERY_KEY, id],
    queryFn: async () => {
      const result = await sdk.operations.get(id!);
      
      // 操作完成时使相关查询失效
      if (isOperationComplete(result.status)) {
        // 根据操作类型使相应缓存失效
        if (result.type === "story_create") {
          queryClient.invalidateQueries({ queryKey: [STORIES_QUERY_KEY] });
        } else if (result.type === "shot_regen") {
          queryClient.invalidateQueries({ queryKey: [SHOTS_QUERY_KEY, "detail", result.story_id, result.shot_id] });
          queryClient.invalidateQueries({ queryKey: [SHOTS_QUERY_KEY, "list", result.story_id] });
        } else if (result.type === "video_render") {
          queryClient.invalidateQueries({ queryKey: [STORIES_QUERY_KEY, "detail", result.story_id] });
        }
        
        // 调用成功回调
        if (result.status === "succeeded" && options?.onSuccess) {
          options.onSuccess(result);
        }
      }
      
      return result;
    },
    enabled: !!id && (options?.enabled !== false),
    // 仅在操作未完成时轮询
    refetchInterval: (query) => {
      if (!query.state.data) return pollInterval;
      return isOperationComplete(query.state.data.status) ? false : pollInterval;
    },
  });

  return {
    ...query,
    isComplete: query.data ? isOperationComplete(query.data.status) : false,
    isSucceeded: query.data?.status === "succeeded",
    isFailed: query.data?.status === "failed",
    errorMessage: query.data?.error_msg || null,
  };
}

/**
 * 创建故事 Mutation Hook
 */
export function useCreateStory() {
  const sdk = useSdk();

  return useMutation<OperationCreatedResponse, Error, CreateStoryRequest>({
    mutationFn: (data) => sdk.stories.create(data),
  });
}

/**
 * 编译视频 Mutation Hook
 */
export function useCompileVideo() {
  const sdk = useSdk();

  return useMutation<OperationCreatedResponse, Error, { storyId: string }>({
    mutationFn: ({ storyId }) => sdk.stories.compile(storyId),
  });
}

/**
 * 兼容旧接口的 UseOperationResult 类型
 */
export interface UseOperationResult {
  isLoading: boolean;
  isComplete: boolean;
  isSucceeded: boolean;
  isFailed: boolean;
  status: OperationStatus | null;
  errorMessage: string | null;
  data: Operation | undefined;
}

/**
 * 操作状态 Hook（简化版，兼容旧接口）
 */
export function useOperation(operationId: string | null): UseOperationResult {
  const query = useOperationQuery(operationId);
  
  return {
    isLoading: query.isLoading,
    isComplete: query.isComplete,
    isSucceeded: query.isSucceeded,
    isFailed: query.isFailed,
    status: query.data?.status ?? null,
    errorMessage: query.errorMessage,
    data: query.data,
  };
}
