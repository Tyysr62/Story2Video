# Story2Video Web App

Web 端应用，使用 React 19 + Vite 构建，支持桌面端和移动端浏览器的响应式布局。

## 功能特性

- **响应式布局**: 桌面端显示侧边栏导航，移动端显示底部 Tab 栏
- **5 个核心页面**: Create、Storyboard、ShotDetail、Assets、Preview
- **实时进度**: 通过 WebSocket 接收任务生成进度
- **共享组件**: 使用 `@story2video/ui` (Gluestack UI) 组件库

## 开发

```bash
# 在项目根目录运行
pnpm install

# 启动 Web 开发服务器
pnpm dev:web

# 或者进入 web 目录
cd apps/web && pnpm dev
```

开发服务器默认运行在 http://localhost:3000

## 环境变量

复制 `.env.example` 为 `.env` 并配置:

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/stream
```

## 构建

```bash
pnpm --filter web build
```

构建产物输出到 `dist/` 目录。
