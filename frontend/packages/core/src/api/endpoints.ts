/**
 * 统一的 API Endpoints SDK（基于 api.md）
 * - 在 core/api 中集中定义所有 HTTP 接口，应用侧只需调用这些函数，不再关心各端 HTTP 细节
 * - 通过传入 IHttpClient（桌面端使用 Tauri HTTP、移动端使用 Axios），实现跨端复用
 *
 * 覆盖能力（根据 api.md）：
 * 1) 故事 Story
 *    - 创建故事：POST /v1/stories => OperationCreatedResponse（返回任务 ID，使用 TanStack Query 轮询进度）
 *    - 获取故事列表：GET /v1/stories
 *    - 获取故事详情：GET /v1/stories/{story_id}
 *    - 导出视频：POST /v1/stories/{story_id}/compile => OperationCreatedResponse
 * 2) 分镜 Shot
 *    - 获取分镜列表：GET /v1/stories/{story_id}/shots
 *    - 获取分镜详情：GET /v1/stories/{story_id}/shots/{shot_id}
 *    - 更新分镜：PATCH /v1/stories/{story_id}/shots/{shot_id}
 *    - 重新生成分镜资产：POST /v1/stories/{story_id}/shots/{shot_id}/regenerate => OperationCreatedResponse
 * 3) 操作 Operation
 *    - 获取操作详情：GET /v1/operations/{operation_id}
 *
 * 使用方式（示例）：
 *   import { createApi } from "@story2video/core/api/endpoints";
 *   const api = createApi(httpClient); // httpClient 实现了 IHttpClient（由各端注入）
 *   const op = await api.stories.create({ display_name: "...", script_content: "...", style: "movie" });
 *   // 使用 TanStack Query 轮询 api.operations.get(operationId) 查询进度
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
  RegenerateShotRequest,
  OperationCreatedResponse,
  StoryStyle,
} from "../types/domain";
import { StoryStatus } from "../types/domain";
import { normalizeMediaUrl } from "../utils/url";

/**
 * 后端返回的故事详情响应格式（GET /v1/stories/{storyId}）
 * 后端包装在 { story: ... } 中
 */
interface BackendStoryDetailResponse {
  story: {
    story_id: string;
    display_name: string;
    script_content: string;
    style: StoryStyle;
    video_url: string;
    compile_state: string;
    cover_url: string;
    create_time: string;
    shots: BackendShotItem[];
  };
}

/**
 * 后端返回的分镜项格式
 */
interface BackendShotItem {
  shot_id: string;
  index: number;
  title: string;
  description: string;
  details: string;
  narration: string;
  type: string;
  transition: string;
  voice: string;
  image_url: string;
  bgm: string;
  status: string;
}

/**
 * 将后端的 compile_state 转换为前端的 StoryStatus
 */
function mapCompileStateToStatus(compileState: string): StoryStatus {
  switch (compileState) {
    case "STATE_PENDING":
      return StoryStatus.GENERATING;
    case "STATE_RUNNING":
      return StoryStatus.GENERATING;
    case "STATE_SUCCEEDED":
      return StoryStatus.READY;
    case "STATE_FAILED":
      return StoryStatus.FAILED;
    default:
      return StoryStatus.GENERATING;
  }
}

/**
 * 将后端返回的故事详情转换为前端 Story 类型
 */
function transformBackendStoryToStory(backend: BackendStoryDetailResponse["story"]): Story {
  return {
    id: backend.story_id,
    user_id: "", // 后端详情接口未返回 user_id
    created_at: backend.create_time,
    updated_at: backend.create_time, // 后端未返回 updated_at，使用 create_time
    content: backend.script_content,
    title: backend.display_name,
    style: backend.style,
    duration: 0, // 后端未返回 duration
    status: mapCompileStateToStatus(backend.compile_state),
    timeline: null,
    cover_url: normalizeMediaUrl(backend.cover_url),
    video_url: normalizeMediaUrl(backend.video_url),
  };
}

/** 故事列表查询参数 */
export interface ListStoriesParams {
  /** 每页条数 */
  page_size?: number;
  /** 翻页 token */
  page_token?: string;
}

/** 分镜列表查询参数（预留扩展） */
export interface ListShotsParams {
  // 在需要时扩展查询参数
}

/** 统一 SDK 返回对象：stories、shots、operations 三大模块 */
export interface ApiSDK {
  stories: StoriesAPI;
  shots: ShotsAPI;
  operations: OperationsAPI;
}

/** 故事模块接口 */
export interface StoriesAPI {
  /**
   * 创建故事（POST /v1/stories）
   * - 入参为 CreateStoryRequest（直接发送，不包裹在 story 对象中）
   * - 返回 OperationCreatedResponse（包含 operation_name，用于轮询进度）
   */
  create(
    req: CreateStoryRequest,
    config?: RequestConfig
  ): Promise<OperationCreatedResponse>;

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
   * 导出视频（POST /v1/stories/{story_id}/compile）
   * - 返回 OperationCreatedResponse（长耗时任务，通过轮询获取进度）
   */
  compile(
    storyId: string,
    config?: RequestConfig
  ): Promise<OperationCreatedResponse>;
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
   * 获取分镜详情（GET /v1/stories/{story_id}/shots/{shot_id}）
   */
  get(
    storyId: string,
    shotId: string,
    config?: RequestConfig
  ): Promise<Shot>;

