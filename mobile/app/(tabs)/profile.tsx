import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useTrustEvents } from "@/hooks/useTrustScore";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: trustData } = useTrustScore();
  const { data: trustEvents } = useTrustEvents();

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace("/(auth)/login");
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        doLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  if (!user) return null;

  const lifestyleItems = [
    { label: "Diet", value: user.diet_preference || "Not set", icon: "coffee" as const },
    { label: "Sleep", value: user.sleep_schedule, icon: "moon" as const },
    { label: "Noise", value: user.noise_tolerance, icon: "volume-2" as const },
    { label: "Cleanliness", value: `${user.cleanliness_level}/5`, icon: "droplet" as const },
    { label: "Guests", value: user.guest_frequency, icon: "users" as const },
    { label: "Smoking", value: user.smoking ? "Yes" : "No", icon: "wind" as const },
    { label: "Pets", value: user.pet_friendly ? "Friendly" : "No pets", icon: "heart" as const },
    { label: "Work", value: user.work_schedule || "Not set", icon: "briefcase" as const },
  ];

  const pillarColors: Record<string, string> = {
    Verification: "#8b5cf6",
    Financial: "#22c55e",
    Household: "#0ea5e9",
    Tenure: "#f59e0b",
    Community: "#ec4899",
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Profile Header */}
      <Card className="mb-4">
        <View className="items-center">
          <Avatar name={user.full_name} size={80} uri={user.avatar_url} />
          <Text className="text-xl font-bold text-slate-900 mt-3">{user.full_name}</Text>
          <Text className="text-slate-500">{user.email}</Text>
          {user.occupation && (
            <View className="bg-slate-100 rounded-full px-3 py-1 mt-2">
              <Text className="text-slate-600 text-sm">{user.occupation}</Text>
            </View>
          )}
          {user.current_city && (
            <View className="flex-row items-center gap-1 mt-2">
              <Feather name="map-pin" size={12} color="#64748b" />
              <Text className="text-slate-500 text-sm">
                {user.current_city}, {user.current_state}
              </Text>
            </View>
          )}
          {user.bio && (
            <Text className="text-slate-500 text-sm text-center mt-2 px-4">{user.bio}</Text>
          )}
        </View>
      </Card>

      {/* Trust Score */}
      <Card className="mb-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-bold text-slate-900 text-lg">Trust Score</Text>
          <TrustBadge score={user.trust_score} size="md" />
        </View>

        {trustData && (
          <View className="gap-3">
            {[
              { label: "Verification", score: trustData.verification_score, max: 20 },
              { label: "Financial", score: trustData.financial_score, max: 30 },
              { label: "Household", score: trustData.household_score, max: 25 },
              { label: "Tenure", score: trustData.tenure_score, max: 15 },
              { label: "Community", score: trustData.community_score, max: 10 },
            ].map((pillar) => (
              <View key={pillar.label}>
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-sm text-slate-600 font-medium">{pillar.label}</Text>
                  <Text className="text-sm font-bold" style={{ color: pillarColors[pillar.label] }}>
                    {Math.round(pillar.score)}/{pillar.max}
                  </Text>
                </View>
                <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((pillar.score / pillar.max) * 100, 100)}%`,
                      backgroundColor: pillarColors[pillar.label],
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {trustData?.trend && (
          <View className="flex-row items-center gap-1.5 mt-4 bg-green-50 rounded-lg px-3 py-2">
            <Feather
              name={trustData.trend === "rising" ? "trending-up" : "minus"}
              size={14}
              color={trustData.trend === "rising" ? "#22c55e" : "#94a3b8"}
            />
            <Text className={`text-sm font-medium ${trustData.trend === "rising" ? "text-green-600" : "text-slate-500"}`}>
              {trustData.trend === "rising" ? "Score is trending up!" : "Score is stable"}
            </Text>
          </View>
        )}

        {!!trustData?.trend_explanation && (
          <Text className="text-slate-500 text-sm mt-3">{trustData.trend_explanation}</Text>
        )}
      </Card>

      {/* Trust Timeline */}
      <Card className="mb-4">
        <Text className="font-bold text-slate-900 text-lg mb-3">Recent Trust Activity</Text>
        {!trustEvents || trustEvents.length === 0 ? (
          <Text className="text-slate-400 text-sm">
            Your trust timeline will appear here as you complete verifications and household activity.
          </Text>
        ) : (
          trustEvents.slice(0, 5).map((event: any, index: number) => (
            <View
              key={event.id}
              className={`py-3 ${index > 0 ? "border-t border-slate-100" : ""}`}
            >
              <View className="flex-row justify-between items-start gap-3">
                <View className="flex-1">
                  <Text className="text-slate-900 font-medium">
                    {event.display_title || event.event_type}
                  </Text>
                  <Text className="text-slate-500 text-sm mt-0.5">
                    {event.display_description || "Trust score updated."}
                  </Text>
                </View>
                <Text
                  className={`font-semibold ${
                    event.points_delta >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {event.points_delta >= 0 ? "+" : ""}
                  {Number(event.points_delta).toFixed(1)}
                </Text>
              </View>
              <Text className="text-xs text-slate-400 mt-1">
                {new Date(event.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* Lifestyle Preferences */}
      <Card className="mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="font-bold text-slate-900 text-lg">Lifestyle</Text>
          <TouchableOpacity onPress={() => router.push("/profile/edit" as any)}>
            <Feather name="edit-2" size={16} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {lifestyleItems.map((item) => (
            <View
              key={item.label}
              className="bg-slate-50 rounded-xl px-3 py-2.5 flex-row items-center gap-2"
              style={{ width: "48%" }}
            >
              <View className="w-8 h-8 bg-white rounded-lg items-center justify-center">
                <Feather name={item.icon} size={14} color="#0ea5e9" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-slate-400">{item.label}</Text>
                <Text className="text-sm text-slate-700 font-medium capitalize">
                  {String(item.value).replace(/_/g, " ")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Quick Links */}
      <Card className="mb-4">
        <Text className="font-bold text-slate-900 text-lg mb-3">Quick Access</Text>

        {[
          { label: "Saved Listings", icon: "bookmark" as const, route: "/saved/index", color: "#0ea5e9" },
          { label: "Messages", icon: "message-circle" as const, route: "/chat/index", color: "#22c55e" },
          { label: "My Listings", icon: "layers" as const, route: "/listing/my-listings", color: "#f59e0b" },
          { label: "Services", icon: "tool" as const, route: "/services/index", color: "#ec4899" },
        ].map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as any)}
            className={`flex-row items-center justify-between py-3.5 ${
              idx > 0 ? "border-t border-slate-100" : ""
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                <Feather name={item.icon} size={18} color={item.color} />
              </View>
              <Text className="text-slate-700 font-medium">{item.label}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </Card>

      {/* Quick Actions */}
      <Card className="mb-4">
        <Text className="font-bold text-slate-900 text-lg mb-3">Settings</Text>

        {[
          { label: "Edit Profile", icon: "edit" as const, route: "/profile/edit", color: "#64748b" },
          { label: "Verification", icon: "shield" as const, route: "/profile/verification", color: "#8b5cf6" },
          { label: "Notifications", icon: "bell" as const, route: "/profile/notifications", color: "#f59e0b" },
        ].map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as any)}
            className={`flex-row items-center justify-between py-3.5 ${
              idx > 0 ? "border-t border-slate-100" : ""
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                <Feather name={item.icon} size={18} color={item.color} />
              </View>
              <Text className="text-slate-700 font-medium">{item.label}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center justify-between py-3.5 border-t border-slate-100"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 bg-red-50 rounded-lg items-center justify-center">
              <Feather name="log-out" size={18} color="#ef4444" />
            </View>
            <Text className="text-red-500 font-medium">Logout</Text>
          </View>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
