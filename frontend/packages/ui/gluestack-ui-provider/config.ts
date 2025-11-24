import { config as defaultConfig } from "@gluestack-ui/config";

export const config = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    radii: {
      ...defaultConfig.tokens.radii,
      none: 0,
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      "2xl": 32,
      "3xl": 48,
      full: 9999,
    },
  },
};
