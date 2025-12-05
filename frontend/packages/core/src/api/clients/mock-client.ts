import type { IHttpClient, RequestConfig } from "../interfaces";
import {
  mockStoryListItems,
  getMockStory,
  getMockOperation,
  getMockShot,
  getMockListShotsResponse,
  createMockOperationCreatedResponse,
} from "../../mocks";
import type { Shot, ListStoriesResponse } from "../../types/domain";

/**
 * Mock HTTP 客户端配置选项
 */
export interface MockHttpClientOptions {
  /**
   * 模拟网络延迟（毫秒），默认 300ms
   */
  delay?: number;
  /**
   * 是否启用调试日志
   */
  debug?: boolean;
}

/**
 * Mock HTTP 客户端实现
 * 用于开发环境，返回预定义的 mock 数据
 */
export class MockHttpClient implements IHttpClient {
  private delay: number;
  private debug: boolean;

  constructor(options?: MockHttpClientOptions) {
    this.delay = options?.delay ?? 300;
    this.debug = options?.debug ?? false;
  }

  private log(method: string, url: string, result?: unknown): void {
    if (this.debug) {
      console.log(`[MockHttpClient] ${method} ${url}`, result);
    }
  }

  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }
  }

  async get<T>(url: string, _config?: RequestConfig): Promise<T> {
    await this.simulateDelay();

    // 解析 URL 参数
    const urlObj = new URL(url, "http://mock.local");
    const pathname = urlObj.pathname;

    // GET /v1/stories
    if (pathname === "/v1/stories") {
      const response: ListStoriesResponse = { items: mockStoryListItems };
      this.log("GET", url, response);
      return response as T;
    }

    // GET /v1/stories/{storyId}
    const storyMatch = pathname.match(/^\/v1\/stories\/([^/]+)$/);
    if (storyMatch) {
      const storyId = decodeURIComponent(storyMatch[1]);
      const story = getMockStory(storyId);
      if (story) {
        this.log("GET", url, story);
        return story as T;
      }
      throw new Error(`Story not found: ${storyId}`);
    }

    // GET /v1/stories/{storyId}/shots
    const shotsMatch = pathname.match(/^\/v1\/stories\/([^/]+)\/shots$/);
    if (shotsMatch) {
      const storyId = decodeURIComponent(shotsMatch[1]);
      const response = getMockListShotsResponse(storyId);
      this.log("GET", url, response);
      return response as T;
    }

    // GET /v1/stories/{storyId}/shots/{shotId}
    const shotMatch = pathname.match(/^\/v1\/stories\/([^/]+)\/shots\/([^/]+)$/);
    if (shotMatch) {
      const storyId = decodeURIComponent(shotMatch[1]);
      const shotId = decodeURIComponent(shotMatch[2]);
      const shot = getMockShot(storyId, shotId);
      if (shot) {
        this.log("GET", url, shot);
        return shot as T;
      }
      throw new Error(`Shot not found: ${shotId}`);
    }

    // GET /v1/operations/{operationId}
    const operationMatch = pathname.match(/^\/v1\/operations\/([^/]+)$/);
    if (operationMatch) {
      const operationId = decodeURIComponent(operationMatch[1]);
      const operation = getMockOperation(operationId);
      if (operation) {
        this.log("GET", url, operation);
        return operation as T;
      }
      throw new Error(`Operation not found: ${operationId}`);
    }

    this.log("GET", url, null);
    throw new Error(`Mock not implemented for GET ${url}`);
  }

  async post<T>(url: string, _data?: unknown, _config?: RequestConfig): Promise<T> {
    await this.simulateDelay();

    const urlObj = new URL(url, "http://mock.local");
    const pathname = urlObj.pathname;

    // POST /v1/stories (创建故事)
    if (pathname === "/v1/stories") {
      const response = createMockOperationCreatedResponse();
      this.log("POST", url, response);
      return response as T;
    }

    // POST /v1/stories/{storyId}/compile (编译视频)
    const compileMatch = pathname.match(/^\/v1\/stories\/([^/]+)\/compile$/);
    if (compileMatch) {
      const response = createMockOperationCreatedResponse();
      this.log("POST", url, response);
      return response as T;
    }

    // POST /v1/stories/{storyId}/shots/{shotId}/regenerate (重新生成分镜)
    const regenerateMatch = pathname.match(/^\/v1\/stories\/([^/]+)\/shots\/([^/]+)\/regenerate$/);
    if (regenerateMatch) {
      const response = createMockOperationCreatedResponse();
      this.log("POST", url, response);
      return response as T;
    }

    this.log("POST", url, null);
    throw new Error(`Mock not implemented for POST ${url}`);
  }

  async patch<T>(url: string, data?: unknown, _config?: RequestConfig): Promise<T> {
    await this.simulateDelay();

    const urlObj = new URL(url, "http://mock.local");
    const pathname = urlObj.pathname;

    // PATCH /v1/stories/{storyId}/shots/{shotId} (更新分镜)
    const shotMatch = pathname.match(/^\/v1\/stories\/([^/]+)\/shots\/([^/]+)$/);
    if (shotMatch) {
      const storyId = decodeURIComponent(shotMatch[1]);
      const shotId = decodeURIComponent(shotMatch[2]);
      const shot = getMockShot(storyId, shotId);
      if (shot) {
        // 模拟更新：合并传入的数据
        const updateData = (data as { shot?: Partial<Shot> })?.shot || {};
        const updatedShot: Shot = {
          ...shot,
          ...updateData,
          updated_at: new Date().toISOString(),
        };
        this.log("PATCH", url, updatedShot);
        return updatedShot as T;
      }
      throw new Error(`Shot not found: ${shotId}`);
    }

    this.log("PATCH", url, null);
    throw new Error(`Mock not implemented for PATCH ${url}`);
  }

  async delete<T>(url: string, _config?: RequestConfig): Promise<T> {
    await this.simulateDelay();
    this.log("DELETE", url, null);
    throw new Error(`Mock not implemented for DELETE ${url}`);
  }
}

/**
 * 创建 MockHttpClient 的便捷工厂函数
 */
export function createMockHttpClient(options?: MockHttpClientOptions): MockHttpClient {
  return new MockHttpClient(options);
}
