import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { EmptyState, MiniBarChart } from "@/components/admin/MetricCharts";
import { useAdminFeatureUsage } from "@/hooks/useAdminMetrics";

export default function ReportsAdminScreen() {
  const { data: usage, isLoading, refetch } = useAdminFeatureUsage(7);

  if (isLoading && !usage) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const moderationSignals = (usage?.features || [])
    .filter((item) => item.name.includes("report") || item.name.includes("trust") || item.name.includes("block"))
    .slice(0, 8)
    .map((item) => ({
      label: item.name.replace(/_/g, " "),
      value: item.total_hits,
      hint: `${item.unique_users} unique users`,
    }));

  const topPlatformEvents = (usage?.features || []).slice(0, 6).map((item) => ({
    label: item.name.replace(/_/g, " "),
    value: item.unique_users,
  }));

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#2563eb"]} />}
    >
      <Text className="text-2xl font-bold text-slate-900">Reports & Risk Signals</Text>
      <Text className="text-slate-500 mt-1 mb-4">Telemetry indicators for moderation and trust workflows.</Text>

      {moderationSignals.length ? (
        <MiniBarChart title="Moderation Activity" subtitle="7-day volume" data={moderationSignals} color="#f97316" />
      ) : (
        <EmptyState message="No moderation-tagged events found for this period." />
      )}

      <View className="h-4" />

      {topPlatformEvents.length ? (
        <MiniBarChart title="Most Used Platform Events" subtitle="Unique users by event" data={topPlatformEvents} color="#7c3aed" />
      ) : (
        <EmptyState message="No platform usage events captured yet." />
      )}
    </ScrollView>
  );
}
