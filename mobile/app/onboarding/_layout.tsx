import { Stack } from "expo-router";
import React from "react";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="intent" />
      <Stack.Screen name="lifestyle" />
      <Stack.Screen name="location" />
      <Stack.Screen name="ready" />
    </Stack>
  );
}
