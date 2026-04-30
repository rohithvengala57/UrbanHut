import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { AdminFeatureUsageRow, fetchAdminFeatureUsage } from "@/hooks/useAdminMetrics";

function FeatureCard({ row }: { row: AdminFeatureUsageRow }) {
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
      <Text className="text-slate-900 font-semibold">{row.name}</Text>
      <View className="flex-row mt-2">
        <Text className="text-xs text-slate-500">Hits: </Text>
        <Text className="text-xs text-slate-700 font-semibold">{row.total_hits}</Text>
        <Text className="text-xs text-slate-500 ml-4">Unique users: </Text>
        <Text className="text-xs text-slate-700 font-semibold">{row.unique_users}</Text>
      </View>
    </View>
  );
}

export default function Reports() {
  const [features, setFeatures] = useState<AdminFeatureUsageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeatureUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await fetchAdminFeatureUsage(14);
      setFeatures(rows);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatureUsage();
  }, [loadFeatureUsage]);

  if (isLoading && features.length === 0) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadFeatureUsage} color="#6366f1" />}
    >
      <View className="mb-4">
        <Text className="text-xl font-bold text-slate-900">Reports & Analytics</Text>
        <Text className="text-slate-500 text-sm mt-1">Top feature usage over the last 14 days</Text>
      </View>
      {error ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 flex-row items-center">
          <Feather name="alert-triangle" size={16} color="#dc2626" />
          <Text className="text-red-700 text-sm ml-2 flex-1">{error}</Text>
        </View>
      ) : null}
      {features.map((row) => (
        <FeatureCard key={row.name} row={row} />
      ))}
    </ScrollView>
  );
}
