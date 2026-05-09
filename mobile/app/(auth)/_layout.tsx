import { Redirect, Stack } from "expo-router";
import React from "react";

import { useAuthStore } from "@/stores/authStore";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Redirect href={isOnboarded ? "/(tabs)/home" : "/onboarding/welcome"} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
