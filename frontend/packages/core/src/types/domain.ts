/**
 * 操作状态枚举（匹配 api.md 返回格式）
 */
export enum OperationStatus {
  QUEUED = "queued",
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
}

/**
 * 故事状态枚举
 */
export enum StoryStatus {
  GENERATING = "generating",
  READY = "ready",
  FAILED = "failed",
}

/**
 * 分镜状态枚举
 */
export enum ShotStatus {
  GENERATING = "generating",
  DONE = "done",
  FAILED = "failed",
}

/**
 * 故事风格枚举（小写格式，匹配 api.md）
 */
export enum StoryStyle {
  MOVIE = "movie",
  ANIMATION = "animation",
  REALISTIC = "realistic",
}

/**
 * 操作类型枚举
 */
export enum OperationType {
  STORY_CREATE = "story_create",
  SHOT_REGEN = "shot_regen",
  VIDEO_RENDER = "video_render",
}

/**
 * 故事实体（匹配 GET /v1/stories 返回格式）
 */
export interface Story {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  content: string;        // 脚本内容
  title: string;          // 显示名称
  style: StoryStyle;
  duration: number;
  status: StoryStatus;
  timeline: any | null;
  cover_url: string;
  video_url: string;
}

/**
 * 创建故事请求体（POST /v1/stories）
 */
export interface CreateStoryRequest {
  display_name: string;
  script_content: string;
  style: StoryStyle;
}

/**
 * 分镜实体（匹配 GET /v1/stories/{id}/shots 返回格式）
 */
export interface Shot {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  story_id: string;
  sequence: string;       // 序号，如 "1", "2"
  title: string;
  description: string;    // AI 生成的描述
  details: string;        // 详细提示词
  narration: string;      // 旁白文本
  type: string;           // 拍摄类型，如 "水平横移拍摄"
  transition: string;     // 转场效果
  voice: string;          // 情感/语气，如 "紧张"
  status: ShotStatus;
  image_url: string;
  bgm: string;
}

/**
 * 更新分镜请求体（PATCH /v1/stories/{id}/shots/{shot_id}）
 */
export interface UpdateShotRequest {
  shot: Partial<Pick<Shot, 'details' | 'narration' | 'title' | 'description' | 'type' | 'transition' | 'voice'>>;
}

/**
 * 重新生成分镜请求体（POST /v1/stories/{id}/shots/{shot_id}/regenerate）
 */
export interface RegenerateShotRequest {
  details?: string;
  asset_type?: "ASSET_IMAGE" | "ASSET_VIDEO" | "ASSET_AUDIO";
}

/**
 * 操作创建响应（POST 创建任务时返回）
 */
export interface OperationCreatedResponse {
  operation_name: string;   // 格式: "operations/{uuid}"
  state: OperationStatus;
  create_time?: string;
}

/**
 * 操作实体（GET /v1/operations/{id} 返回格式）
 */
export interface Operation {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  story_id: string;
  shot_id: string;          // "00000000-0000-0000-0000-000000000000" 表示非分镜操作
  type: OperationType;
  payload: Record<string, any>;
  status: OperationStatus;
  retries: number;
  error_msg: string;
  worker: string;
  started_at: string;
  finished_at: string;
}

/**
 * API 错误响应
 */
export interface ApiError {
  code: number;
  message: string;
  details?: any[];
}

/**
 * 故事列表响应
 */
export interface ListStoriesResponse {
  items: Story[];
  next_page_token?: string;
}

/**
 * 分镜列表响应
 */
export interface ListShotsResponse {
  shots: Shot[];
}
