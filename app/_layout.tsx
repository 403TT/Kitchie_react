// app/_layout.tsx  (ROOT layout)
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";

// Prevent the native splash screen from auto-hiding
// so we control the transition to our custom loading screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide the native splash immediately so our custom loading screen shows
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
