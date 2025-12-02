import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ApiProvider, QueryProvider } from "@story2video/core";
import { createAxiosHttpClient } from "@story2video/core/axios";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const getToken = () =>
  (typeof localStorage !== "undefined" && localStorage.getItem("auth_token")) ||
  "";

const client = createAxiosHttpClient({
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
