import {
  Shot,
  ShotStatus,
  ListShotsResponse,
} from "../types/domain";

/**
 * Mock 分镜数据（对应雪山奇缘故事）
 */
export const mockShots: Shot[] = [
  {
    id: "e6289115-9e5b-4625-98b0-413cd47d8f0a",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:37.19697+08:00",
    updated_at: "2025-12-01T20:41:13.473451+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    sequence: "1",
    title: "两名旅人",
    description: "写实风格。冷色调的顶光照射，高对比度的阴影。画面左侧，两名穿着登山服的旅人先低头查看指南针，然后抬头望向画面右上方的雪山，最后互相确认眼神。",
    details: "写实风格。冷色调的顶光照射，高对比度的阴影。画面左侧，两名穿着登山服的旅人先低头查看指南针，然后抬头望向画面右上方的雪山，最后互相确认眼神。",
    narration: "迷雾笼罩雪山",
    type: "水平横移拍摄",
    transition: "none",
    voice: "紧张",
    status: ShotStatus.DONE,
    image_url: "/static/4fbb04b3-db6d-4928-aa2d-2514a2469a82_e6289115-9e5b-4625-98b0-413cd47d8f0a_keyframe.png",
    bgm: "",
  },
  {
    id: "18bc2686-65c7-47b5-a445-6af3bb0ac560",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:37.201424+08:00",
    updated_at: "2025-12-01T20:40:37.201424+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    sequence: "2",
    title: "旅人",
    description: "电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面右侧，一名旅人先从背包中拿出保温杯，然后将热水倒入保温杯，最后用手指擦拭杯口雾气。",
    details: "电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面右侧，一名旅人先从背包中拿出保温杯，然后将热水倒入保温杯，最后用手指擦拭杯口雾气。",
    narration: "寒冷吞噬勇气",
    type: "镜头推进",
    transition: "none",
    voice: "孤独",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/png?text=Shot+2",
    bgm: "",
  },
  {
    id: "2c9a259b-7903-4a64-8638-44ed67743df2",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:37.204882+08:00",
    updated_at: "2025-12-01T20:40:37.204882+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    sequence: "3",
    title: "旅人",
    description: "赛博朋克。霓虹的侧光打在脸上，高对比度的阴影。画面前景，一名旅人先用手机打开地图APP，然后将手指滑动屏幕，最后露出迷茫的表情。",
    details: "赛博朋克。霓虹的侧光打在脸上，高对比度的阴影。画面前景，一名旅人先用手机打开地图APP，然后将手指滑动屏幕，最后露出迷茫的表情。",
    narration: "信号消失",
    type: "绕轴横向左旋转",
    transition: "none",
    voice: "绝望",
    status: ShotStatus.GENERATING,
    image_url: "",
    bgm: "",
  },
  {
    id: "fad52d6d-a7ea-4ff9-ae98-303f091b9fb7",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:37.208792+08:00",
    updated_at: "2025-12-01T20:40:37.208792+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    sequence: "4",
    title: "旅人",
    description: "水墨画。冷色的顶光照射，柔和的阴影。画面背景，一名旅人先用登山杖戳向雪地，然后蹲下身用手指挖出雪块，最后将雪块捏成雪球。",
    details: "水墨画。冷色的顶光照射，柔和的阴影。画面背景，一名旅人先用登山杖戳向雪地，然后蹲下身用手指挖出雪块，最后将雪块捏成雪球。",
    narration: "雪中寻路",
    type: "垂直升降拍摄",
    transition: "none",
    voice: "冷静",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/png?text=Shot+4",
    bgm: "",
  },
  {
    id: "7f6be4b7-9bec-48f3-8026-af71f5bb39a0",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:37.215037+08:00",
    updated_at: "2025-12-01T20:40:37.215037+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    sequence: "5",
    title: "两名旅人",
    description: "电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面中央，两名旅人先互相搀扶着向前走，然后停下脚步仰望星空，最后同时指向远方的雪峰。",
    details: "电影感。暖色的逆光透过雪山，柔和渐变的阴影。画面中央，两名旅人先互相搀扶着向前走，然后停下脚步仰望星空，最后同时指向远方的雪峰。",
    narration: "命运指引方向",
    type: "固定机位",
    transition: "none",
    voice: "希望",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/png?text=Shot+5",
    bgm: "",
  },
];

/**
 * Mock 分镜列表响应
 */
export const mockListShotsResponse: ListShotsResponse = {
  shots: mockShots,
};

/**
 * 根据故事 ID 获取 Mock 分镜列表
 */
export function getMockShotsByStoryId(storyId: string): Shot[] {
  return mockShots.filter((s) => s.story_id === storyId);
}

/**
 * 根据 ID 获取 Mock 分镜
 */
export function getMockShot(storyId: string, shotId: string): Shot | undefined {
  return mockShots.find((s) => s.story_id === storyId && s.id === shotId);
}
