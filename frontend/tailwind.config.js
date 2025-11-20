const sharedConfig = require("./packages/ui/tailwind.config.js");

module.exports = {
  ...sharedConfig,
  content: [
    ...new Set([
      ...(sharedConfig.content || []),
      "./packages/ui/**/*.{js,jsx,ts,tsx}",
      "./apps/desktop/src/**/*.{js,jsx,ts,tsx}",
      "./apps/mobile/**/*.{js,jsx,ts,tsx}",
    ]),
  ],
};
