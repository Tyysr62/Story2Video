import {
  Shot,
  ShotStatus,
  ListShotsResponse,
} from "../types/domain";

/**
 * Mock 分镜数据（雪山奇缘故事 - story_id: 4fbb04b3-db6d-4928-aa2d-2514a2469a82）
 */
export const mockShotsSnowMountain: Shot[] = [
  {
    id: "e6289115-9e5b-4625-98b0-413cd47d8f0a",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T20:40:37.19697+08:00",
    updated_at: "2025-12-01T20:41:13.473451+08:00",
    story_id: "4fbb04b3-db6d-4928-aa2d-2514a2469a82",
    sequence: "1",
    title: "两名旅人",
    description: "需要极光星空画面",
    details: "需要极光星空画面",
    narration: "",
    type: "",
    transition: "",
    voice: "",
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
    image_url: "https://placehold.co/600x400/4A90A4/FFFFFF/png?text=Shot+2+-+保温杯",
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
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/6B5B95/FFFFFF/png?text=Shot+3+-+迷茫",
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
    image_url: "https://placehold.co/600x400/88B04B/FFFFFF/png?text=Shot+4+-+雪球",
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
    image_url: "https://placehold.co/600x400/F7CAC9/333333/png?text=Shot+5+-+星空",
    bgm: "",
  },
];

/**
 * Mock 分镜数据（沙漠秘境故事 - story_id: aff9edc-cdad-4c26-8c3b-8fb44f8a6898）
 */
export const mockShotsDesert: Shot[] = [
  {
    id: "desert-shot-001",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:51:54.190894+08:00",
    updated_at: "2025-12-01T19:53:54.399044+08:00",
    story_id: "aff9edc-cdad-4c26-8c3b-8fb44f8a6898",
    sequence: "1",
    title: "沙漠日出",
    description: "电影感。金色的阳光从沙丘后升起，长影投射在沙漠上。画面中央，一队骆驼商队缓缓前进。",
    details: "电影感。金色的阳光从沙丘后升起，长影投射在沙漠上。画面中央，一队骆驼商队缓缓前进。",
    narration: "沙漠的黎明，寂静而神秘",
    type: "航拍俯视",
    transition: "fade",
    voice: "沉稳",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/D4A574/333333/png?text=沙漠日出",
    bgm: "",
  },
  {
    id: "desert-shot-002",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:51:54.190894+08:00",
    updated_at: "2025-12-01T19:53:54.399044+08:00",
    story_id: "aff9edc-cdad-4c26-8c3b-8fb44f8a6898",
    sequence: "2",
    title: "古城遗迹",
    description: "写实风格。暖色调的顶光照射，沙尘漫天。画面前景，探险者站在半埋入沙中的古城门前，手持指南针。",
    details: "写实风格。暖色调的顶光照射，沙尘漫天。画面前景，探险者站在半埋入沙中的古城门前，手持指南针。",
    narration: "传说中的古城，终于出现在眼前",
    type: "推进镜头",
    transition: "dissolve",
    voice: "激动",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/C19A6B/FFFFFF/png?text=古城遗迹",
    bgm: "",
  },
  {
    id: "desert-shot-003",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:51:54.190894+08:00",
    updated_at: "2025-12-01T19:53:54.399044+08:00",
    story_id: "aff9edc-cdad-4c26-8c3b-8fb44f8a6898",
    sequence: "3",
    title: "探索内部",
    description: "神秘风格。火把光芒照亮古老壁画，阴影摇曳。探险者惊讶地发现宝藏线索。",
    details: "神秘风格。火把光芒照亮古老壁画，阴影摇曳。探险者惊讶地发现宝藏线索。",
    narration: "壁画上记载着失落文明的秘密",
    type: "手持跟拍",
    transition: "cut",
    voice: "惊奇",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/8B7355/FFFFFF/png?text=探索内部",
    bgm: "",
  },
  {
    id: "desert-shot-004",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:51:54.190894+08:00",
    updated_at: "2025-12-01T19:53:54.399044+08:00",
    story_id: "aff9edc-cdad-4c26-8c3b-8fb44f8a6898",
    sequence: "4",
    title: "沙尘暴",
    description: "史诗感。狂风卷起漫天黄沙，能见度极低。探险者们紧紧抓住骆驼，艰难前行。",
    details: "史诗感。狂风卷起漫天黄沙，能见度极低。探险者们紧紧抓住骆驼，艰难前行。",
    narration: "沙漠的怒吼，考验着每一个勇者",
    type: "全景摇移",
    transition: "wipe",
    voice: "紧张",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/BDB76B/333333/png?text=沙尘暴",
    bgm: "",
  },
];

