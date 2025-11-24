const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// 定位 Monorepo 的根目录
const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

const resolveFromWorkspace = (moduleName) =>
  path.dirname(
    require.resolve(`${moduleName}/package.json`, { paths: [workspaceRoot] })
  );

const config = getDefaultConfig(projectRoot);

// 1. 扩展 watchFolders，让 Metro 监听根目录下的 node_modules 和 packages
config.watchFolders = [workspaceRoot];

// 2. 强制 Metro 解析 workspace 根目录的 node_modules
// 这解决了"Phantom Dependency"（幻影依赖）问题
config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, "node_modules"),
  path.resolve(projectRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@story2video/ui": path.resolve(workspaceRoot, "packages/ui"),
  "@story2video/core": path.resolve(workspaceRoot, "packages/core"),
  react: resolveFromWorkspace("react"),
  "react-dom": resolveFromWorkspace("react-dom"),
  "react-native": resolveFromWorkspace("react-native")
};

// 3. 适配 Gluestack 的 SVG 需求
// Gluestack 依赖 react-native-svg，需要将 svg 转换为组件而非静态资源
const { transformer, resolver } = config;
config.transformer = {
 ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};
config.resolver = {
 ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext!== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

// 4. 应用 NativeWind 插件
module.exports = withNativeWind(config, { input: "./global.css" });
