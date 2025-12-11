import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Some react-native-css-interop files ship JSX inside .js; pre-strip it so esbuild doesn't error in build
const nativewindDoctorFix = () => ({
  name: "nativewind-doctor-fix",
  enforce: "pre",
  transform(code: string, id: string) {
    if (id.includes("react-native-css-interop/dist/doctor.js")) {
      return code.replace(
        /return\s*<react-native-css-interop-jsx-pragma-check \/>\s*===\s*true;/,
        "return true;",
      );
    }
    return null;
  },
});

// 定义 React Native 常见的文件扩展名，确保 Vite 能正确解析.web.tsx 等文件
const extensions = [
  '.web.tsx', '.tsx', '.web.ts', '.ts', '.web.jsx', '.jsx', '.web.js', '.js', '.css', '.json'
];

export default defineConfig(({ mode }) => ({
  // Always use relative base so packaged Tauri loads CSS/JS via asset:// scheme
  base: "./",
  plugins: [react(), nativewindDoctorFix()],
  resolve: {
    extensions,
    alias: {
      // 核心映射：将 RN 请求重定向到 RNW
      "react-native": "react-native-web",
      // 修复 @legendapp/motion 缺失的 exports 导致 Vite 依赖优化崩溃
      "@legendapp/motion/react-native-web": "@legendapp/motion",
      "@legendapp/motion/react-native-web/svg": "@legendapp/motion/svg",
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
    global: "globalThis",
  },
  optimizeDeps: {
    include: [
      "@legendapp/motion",
      "@gluestack-style/legend-motion-animation-driver",
      // Pre-bundle NativeWind + interop so Vite converts the CJS build to ESM
      "nativewind",
      "react-native-css-interop",
    ],
    esbuildOptions: {
      resolveExtensions: extensions,
      // 许多 RN 库是以 CommonJS 发布且包含 JSX 的，需要显式启用 JSX loader
      loader: { ".js": "jsx" },
    },
  },
  build: {
    rollupOptions: {
      // Bundle NativeWind and interop to expose ESM-friendly exports
      external: [],
    },
  },
}));