/**
 * Mock 分镜数据（温馨短片故事 - story_id: 3d38342b-c4d2-4171-ab87-bda85a36136e）
 */
export const mockShotsDogStory: Shot[] = [
  {
    id: "dog-shot-001",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:19:20.273197+08:00",
    updated_at: "2025-12-01T19:41:13.032344+08:00",
    story_id: "3d38342b-c4d2-4171-ab87-bda85a36136e",
    sequence: "1",
    title: "小狗迷路",
    description: "动画风格。柔和的日落光线，暖色调。画面中央，一只可爱的小狗在公园里四处张望，寻找妈妈。",
    details: "动画风格。柔和的日落光线，暖色调。画面中央，一只可爱的小狗在公园里四处张望，寻找妈妈。",
    narration: "小狗贝贝迷路了，它焦急地寻找着妈妈的身影",
    type: "特写",
    transition: "fade",
    voice: "温柔",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/FFB6C1/333333/png?text=小狗迷路",
    bgm: "",
  },
  {
    id: "dog-shot-002",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:19:20.273197+08:00",
    updated_at: "2025-12-01T19:41:13.032344+08:00",
    story_id: "3d38342b-c4d2-4171-ab87-bda85a36136e",
    sequence: "2",
    title: "遇到朋友",
    description: "卡通风格。明亮的午后阳光。小狗遇到了一只友善的猫咪，它们一起踏上了寻找妈妈的旅程。",
    details: "卡通风格。明亮的午后阳光。小狗遇到了一只友善的猫咪，它们一起踏上了寻找妈妈的旅程。",
    narration: "在旅途中，贝贝结识了新朋友小花猫",
    type: "双人镜头",
    transition: "dissolve",
    voice: "欢快",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/87CEEB/333333/png?text=遇到朋友",
    bgm: "",
  },
  {
    id: "dog-shot-003",
    user_id: "11111111-2222-3333-4444-555555555555",
    created_at: "2025-12-01T19:19:20.273197+08:00",
    updated_at: "2025-12-01T19:41:13.032344+08:00",
    story_id: "3d38342b-c4d2-4171-ab87-bda85a36136e",
    sequence: "3",
    title: "找到妈妈",
    description: "温馨风格。黄昏的柔和光线。小狗终于看到了妈妈的身影，兴奋地跑向她，母子团聚。",
    details: "温馨风格。黄昏的柔和光线。小狗终于看到了妈妈的身影，兴奋地跑向她，母子团聚。",
    narration: "经过一番冒险，贝贝终于找到了妈妈，温暖的拥抱胜过千言万语",
    type: "中景",
    transition: "fade",
    voice: "感动",
    status: ShotStatus.DONE,
    image_url: "https://placehold.co/600x400/98FB98/333333/png?text=找到妈妈",
    bgm: "",
  },
];

/**
 * 所有 Mock 分镜数据汇总
 */
export const mockShots: Shot[] = [
  ...mockShotsSnowMountain,
  ...mockShotsDesert,
  ...mockShotsDogStory,
];

/**
 * Mock 分镜列表响应（默认返回所有分镜）
 */
export const mockListShotsResponse: ListShotsResponse = {
  shots: mockShots,
};

/**
 * 根据故事 ID 获取 Mock 分镜列表响应
 */
export function getMockListShotsResponse(storyId: string): ListShotsResponse {
  return {
    shots: getMockShotsByStoryId(storyId),
  };
}

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

/**
 * 按故事 ID 分组的 Mock 分镜数据映射
 */
export const mockShotsByStory: Record<string, Shot[]> = {
  "4fbb04b3-db6d-4928-aa2d-2514a2469a82": mockShotsSnowMountain,
  "aff9edc-cdad-4c26-8c3b-8fb44f8a6898": mockShotsDesert,
  "3d38342b-c4d2-4171-ab87-bda85a36136e": mockShotsDogStory,
};
