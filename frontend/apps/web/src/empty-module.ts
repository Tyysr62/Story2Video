// Empty module placeholder for React Native-only packages
// These packages are not needed in web builds
export default {};
export const styled = (component: any) => component;
export const cssInterop = () => {};

// NativeWind colorScheme stub
export const colorScheme = {
  set: (_mode: "light" | "dark") => {},
  get: () => "light" as const,
};
