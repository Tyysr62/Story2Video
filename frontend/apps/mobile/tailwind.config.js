// 引入共享配置
const sharedConfig = require("../../packages/ui/tailwind.config");

module.exports = {
...sharedConfig,
  content: [
     // 扫描自身的代码
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}",
    // 扫描共享 UI 库的代码 (必须包含，否则共享组件样式会丢失)
    "../../packages/ui/components/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/src/**/*.{js,jsx,ts,tsx}"
  ],
};