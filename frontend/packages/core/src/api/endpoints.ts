/**
 * 统一的 API Endpoints SDK（基于 api.md）
 * - 在 core/api 中集中定义所有 HTTP 接口，应用侧只需调用这些函数，不再关心各端 HTTP 细节
 * - 通过传入 IHttpClient（桌面端使用 Tauri HTTP、移动端使用 Axios），实现跨端复用
 *
 * 覆盖能力（根据 api.md）：
 * 1) 故事 Story
 *    - 创建故事：POST /v1/stories => Operation（返回任务 ID，随后用 WebSocket 订阅进度）
 *    - 获取故事列表：GET /v1/stories
 *    - 获取故事详情：GET /v1/stories/{story_id}
 *    - 导出视频：POST /v1/stories/{story_id}:compile => Operation
 * 2) 分镜 Shot
 *    - 获取分镜列表：GET /v1/stories/{story_id}/shots
 *    - 更新分镜：PATCH /v1/stories/{story_id}/shots/{shot_id}?update_mask=prompt,narration_content
 *    - 重新生成分镜资产：POST /v1/stories/{story_id}/shots/{shot_id}:regenerate => Operation
 *
 * 使用方式（示例）：
 *   import { createApi } from "@story2video/core/api/endpoints";
 *   const api = createApi(httpClient); // httpClient 实现了 IHttpClient（由各端注入）
 *   const op = await api.stories.create({ story: {...} });
 *   socket.subscribe(op.name, onProgress); // WebSocket 订阅进度
 */

import type { IHttpClient, RequestConfig } from "./interfaces";
import type {
  Story,
  Shot,
  Operation,
  ListStoriesResponse,
  ListShotsResponse,
  CreateStoryRequest,
  UpdateShotRequest,
  StoryStyle,
} from "../types/domain";

/** 故事列表查询参数 */
export interface ListStoriesParams {
  /** 每页条数 */
  page_size?: number;
  /** 翻页 token */
  page_token?: string;
}

/** 分镜列表查询参数（预留扩展，当前接口无特殊查询参数也可以传空） */
export interface ListShotsParams {
  // 在需要时扩展查询参数
}

/** 允许更新的分镜字段（与接口 update_mask 对齐） */
export type ShotUpdateField = "prompt" | "narration_content";

/** 统一 SDK 返回对象：stories 与 shots 两大模块 */
export interface ApiSDK {
  stories: StoriesAPI;
  shots: ShotsAPI;
}

/** 故事模块接口 */
export interface StoriesAPI {
  /**
   * 创建故事（POST /v1/stories）
   * - 入参为 CreateStoryRequest
   * - 返回 Operation（包含任务 ID，随后通过 WebSocket 订阅进度）
   */
  create(
    req: CreateStoryRequest,
    config?: RequestConfig
  ): Promise<Operation>;

  /**
   * 获取故事列表（GET /v1/stories）
   * - 支持分页参数 page_size / page_token
   */
  list(
    params?: ListStoriesParams,
    config?: RequestConfig
  ): Promise<ListStoriesResponse>;

  /**
   * 获取故事详情（GET /v1/stories/{story_id}）
   */
  get(
    storyId: string,
    config?: RequestConfig
  ): Promise<Story>;

  /**
   * 导出视频（POST /v1/stories/{story_id}:compile）
   * - 返回 Operation（长耗时任务，通过 WebSocket 获取进度）
   * - body 在文档暂未细化，这里作为可选参数透传
   */
  compile(
    storyId: string,
    body?: any,
    config?: RequestConfig
  ): Promise<Operation>;
}

/** 分镜模块接口 */
export interface ShotsAPI {
  /**
   * 获取分镜列表（GET /v1/stories/{story_id}/shots）
   * - 用于 Storyboard 展示
   */
  list(
    storyId: string,
    params?: ListShotsParams,
    config?: RequestConfig
  ): Promise<ListShotsResponse>;

  /**
   * 更新分镜（PATCH /v1/stories/{story_id}/shots/{shot_id}?update_mask=...）
   * - update_mask 使用逗号分隔，例如：prompt,narration_content
   * - req.shot 只需要包含要更新的字段
   */
  update(
    storyId: string,
    shotId: string,
    fields: ShotUpdateField[],
    req: UpdateShotRequest,
    config?: RequestConfig
  ): Promise<Shot>;

  /**
   * 重新生成分镜资产（POST /v1/stories/{story_id}/shots/{shot_id}:regenerate）
   * - 返回 Operation（通过 WebSocket 获取进度）
   * - body 在文档暂未细化，这里作为可选参数透传（比如选择只重生成 image/audio 等）
   */
  regenerate(
    storyId: string,
    shotId: string,
    body?: any,
    config?: RequestConfig
  ): Promise<Operation>;
}

/**
 * 创建统一 API SDK（按模块导出 stories / shots）
 * - client：由各端注入（桌面端是 Tauri HTTP 客户端，移动端是 Axios 客户端）
 * - basePath：默认 /v1，可覆盖
 */
export function createApi(client: IHttpClient, basePath = "/v1"): ApiSDK {
  const stories: StoriesAPI = {
    create: (req, config) => {
      return client.post<Operation>(`${basePath}/stories`, req, config);
    },

    list: (params, config) => {
      const merged = withParams(config, params);
      return client.get<ListStoriesResponse>(`${basePath}/stories`, merged);
    },

    get: (storyId, config) => {
      const sid = encode(storyId);
      return client.get<Story>(`${basePath}/stories/${sid}`, config);
    },

    compile: (storyId, body, config) => {
      const sid = encode(storyId);
      return client.post<Operation>(`${basePath}/stories/${sid}:compile`, body ?? {}, config);
    },
  };

  const shots: ShotsAPI = {
    list: (storyId, params, config) => {
      const sid = encode(storyId);
      const merged = withParams(config, params);
      return client.get<ListShotsResponse>(`${basePath}/stories/${sid}/shots`, merged);
    },

    update: (storyId, shotId, fields, req, config) => {
      const sid = encode(storyId);
      const shid = encode(shotId);
      const updateMask = fields?.length ? fields.join(",") : undefined;
      const merged = withParams(config, updateMask ? { update_mask: updateMask } : undefined);
      return client.patch<Shot>(`${basePath}/stories/${sid}/shots/${shid}`, req, merged);
    },

    regenerate: (storyId, shotId, body, config) => {
      const sid = encode(storyId);
      const shid = encode(shotId);
      return client.post<Operation>(`${basePath}/stories/${sid}/shots/${shid}:regenerate`, body ?? {}, config);
    },
  };

  return { stories, shots };
}

/* ------------------------- 工具函数（内部使用） ------------------------- */

/** URL 片段安全编码 */
function encode(segment: string): string {
  return encodeURIComponent(segment);
}

/** 合并请求配置（仅关心 params 合并，headers/timeout 维持传入值即可） */
function withParams<T extends RequestConfig | undefined>(
  config: T,
  params?: Record<string, string | number | boolean> | undefined
): T {
  if (!params || Object.keys(params).length === 0) return config;
  const next: RequestConfig = {
    ...(config || {}),
    params: {
      ...((config && config.params) || {}),
      ...params,
    },
  };
  return next as T;
}

/* ------------------------- 额外导出（可选） ------------------------- */

/**
 * 常量/类型导出，方便上层直接引用（可选）
 * - StoryStyle 仅用于调用端进行风格枚举提示或类型约束
 */
export type { StoryStyle };
