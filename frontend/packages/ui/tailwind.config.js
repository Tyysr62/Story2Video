// packages/ui/tailwind.config.js
const plugin = require("tailwindcss/plugin");

const statePriority = {
  "indeterminate=true": 1,
  "indeterminate=false": 1,
  "checked=true": 1,
  "checked=false": 1,
  "read-only=true": 1,
  "read-only=false": 1,
  "flip=true": 1,
  "flip=false": 1,
  "required=true": 2,
  "required=false": 2,
  "invalid=true": 2,
  "invalid=false": 2,
  "focus=true": 3,
  "focus=false": 3,
  "focus-visible=true": 4,
  "focus-visible=false": 4,
  "hover=true": 5,
  "hover=false": 5,
  "pressed=true": 6,
  "pressed=false": 6,
  "active=true": 6,
  "active=false": 6,
  "loading=true": 7,
  "loading=false": 7,
  "disabled=true": 10,
  "disabled=false": 10,
};

const gluestackPlugin = plugin(({ matchVariant }) => {
  matchVariant(
    "data",
    (value) => {
      if (!value?.includes("=")) {
        return "&";
      }

      const [state, flag] = value.split("=");
      return `&[data-${state}="${flag}"]`;
    },
    {
      sort(a, z) {
        const left = statePriority[a.value] ?? Number.MAX_SAFE_INTEGER;
        const right = statePriority[z.value] ?? Number.MAX_SAFE_INTEGER;
        return left - right;
      },
    },
  );
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 必须设置为 class 模式以支持手动切换深色模式
  content: ["./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  plugins: [gluestackPlugin], // 注入 Gluestack 的预设 Token
  theme: {
    extend: {
      // 这里可以扩展自定义的主题 Token
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
};
