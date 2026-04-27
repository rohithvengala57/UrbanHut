import { router } from "expo-router";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { OnboardingWrapper } from "@/components/ui/OnboardingWrapper";
import { useAuthStore } from "@/stores/authStore";

const intents = [
  {
    id: "find_room",
    title: "Find a room",
    description: "I'm looking for a place to live and great roommates.",
    icon: "search",
  },
  {
    id: "list_space",
    title: "List my space",
    description: "I have a room available and need a roommate.",
    icon: "plus-circle",
  },
  {
    id: "manage_household",
    title: "Manage household",
    description: "I'm already in a house and want to use the tools.",
    icon: "users",
  },
];

export default function IntentScreen() {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedIntent) return;
    setLoading(true);
    try {
      // Mapping intent to role or metadata if needed
      // For now we'll just store it in onboarding_metadata if we want, 
      // but let's just proceed to next step for the wizard flow.
      router.push("/onboarding/lifestyle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingWrapper
      step={2}
      totalSteps={5}
      title="What brings you here?"
      subtitle="Select your primary goal so we can tailor your experience."
      onContinue={handleContinue}
      canContinue={!!selectedIntent}
      isLoading={loading}
    >
      <View className="flex-1 gap-4 pt-4">
        {intents.map((intent) => (
          <TouchableOpacity
            key={intent.id}
            onPress={() => setSelectedIntent(intent.id)}
            className={`p-5 rounded-3xl border-2 flex-row items-center gap-4 ${
              selectedIntent === intent.id
                ? "border-primary-500 bg-primary-50"
                : "border-slate-100 bg-white"
            }`}
          >
            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${
              selectedIntent === intent.id ? "bg-primary-500" : "bg-slate-100"
            }`}>
              <Feather 
                name={intent.icon as any} 
                size={24} 
                color={selectedIntent === intent.id ? "#fff" : "#64748b"} 
              />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-bold ${
                selectedIntent === intent.id ? "text-primary-900" : "text-slate-900"
              }`}>
                {intent.title}
              </Text>
              <Text className="text-slate-500 text-sm">
                {intent.description}
              </Text>
            </View>
            {selectedIntent === intent.id && (
              <Feather name="check-circle" size={20} color="#0ea5e9" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </OnboardingWrapper>
  );
}
