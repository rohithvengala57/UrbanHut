import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import * as Linking from "expo-linking";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/stores/uiStore";
import { captureAttributionFromUrl, getAttributionContext, trackEvent } from "@/lib/analytics";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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
  usePushNotifications();

  useEffect(() => {
    const trackLandingFromUrl = async (url: string | null) => {
      if (url) {
        await captureAttributionFromUrl(url);
      } else {
        const initialUrl = await Linking.getInitialURL();
        await captureAttributionFromUrl(initialUrl);
      }

      const { first_touch, last_touch } = await getAttributionContext();
      const source = last_touch?.source ?? first_touch?.source ?? "direct";
      const medium = last_touch?.medium ?? first_touch?.medium ?? "none";
      const campaign = last_touch?.campaign ?? first_touch?.campaign ?? "(not_set)";
      const city = last_touch?.city ?? first_touch?.city ?? "(not_set)";
      await trackEvent("landing_page_viewed", { source, medium, campaign, city });
    };

    trackLandingFromUrl(null);
    trackEvent("app_opened");
    const subscription = Linking.addEventListener("url", (event) => {
      trackLandingFromUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <>
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
    </>
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
