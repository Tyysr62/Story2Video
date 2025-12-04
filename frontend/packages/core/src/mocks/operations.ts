import {
  Operation,
  OperationStatus,
  OperationType,
  OperationCreatedResponse,
} from "../types/domain";

/**
 * Mock 操作数据
 */
export const mockOperations: Operation[] = [
  {
    id: "b0b3a96d-dca3-42f4-a85b-e551a2bee5fd",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:30.761361+08:00",
    updated_at: "2025-12-01T20:40:37.220895+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    shot_id: "00000000-0000-0000-0000-000000000000",
    type: OperationType.STORY_CREATE,
    payload: {
      style: "movie",
      display_name: "雪山奇缘",
      script_content: "两名旅人在雪山中迷路的故事",
    },
    status: OperationStatus.SUCCEEDED,
    retries: 0,
    error_msg: "",
    worker: "story-worker",
    started_at: "2025-12-01T20:40:31.789637+08:00",
    finished_at: "2025-12-01T20:40:37.220517+08:00",
  },
  {
    id: "2d6c6355-f634-4ac8-bcf1-d543f635c080",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:39:51.917938+08:00",
    updated_at: "2025-12-01T19:39:55.175971+08:00",
    story_id: "cf000374-bdf4-403f-8112-d57fb5617cb1",
    shot_id: "00000000-0000-0000-0000-000000000000",
    type: OperationType.STORY_CREATE,
    payload: {
      style: "movie",
      display_name: "花田传说",
      script_content: "花田里的冒险",
    },
    status: OperationStatus.FAILED,
    retries: 0,
    error_msg: "rpc error: code = Internal desc = create storyboard: model service /api/v1/storyboard/create status=502 body={'detail':'LLM 分镜生成失败，请稍后重试'}",
    worker: "story-worker",
    started_at: "2025-12-01T19:39:52.935581+08:00",
    finished_at: "2025-12-01T19:39:55.172329+08:00",
  },
  {
    id: "7c4bff7c-ad7b-4b09-90a1-9b22baca0481",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:41:12.294092+08:00",
    updated_at: "2025-12-01T20:41:13.496729+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    shot_id: "e6289115-9e5b-4625-98b0-413cd47d8f0a",
    type: OperationType.SHOT_REGEN,
    payload: {
      details: "需要极光星空画面",
      shot_id: "e6289115-9e5b-4625-98b0-413cd47d8f0a",
    },
    status: OperationStatus.SUCCEEDED,
    retries: 0,
    error_msg: "",
    worker: "story-worker",
    started_at: "2025-12-01T20:41:13.304791+08:00",
    finished_at: "2025-12-01T20:41:13.488044+08:00",
  },
  {
    id: "521fe61b-9790-4fae-8c28-e3682a6121b4",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:41:37.414174+08:00",
    updated_at: "2025-12-01T20:41:38.619011+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    shot_id: "00000000-0000-0000-0000-000000000000",
    type: OperationType.VIDEO_RENDER,
    payload: {
      story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    },
    status: OperationStatus.SUCCEEDED,
    retries: 0,
    error_msg: "",
    worker: "story-worker",
    started_at: "2025-12-01T20:41:38.421003+08:00",
    finished_at: "2025-12-01T20:41:38.618585+08:00",
  },
  {
    id: "running-operation-001",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-02T10:00:00.000000+08:00",
    updated_at: "2025-12-02T10:00:05.000000+08:00",
    story_id: "cf000374-bdf4-403f-8112-d57fb5617cb1",
    shot_id: "00000000-0000-0000-0000-000000000000",
    type: OperationType.STORY_CREATE,
    payload: {
      style: "animation",
      display_name: "测试进行中",
      script_content: "正在生成的故事",
    },
    status: OperationStatus.RUNNING,
    retries: 0,
    error_msg: "",
    worker: "story-worker",
    started_at: "2025-12-02T10:00:01.000000+08:00",
    finished_at: "",
  },
  {
    id: "queued-operation-001",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-02T10:05:00.000000+08:00",
    updated_at: "2025-12-02T10:05:00.000000+08:00",
    story_id: "3d38342b-c4d2-4171-ab87-bda85a36136e",
    shot_id: "00000000-0000-0000-0000-000000000000",
    type: OperationType.VIDEO_RENDER,
    payload: {
      story_id: "3d38342b-c4d2-4171-ab87-bda85a36136e",
    },
    status: OperationStatus.QUEUED,
    retries: 0,
    error_msg: "",
    worker: "",
    started_at: "",
    finished_at: "",
  },
];

/**
 * Mock 操作创建响应
 */
export function createMockOperationCreatedResponse(operationId?: string): OperationCreatedResponse {
  const id = operationId || `mock-${Date.now()}`;
  return {
    operation_name: `operations/${id}`,
    state: OperationStatus.QUEUED,
    create_time: new Date().toISOString(),
  };
}

/**
 * 根据 ID 获取 Mock 操作
 */
export function getMockOperation(operationId: string): Operation | undefined {
  return mockOperations.find((op) => op.id === operationId);
}

/**
 * 获取所有 Mock 操作（用于任务列表）
 */
export function getMockOperations(): Operation[] {
  return mockOperations;
}
