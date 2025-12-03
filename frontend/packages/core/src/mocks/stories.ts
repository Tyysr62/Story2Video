import {
  Story,
  StoryStyle,
  StoryStatus,
  ListStoriesResponse,
} from "../types/domain";

/**
 * Mock 故事数据
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
    style: StoryStyle.ANIME,
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
  items: mockStories,
};

/**
 * 根据 ID 获取 Mock 故事
 */
export function getMockStory(storyId: string): Story | undefined {
  return mockStories.find((s) => s.id === storyId);
}
