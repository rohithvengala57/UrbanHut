import Constants from "expo-constants";
import { useEffect } from "react";
import { Platform } from "react-native";

import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Constants.appOwnership === "expo") return null;

  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync().then((token) => {
      if (!token) return;
      api.put("/users/me/push-token", { push_token: token }).catch(() => {});
    });
  }, [isAuthenticated]);
}
