import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * 默认的 QueryClient 配置
 * - staleTime: 数据被认为过期的时间（5分钟）
 * - gcTime: 未使用缓存数据的垃圾回收时间（10分钟）
 * - retry: 失败重试次数
 */
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
  client?: QueryClient;
}

/**
 * Query Provider 组件
 * - 封装 TanStack Query 的 QueryClientProvider
 * - 可选传入自定义 QueryClient，否则使用默认配置
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({
  children,
  client = defaultQueryClient,
}) => {
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * 导出默认 QueryClient 供外部使用（如手动 invalidateQueries）
 */
export { defaultQueryClient };

/**
 * 创建自定义 QueryClient 的工厂函数
 */
export function createQueryClient(options?: ConstructorParameters<typeof QueryClient>[0]) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    ...options,
  });
}
