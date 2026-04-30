import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { 
  useAdminFunnels, 
  useAdminRetention, 
  useAdminSearchAnalytics,
  useAdminTrustAnalytics,
  useAdminHouseholdAnalytics
} from "@/hooks/useAdminMetrics";
import Svg, { Rect, Line, G, Text as SvgText, Path, Circle } from "react-native-svg";

type TabType = "funnels" | "retention" | "search" | "trust" | "households";

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("funnels");
  
  const funnels = useAdminFunnels();
  const retention = useAdminRetention();
  const search = useAdminSearchAnalytics();
  const trust = useAdminTrustAnalytics();
  const households = useAdminHouseholdAnalytics();

  const isLoading = funnels.isLoading || retention.isLoading || search.isLoading || trust.isLoading || households.isLoading;

  const onRefresh = () => {
    funnels.refetch();
    retention.refetch();
    search.refetch();
    trust.refetch();
    households.refetch();
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Tab Selector */}
      <View className="bg-white border-b border-slate-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
          <TabButton 
            label="Funnels" 
            active={activeTab === "funnels"} 
            onPress={() => setActiveTab("funnels")} 
            icon="filter"
          />
          <TabButton 
            label="Retention" 
            active={activeTab === "retention"} 
            onPress={() => setActiveTab("retention")} 
            icon="refresh-cw"
          />
          <TabButton 
            label="Search" 
            active={activeTab === "search"} 
            onPress={() => setActiveTab("search")} 
            icon="search"
          />
          <TabButton 
            label="Trust" 
            active={activeTab === "trust"} 
            onPress={() => setActiveTab("trust")} 
            icon="shield"
          />
          <TabButton 
            label="Households" 
            active={activeTab === "households"} 
            onPress={() => setActiveTab("households")} 
            icon="home"
          />
        </ScrollView>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={["#0ea5e9"]} />}
      >
        {activeTab === "funnels" && <FunnelsTab data={funnels.data} isLoading={funnels.isLoading} />}
        {activeTab === "retention" && <RetentionTab data={retention.data} isLoading={retention.isLoading} />}
        {activeTab === "search" && <SearchTab data={search.data} isLoading={search.isLoading} />}
        {activeTab === "trust" && <TrustTab data={trust.data} isLoading={trust.isLoading} />}
        {activeTab === "households" && <HouseholdsTab data={households.data} isLoading={households.isLoading} />}
      </ScrollView>
    </View>
  );
}

