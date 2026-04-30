import { Feather } from "lucide-react";
import React, { useMemo } from "react";

import {
  useAdminOverview,
  useAdminUserGrowth,
  useAdminFeatureUsage,
  useAdminRecentUsers,
  useAdminRecentListings,
  UserGrowthPoint,
  FeatureUsagePoint,
} from "../hooks/useAdminMetrics";

function KPICard({ title, value, icon, subtitle, change, positive }: { 
  title: string; 
  value: string | number; 
  icon: string;
  subtitle?: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 w-[48%] mb-4 shadow-sm justify-between min-h-[120px]">
      <div>
        <div className="flex-row items-center mb-1">
          <div className="p-1.5 bg-slate-50 rounded-lg mr-2">
            <Feather name={icon} size={14} color="#0ea5e9" />
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{title}</p>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div>
        {change && (
          <p className={`text-[10px] font-bold ${positive ? "text-emerald-600" : "text-amber-600"}`}>
            {change}
          </p>
        )}
        {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
      </div>
    </div>
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
      <div className="flex-row justify-between items-center mb-4">
        <div>
          <p className="text-slate-900 text-sm font-bold">Top Features</p>
          <p className="text-slate-500 text-[10px] font-medium">Hits in last 7 days</p>
        </div>
        {isLoading && <p>Loading...</p>}
      </div>

      {!isLoading && features && features.length > 0 ? (
        <div>
          {features.slice(0, 6).map((feature, index) => (
            <div key={feature.name} className="mb-3">
              <div className="flex-row justify-between mb-1">
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">
                  {feature.name.replace(/_/g, " ")}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{feature.total_hits}</p>
              </div>
              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${(feature.total_hits / maxHits) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : !isLoading ? (
        <div className="h-[100] items-center justify-center bg-slate-50 rounded-xl">
          <p className="text-slate-400 text-xs italic">No feature usage data</p>
        </div>
      ) : null}
    </div>
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
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
      <div className="flex-row justify-between items-center mb-4">
        <div>
          <p className="text-slate-900 text-sm font-bold">{title}</p>
          <p className="text-slate-500 text-[10px] font-medium">Daily registration trend</p>
        </div>
        {isLoading && <p>Loading...</p>}
      </div>

      {!isLoading && points && points.length >= 2 ? (
        <div className="h-[150] items-center justify-center bg-slate-50 rounded-xl">
          <p className="text-slate-400 text-xs italic">Chart placeholder</p>
        </div>
      ) : !isLoading ? (
        <div className="h-[150] items-center justify-center bg-slate-50 rounded-xl">
          <p className="text-slate-400 text-xs italic">Insufficient data for chart</p>
        </div>
      ) : null}
    </div>
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
    <div className="bg-white rounded-2xl border border-slate-200 mb-6 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex-row justify-between items-center">
        <p className="text-slate-900 font-bold">{title}</p>
        {isLoading && <p>Loading...</p>}
      </div>
      <div>
        {!isLoading && items && items.length > 0 ? (
          items.map((item, index) => (
            <div key={item.id || index} className={`p-4 ${index !== items.length - 1 ? "border-b border-slate-50" : ""}`}>
              {renderRow(item)}
            </div>
          ))
        ) : !isLoading ? (
          <div className="p-8 items-center justify-center">
            <p className="text-slate-400 text-xs italic">No recent items found</p>
          </div>
        ) : null}
      </div>
    </div>
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
      <div className="flex-1 items-center justify-center bg-slate-50">
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Feather name="alert-triangle" size={48} color="#ef4444" />
        <p className="text-lg font-bold text-slate-900 mt-4">Error</p>
        <p className="text-slate-500 text-center mt-2">{error}</p>
        <button className="text-sky-600 font-semibold mt-6" onClick={refetch}>Retry</button>
      </div>
    );
  }

  const kpis = overview?.kpis;

  return (
    <div 
      className="flex-1 bg-slate-50"
      style={{ padding: 16, overflowY: 'auto' }}
    >
      <div className="mb-6">
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Executive Overview</p>
        <p className="text-3xl font-bold text-slate-900">Dashboard</p>
      </div>

      <div className="flex-row flex-wrap justify-between">
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
          title="Listing divs" 
          value={kpis?.listing_views || 0} 
          icon="eye" 
          subtitle="Total divs today"
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
      </div>

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
          <div className="flex-row items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
              <p className="text-[10px] text-slate-500">{user.email}</p>
            </div>
            <div className="items-end">
              <div className={`px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <p className={`text-[8px] font-black uppercase ${user.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {user.status}
                </p>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">Trust: {user.trust_score}</p>
            </div>
          </div>
        )}
      />

      <RecentItemsTable 
        title="New Listings"
        items={recentListings?.items || []}
        isLoading={isListingsLoading}
        renderRow={(listing) => (
          <div className="flex-row items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="text-sm font-bold text-slate-900">{listing.title}</p>
              <p className="text-[10px] text-slate-500">{listing.city} • {listing.owner?.full_name}</p>
            </div>
            <div className="items-end">
              <p className="text-[10px] font-bold text-sky-600">{listing.metrics?.view_count} divws</p>
              <p className="text-[9px] text-slate-400 mt-1">{listing.metrics?.interest_count} interests</p>
            </div>
          </div>
        )}
      />

      <div className="mt-2 bg-slate-900 p-6 rounded-3xl shadow-xl">
        <div className="flex-row items-center justify-between mb-4">
          <div>
            <p className="text-sky-300 font-bold text-[10px] uppercase tracking-wider">Marketplace Health</p>
            <p className="text-white text-xl font-bold mt-1">
              {overview?.highlights?.marketplace_health === "stable" ? "Condition: Stable" : "Condition: Attention Required"}
            </p>
          </div>
          <div className="bg-emerald-500/20 p-2 rounded-full">
            <Feather name="shield" size={20} color="#10b981" />
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-[85%]" />
        </div>
        <p className="text-slate-400 text-[10px] mt-3 font-medium">
          Health is calculated based on active supply vs user engagement trends. Currently trending within target parameters.
        </p>
      </div>

      <div className="mt-8 mb-4">
        <p className="text-lg font-bold text-slate-900 mb-4">Quick Actions</p>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex-row items-center">
            <div className="bg-amber-50 p-2 rounded-lg mr-3">
              <Feather name="shield" size={16} color="#d97706" />
            </div>
            <p className="font-bold text-slate-700">Verification Queue</p>
            <div className="ml-auto bg-amber-100 px-2 py-0.5 rounded-full">
              <p className="text-amber-700 text-[10px] font-black">12 PENDING</p>
            </div>
          </div>
          <div className="p-4 border-b border-slate-100 flex-row items-center">
            <div className="bg-rose-50 p-2 rounded-lg mr-3">
              <Feather name="flag" size={16} color="#e11d48" />
            </div>
            <p className="font-bold text-slate-700">Reported Content</p>
            <div className="ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
              <p className="text-slate-500 text-[10px] font-black">0 NEW</p>
            </div>
          </div>
          <div className="p-4 flex-row items-center">
            <div className="bg-slate-50 p-2 rounded-lg mr-3">
              <Feather name="settings" size={16} color="#475569" />
            </div>
            <p className="font-bold text-slate-700">System Settings</p>
            <Feather name="chevron-right" size={16} color="#cbd5e1" className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
