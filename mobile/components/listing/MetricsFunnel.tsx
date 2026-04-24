import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import type { ListingMetrics } from "@/hooks/useHostListings";

const FUNNEL_COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#22c55e"];

interface MetricsFunnelProps {
  metrics: ListingMetrics;
}

export function MetricsFunnel({ metrics }: MetricsFunnelProps) {
  return (
    <View>
      {/* Stat Cards */}
      <View className="flex-row flex-wrap gap-2 mb-4">
        <StatCard
          icon="eye"
          label="Views"
          value={metrics.view_count}
          color="#0ea5e9"
        />
        <StatCard
          icon="heart"
          label="Interests"
          value={metrics.interest_count}
          color="#ec4899"
        />
        <StatCard
          icon="bookmark"
          label="Shortlisted"
          value={metrics.shortlist_count}
          color="#8b5cf6"
        />
        <StatCard
          icon="check-circle"
          label="Accepted"
          value={metrics.accept_count}
          color="#22c55e"
        />
      </View>

      {/* Conversion Funnel */}
      {metrics.funnel.length > 0 && (
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <Text className="font-bold text-slate-900 mb-3">Conversion Funnel</Text>
          {metrics.funnel.map((step, index) => (
            <View key={step.label} className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-sm text-slate-600 font-medium">{step.label}</Text>
                <Text className="text-sm font-bold" style={{ color: FUNNEL_COLORS[index] || "#64748b" }}>
                  {step.count} ({step.percentage}%)
                </Text>
              </View>
              <View className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(step.percentage, 2)}%`,
                    backgroundColor: FUNNEL_COLORS[index] || "#64748b",
                  }}
                />
              </View>
              {index < metrics.funnel.length - 1 && (
                <View className="items-center my-1">
                  <Feather name="chevron-down" size={14} color="#cbd5e1" />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Additional Stats */}
      {(metrics.reject_count > 0 || metrics.archive_count > 0) && (
        <View className="flex-row gap-3 mt-3">
          {metrics.reject_count > 0 && (
            <View className="flex-1 bg-red-50 rounded-xl px-3 py-2 flex-row items-center gap-2">
              <Feather name="x-circle" size={14} color="#ef4444" />
              <Text className="text-sm text-red-600 font-medium">
                {metrics.reject_count} rejected
              </Text>
            </View>
          )}
          {metrics.archive_count > 0 && (
            <View className="flex-1 bg-slate-50 rounded-xl px-3 py-2 flex-row items-center gap-2">
              <Feather name="archive" size={14} color="#64748b" />
              <Text className="text-sm text-slate-600 font-medium">
                {metrics.archive_count} archived
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View
      className="rounded-xl px-3 py-3 items-center"
      style={{ backgroundColor: `${color}10`, width: "48%" }}
    >
      <View
        className="w-8 h-8 rounded-lg items-center justify-center mb-1"
        style={{ backgroundColor: `${color}20` }}
      >
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text className="text-xl font-bold text-slate-900">{value}</Text>
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  );
}
