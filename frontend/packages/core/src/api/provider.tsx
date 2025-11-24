import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { IHttpClient } from "./interfaces";
import { createApi, ApiSDK } from "./endpoints";

interface ApiContextType {
  client: IHttpClient;
  sdk: ApiSDK;
}

const ApiContext = createContext<ApiContextType | null>(null);

interface ApiProviderProps {
  client: IHttpClient;
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({
  client,
  children,
}) => {
  // 通过 client 生成统一 SDK，并使用 useMemo 保证引用稳定
  const sdk = useMemo(() => createApi(client), [client]);

  return (
    <ApiContext.Provider value={{ client, sdk }}>
      {children}
    </ApiContext.Provider>
  );
};

// 为了在各界面中实现“零样板代码”，直接提供 useSdk 钩子，避免每个界面都手动 createApi
export const useSdk = (): ApiSDK => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useSdk must be used within an ApiProvider");
  }
  return context.sdk;
};

export const useApi = (): IHttpClient => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context.client;
};
