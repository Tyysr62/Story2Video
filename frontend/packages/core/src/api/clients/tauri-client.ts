import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { ClientOptions } from "@tauri-apps/plugin-http";
import type { IHttpClient, RequestConfig } from "../interfaces";

/**
 * 提供认证 token（同步或异步）
 */
export type AuthTokenProvider = () => string | Promise<string>;

export interface TauriHttpClientOptions {
  /**
   * 所有请求的基础 URL（例如 https://api.example.com/v1）
   */
  baseURL?: string;
  /**
   * 应用于每个请求的静态请求头
   */
  headers?: Record<string, string>;
  /**
   * 可选的 token 提供器。当存在时，会注入 Authorization 请求头：
   * Authorization: Bearer <token>
   */
  getAuthToken?: AuthTokenProvider;
  /**
   * 默认连接超时时间（毫秒），映射到插件的 connectTimeout
   */
  timeout?: number;
}

/**
 * 基于 Tauri 的 IHttpClient 实现，使用 @tauri-apps/plugin-http 的 `fetch`。
 *
 * 注意：
 * - 使用插件的 Rust 端 HTTP 客户端绕过 CORS 和操作系统限制。
 * - 超时时间映射到插件的 `connectTimeout` 选项（毫秒）。
 * - 响应解析由 Content-Type 请求头驱动；JSON 会自动解析，否则返回文本。
 */
export class TauriHttpClient implements IHttpClient {
  private baseURL?: string;
  private staticHeaders?: Record<string, string>;
  private getAuthToken?: AuthTokenProvider;
  private defaultTimeoutMs?: number;

  constructor(options?: TauriHttpClientOptions) {
    this.baseURL = options?.baseURL;
    this.staticHeaders = options?.headers;
    this.getAuthToken = options?.getAuthToken;
    this.defaultTimeoutMs = options?.timeout;
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>("GET", url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>("POST", url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>("PATCH", url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>("DELETE", url, undefined, config);
  }

  // 内部方法

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const fullUrl = this.buildURL(url, config?.params);
    const headers = await this.buildHeaders(config?.headers, data);

    // 准备与 plugin-http 兼容的 RequestInit
    const init: RequestInit & ClientOptions = {
      method,
      headers,
      // plugin-http 支持标准 Request API 接受的任何 body 类型
      body: this.prepareBody(data, headers),
      connectTimeout: this.computeTimeout(config?.timeout),
    };

    // 对于 GET/DELETE，确保不发送 body
    if ((method === "GET" || method === "DELETE") && "body" in init) {
      delete (init as any).body;
    }

    let res: Response;
    try {
      res = await tauriFetch(fullUrl, init);
    } catch (e) {
      // 网络或底层错误
      if (e instanceof Error) throw e;
      throw new Error(String(e));
    }

    if (!res.ok) {
      // 尝试读取错误体以获取额外的上下文信息
      const errorPayload = await this.safeParse(res);
      const message =
        (errorPayload &&
          typeof errorPayload === "object" &&
          (errorPayload as any).message) ||
        (typeof errorPayload === "string" && errorPayload) ||
        `HTTP ${res.status}`;
      const err = new Error(message);
      (err as any).status = res.status;
      (err as any).data = errorPayload;
      throw err;
    }

    return (await this.safeParse(res)) as T;
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  private buildURL(
    url: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    const base =
      this.baseURL && !this.isAbsoluteUrl(url)
        ? `${this.baseURL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`
        : url;

    if (!params || Object.keys(params).length === 0) return base;

    const u = new URL(base, "http://placeholder.local"); // 用于安全解析相对 URL 的基础
    // 如果 base 是绝对 URL，URL 构造器将保留 base 中的主机名
    const hasRealOrigin = this.isAbsoluteUrl(base);
    const finalUrl = hasRealOrigin
      ? new URL(base)
      : new URL(u.pathname + u.search + u.hash, "http://placeholder.local");

    const qs = new URLSearchParams(finalUrl.search);
    for (const [k, v] of Object.entries(params)) {
      qs.set(k, String(v));
    }
    finalUrl.search = qs.toString();

    return hasRealOrigin
      ? finalUrl.toString()
      : finalUrl.pathname +
          (finalUrl.search ? `?${finalUrl.searchParams.toString()}` : "") +
          finalUrl.hash;
  }

  private async buildHeaders(
    extra?: Record<string, string>,
    data?: any,
  ): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      ...(this.staticHeaders || {}),
      ...(extra || {}),
    };

    // 如果存在 token 提供器且请求头未设置，则注入 Authorization
    if (this.getAuthToken && !headers.Authorization) {
      const token = await this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // 为普通对象 body 设置默认的 JSON content-type
    if (
      data !== undefined &&
      !this.isFormData(data) &&
      !this.isBinary(data) &&
      typeof data !== "string" &&
      !headers["Content-Type"] &&
      !headers["content-type"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  private isFormData(val: any): val is FormData {
    return typeof FormData !== "undefined" && val instanceof FormData;
  }

  private isBinary(val: any): val is ArrayBuffer | Uint8Array {
    return val instanceof ArrayBuffer || val instanceof Uint8Array;
  }

  private prepareBody(data: any, headers: HeadersInit): BodyInit | undefined {
    if (data === undefined || data === null) return undefined;

    // 原样传递常见的 body 类型
    if (
      typeof data === "string" ||
      this.isFormData(data) ||
      data instanceof Blob ||
      data instanceof URLSearchParams ||
      this.isBinary(data)
    ) {
      return data as BodyInit;
    }

    // 对象默认使用 JSON 序列化
    const headerObj =
      headers instanceof Headers
        ? Object.fromEntries(headers.entries())
        : Array.isArray(headers)
          ? Object.fromEntries(headers)
          : headers;

    const ct = (
      headerObj["Content-Type"] ||
      headerObj["content-type"] ||
      ""
    ).toLowerCase();
    if (ct.includes("application/json") || ct === "") {
      return JSON.stringify(data);
    }

    // 如果设置了自定义 Content-Type 但 body 是普通对象，仍然默认序列化为 JSON。
    // 如果需要其他编码方式，在此处调整。
    return JSON.stringify(data);
  }

  private computeTimeout(overrideMs?: number): number | undefined {
    const ms = overrideMs ?? this.defaultTimeoutMs;
    if (typeof ms !== "number") return undefined;
    return ms;
  }

  private async safeParse(res: Response): Promise<unknown> {
    const contentType = res.headers.get("content-type")?.toLowerCase() || "";

    // 无内容
    if (res.status === 204 || res.status === 205) {
      return null;
    }

    try {
      if (contentType.includes("application/json")) {
        return await res.json();
      }
      // 对于其他 content type 尝试返回文本
      return await res.text();
    } catch {
      // 如果解析失败，返回 null 以避免在此处抛出异常
      return null;
    }
  }
}

/**
 * 创建 TauriHttpClient 的便捷工厂函数
 */
export function createTauriHttpClient(
  options?: TauriHttpClientOptions,
): TauriHttpClient {
  return new TauriHttpClient(options);
}