function TabButton({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon: any }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`px-6 flex-row items-center justify-center py-4 border-b-2 ${active ? "border-sky-500" : "border-transparent"}`}
    >
      <Feather name={icon} size={16} color={active ? "#0ea5e9" : "#64748b"} />
      <Text className={`ml-2 font-bold ${active ? "text-sky-600" : "text-slate-500"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

// ... (Previous tabs FunnelsTab, RetentionTab, SearchTab remain same)

function FunnelsTab({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading && !data) return <ActivityIndicator size="large" color="#0ea5e9" className="mt-10" />;
  if (!data) return <Text className="text-slate-400 text-center mt-10">No funnel data available</Text>;

  return (
    <View>
      <View className="mb-6">
        <Text className="text-slate-900 text-xl font-bold mb-1">Onboarding Funnel</Text>
        <Text className="text-slate-500 text-sm mb-4">User journey from first open to verification</Text>
        <FunnelChart steps={data.onboarding} />
      </View>

      <View className="mb-6">
        <Text className="text-slate-900 text-xl font-bold mb-1">Marketplace Funnel</Text>
        <Text className="text-slate-500 text-sm mb-4">Seeker journey from search to match</Text>
        <FunnelChart steps={data.marketplace} color="#10b981" />
      </View>
    </View>
  );
}

function FunnelChart({ steps, color = "#0ea5e9" }: { steps: any[]; color?: string }) {
  const maxCount = Math.max(...steps.map(s => s.count)) || 1;
  
  return (
    <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      {steps.map((step, index) => {
        const percentage = Math.round((step.count / maxCount) * 100);
        const prevCount = index > 0 ? steps[index - 1].count : null;
        const dropoff = prevCount ? Math.round((step.count / prevCount) * 100) : null;

        return (
          <View key={step.label} className="mb-4">
            <View className="flex-row justify-between items-end mb-1">
              <Text className="text-slate-700 font-medium text-sm">{step.label}</Text>
              <View className="flex-row items-baseline">
                <Text className="text-slate-900 font-bold text-base">{step.count.toLocaleString()}</Text>
                {dropoff !== null && (
                  <Text className="text-slate-400 text-xs ml-2">({dropoff}% of prev)</Text>
                )}
              </View>
            </View>
            <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <View 
                className="h-full rounded-full" 
                style={{ width: `${percentage}%`, backgroundColor: color }} 
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RetentionTab({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading && !data) return <ActivityIndicator size="large" color="#0ea5e9" className="mt-10" />;
  if (!data) return <Text className="text-slate-400 text-center mt-10">No retention data available</Text>;

  return (
    <View>
      <View className="flex-row flex-wrap justify-between mb-6">
        <MetricSmallCard title="D1 Retention" value={`${data.metrics.d1}%`} />
        <MetricSmallCard title="D7 Retention" value={`${data.metrics.d7}%`} />
        <MetricSmallCard title="D30 Retention" value={`${data.metrics.d30}%`} />
        <MetricSmallCard title="Stickiness" value={`${data.metrics.stickiness}%`} />
      </View>

      <Text className="text-slate-900 text-xl font-bold mb-4">Cohort Retention</Text>
      <View className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <View className="flex-row bg-slate-50 border-b border-slate-100 p-3">
          <Text className="w-[80px] text-slate-400 font-bold text-[10px] uppercase">Cohort</Text>
          <Text className="w-[50px] text-slate-400 font-bold text-[10px] uppercase">Size</Text>
          <Text className="flex-1 text-slate-400 font-bold text-[10px] uppercase text-center">D0</Text>
          <Text className="flex-1 text-slate-400 font-bold text-[10px] uppercase text-center">D1</Text>
          <Text className="flex-1 text-slate-400 font-bold text-[10px] uppercase text-center">D7</Text>
          <Text className="flex-1 text-slate-400 font-bold text-[10px] uppercase text-center">D30</Text>
        </View>
        {data.cohorts.map((cohort: any, idx: number) => (
          <View key={idx} className="flex-row border-b border-slate-50 p-3 items-center">
            <Text className="w-[80px] text-slate-900 font-medium text-xs">{cohort.cohort}</Text>
            <Text className="w-[50px] text-slate-500 text-xs">{cohort.size.toLocaleString()}</Text>
            {cohort.retention.map((val: number, i: number) => (
              <View key={i} className="flex-1 items-center">
                <View 
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: getRetentionColor(val) }}
                >
                  <Text className={`text-[10px] font-bold ${val > 40 ? "text-white" : "text-slate-900"}`}>{val}%</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function getRetentionColor(val: number) {
  if (val >= 100) return "#0ea5e9";
  if (val >= 50) return "#38bdf8";
  if (val >= 30) return "#7dd3fc";
  if (val >= 15) return "#bae6fd";
  return "#f0f9ff";
}

function MetricSmallCard({ title, value }: { title: string; value: string }) {
  return (
    <View className="bg-white p-3 rounded-2xl border border-slate-200 w-[48%] mb-4 shadow-sm">
      <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</Text>
      <Text className="text-xl font-bold text-slate-900">{value}</Text>
    </View>
  );
}

function SearchTab({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading && !data) return <ActivityIndicator size="large" color="#0ea5e9" className="mt-10" />;
  if (!data) return <Text className="text-slate-400 text-center mt-10">No search data available</Text>;

  return (
    <View>
      <View className="mb-8">
        <Text className="text-slate-900 text-xl font-bold mb-4">Top Searched Cities</Text>
        <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {data.top_cities.map((city: any, index: number) => (
            <View key={city.city} className="mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-700 font-medium">{city.city}</Text>
                <Text className="text-slate-900 font-bold">{city.count.toLocaleString()}</Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-amber-400 rounded-full" 
                  style={{ width: `${(city.count / (data.top_cities[0]?.count || 1)) * 100}%` }} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-slate-900 text-xl font-bold mb-4">Filter Usage</Text>
        <View className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm items-center">
          <DonutChart data={data.filter_usage} />
          <View className="mt-6 w-full">
            {data.filter_usage.map((item: any, idx: number) => (
              <View key={idx} className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <Text className="text-slate-600 text-sm">{item.label}</Text>
                </View>
                <Text className="text-slate-900 font-bold text-sm">{item.value}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ... (New Tabs: TrustTab, HouseholdsTab)

function TrustTab({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading && !data) return <ActivityIndicator size="large" color="#0ea5e9" className="mt-10" />;
  if (!data) return <Text className="text-slate-400 text-center mt-10">No trust data available</Text>;

  const maxTrustCount = Math.max(...data.distribution.map((d: any) => d.count)) || 1;

  return (
    <View>
      <View className="mb-8">
        <Text className="text-slate-900 text-xl font-bold mb-4">Trust Score Distribution</Text>
        <View className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <View className="flex-row items-end h-[150] justify-between px-2">
            {data.distribution.map((item: any, idx: number) => (
              <View key={item.label} className="items-center w-[15%]">
                <Text className="text-[10px] text-slate-400 font-bold mb-1">{item.count}</Text>
                <View 
                  className="w-full rounded-t-lg bg-sky-500" 
                  style={{ height: `${(item.count / maxTrustCount) * 100}%` }} 
                />
                <Text className="text-[9px] text-slate-500 mt-2 text-center" numberOfLines={1}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-slate-900 text-xl font-bold mb-4">Verification Status</Text>
        <View className="flex-row flex-wrap justify-between">
          <MetricSmallCard title="Pending" value={data.verification_stats.pending.toString()} />
          <MetricSmallCard title="Approved" value={data.verification_stats.approved.toString()} />
          <MetricSmallCard title="Rejected" value={data.verification_stats.rejected.toString()} />
          <MetricSmallCard title="Total" value={data.verification_stats.total.toString()} />
        </View>
      </View>
    </View>
  );
}

function HouseholdsTab({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading && !data) return <ActivityIndicator size="large" color="#0ea5e9" className="mt-10" />;
  if (!data) return <Text className="text-slate-400 text-center mt-10">No household data available</Text>;

  return (
    <View>
      <View className="flex-row flex-wrap justify-between mb-6">
        <MetricSmallCard title="Total Households" value={data.metrics.total_households.toString()} />
        <MetricSmallCard title="Active Households" value={data.metrics.active_households.toString()} />
        <MetricSmallCard title="Avg Members" value={data.metrics.avg_members.toString()} />
      </View>

      <View className="mb-6">
        <Text className="text-slate-900 text-xl font-bold mb-4">Feature Adoption (30d)</Text>
        <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {data.feature_adoption.map((item: any, index: number) => (
            <View key={item.label} className="mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-700 font-medium">{item.label}</Text>
                <Text className="text-slate-900 font-bold">{item.count}</Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${(item.count / (data.metrics.total_households || 1)) * 100}%` }} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const CHART_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f97316"];

function DonutChart({ data }: { data: any[] }) {
  const size = 180;
  const strokeWidth = 25;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        {data.map((item, idx) => {
          const strokeDashoffset = circumference - (circumference * item.value) / 100;
          const rotate = (currentOffset / 100) * 360;
          currentOffset += item.value;
          
          return (
            <Circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(${rotate}, ${size / 2}, ${size / 2})`}
            />
          );
        })}
      </G>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Text className="text-slate-400 text-[10px] font-bold uppercase">Total Filters</Text>
        <Text className="text-slate-900 text-2xl font-bold">100%</Text>
      </View>
    </Svg>
  );
}
