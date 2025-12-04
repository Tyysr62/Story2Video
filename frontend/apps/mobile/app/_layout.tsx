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
import { ApiProvider, QueryProvider, IHttpClient } from "@story2video/core";
import { createAxiosHttpClient } from "@story2video/core/axios";
import { createMockHttpClient } from "@story2video/core/mock";

export const unstable_settings = {
  anchor: "(tabs)",
};

const apiBaseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const useMock = process.env.EXPO_PUBLIC_USE_MOCK === "true";

const getToken = () => "";

// 根据环境变量选择使用 mock 客户端还是真实 API 客户端
const client: IHttpClient = useMock
  ? createMockHttpClient({ delay: 300, debug: true })
  : createAxiosHttpClient({
      baseURL: apiBaseURL,
      getAuthToken: getToken,
      headers: {
        "X-User-ID": "11111111-2222-3333-4444-555555555555",
      },
    });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = colorScheme === "dark" ? "dark" : "light";

  return (
    <GluestackUIProvider mode={themeMode}>
      <QueryProvider>
        <ApiProvider client={client}>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="storyboard"
                options={{ title: "分镜列表", headerShown: false }}
              />
              <Stack.Screen
                name="shot/[id]"
                options={{ title: "分镜详情", headerShown: false }}
              />
              <Stack.Screen name="preview" options={{ title: "视频预览", headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </ApiProvider>
      </QueryProvider>
    </GluestackUIProvider>
  );
}
