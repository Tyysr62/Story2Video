# Story2Video Frontend Monorepo

## 📂 架构概览 (Architecture)

本项目采用 **Turborepo** + **pnpm workspaces** 进行管理。

### 目录结构

```
frontend/
├── apps/                   # 具体应用程序
│   ├── desktop/            # 🖥️ 桌面端应用 (Tauri + React + Vite)
│   └── mobile/             # 📱 移动端应用 (Expo + React Native)
├── packages/               # 共享代码库
│   ├── core/               # 🧠 核心业务逻辑 (API, WebSocket, Types, Hooks)
│   └── ui/                 # 🎨 UI 组件库 (Gluestack UI + NativeWind)
├── turbo.json              # Turborepo 配置文件
├── pnpm-workspace.yaml     # pnpm 工作区配置
└── package.json            # 根目录配置
```

### 技术栈

- **包管理**: pnpm
- **Monorepo 工具**: Turborepo
- **桌面端**: Tauri v2, React 19, Vite
- **移动端**: Expo, React Native, NativeWind (Tailwind for RN)
- **共享 UI**: Gluestack UI
- **API 通信**: WebSocket (实时进度), Axios/Fetch (REST API)

---

## 🚀 快速开始 (Quick Start)

### 1. 环境准备

确保你的开发环境已安装以下工具：
- **Node.js** (推荐 v18 或更高版本)
- **pnpm** (必须安装): `npm install -g pnpm`
- **Rust** (仅桌面端开发需要，用于 Tauri): [安装指南](https://www.rust-lang.org/tools/install)
- **Android Studio / Xcode** (仅移动端开发需要)

### 2. 安装依赖

在项目根目录下运行：

```bash
pnpm install
```

### 3. 启动开发环境

你可以一次性启动所有应用，或者只启动特定的应用。

**启动所有应用：**
```bash
pnpm dev
```

**只启动桌面端：**
```bash
pnpm --filter desktop dev
# 或者进入目录
cd apps/desktop && pnpm dev
```

**只启动移动端：**
```bash
pnpm --filter mobile start
# 或者进入目录
cd apps/mobile && pnpm start
```

---

## 🧠 核心 API 实现与规范 (`packages/core`)

核心逻辑位于 `packages/core`，它不包含任何 UI 代码，只负责数据和通信。

### 1. 领域模型 (Domain Types)
位于 `src/types/domain.ts`。主要实体包括：
- **Story**: 包含脚本内容、风格等信息。
- **Shot**: 分镜，包含提示词(Prompt)、旁白、图片/音频 URL。
- **Operation**: 长耗时任务（LRO），用于追踪视频生成进度。

### 2. WebSocket 管理器 (`SocketManager`)
位于 `src/api/socket.ts`。用于实时接收生成进度。

**功能特性：**
- **自动重连**: 连接断开后会自动尝试重连。
- **心跳检测**: 每 30 秒发送 `PING` 保持连接活跃。
- **订阅机制**: 支持通过 `subscribe(topic, callback)` 监听特定任务的更新。

**使用示例：**
```typescript
import { socketManager } from '@story2video/core';

// 连接 Socket
socketManager.connect('wss://api.example.com', 'your-auth-token');

// 订阅任务进度
const unsubscribe = socketManager.subscribe('operations/123', (payload) => {
  console.log(`进度: ${payload.progress_percent}%`);
  if (payload.state === 'STATE_SUCCEEDED') {
    console.log('生成完成！');
  }
});

// 组件卸载时取消订阅
unsubscribe();
```

### 3. HTTP 客户端接口
定义了标准的 REST 请求接口 `IHttpClient`，支持 `get`, `post`, `patch`, `delete`。

---

## 🛠️ 常用命令 (Common Commands)

在根目录下运行这些命令：

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有依赖（包括 workspaces） |
| `pnpm dev` | 并行启动所有应用的开发服务器 |
| `pnpm build` | 构建所有应用和包 |
| `pnpm lint` | 运行代码检查 |
| `pnpm clean` | 清理构建产物（如果配置了的话） |

**针对特定应用的命令：**

使用 `--filter` 参数（或 `-F`）指定目标包名。

- **Desktop 相关**:
  - `pnpm -F desktop tauri dev`: 启动 Tauri 开发窗口
  - `pnpm -F desktop build`: 构建桌面端应用

- **Mobile 相关**:
  - `pnpm -F mobile android`: 启动 Android 模拟器
  - `pnpm -F mobile ios`: 启动 iOS 模拟器
  - `pnpm -F mobile web`: 在浏览器中预览移动端应用

---

## 🧩 开发指南

### 添加新依赖
由于是 Monorepo，安装依赖时需要指定安装到哪个包。

**给 desktop 安装 axios:**
```bash
pnpm --filter desktop add axios
```

**给 core 包安装 lodash:**
```bash
pnpm --filter @story2video/core add lodash
```

### 引用 workspace 包
如果你在 `desktop` 中需要使用 `core` 包，`apps/desktop/package.json` 中应如下声明：
```json
"dependencies": {
  "@story2video/core": "workspace:^"
}
```

### 样式规范
我们使用 **Tailwind CSS** (Web/Desktop) 和 **NativeWind** (Mobile)。尽量使用原子类（utility classes）来编写样式，以保持 UI 包的统一性。

---

## 📦 EAS 构建指南（Expo in Monorepo）


### 1) 触发构建（在 apps/mobile 目录）

初始化与登录（首次）：
```bash
eas login
eas init
```

常用构建命令：
- 开发客户端（Dev Client，内部分发）：
  ```bash
  eas build -p ios --profile development
  eas build -p android --profile development
  ```
- 内测分发（Preview）：
  ```bash
  eas build -p ios --profile preview
  eas build -p android --profile preview
  ```
- 生产发布（Production）：
  ```bash
  eas build -p ios --profile production
  eas build -p android --profile production
  ```

### 2) Secrets 与环境变量

- 注入密钥/环境变量（如 API_KEY）：
  ```bash
  eas secret:create --name API_KEY --value "xxxxx"
  ```
- 也可在 `eas.json` 的 `env` 中配置非敏感变量。敏感信息优先使用 `eas secret`。
