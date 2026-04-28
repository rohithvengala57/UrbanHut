import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import type { ListingMetrics } from "@/hooks/useHostListings";

interface MetricsFunnelProps {
  metrics: ListingMetrics;
}

export function MetricsFunnel({ metrics }: MetricsFunnelProps) {
  const steps = [
    { key: "views", label: "Views", count: metrics.view_count, percentage: 100, icon: "eye" },
    { key: "interests", label: "Interests", count: metrics.interest_count, percentage: metrics.view_count > 0 ? (metrics.interest_count / metrics.view_count) * 100 : 0, icon: "heart" },
    { key: "shortlisted", label: "Shortlisted", count: metrics.shortlist_count, percentage: metrics.view_count > 0 ? (metrics.shortlist_count / metrics.view_count) * 100 : 0, icon: "bookmark" },
    { key: "accepted", label: "Accepted", count: metrics.accept_count, percentage: metrics.view_count > 0 ? (metrics.accept_count / metrics.view_count) * 100 : 0, icon: "check-circle" },
  ];

  return (
    <View>
      {steps.map((step, index) => (
        <View key={step.key} className="mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Feather name={step.icon as any} size={14} color="#059669" />
              <Text className="text-sm font-bold text-slate-700">{step.label}</Text>
            </View>
            <Text className="text-sm font-black text-emerald-600">
              {step.count} ({Math.round(step.percentage)}%)
            </Text>
          </View>
          <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-[#10b981] rounded-full"
              style={{ width: `${Math.max(step.percentage, 1)}%` }}
            />
          </View>
          {index < steps.length - 1 && (
            <View className="items-center mt-2 -mb-1">
              <Feather name="chevron-down" size={12} color="#cbd5e1" />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
