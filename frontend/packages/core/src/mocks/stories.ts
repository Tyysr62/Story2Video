import {
  Story,
  StoryListItem,
  StoryStyle,
  StoryStatus,
  ListStoriesResponse,
} from "../types/domain";

/**
 * Mock 故事列表项数据（用于列表 API）
 */
export const mockStoryListItems: StoryListItem[] = [
  {
    story_id: "aff9edc-cdad-4c26-8c3b-8fb44f8a6898",
    display_name: "沙漠秘境",
    cover_url: "https://placehold.co/600x400/png?text=沙漠秘境",
    create_time: "2025-12-01T19:51:54.190894+08:00",
    compile_state: "STATE_COMPLETED",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    story_id: "cf000374-bdf4-403f-8112-d57fb5617cb1",
    display_name: "花田传说",
    cover_url: "",
    create_time: "2025-12-01T19:39:51.915875+08:00",
    compile_state: "STATE_RUNNING",
    video_url: "",
  },
  {
    story_id: "3d38342b-c4d2-4171-ab87-bda85a36136e",
    display_name: "温馨短片",
    cover_url: "https://placehold.co/600x400/png?text=温馨短片",
    create_time: "2025-12-01T19:19:20.273197+08:00",
    compile_state: "STATE_COMPLETED",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    display_name: "雪山奇缘",
    cover_url: "https://placehold.co/600x400/png?text=雪山奇缘",
    create_time: "2025-12-01T20:40:30.761361+08:00",
    compile_state: "STATE_COMPLETED",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    story_id: "95134d9c-8ca0-407b-b0f7-a4df9bcfe69c",
    display_name: "测试失败",
    cover_url: "",
    create_time: "2025-12-01T18:00:00.000000+08:00",
    compile_state: "STATE_FAILED",
    video_url: "",
  },
];

/**
 * Mock 故事详情数据（用于详情 API）
 */
export const mockStories: Story[] = [
  {
    id: "aff9edc-cdad-4c26-8c3b-8fb44f8a6898",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:51:54.190894+08:00",
    updated_at: "2025-12-01T19:53:54.399044+08:00",
    content: "穿越沙漠寻找古城",
    title: "沙漠秘境",
    style: StoryStyle.MOVIE,
    duration: 120,
    status: StoryStatus.READY,
    timeline: null,
    cover_url: "https://placehold.co/600x400/png?text=沙漠秘境",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: "cf000374-bdf4-403f-8112-d57fb5617cb1",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:39:51.915875+08:00",
    updated_at: "2025-12-01T19:39:51.915875+08:00",
    content: "花田里的冒险",
    title: "花田传说",
    style: StoryStyle.MOVIE,
    duration: 0,
    status: StoryStatus.GENERATING,
    timeline: null,
    cover_url: "",
    video_url: "",
  },
  {
    id: "3d38342b-c4d2-4171-ab87-bda85a36136e",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:19:20.273197+08:00",
    updated_at: "2025-12-01T19:41:13.032344+08:00",
    content: "小狗找妈妈的故事",
    title: "温馨短片",
    style: StoryStyle.ANIMATION,
    duration: 90,
    status: StoryStatus.READY,
    timeline: null,
    cover_url: "https://placehold.co/600x400/png?text=温馨短片",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:30.761361+08:00",
    updated_at: "2025-12-01T20:41:38.619011+08:00",
    content: "两名旅人在雪山中迷路的故事",
    title: "雪山奇缘",
    style: StoryStyle.MOVIE,
    duration: 150,
    status: StoryStatus.READY,
    timeline: null,
    cover_url: "https://placehold.co/600x400/png?text=雪山奇缘",
    video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  },
  {
    id: "95134d9c-8ca0-407b-b0f7-a4df9bcfe69c",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T18:00:00.000000+08:00",
    updated_at: "2025-12-01T18:05:00.000000+08:00",
    content: "失败的测试故事",
    title: "测试失败",
    style: StoryStyle.REALISTIC,
    duration: 0,
    status: StoryStatus.FAILED,
    timeline: null,
    cover_url: "",
    video_url: "",
  },
];

/**
 * Mock 故事列表响应
 */
export const mockListStoriesResponse: ListStoriesResponse = {
  items: mockStoryListItems,
};

/**
 * 将 StoryStatus 转换为后端的 compile_state 格式
 */
function mapStatusToCompileState(status: StoryStatus): string {
  switch (status) {
    case StoryStatus.GENERATING:
      return "STATE_RUNNING";
    case StoryStatus.READY:
      return "STATE_SUCCEEDED";
    case StoryStatus.FAILED:
      return "STATE_FAILED";
    default:
      return "STATE_RUNNING";
  }
}

/**
 * 根据 ID 获取 Mock 故事（返回后端格式的响应）
 * 后端 GET /v1/stories/{storyId} 返回 { story: {...} } 格式
 */
export function getMockStory(storyId: string): { story: any } | undefined {
  const story = mockStories.find((s) => s.id === storyId);
  if (!story) return undefined;
  
  // 转换为后端响应格式
  return {
    story: {
      story_id: story.id,
      display_name: story.title,
      script_content: story.content,
      style: story.style,
      video_url: story.video_url,
      compile_state: mapStatusToCompileState(story.status),
      cover_url: story.cover_url,
      create_time: story.created_at,
      shots: [], // Mock 空分镜列表
    }
  };
}
