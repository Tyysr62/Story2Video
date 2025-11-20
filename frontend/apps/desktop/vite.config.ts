import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// 定义 React Native 常见的文件扩展名，确保 Vite 能正确解析.web.tsx 等文件
const extensions = [
  '.web.tsx', '.tsx', '.web.ts', '.ts', '.web.jsx', '.jsx', '.web.js', '.js', '.css', '.json'
];

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    extensions,
    alias: {
      // 核心映射：将 RN 请求重定向到 RNW
      "react-native": "react-native-web",
      // NativeWind v4 Web 端支持的关键别名
      "nativewind/presets": path.resolve(
        __dirname,
        "../../node_modules/nativewind/dist/presets",
      ),
      "@story2video/ui": path.resolve(__dirname, "../../packages/ui"),
    },
  },
  define: {
    __DEV__: JSON.stringify(mode !== "production"),
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: extensions,
      // 许多 RN 库是以 CommonJS 发布且包含 JSX 的，需要显式启用 JSX loader
      loader: { ".js": "jsx" },
    },
  },
}));