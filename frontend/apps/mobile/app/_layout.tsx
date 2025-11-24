import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "@story2video/ui/global.css";
import { GluestackUIProvider } from "@story2video/ui";

import { useColorScheme } from "../hooks/use-color-scheme";
import { ApiProvider, SocketProvider, SocketManager } from "@story2video/core";
import { createAxiosHttpClient } from "@story2video/core/axios";

export const unstable_settings = {
  anchor: "(tabs)",
};

const apiBaseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const getToken = () => "";
const client = createAxiosHttpClient({
  baseURL: apiBaseURL,
  getAuthToken: getToken,
});
const socketManager = new SocketManager();
const wsUrl =
  process.env.EXPO_PUBLIC_WS_URL ??
  apiBaseURL.replace(/^http/i, "ws") + "/stream";
socketManager.connect(wsUrl, getToken());

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = colorScheme === "dark" ? "dark" : "light";

  return (
    <GluestackUIProvider mode={themeMode}>
      <SocketProvider socket={socketManager}>
        <ApiProvider client={client}>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="shot/[id]"
                options={{ title: "Shot Detail" }}
              />
              <Stack.Screen name="preview" options={{ title: "Preview" }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </ApiProvider>
      </SocketProvider>
    </GluestackUIProvider>
  );
}
