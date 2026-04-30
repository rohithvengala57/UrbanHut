import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { EmptyState, MiniBarChart } from "@/components/admin/MetricCharts";
import { useAdminServicesAnalytics } from "@/hooks/useAdminMetrics";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="bg-white border border-slate-200 rounded-xl p-4 w-[48%] mb-3">
      <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</Text>
      <Text className="text-slate-900 text-2xl font-bold mt-1">{value}</Text>
    </View>
  );
}

export default function ServicesAdminScreen() {
  const { data, isLoading, refetch } = useAdminServicesAnalytics(30);

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const metrics = data?.metrics;
  const demandRows = (data?.category_demand || []).map((row) => ({
    label: row.category || "Uncategorized",
    value: row.bookings,
    hint: `${row.unique_customers} unique customers`,
  }));

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#2563eb"]} />}
    >
      <Text className="text-2xl font-bold text-slate-900">Services Analytics</Text>
      <Text className="text-slate-500 mt-1 mb-4">Marketplace supply, demand, and booking outcomes.</Text>

      <View className="flex-row flex-wrap justify-between mb-2">
        <StatCard label="Total Providers" value={metrics?.total_providers || 0} />
        <StatCard label="Verified Providers" value={metrics?.verified_providers || 0} />
        <StatCard label="Total Bookings" value={metrics?.total_bookings || 0} />
        <StatCard label="New Bookings (30d)" value={metrics?.new_bookings || 0} />
        <StatCard label="Completed (30d)" value={metrics?.completed_bookings || 0} />
        <StatCard label="Cancelled (30d)" value={metrics?.cancelled_bookings || 0} />
        <StatCard label="Completion Rate" value={`${metrics?.completion_rate || 0}%`} />
        <StatCard label="New Reviews (30d)" value={metrics?.new_reviews || 0} />
      </View>

      {demandRows.length ? (
        <MiniBarChart title="Category Demand" subtitle="Bookings by provider category" data={demandRows} color="#14b8a6" />
      ) : (
        <EmptyState message="No service bookings captured yet for this period." />
      )}
    </ScrollView>
  );
}
