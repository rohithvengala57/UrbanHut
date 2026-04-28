import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { TrustScoreCircle } from "@/components/ui/TrustScoreCircle";
import { useTrustScore, useTrustEvents } from "@/hooks/useTrustScore";
import { useAuthStore } from "@/stores/authStore";

const PILLAR_COLORS: Record<string, string> = {
  Verification: "#8b5cf6",
  Financial: "#22c55e",
  Household: "#0ea5e9",
  Tenure: "#f59e0b",
  Community: "#ec4899",
};

const PILLAR_HINTS: Record<string, string> = {
  Verification: "Verify phone +5 pts · Verify ID +10 pts",
  Financial: "Connect bank account +15 pts · Pay rent on time +5 pts",
  Household: "Complete chores +3 pts · Pay expenses on time +4 pts",
  Tenure: "Stay 3+ months +5 pts · Stay 12+ months +10 pts",
  Community: "Post in community +2 pts · Get endorsements +3 pts",
};

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: trustData, refetch: refetchTrust } = useTrustScore();
  const { data: trustEvents, refetch: refetchEvents } = useTrustEvents();

  // Refetch trust and user data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchTrust();
      refetchEvents();
      queryClient.invalidateQueries({ queryKey: ["trust-score"] });
      queryClient.invalidateQueries({ queryKey: ["trust-events"] });
    }, [refetchTrust, refetchEvents, queryClient]),
  );

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace("/(auth)/login");
    };
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) doLogout();
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

  const trustPillars = [
    { label: "Verification", score: trustData?.verification_score ?? 0, max: 20 },
    { label: "Financial", score: trustData?.financial_score ?? 0, max: 30 },
    { label: "Household", score: trustData?.household_score ?? 0, max: 25 },
    { label: "Tenure", score: trustData?.tenure_score ?? 0, max: 15 },
    { label: "Community", score: trustData?.community_score ?? 0, max: 10 },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 48 }}>
      {/* ── Hero header card ── */}
      <View className="overflow-hidden" style={{ height: 220 }}>
        <Svg
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="profileGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0ea5e9" stopOpacity="1" />
              <Stop offset="1" stopColor="#10b981" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#profileGrad)" />
        </Svg>
        <View className="flex-1 items-center justify-center pt-4">
          <Avatar name={user.full_name} size={84} uri={user.avatar_url} />
          <Text className="text-white text-2xl font-bold mt-3">{user.full_name}</Text>
          <Text className="text-white/75 text-sm">{user.email}</Text>
          <View className="flex-row items-center gap-3 mt-2">
            {!!user.occupation && (
              <View className="bg-white/20 rounded-full px-3 py-1">
                <Text className="text-white text-xs font-medium">{user.occupation}</Text>
              </View>
            )}
            {!!user.current_city && (
              <View className="flex-row items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                <Feather name="map-pin" size={11} color="rgba(255,255,255,0.9)" />
                <Text className="text-white text-xs">
                  {user.current_city}{user.current_state ? `, ${user.current_state}` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="px-4 -mt-5">
        {/* ── Trust score card ── */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-5">
            <TrustScoreCircle score={user.trust_score ?? 0} size={100} />
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900 mb-1">Trust Score</Text>
              {trustData?.trend && (
                <View
                  className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 self-start mb-2 ${
                    trustData.trend === "rising" ? "bg-green-50" : "bg-slate-100"
                  }`}
                >
                  <Feather
                    name={trustData.trend === "rising" ? "trending-up" : "minus"}
                    size={12}
                    color={trustData.trend === "rising" ? "#22c55e" : "#94a3b8"}
                  />
                  <Text
                    className={`text-xs font-medium ${
                      trustData.trend === "rising" ? "text-green-600" : "text-slate-500"
                    }`}
                  >
                    {trustData.trend === "rising" ? "Trending up" : "Stable"}
                  </Text>
                </View>
              )}
              {!!trustData?.trend_explanation && (
                <Text className="text-slate-500 text-xs">{trustData.trend_explanation}</Text>
              )}
            </View>
          </View>

          {/* Pillar bars */}
          {trustData && (
            <View className="mt-4 gap-3">
              {trustPillars.map((pillar) => {
                const color = PILLAR_COLORS[pillar.label] ?? "#64748b";
                const pct = Math.min((pillar.score / pillar.max) * 100, 100);
                const hint = PILLAR_HINTS[pillar.label];
                const isMaxed = pct >= 100;
                return (
                  <View key={pillar.label}>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm text-slate-600 font-medium">{pillar.label}</Text>
                      <Text className="text-sm font-bold" style={{ color }}>
                        {Math.round(pillar.score)}/{pillar.max}
                      </Text>
                    </View>
                    <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </View>
                    {!isMaxed && hint && (
                      <Text className="text-xs text-slate-400 mt-1">{hint}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* ── Referral card ── */}
        <Card className="mb-4 bg-primary-50 border-primary-100">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-bold text-slate-900 text-lg">Refer Your Friends</Text>
            <Feather name="share-2" size={18} color="#0ea5e9" />
          </View>
          <Text className="text-slate-600 text-sm mb-4">
            Invite friends to join Urban Hut and boost your trust together!
          </Text>
          <View className="bg-white rounded-xl p-3 border border-primary-200 flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-slate-400 uppercase font-bold tracking-wider">Your Code</Text>
              <Text className="text-xl font-bold text-primary-600">{user.referral_code || "GEN-CODE"}</Text>
            </View>
            <TouchableOpacity 
              className="bg-primary-500 rounded-lg px-4 py-2"
              onPress={() => {
                Alert.alert("Code Copied", "Share this code with your friends!");
              }}
            >
              <Text className="text-white font-bold">Share</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Trust activity timeline ── */}
        <Card className="mb-4">
          <Text className="font-bold text-slate-900 text-lg mb-3">Trust Activity</Text>
          {!trustEvents || trustEvents.length === 0 ? (
            <Text className="text-slate-400 text-sm">
              Your trust timeline will appear here as you complete verifications and household activity.
            </Text>
          ) : (
            trustEvents.slice(0, 5).map((event: any, index: number) => (
              <View
                key={event.id}
                className={`py-3 flex-row items-start gap-3 ${index > 0 ? "border-t border-slate-100" : ""}`}
              >
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center mt-0.5 ${
                    event.points_delta >= 0 ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <Feather
                    name={event.points_delta >= 0 ? "arrow-up" : "arrow-down"}
                    size={14}
                    color={event.points_delta >= 0 ? "#22c55e" : "#ef4444"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 font-medium text-sm">
                    {event.display_title || event.event_type}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    {event.display_description || "Trust score updated."}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    {new Date(event.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  className={`font-bold text-sm ${
                    event.points_delta >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {event.points_delta >= 0 ? "+" : ""}
                  {Number(event.points_delta).toFixed(1)}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* ── Lifestyle ── */}
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
                className="bg-slate-50 rounded-2xl px-3 py-2.5 flex-row items-center gap-2"
                style={{ width: "48%" }}
              >
                <View className="w-8 h-8 bg-white rounded-xl items-center justify-center">
                  <Feather name={item.icon} size={14} color="#0ea5e9" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-400">{item.label}</Text>
                  <Text className="text-sm text-slate-700 font-medium capitalize" numberOfLines={1}>
                    {String(item.value).replace(/_/g, " ")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Quick Access ── */}
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
              className={`flex-row items-center justify-between py-3.5 ${idx > 0 ? "border-t border-slate-100" : ""}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${item.color}18` }}
                >
                  <Feather name={item.icon} size={18} color={item.color} />
                </View>
                <Text className="text-slate-700 font-medium">{item.label}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </Card>

        {/* ── Settings ── */}
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
              className={`flex-row items-center justify-between py-3.5 ${idx > 0 ? "border-t border-slate-100" : ""}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${item.color}18` }}
                >
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
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center">
                <Feather name="log-out" size={18} color="#ef4444" />
              </View>
              <Text className="text-red-500 font-medium">Logout</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}
