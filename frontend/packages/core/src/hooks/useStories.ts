import { useQuery } from "@tanstack/react-query";
import { useSdk } from "../api/provider";
import type { ListStoriesResponse, Story } from "../types/domain";

/**
 * 查询键前缀
 */
export const STORIES_QUERY_KEY = "stories";

/**
 * 故事列表查询 Hook
 * @param params 分页参数
 */
export function useStories(params?: { page_size?: number; page_token?: string }) {
  const sdk = useSdk();

  return useQuery<ListStoriesResponse>({
    queryKey: [STORIES_QUERY_KEY, "list", params],
    queryFn: () => sdk.stories.list(params),
  });
}

/**
 * 单个故事查询 Hook
 * @param storyId 故事 ID
 * @param options 可选配置
 */
export function useStory(
  storyId: string | undefined,
  options?: { enabled?: boolean }
) {
  const sdk = useSdk();

  return useQuery<Story>({
    queryKey: [STORIES_QUERY_KEY, "detail", storyId],
    queryFn: () => sdk.stories.get(storyId!),
    enabled: !!storyId && (options?.enabled !== false),
  });
}
