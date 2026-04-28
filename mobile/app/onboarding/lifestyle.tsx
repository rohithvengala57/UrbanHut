import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { OnboardingWrapper } from "@/components/ui/OnboardingWrapper";
import { useAuthStore } from "@/stores/authStore";

const LIFESTYLE_OPTIONS = [
  {
    category: "Sleep",
    options: [
      { id: "early_bird", label: "Early bird", icon: "sunrise" },
      { id: "night_owl", label: "Night owl", icon: "moon" },
    ],
  },
  {
    category: "Pets",
    options: [
      { id: "has_pets", label: "Have pets", icon: "github" }, // using github as a placeholder for pet-like icon if missing
      { id: "no_pets", label: "No pets", icon: "slash" },
    ],
  },
  {
    category: "Cleanliness",
    options: [
      { id: "tidy", label: "Very tidy", icon: "sparkles" },
      { id: "relaxed", label: "Relaxed", icon: "coffee" },
    ],
  },
  {
    category: "Work",
    options: [
      { id: "wfh", label: "WFH", icon: "home" },
      { id: "office", label: "Office", icon: "briefcase" },
    ],
  },
];

export default function LifestyleScreen() {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [loading, setLoading] = useState(false);

  const toggleOption = (category: string, id: string) => {
    setSelected((prev) => ({ ...prev, [category]: id }));
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Map selections to actual user profile fields
      const profileData: any = {};
      if (selected["Sleep"]) {
        profileData.sleep_schedule = selected["Sleep"] === "early_bird" ? "early" : "late";
      }
      if (selected["Pets"]) {
        profileData.pet_friendly = selected["Pets"] === "has_pets";
      }
      if (selected["Cleanliness"]) {
        profileData.cleanliness_level = selected["Cleanliness"] === "tidy" ? 5 : 2;
      }
      if (selected["Work"]) {
        profileData.work_schedule = selected["Work"] === "wfh" ? "remote" : "office";
      }

      await updateProfile(profileData);
      router.push("/onboarding/location");
    } catch (e) {
      console.error(e);
      // Fallback to next screen if API fails or other issues
      router.push("/onboarding/location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingWrapper
      step={3}
      totalSteps={5}
      title="Lifestyle & Habits"
      subtitle="Help us find roommates who match your vibe."
      onContinue={handleContinue}
      canContinue={Object.keys(selected).length > 0}
      isLoading={loading}
      onSkip={() => router.push("/onboarding/location")}
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-8 py-4">
          {LIFESTYLE_OPTIONS.map((group) => (
            <View key={group.category}>
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                {group.category}
              </Text>
              <View className="flex-row gap-3">
                {group.options.map((option) => {
                  const isSelected = selected[group.category] === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => toggleOption(group.category, option.id)}
                      className={`flex-1 flex-row items-center justify-center p-4 rounded-2xl border-2 gap-2 ${
                        isSelected
                          ? "border-primary-500 bg-primary-50"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <Feather
                        name={option.icon as any}
                        size={18}
                        color={isSelected ? "#0ea5e9" : "#64748b"}
                      />
                      <Text
                        className={`font-semibold ${
                          isSelected ? "text-primary-900" : "text-slate-600"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </OnboardingWrapper>
  );
}
