export enum GenerationState {
  STATE_UNSPECIFIED = "STATE_UNSPECIFIED",
  STATE_PENDING = "STATE_PENDING",
  STATE_RUNNING = "STATE_RUNNING",
  STATE_SUCCEEDED = "STATE_SUCCEEDED",
  STATE_FAILED = "STATE_FAILED",
}

export enum StoryStyle {
  STYLE_MOVIE = "STYLE_MOVIE",
  STYLE_ANIME = "STYLE_ANIME",
  STYLE_REALISTIC = "STYLE_REALISTIC",
}

export interface Story {
  name?: string; // Resource name e.g. "stories/123-abc"
  id?: string;   // Parsed ID for convenience
  display_name?: string;
  script_content?: string;
  style?: StoryStyle;
}

export interface CreateStoryRequest {
  story: {
    display_name: string;
    script_content: string;
    style: StoryStyle;
  };
}

export interface Shot {
  name?: string; // Resource name e.g. "stories/123/shots/456"
  id?: string;
  prompt: string;
  narration_content: string;
  image_url?: string;
  audio_url?: string;
  duration?: number;
}

export interface UpdateShotRequest {
  shot: Partial<Pick<Shot, 'prompt' | 'narration_content'>>;
}

export interface OperationMetadata {
  "@type"?: string;
  verb?: string;
  create_time?: string;
  progress_percent: number;
  state?: GenerationState; // Often included in metadata for quick access
}

export interface ApiError {
  code: number;
  message: string;
  details?: any[];
}

export interface Operation {
  name: string; // Operation ID e.g. "operations/..."
  done: boolean;
  metadata?: OperationMetadata;
  response?: any;
  error?: ApiError;
}

export interface ListStoriesResponse {
  stories: Story[];
  next_page_token?: string;
}

export interface ListShotsResponse {
  shots: Shot[];
}

// WebSocket Message Types

export interface SubscribeMessage {
  action: "SUBSCRIBE";
  topic: string;
}

export interface OperationProgressPayload {
  operation_name: string;
  state: GenerationState;
  progress_percent: number;
  message?: string;
}

export interface OperationDonePayload {
  operation_name: string;
  state: GenerationState;
  progress_percent: number;
  result_resource_name?: string;
  error?: ApiError;
}

export type WebSocketMessage =
  | { type: "OPERATION_PROGRESS"; timestamp: string; payload: OperationProgressPayload }
  | { type: "OPERATION_DONE"; timestamp: string; payload: OperationDonePayload };
