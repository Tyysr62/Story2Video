import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ApiProvider, QueryProvider } from "@story2video/core";
import { createTauriHttpClient } from "@story2video/core/tauri";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const getToken = () =>
  (typeof localStorage !== "undefined" && localStorage.getItem("auth_token")) ||
  "";

const client = createTauriHttpClient({
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
