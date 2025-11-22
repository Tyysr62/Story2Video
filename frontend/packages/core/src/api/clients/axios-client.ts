import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosHeaders,
} from "axios";
import { IHttpClient, RequestConfig } from "../interfaces";

/**
 * 将我们的 RequestConfig 映射到 AxiosRequestConfig
 */
function toAxiosConfig(
  config?: RequestConfig,
  extraHeaders?: Record<string, string>,
): AxiosRequestConfig {
  if (!config && !extraHeaders) return {};
  const mergedHeaders = {
    ...(extraHeaders || {}),
    ...(config?.headers || {}),
  };

  const axiosCfg: AxiosRequestConfig = {
    headers: new AxiosHeaders(mergedHeaders),
    params: config?.params,
    timeout: config?.timeout,
  };

  return axiosCfg;
}

/**
 * 将 AxiosError 规范化为更易读的 Error
 */
function normalizeAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError<any>;
    const status = axErr.response?.status;
    const statusText = axErr.response?.statusText;
    const data = axErr.response?.data;

    // 优先使用服务端提供的错误消息（如果存在）
    const serverMessage =
      (typeof data === "string" && data) ||
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error?.message === "string" && data.error.message);

    const message =
      serverMessage ||
      axErr.message ||
      `HTTP Error${status ? ` ${status}` : ""}${statusText ? `: ${statusText}` : ""}`;

    const err = new Error(message);
    // 附加有用的上下文信息供上层处理器使用
    (err as any).status = status;
    (err as any).data = data;
    throw err;
  }

  // 不是 AxiosError：以最小的转换重新抛出
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(String(error));
}

export type AuthTokenProvider = () => string | Promise<string>;

export interface AxiosHttpClientOptions {
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
}

/**
 * 基于 Axios 的 IHttpClient 实现，用于移动端（React Native / Expo）。
 * 该客户端保持框架无关性，可以在任何运行 Axios 的地方使用。
 */
export class AxiosHttpClient implements IHttpClient {
  private instance: AxiosInstance;
  private staticHeaders?: Record<string, string>;
  private getAuthToken?: AuthTokenProvider;

  constructor(options?: AxiosHttpClientOptions) {
    this.staticHeaders = options?.headers;
    this.getAuthToken = options?.getAuthToken;

    this.instance = axios.create({
      baseURL: options?.baseURL,
      headers: new AxiosHeaders(options?.headers),
    });

    // 请求拦截器：如果存在 token 提供器，则注入 Authorization
    this.instance.interceptors.request.use(async (config) => {
      if (this.getAuthToken) {
        const token = await this.getAuthToken();
        if (token) {
          const h = new AxiosHeaders(config.headers);
          h.set("Authorization", `Bearer ${token}`);
          config.headers = h;
        }
      }
      return config;
    });
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    try {
      const res = await this.instance.get<T>(
        url,
        toAxiosConfig(config, this.staticHeaders),
      );
      return res.data;
    } catch (err) {
      normalizeAxiosError(err);
    }
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    try {
      const res = await this.instance.post<T>(
        url,
        data,
        toAxiosConfig(config, this.staticHeaders),
      );
      return res.data;
    } catch (err) {
      normalizeAxiosError(err);
    }
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    try {
      const res = await this.instance.patch<T>(
        url,
        data,
        toAxiosConfig(config, this.staticHeaders),
      );
      return res.data;
    } catch (err) {
      normalizeAxiosError(err);
    }
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    try {
      const res = await this.instance.delete<T>(
        url,
        toAxiosConfig(config, this.staticHeaders),
      );
      return res.data;
    } catch (err) {
      normalizeAxiosError(err);
    }
  }
}

/**
 * 创建 AxiosHttpClient 的便捷工厂函数
 */
export function createAxiosHttpClient(
  options?: AxiosHttpClientOptions,
): AxiosHttpClient {
  return new AxiosHttpClient(options);
}
