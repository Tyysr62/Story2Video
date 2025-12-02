import { StoryStyle } from "./domain";

export type SupportedLocale = "zh-CN" | "en-US";

export const DEFAULT_LOCALE: SupportedLocale = "zh-CN";

const STORY_STYLE_LABELS: Record<StoryStyle, Record<SupportedLocale, string>> = {
  [StoryStyle.MOVIE]: {
    "zh-CN": "电影",
    "en-US": "Movie",
  },
  [StoryStyle.ANIME]: {
    "zh-CN": "动画",
    "en-US": "Animation",
  },
  [StoryStyle.REALISTIC]: {
    "zh-CN": "写实",
    "en-US": "Realistic",
  },
};

const STORY_STYLE_PLACEHOLDER: Record<SupportedLocale, string> = {
  "zh-CN": "请选择故事风格",
  "en-US": "Select style",
};

export const TRANSITION_VALUES = ["ken_burns", "crossfade", "volume_mix"] as const;
export type TransitionType = typeof TRANSITION_VALUES[number];

const TRANSITION_LABELS: Record<TransitionType, Record<SupportedLocale, string>> = {
  ken_burns: {
    "zh-CN": "肯尼伯恩斯",
    "en-US": "Ken Burns",
  },
  crossfade: {
    "zh-CN": "渐变",
    "en-US": "Crossfade",
  },
  volume_mix: {
    "zh-CN": "音量混合",
    "en-US": "Volume Mix",
  },
};

const TRANSITION_PLACEHOLDER: Record<SupportedLocale, string> = {
  "zh-CN": "请选择转换效果",
  "en-US": "Select effect",
};

const resolveLabel = (
  map: Record<string, Record<SupportedLocale, string>>,
  key: string,
  locale: SupportedLocale,
) => map[key]?.[locale] ?? map[key]?.[DEFAULT_LOCALE] ?? key;

export const getStoryStyleLabel = (
  style: StoryStyle,
  locale: SupportedLocale = DEFAULT_LOCALE,
) => resolveLabel(STORY_STYLE_LABELS, style, locale);

export const getStoryStylePlaceholder = (
  locale: SupportedLocale = DEFAULT_LOCALE,
) => STORY_STYLE_PLACEHOLDER[locale] ?? STORY_STYLE_PLACEHOLDER[DEFAULT_LOCALE];

export const getStoryStyleOptions = (
  locale: SupportedLocale = DEFAULT_LOCALE,
) => Object.entries(STORY_STYLE_LABELS).map(([value, labels]) => ({
  value: value as StoryStyle,
  label: labels[locale] ?? labels[DEFAULT_LOCALE],
}));

export const getTransitionLabel = (
  transition: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
) => resolveLabel(TRANSITION_LABELS, transition, locale);

export const getTransitionPlaceholder = (
  locale: SupportedLocale = DEFAULT_LOCALE,
) => TRANSITION_PLACEHOLDER[locale] ?? TRANSITION_PLACEHOLDER[DEFAULT_LOCALE];

export const getTransitionOptions = (
  locale: SupportedLocale = DEFAULT_LOCALE,
) => TRANSITION_VALUES.map((value) => ({
  value,
  label: TRANSITION_LABELS[value][locale] ?? TRANSITION_LABELS[value][DEFAULT_LOCALE],
}));