  /**
   * 更新分镜（PATCH /v1/stories/{story_id}/shots/{shot_id}）
   * - req.shot 只需要包含要更新的字段
   */
  update(
    storyId: string,
    shotId: string,
    req: UpdateShotRequest,
    config?: RequestConfig
  ): Promise<Shot>;

  /**
   * 重新生成分镜资产（POST /v1/stories/{story_id}/shots/{shot_id}/regenerate）
   * - 返回 OperationCreatedResponse（通过轮询获取进度）
   */
  regenerate(
    storyId: string,
    shotId: string,
    req?: RegenerateShotRequest,
    config?: RequestConfig
  ): Promise<OperationCreatedResponse>;
}

/** 操作模块接口 */
export interface OperationsAPI {
  /**
   * 获取操作详情（GET /v1/operations/{operation_id}）
   * - 用于轮询任务进度
   */
  get(
    operationId: string,
    config?: RequestConfig
  ): Promise<Operation>;
}

/**
 * 创建统一 API SDK（按模块导出 stories / shots / operations）
 * - client：由各端注入（桌面端是 Tauri HTTP 客户端，移动端是 Axios 客户端）
 * - basePath：默认 /v1，可覆盖
 */
export function createApi(client: IHttpClient, basePath = "/v1"): ApiSDK {
  const stories: StoriesAPI = {
    create: (req, config) => {
      // 直接发送请求体，不包裹在 story 对象中
      return client.post<OperationCreatedResponse>(`${basePath}/stories`, req, config);
    },

    list: (params, config) => {
      const merged = withParams(config, params);
      return client.get<ListStoriesResponse>(`${basePath}/stories`, merged).then((res) => ({
        ...res,
        items: res.items.map((item) => ({
          ...item,
          cover_url: normalizeMediaUrl(item.cover_url),
          video_url: normalizeMediaUrl(item.video_url),
        })),
      }));
    },

    get: async (storyId, config) => {
      const sid = encode(storyId);
      // 后端返回 { story: {...} }，需要解包并转换字段
      const response = await client.get<BackendStoryDetailResponse>(`${basePath}/stories/${sid}`, config);
      return transformBackendStoryToStory(response.story);
    },

    compile: (storyId, config) => {
      const sid = encode(storyId);
      // 修正路径：使用 /compile 而不是 :compile
      return client.post<OperationCreatedResponse>(`${basePath}/stories/${sid}/compile`, {}, config);
    },
  };

  const shots: ShotsAPI = {
    list: (storyId, params, config) => {
      const sid = encode(storyId);
      const merged = withParams(config, params);
      return client.get<ListShotsResponse>(`${basePath}/stories/${sid}/shots`, merged).then((res) => ({
        ...res,
        shots: res.shots.map((shot) => ({
          ...shot,
          image_url: normalizeMediaUrl(shot.image_url),
        })),
      }));
    },

    get: (storyId, shotId, config) => {
      const sid = encode(storyId);
      const shid = encode(shotId);
      return client
        .get<Shot>(`${basePath}/stories/${sid}/shots/${shid}`, config)
        .then((shot) => ({
          ...shot,
          image_url: normalizeMediaUrl(shot.image_url),
        }));
    },

    update: (storyId, shotId, req, config) => {
      const sid = encode(storyId);
      const shid = encode(shotId);
      return client
        .patch<Shot>(`${basePath}/stories/${sid}/shots/${shid}`, req, config)
        .then((shot) => ({
          ...shot,
          image_url: normalizeMediaUrl(shot.image_url),
        }));
    },

    regenerate: (storyId, shotId, req, config) => {
      const sid = encode(storyId);
      const shid = encode(shotId);
      // 修正路径：使用 /regenerate 而不是 :regenerate
      return client.post<OperationCreatedResponse>(
        `${basePath}/stories/${sid}/shots/${shid}/regenerate`,
        req ?? {},
        config
      );
    },
  };

  const operations: OperationsAPI = {
    get: (operationId, config) => {
      const oid = encode(operationId);
      return client.get<Operation>(`${basePath}/operations/${oid}`, config);
    },
  };

  return { stories, shots, operations };
}

/* ------------------------- 工具函数（内部使用） ------------------------- */

/** URL 片段安全编码 */
function encode(segment: string): string {
  return encodeURIComponent(segment);
}

/** 合并请求配置（仅关心 params 合并，headers/timeout 维持传入值即可） */
function withParams<T extends RequestConfig | undefined, P extends object>(
  config: T,
  params?: P | undefined
): T {
  if (!params || Object.keys(params).length === 0) return config;
  const next: RequestConfig = {
    ...(config || {}),
    params: {
      ...((config && config.params) || {}),
      ...(params as Record<string, string | number | boolean>),
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
