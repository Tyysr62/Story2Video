import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSdk } from "../api/provider";
import type { ListShotsResponse, Shot, UpdateShotRequest, RegenerateShotRequest, OperationCreatedResponse } from "../types/domain";

/**
 * 查询键前缀
 */
export const SHOTS_QUERY_KEY = "shots";

/**
 * 分镜列表查询 Hook
 * @param storyId 故事 ID
 * @param options 可选配置
 */
export function useShots(
  storyId: string | undefined,
  options?: { enabled?: boolean }
) {
  const sdk = useSdk();

  return useQuery<ListShotsResponse>({
    queryKey: [SHOTS_QUERY_KEY, "list", storyId],
    queryFn: () => sdk.shots.list(storyId!),
    enabled: !!storyId && (options?.enabled !== false),
  });
}

/**
 * 单个分镜查询 Hook
 * @param storyId 故事 ID
 * @param shotId 分镜 ID
 * @param options 可选配置
 */
export function useShot(
  storyId: string | undefined,
  shotId: string | undefined,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) {
  const sdk = useSdk();

  return useQuery<Shot>({
    queryKey: [SHOTS_QUERY_KEY, "detail", storyId, shotId],
    queryFn: () => sdk.shots.get(storyId!, shotId!),
    enabled: !!storyId && !!shotId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * 更新分镜 Mutation Hook
 */
export function useUpdateShot() {
  const sdk = useSdk();
  const queryClient = useQueryClient();

  return useMutation<Shot, Error, { storyId: string; shotId: string; data: UpdateShotRequest }>({
    mutationFn: ({ storyId, shotId, data }) => sdk.shots.update(storyId, shotId, data),
    onSuccess: (data, variables) => {
      // 更新缓存中的分镜数据
      queryClient.setQueryData([SHOTS_QUERY_KEY, "detail", variables.storyId, variables.shotId], data);
      // 使分镜列表缓存失效
      queryClient.invalidateQueries({ queryKey: [SHOTS_QUERY_KEY, "list", variables.storyId] });
    },
  });
}

/**
 * 重新生成分镜 Mutation Hook
 */
export function useRegenerateShot() {
  const sdk = useSdk();

  return useMutation<OperationCreatedResponse, Error, { storyId: string; shotId: string; data?: RegenerateShotRequest }>({
    mutationFn: ({ storyId, shotId, data }) => sdk.shots.regenerate(storyId, shotId, data),
  });
}
