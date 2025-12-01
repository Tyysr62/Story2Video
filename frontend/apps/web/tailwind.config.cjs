const sharedConfig = require("../../packages/ui/tailwind.config");

module.exports = {
  ...sharedConfig,
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/**/*.{js,jsx,ts,tsx}"
  ],
  // 增加权重，防止被由于 CSS 加载顺序导致的样式覆盖
  important: 'html',
};
