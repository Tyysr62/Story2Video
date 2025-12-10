# Story2Video Frontend Context

## Project Overview

This is the frontend monorepo for **Story2Video**, a multi-platform application (Desktop, Mobile, Web) that converts stories into videos using AI. It uses **Turborepo** for build orchestration and **pnpm** for package management.

### Architecture

The project is structured as a Monorepo:

*   **Apps (`apps/`):**
    *   **Desktop (`apps/desktop`):** A desktop application built with **Tauri v2**, **React 19**, and **Vite**.
    *   **Mobile (`apps/mobile`):** A mobile application built with **Expo**, **React Native**, and **NativeWind**.
    *   **Web (`apps/web`):** A web application built with **React 19** and **Vite**.
*   **Packages (`packages/`):**
    *   **Core (`packages/core`):** Shared business logic, API clients (Axios/Fetch), WebSocket managers, hooks, and TypeScript definitions. NO UI code here.
    *   **UI (`packages/ui`):** Shared UI component library based on **Gluestack UI** and **NativeWind**, ensuring consistent design across platforms.

## Key Technologies

*   **Languages:** TypeScript, Rust (for Tauri backend)
*   **Frameworks:** React (Web/Desktop), React Native (Mobile)
*   **Build Tools:** Turborepo, Vite, Expo
*   **Styling:** Tailwind CSS (Web/Desktop), NativeWind (Mobile)
*   **State Management:** React Query (implied from devDependencies), Custom Stores in Core.
*   **API:** REST API (Axios), WebSocket (for real-time progress updates).

## Development Workflow

### Prerequisites
*   Node.js (v18+)
*   pnpm (`npm install -g pnpm`)
*   Rust (for Desktop/Tauri)
*   Android Studio / Xcode (for Mobile)

### Common Commands

Run these from the project root:

*   **Install Dependencies:** `pnpm install`
*   **Start All Apps (Dev):** `pnpm dev`
*   **Build All Apps:** `pnpm build`
*   **Lint All Apps:** `pnpm lint`

### App-Specific Commands

Use `pnpm --filter <app_name> <command>` or `-F`.

*   **Desktop:**
    *   Dev: `pnpm -F desktop dev`
    *   Tauri Dev: `pnpm -F desktop tauri dev`
    *   Build: `pnpm -F desktop build`
*   **Mobile:**
    *   Start: `pnpm -F mobile start`
    *   Android: `pnpm -F mobile android`
    *   iOS: `pnpm -F mobile ios`
*   **Web:**
    *   Dev: `pnpm dev:web`
    *   Build: `pnpm -F web build`

## Core Logic (`packages/core`)

*   **Domain Models (`src/types/domain.ts`):** Definitions for `Story`, `Shot`, `Operation` (Long Running Operations).
*   **SocketManager (`src/api/socket.ts`):** Handles real-time WebSocket connections, auto-reconnect, heartbeat, and topic subscriptions for task progress.
*   **API Client:** Standardized REST interface.

## UI Components (`packages/ui`)

*   Uses **Gluestack UI** + **NativeWind**.
*   Components are designed to be shared across React (DOM) and React Native environments where possible.

## Backend API (Context from `api.md`)

*   **Base URL:** `http://localhost:8080/v1` (Default local)
*   **Authentication:** `X-User-ID` header.
*   **Key Endpoints:**
    *   `GET /stories`: List stories.
    *   `POST /stories`: Create a new story (triggers async operation).
    *   `GET /operations/{id}`: Check status of async tasks (Generation, Compilation).
    *   `GET /stories/{id}/shots`: Get shots for a story.
    *   `PATCH /stories/{id}/shots/{shot_id}`: Update shot details.
    *   `POST /stories/{id}/shots/{shot_id}/regenerate`: Regenerate a specific shot.
    *   `POST /stories/{id}/compile`: Compile shots into a final video.
