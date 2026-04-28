import { router } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { OnboardingWrapper } from "@/components/ui/OnboardingWrapper";
import { useAuthStore } from "@/stores/authStore";

export default function WelcomeScreen() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <OnboardingWrapper
      step={1}
      totalSteps={5}
      title={`Welcome to UrbanHut, ${firstName}!`}
      subtitle="Let's get your profile set up so you can find the perfect roommate or home."
      onContinue={() => router.push("/onboarding/intent")}
    >
      <View className="flex-1 items-center justify-center">
        <View className="w-48 h-48 bg-primary-50 rounded-full items-center justify-center mb-8">
          <Feather name="home" size={80} color="#0ea5e9" />
        </View>
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 bg-accent-100 rounded-full items-center justify-center">
              <Feather name="check" size={18} color="#10b981" />
            </View>
            <Text className="text-slate-700 text-lg">Verified profiles you can trust</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 bg-accent-100 rounded-full items-center justify-center">
              <Feather name="check" size={18} color="#10b981" />
            </View>
            <Text className="text-slate-700 text-lg">Smart lifestyle matching</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 bg-accent-100 rounded-full items-center justify-center">
              <Feather name="check" size={18} color="#10b981" />
            </View>
            <Text className="text-slate-700 text-lg">Built-in household tools</Text>
          </View>
        </View>
      </View>
    </OnboardingWrapper>
  );
}
