# Story2Video Frontend Monorepo

Monorepo for desktop (Tauri), mobile (Expo + React Native), and web (React + Vite) apps using Turborepo + pnpm workspaces.

## 目录与技术

```
frontend/
├── apps/
│   ├── desktop/   # Tauri + React + Vite
│   ├── mobile/    # Expo + React Native + NativeWind
│   └── web/       # React + Vite
├── packages/
│   ├── core/      # API / types / sockets / hooks
│   └── ui/        # Shared UI (Gluestack UI + NativeWind)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

- 包管理：pnpm
- Monorepo：Turborepo
- 桌面端：Tauri v2, React 19, Vite
- 移动端：Expo, React Native, NativeWind
- Web：React 19, Vite
- 通信：WebSocket + REST (Axios/Fetch)

## 环境与安装

1) 用 mise 准备工具链（推荐）
- 在 `frontend/` 执行 `mise install`，按 `mise.toml` 安装 Node 22、pnpm 9、Java 17、Rust 及 `eas-cli`/`vercel`。
- 在 shell 中启用：`mise activate fish`（或 bash/zsh），进入仓库自动切版本。
- Expo/EAS 默认读取 `EXPO_USE_PNPM=1` 等环境（已在 `eas.json` 中声明）。

2) 依赖安装
```bash
pnpm install
```

3) 开发命令
- 全部应用：`pnpm dev`
- 桌面端：`pnpm -F desktop dev`
- 移动端：`pnpm -F mobile start`
- Web：`pnpm dev:web`

常用脚本（根目录）：`pnpm build`、`pnpm lint`、`pnpm clean`。

## Mobile (Expo) iOS 本地编译与调试

- 前置：Xcode 15+、CocoaPods (`sudo gem install cocoapods`)，已安装 Xcode Command Line Tools。
- 首次生成原生工程（可修复 scheme/workspace 丢失）：
  ```bash
  cd apps/mobile
  pnpm start        # 让 Expo 生成本地 iOS 工程及 schemes
  ```
- 启动模拟器调试：在 `pnpm start` 的交互里按 `i`，或直接 `pnpm -F mobile ios`。
- 真机开发客户端：
  ```bash
  cd apps/mobile
  eas build --local -p ios --profile development   # 本地 dev client，需 Xcode 与签名证书
  ```
- 复现 EAS Release 行为：
  ```bash
  pnpm exec expo run:ios --configuration Release   # 本地 Release 编译，等效 EAS Release 设置
  pnpm exec expo run:android --variant release     # Android 对应命令
  ```
- 生产/预发签名构建：
  ```bash
  eas build -p ios --profile production   # 生产
  eas build -p ios --profile preview      # 预发/内测
  ```
- Bundle Identifier / Scheme：`com.maredevi.story2video` / `mobile`（见 `app.json`）。
- 若遇到 workspace/scheme 解析异常或 CocoaPods 缺失：运行 `pnpm start` 生成工程并自动安装 Pods；必要时执行 `npx pod-install`。

## EAS 使用要点（apps/mobile）

- 登录初始化：
  ```bash
  cd apps/mobile
  eas login
  eas init
  ```
- Secrets：敏感值用 `eas secret:create --name KEY --value VALUE`；非敏感值可放 `eas.json` 的 `env`。
- 主要 Profile：
  - `development`：Dev Client 内部分发
  - `preview`：内测渠道
  - `production`：商店/正式发布（启用 remote appVersion）
  - 如果要生成 iOS 模拟器包，可在 profile 的 `ios` 下设置 `"simulator": true`

## 核心包 (`packages/core`)

- 领域模型：`src/types/domain.ts`（Story / Shot / Operation）。
- WebSocket 管理：`src/api/socket.ts`，支持自动重连、心跳与 `subscribe(topic, cb)`。
- HTTP 接口：`IHttpClient` 定义 `get/post/patch/delete`，由各端实现。

## 开发指引

- 安装依赖到特定包：`pnpm --filter desktop add axios`；`pnpm --filter @story2video/core add lodash`。
- 引用 workspace 包：`"@story2video/core": "workspace:^"`（写入目标包 `package.json`）。
- 样式：Web/Desktop 用 Tailwind；Mobile 用 NativeWind。

## 故障排查（iOS Expo 常见）

- Scheme/workspace 找不到：在 `apps/mobile` 运行 `pnpm start` 或 `npx expo prebuild --clean` 重新生成原生工程。
- Pods 未安装或编译失败：执行 `npx pod-install`（需 CocoaPods）。
- Expo CLI 找不到 pnpm：确认已 `mise activate` 或全局安装 pnpm；`echo $PNPM_HOME` 并加入 PATH。
