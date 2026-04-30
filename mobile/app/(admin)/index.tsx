import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useAdminMetrics } from "@/hooks/useAdminMetrics";

function KPICard({ title, value, icon, subtitle }: { 
  title: string; 
  value: string | number; 
  icon: keyof typeof Feather.glyphMap;
  subtitle?: string;
}) {
  return (
    <View className="bg-white p-4 rounded-xl border border-slate-200 w-[48%] mb-4 shadow-sm">
      <View className="flex-row items-center mb-2">
        <View className="p-2 bg-slate-50 rounded-lg mr-2">
          <Feather name={icon} size={16} color="#6366f1" />
        </View>
        <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</Text>
      </View>
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      {subtitle && <Text className="text-xs text-slate-400 mt-1">{subtitle}</Text>}
    </View>
  );
}

export default function AdminOverview() {
  const { overview, isLoading, error, refetch } = useAdminMetrics();

  if (isLoading && !overview) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error && !overview) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Feather name="alert-triangle" size={48} color="#ef4444" />
        <Text className="text-lg font-bold text-slate-900 mt-4">Error</Text>
        <Text className="text-slate-500 text-center mt-2">{error}</Text>
        <Text className="text-indigo-600 font-semibold mt-6" onPress={refetch}>Retry</Text>
      </View>
    );
  }

  const kpis = overview?.kpis;

  return (
    <ScrollView 
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} color="#6366f1" />}
    >
      <View className="mb-6">
        <Text className="text-slate-500 font-medium">Executive Overview</Text>
        <Text className="text-2xl font-bold text-slate-900">Dashboard</Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        <KPICard 
          title="Total Users" 
          value={kpis?.total_users || 0} 
          icon="users" 
          subtitle={`${kpis?.new_users_today || 0} new today`}
        />
        <KPICard 
          title="Daily Active" 
          value={kpis?.dau || 0} 
          icon="activity" 
          subtitle={`${overview?.highlights?.stickiness || 0}% stickiness`}
        />
        <KPICard 
          title="Active Listings" 
          value={kpis?.active_listings || 0} 
          icon="home" 
          subtitle={`of ${kpis?.total_listings || 0} total`}
        />
        <KPICard 
          title="Households" 
          value={kpis?.total_households || 0} 
          icon="home" 
          subtitle="Managed entities"
        />
      </View>

      <View className="mt-4 bg-indigo-600 p-6 rounded-2xl shadow-md">
        <Text className="text-indigo-100 font-medium">Marketplace Health</Text>
        <Text className="text-white text-xl font-bold mt-1">
          {overview?.highlights?.marketplace_health === "stable" ? "Condition: Stable" : "Condition: Attention Required"}
        </Text>
        <View className="h-1 bg-white/20 rounded-full mt-4" />
        <Text className="text-indigo-100 text-xs mt-3">
          Status based on active supply vs user engagement trends.
        </Text>
      </View>

      <View className="mt-8">
        <Text className="text-lg font-bold text-slate-900 mb-4">Quick Actions</Text>
        <View className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <View className="p-4 border-b border-slate-100 flex-row items-center">
            <Feather name="shield" size={18} color="#64748b" />
            <Text className="ml-3 font-semibold text-slate-700">Verification Queue</Text>
            <View className="ml-auto bg-amber-100 px-2 py-0.5 rounded-full">
              <Text className="text-amber-700 text-[10px] font-bold">12 PENDING</Text>
            </View>
          </View>
          <View className="p-4 border-b border-slate-100 flex-row items-center">
            <Feather name="flag" size={18} color="#64748b" />
            <Text className="ml-3 font-semibold text-slate-700">Reported Content</Text>
          </View>
          <View className="p-4 flex-row items-center">
            <Feather name="settings" size={18} color="#64748b" />
            <Text className="ml-3 font-semibold text-slate-700">System Settings</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
