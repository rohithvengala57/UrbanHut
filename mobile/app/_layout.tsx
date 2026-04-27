import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Text, View } from "react-native";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/stores/uiStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function RootLayoutInner() {
  const { isLoading } = useAuth();
  const apiWarning = useUIStore((s) => s.apiWarning);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: "Listing" }} />
        <Stack.Screen name="listing/create" options={{ headerShown: true, title: "Post a Listing", presentation: "modal" }} />
        <Stack.Screen name="listing/my-listings" options={{ headerShown: true, title: "My Listings" }} />
        <Stack.Screen name="listing/manage/[id]" options={{ headerShown: true, title: "Manage Listing" }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: true, title: "Edit Profile", presentation: "modal" }} />
        <Stack.Screen name="profile/verification" options={{ headerShown: true, title: "Verification" }} />
        <Stack.Screen name="profile/notifications" options={{ headerShown: true, title: "Notifications" }} />
        <Stack.Screen name="services/index" options={{ headerShown: true, title: "Service Directory" }} />
        <Stack.Screen name="services/[id]" options={{ headerShown: true, title: "Provider Details" }} />
        <Stack.Screen name="chat/index" options={{ headerShown: false, title: "Messages" }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false, title: "Chat" }} />
        <Stack.Screen name="saved/index" options={{ headerShown: true, title: "Saved Listings" }} />
        <Stack.Screen name="saved/compare" options={{ headerShown: true, title: "Compare Listings" }} />
      </Stack>
      {apiWarning && (
        <View
          className="absolute left-3 right-3 bg-amber-100 border border-amber-300 rounded-xl px-3 py-2"
          style={{ top: 56, zIndex: 50 }}
        >
          <Text className="text-amber-900 text-xs font-medium">{apiWarning}</Text>
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootLayoutInner />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
