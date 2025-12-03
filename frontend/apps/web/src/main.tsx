import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ApiProvider, QueryProvider, IHttpClient } from "@story2video/core";
import { createAxiosHttpClient } from "@story2video/core/axios";
import { createMockHttpClient } from "@story2video/core/mock";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const useMock = import.meta.env.VITE_USE_MOCK === "true";

const getToken = () =>
  (typeof localStorage !== "undefined" && localStorage.getItem("auth_token")) ||
  "";

// 根据环境变量选择使用 mock 客户端还是真实 API 客户端
const client: IHttpClient = useMock
  ? createMockHttpClient({ delay: 300, debug: true })
  : createAxiosHttpClient({
      baseURL: apiBaseURL,
      getAuthToken: getToken,
    });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryProvider>
      <ApiProvider client={client}>
        <App />
      </ApiProvider>
    </QueryProvider>
  </React.StrictMode>,
);
