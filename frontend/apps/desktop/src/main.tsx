import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ApiProvider, SocketProvider, SocketManager } from "@story2video/core";
import { createTauriHttpClient } from "@story2video/core/tauri";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const getToken = () =>
  (typeof localStorage !== "undefined" && localStorage.getItem("auth_token")) ||
  "";

const client = createTauriHttpClient({
  baseURL: apiBaseURL,
  getAuthToken: getToken,
});

const socketManager = new SocketManager();
const wsUrl =
  import.meta.env.VITE_WS_URL ?? apiBaseURL.replace(/^http/i, "ws") + "/stream";
socketManager.connect(wsUrl, getToken());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SocketProvider socket={socketManager}>
      <ApiProvider client={client}>
        <App />
      </ApiProvider>
    </SocketProvider>
  </React.StrictMode>,
);
