import { Redirect } from "expo-router";

import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  if (isAuthenticated) {
    if (!isOnboarded) {
      return <Redirect href="/onboarding/welcome" />;
    }
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/landing" />;
}
