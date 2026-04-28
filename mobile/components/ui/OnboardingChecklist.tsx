import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

interface ChecklistItemProps {
  label: string;
  completed: boolean;
  onPress: () => void;
}

const ChecklistItem = ({ label, completed, onPress }: ChecklistItemProps) => (
  <TouchableOpacity 
    className="flex-row items-center justify-between py-2.5"
    onPress={onPress}
    disabled={completed}
  >
    <View className="flex-row items-center gap-3">
      <Ionicons 
        name={completed ? "checkbox" : "square-outline"} 
        size={22} 
        color={completed ? "#10B981" : "#94a3b8"} 
      />
      <Text className={`text-[15px] ${completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
        {label}
      </Text>
    </View>
    {!completed && <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />}
  </TouchableOpacity>
);

export const OnboardingChecklist = () => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  if (!user || !user.onboarding_metadata) return null;

  const { steps } = user.onboarding_metadata;
  
  const items = [
    {
      id: "profile",
      label: "Complete your profile",
      completed: steps.profile_completed,
      route: "/profile/edit" as const,
    },
    {
      id: "email",
      label: "Verify email address",
      completed: steps.email_verified,
      route: "/(auth)/verify-email" as const,
    },
    {
      id: "identity",
      label: "Verify your identity",
      completed: steps.identity_verified,
      route: "/profile/verification" as const,
    },
    {
      id: "action",
      label: "Send your first interest",
      completed: steps.first_meaningful_action,
      route: "/(tabs)/home" as const,
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const progress = (completedCount / items.length) * 100;

  if (completedCount === items.length) return null;

  return (
    <View className="bg-white rounded-3xl p-4 my-2 border border-slate-100 shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-lg font-bold text-slate-900">Getting Started</Text>
        <Text className="text-sm font-semibold text-slate-500">{completedCount}/{items.length}</Text>
      </View>
      
      <View className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <View className="h-full bg-primary-500 rounded-full" style={{ width: `${progress}%` }} />
      </View>

      <View className="gap-1">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            label={item.label}
            completed={item.completed}
            onPress={() => router.push(item.route)}
          />
        ))}
      </View>
    </View>
  );
};
