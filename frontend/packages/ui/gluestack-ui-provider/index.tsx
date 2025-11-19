import { ReactNode } from "react";
import { GluestackUIProvider as ThemedProvider } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
import { OverlayProvider } from "@gluestack-ui/overlay";
import { ToastProvider } from "@gluestack-ui/toast";
import { colorScheme as colorSchemeNW } from "nativewind";

type GluestackProviderProps = {
  mode?: "light" | "dark";
  children: ReactNode;
};

export function GluestackUIProvider({ mode = "light", children }: GluestackProviderProps) {
  // keep NativeWind and gluestack in sync so Tailwind tokens resolve correctly
  colorSchemeNW.set(mode);

  return (
    <ThemedProvider config={config} colorMode={mode}>
      <OverlayProvider>
        <ToastProvider>{children}</ToastProvider>
      </OverlayProvider>
    </ThemedProvider>
  );
}
