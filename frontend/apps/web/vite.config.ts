import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// 定义 React Native 常见的文件扩展名，确保 Vite 能正确解析.web.tsx 等文件
const extensions = [
  '.web.tsx', '.tsx', '.web.ts', '.ts', '.web.jsx', '.jsx', '.web.js', '.js', '.css', '.json'
];

// 空模块占位符，用于替换 RN-only 的包
const emptyModule = path.resolve(__dirname, "src/empty-module.ts");

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    extensions,
    alias: {
      // 核心映射：将 RN 请求重定向到 RNW
      "react-native": "react-native-web",
      // 修复 @legendapp/motion 缺失的 exports 导致 Vite 依赖优化崩溃
      "@legendapp/motion/react-native-web": "@legendapp/motion",
      "@legendapp/motion/react-native-web/svg": "@legendapp/motion/svg",
      // NativeWind 在 web 端不需要，替换为空模块
      "nativewind": emptyModule,
      "nativewind/preset": emptyModule,
      "nativewind/presets": emptyModule,
      "react-native-css-interop": emptyModule,
      "@story2video/ui": path.resolve(__dirname, "../../packages/ui"),
    },
  },
  define: {
    __DEV__: JSON.stringify(mode !== "production"),
    global: "globalThis",
  },
  optimizeDeps: {
    include: [
      "@legendapp/motion",
      "@gluestack-style/legend-motion-animation-driver",
    ],
    esbuildOptions: {
      resolveExtensions: extensions,
      // 许多 RN 库是以 CommonJS 发布且包含 JSX 的，需要显式启用 JSX loader
      loader: { ".js": "jsx" },
    },
  },
  server: {
    proxy: {
      // 将 /v1 开头的请求代理到后端服务器
      "/v1": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
}));
