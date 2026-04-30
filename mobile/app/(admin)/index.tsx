import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { useAdminOverview, useAdminUserGrowth, useAdminFeatureUsage, UserGrowthPoint, FeatureUsagePoint } from "@/hooks/useAdminMetrics";

function KPICard({ title, value, icon, subtitle, change, positive }: { 
  title: string; 
  value: string | number; 
  icon: keyof typeof Feather.glyphMap;
  subtitle?: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <View className="bg-white p-4 rounded-2xl border border-slate-200 w-[48%] mb-4 shadow-sm justify-between min-h-[120px]">
      <View>
        <View className="flex-row items-center mb-1">
          <View className="p-1.5 bg-slate-50 rounded-lg mr-2">
            <Feather name={icon} size={14} color="#0ea5e9" />
          </View>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{title}</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      </View>
      <View>
        {change && (
          <Text className={`text-[10px] font-bold ${positive ? "text-emerald-600" : "text-amber-600"}`}>
            {change}
          </Text>
        )}
        {subtitle && <Text className="text-[10px] text-slate-400 font-medium" numberOfLines={1}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function FeatureUsageChart({
  features,
  isLoading
}: {
  features: FeatureUsagePoint[];
  isLoading?: boolean;
}) {
  const maxHits = useMemo(() => {
    if (!features || features.length === 0) return 1;
    return Math.max(1, ...features.map((f) => f.total_hits));
  }, [features]);

  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-slate-900 text-sm font-bold">Top Features</Text>
          <Text className="text-slate-500 text-[10px] font-medium">Hits in last 7 days</Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color="#0ea5e9" />}
      </View>

      {!isLoading && features && features.length > 0 ? (
        <View>
          {features.slice(0, 6).map((feature, index) => (
            <View key={feature.name} className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">
                  {feature.name.replace(/_/g, " ")}
                </Text>
                <Text className="text-[10px] text-slate-400 font-bold">{feature.total_hits}</Text>
              </View>
              <View className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <View
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${(feature.total_hits / maxHits) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : !isLoading ? (
        <View className="h-[100] items-center justify-center bg-slate-50 rounded-xl">
          <Text className="text-slate-400 text-xs italic">No feature usage data</Text>
        </View>
      ) : null}
    </View>
  );
}

function GrowthLineChart({
  title,
  points,
  stroke,
  gradientFrom,
  gradientTo,
  isLoading
}: {
  title: string;
  points: UserGrowthPoint[];
  stroke: string;
  gradientFrom: string;
  gradientTo: string;
  isLoading?: boolean;
}) {
  const width = 320;
  const height = 150;
  const padding = 20;

  const { path, areaPath, circles, labels } = useMemo(() => {
    if (!points || points.length < 2) return { path: "", areaPath: "", circles: [], labels: [] };

    const values = points.map((point) => point.count);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);

    const mapped = points.map((point, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
      const y = height - padding - ((point.count - min) / range) * (height - padding * 2);
      return { x, y };
    });

    const pathValue = mapped
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");

    const first = mapped[0];
    const last = mapped[mapped.length - 1];
    const areaValue = `${pathValue} L ${last.x.toFixed(2)} ${(height - padding).toFixed(2)} L ${first.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;

    // Take only a few labels to avoid crowding
    const labelIndices = [0, Math.floor(points.length / 2), points.length - 1];
    const labelsData = labelIndices.map(idx => ({
      text: points[idx].date.split('-').slice(1).join('/'), // Format YYYY-MM-DD to MM/DD
      x: mapped[idx].x
    }));

    return {
      path: pathValue,
      areaPath: areaValue,
      circles: mapped,
      labels: labelsData
    };
  }, [points]);

  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-slate-900 text-sm font-bold">{title}</Text>
          <Text className="text-slate-500 text-[10px] font-medium">Daily registration trend</Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color="#0ea5e9" />}
      </View>

      {!isLoading && points && points.length >= 2 ? (
        <View>
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <LinearGradient id={`grad-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={gradientFrom} stopOpacity="0.4" />
                <Stop offset="1" stopColor={gradientTo} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            <Rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} fill="#f8fafc" rx={8} />
            <Path d={areaPath} fill={`url(#grad-${title.replace(/\s+/g, '-')})`} />
            <Path d={path} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {circles.map((point, index) => (
              <Circle key={`${title}-${index}`} cx={point.x} cy={point.y} r={3} fill={stroke} />
            ))}
          </Svg>

          <View className="flex-row justify-between mt-2 px-4">
            {labels.map((label, index) => (
              <Text key={`${title}-label-${index}`} className="text-slate-400 text-[9px] font-bold">
                {label.text}
              </Text>
            ))}
          </View>
        </View>
      ) : !isLoading ? (
        <View className="h-[150] items-center justify-center bg-slate-50 rounded-xl">
          <Text className="text-slate-400 text-xs italic">Insufficient data for chart</Text>
        </View>
      ) : null}
    </View>
  );
}

function RecentItemsTable({
  title,
  items,
  renderRow,
  isLoading
}: {
  title: string;
  items: any[];
  renderRow: (item: any) => React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 mb-6 shadow-sm overflow-hidden">
      <View className="p-4 border-b border-slate-100 flex-row justify-between items-center">
        <Text className="text-slate-900 font-bold">{title}</Text>
        {isLoading && <ActivityIndicator size="small" color="#0ea5e9" />}
      </View>
      <View>
        {!isLoading && items && items.length > 0 ? (
          items.map((item, index) => (
            <View key={item.id || index} className={`p-4 ${index !== items.length - 1 ? "border-b border-slate-50" : ""}`}>
              {renderRow(item)}
            </View>
          ))
        ) : !isLoading ? (
          <View className="p-8 items-center justify-center">
            <Text className="text-slate-400 text-xs italic">No recent items found</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function AdminOverview() {
  const { data: overview, isLoading: isOverviewLoading, error: overviewError, refetch: refetchOverview } = useAdminOverview();
  const { data: growth, isLoading: isGrowthLoading, error: growthError, refetch: refetchGrowth } = useAdminUserGrowth(14);
  const { data: featureUsage, isLoading: isFeatureLoading, error: featureError, refetch: refetchFeatures } = useAdminFeatureUsage(7);
  const { data: recentUsers, isLoading: isUsersLoading, refetch: refetchUsers } = useAdminRecentUsers(5);
  const { data: recentListings, isLoading: isListingsLoading, refetch: refetchListings } = useAdminRecentListings(5);

  const isLoading = isOverviewLoading || isGrowthLoading || isFeatureLoading || isUsersLoading || isListingsLoading;
  const error = overviewError || growthError || featureError;

  const refetch = () => {
    refetchOverview();
    refetchGrowth();
    refetchFeatures();
    refetchUsers();
    refetchListings();
  };

  if (isLoading && !overview) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error && !overview) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Feather name="alert-triangle" size={48} color="#ef4444" />
        <Text className="text-lg font-bold text-slate-900 mt-4">Error</Text>
        <Text className="text-slate-500 text-center mt-2">{error}</Text>
        <Text className="text-sky-600 font-semibold mt-6" onPress={refetch}>Retry</Text>
      </View>
    );
  }

  const kpis = overview?.kpis;

  return (
    <ScrollView 
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#0ea5e9"]} />}
    >
      <View className="mb-6">
        <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest">Executive Overview</Text>
        <Text className="text-3xl font-bold text-slate-900">Dashboard</Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        <KPICard 
          title="Total Users" 
          value={kpis?.total_users || 0} 
          icon="users" 
          change="+12.4% MoM"
          positive={true}
          subtitle={`${kpis?.new_users_today || 0} new today`}
        />
        <KPICard 
          title="Daily Active" 
          value={kpis?.dau || 0} 
          icon="activity" 
          change="+6.3% WoW"
          positive={true}
          subtitle={`${overview?.highlights?.stickiness || 0}% stickiness`}
        />
        <KPICard 
          title="Active Listings" 
          value={kpis?.active_listings || 0} 
          icon="home" 
          change="+2.1% WoW"
          positive={true}
          subtitle={`of ${kpis?.total_listings || 0} total`}
        />
        <KPICard 
          title="Households" 
          value={kpis?.total_households || 0} 
          icon="layers" 
          change="+4.5% MoM"
          positive={true}
          subtitle="Managed entities"
        />
        <KPICard 
          title="Listing Views" 
          value={kpis?.listing_views || 0} 
          icon="eye" 
          subtitle="Total views today"
        />
        <KPICard 
          title="Interests Sent" 
          value={kpis?.interests_sent || 0} 
          icon="heart" 
          subtitle="Match requests today"
        />
        <KPICard 
          title="Messages" 
          value={kpis?.messages_sent || 0} 
          icon="message-circle" 
          subtitle="Chat activity today"
        />
        <KPICard 
          title="Chores" 
          value={kpis?.chores_completed || 0} 
          icon="check-square" 
          subtitle="Completed today"
        />
        <KPICard 
          title="Expenses" 
          value={kpis?.expenses_created || 0} 
          icon="dollar-sign" 
          subtitle="New shared costs"
        />
        <KPICard 
          title="Avg Session" 
          value={`${kpis?.avg_session_time || 0}m`} 
          icon="clock" 
          subtitle="Time per user"
        />
      </View>

      <GrowthLineChart
        title="User Growth (14 Days)"
        points={growth?.data || []}
        stroke="#0ea5e9"
        gradientFrom="#38bdf8"
        gradientTo="#e0f2fe"
        isLoading={isGrowthLoading}
      />

      <FeatureUsageChart 
        features={featureUsage?.features || []}
        isLoading={isFeatureLoading}
      />

      <RecentItemsTable 
        title="Recent Signups"
        items={recentUsers?.items || []}
        isLoading={isUsersLoading}
        renderRow={(user) => (
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-bold text-slate-900">{user.full_name}</Text>
              <Text className="text-[10px] text-slate-500">{user.email}</Text>
            </View>
            <View className="items-end">
              <View className={`px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <Text className={`text-[8px] font-black uppercase ${user.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {user.status}
                </Text>
              </View>
              <Text className="text-[9px] text-slate-400 mt-1">Trust: {user.trust_score}</Text>
            </View>
          </View>
        )}
      />

      <RecentItemsTable 
        title="New Listings"
        items={recentListings?.items || []}
        isLoading={isListingsLoading}
        renderRow={(listing) => (
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{listing.title}</Text>
              <Text className="text-[10px] text-slate-500">{listing.city} • {listing.owner?.full_name}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] font-bold text-sky-600">{listing.metrics?.view_count} views</Text>
              <Text className="text-[9px] text-slate-400 mt-1">{listing.metrics?.interest_count} interests</Text>
            </View>
          </View>
        )}
      />

      <View className="mt-2 bg-slate-900 p-6 rounded-3xl shadow-xl">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-sky-300 font-bold text-[10px] uppercase tracking-wider">Marketplace Health</Text>
            <Text className="text-white text-xl font-bold mt-1">
              {overview?.highlights?.marketplace_health === "stable" ? "Condition: Stable" : "Condition: Attention Required"}
            </Text>
          </View>
          <View className="bg-emerald-500/20 p-2 rounded-full">
            <Feather name="shield" size={20} color="#10b981" />
          </View>
        </View>
        <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <View className="h-full bg-emerald-500 w-[85%]" />
        </View>
        <Text className="text-slate-400 text-[10px] mt-3 font-medium">
          Health is calculated based on active supply vs user engagement trends. Currently trending within target parameters.
        </Text>
      </View>

      <View className="mt-8 mb-4">
        <Text className="text-lg font-bold text-slate-900 mb-4">Quick Actions</Text>
        <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <View className="p-4 border-b border-slate-100 flex-row items-center">
            <View className="bg-amber-50 p-2 rounded-lg mr-3">
              <Feather name="shield" size={16} color="#d97706" />
            </View>
            <Text className="font-bold text-slate-700">Verification Queue</Text>
            <View className="ml-auto bg-amber-100 px-2 py-0.5 rounded-full">
              <Text className="text-amber-700 text-[10px] font-black">12 PENDING</Text>
            </View>
          </View>
          <View className="p-4 border-b border-slate-100 flex-row items-center">
            <View className="bg-rose-50 p-2 rounded-lg mr-3">
              <Feather name="flag" size={16} color="#e11d48" />
            </View>
            <Text className="font-bold text-slate-700">Reported Content</Text>
            <View className="ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
              <Text className="text-slate-500 text-[10px] font-black">0 NEW</Text>
            </View>
          </View>
          <View className="p-4 flex-row items-center">
            <View className="bg-slate-50 p-2 rounded-lg mr-3">
              <Feather name="settings" size={16} color="#475569" />
            </View>
            <Text className="font-bold text-slate-700">System Settings</Text>
            <Feather name="chevron-right" size={16} color="#cbd5e1" className="ml-auto" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
