import React, { useState } from "react";
import { Feather } from "lucide-react";
import { 
  useAdminFunnels, 
  useAdminRetention, 
  useAdminSearchAnalytics,
  useAdminTrustAnalytics,
  useAdminHouseholdAnalytics
} from "../hooks/useAdminMetrics";

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState("funnels");
  
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
    <div className="flex-1 bg-slate-50">
      {/* Tab Selector */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex px-2 overflow-x-auto">
          <TabButton 
            label="Funnels" 
            active={activeTab === "funnels"} 
            onClick={() => setActiveTab("funnels")} 
            icon="filter"
          />
          <TabButton 
            label="Retention" 
            active={activeTab === "retention"} 
            onClick={() => setActiveTab("retention")} 
            icon="refresh-cw"
          />
          <TabButton 
            label="Search" 
            active={activeTab === "search"} 
            onClick={() => setActiveTab("search")} 
            icon="search"
          />
          <TabButton 
            label="Trust" 
            active={activeTab === "trust"} 
            onClick={() => setActiveTab("trust")} 
            icon="shield"
          />
          <TabButton 
            label="Households" 
            active={activeTab === "households"} 
            onClick={() => setActiveTab("households")} 
            icon="home"
          />
        </div>
      </div>

      <div 
        className="flex-1"
        style={{ padding: 16, overflowY: 'auto' }}
      >
        {activeTab === "funnels" && <FunnelsTab data={funnels.data} isLoading={funnels.isLoading} />}
        {activeTab === "retention" && <RetentionTab data={retention.data} isLoading={retention.isLoading} />}
        {activeTab === "search" && <SearchTab data={search.data} isLoading={search.isLoading} />}
        {activeTab === "trust" && <TrustTab data={trust.data} isLoading={trust.isLoading} />}
        {activeTab === "households" && <HouseholdsTab data={households.data} isLoading={households.isLoading} />}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick, icon }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 flex-row items-center justify-center py-4 border-b-2 ${active ? "border-sky-500" : "border-transparent"}`}
    >
      <Feather name={icon} size={16} color={active ? "#0ea5e9" : "#64748b"} />
      <span className={`ml-2 font-bold ${active ? "text-sky-600" : "text-slate-500"}`}>{label}</span>
    </button>
  );
}

function FunnelsTab({ data, isLoading }) {
  if (isLoading && !data) return <p className="mt-10">Loading...</p>;
  if (!data) return <p className="text-slate-400 text-center mt-10">No funnel data available</p>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-slate-900 text-xl font-bold mb-1">Onboarding Funnel</p>
        <p className="text-slate-500 text-sm mb-4">User journey from first open to verification</p>
        <FunnelChart steps={data.onboarding} />
      </div>

      <div className="mb-6">
        <p className="text-slate-900 text-xl font-bold mb-1">Marketplace Funnel</p>
        <p className="text-slate-500 text-sm mb-4">Seeker journey from search to match</p>
        <FunnelChart steps={data.marketplace} color="#10b981" />
      </div>
    </div>
  );
}

function FunnelChart({ steps, color = "#0ea5e9" }) {
  const maxCount = Math.max(...steps.map(s => s.count)) || 1;
  
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      {steps.map((step, index) => {
        const percentage = Math.round((step.count / maxCount) * 100);
        const prevCount = index > 0 ? steps[index - 1].count : null;
        const dropoff = prevCount ? Math.round((step.count / prevCount) * 100) : null;

        return (
          <div key={step.label} className="mb-4">
            <div className="flex-row justify-between items-end mb-1">
              <p className="text-slate-700 font-medium text-sm">{step.label}</p>
              <div className="flex-row items-baseline">
                <p className="text-slate-900 font-bold text-base">{step.count.toLocaleString()}</p>
                {dropoff !== null && (
                  <p className="text-slate-400 text-xs ml-2">({dropoff}% of prev)</p>
                )}
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ width: `${percentage}%`, backgroundColor: color }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RetentionTab({ data, isLoading }) {
  if (isLoading && !data) return <p className="mt-10">Loading...</p>;
  if (!data) return <p className="text-slate-400 text-center mt-10">No retention data available</p>;

  return (
    <div>
      <div className="flex-row flex-wrap justify-between mb-6">
        <MetricSmallCard title="D1 Retention" value={`${data.metrics.d1}%`} />
        <MetricSmallCard title="D7 Retention" value={`${data.metrics.d7}%`} />
        <MetricSmallCard title="D30 Retention" value={`${data.metrics.d30}%`} />
        <MetricSmallCard title="Stickiness" value={`${data.metrics.stickiness}%`} />
      </div>

      <p className="text-slate-900 text-xl font-bold mb-4">Cohort Retention</p>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <p className="p-4">Chart placeholder</p>
      </div>
    </div>
  );
}

function MetricSmallCard({ title, value }) {
  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 w-[48%] mb-4 shadow-sm">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SearchTab({ data, isLoading }) {
  if (isLoading && !data) return <p className="mt-10">Loading...</p>;
  if (!data) return <p className="text-slate-400 text-center mt-10">No search data available</p>;

  return (
    <div>
      <div className="mb-8">
        <p className="text-slate-900 text-xl font-bold mb-4">Top Searched Cities</p>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {data.top_cities.map((city, index) => (
            <div key={city.city} className="mb-4">
              <div className="flex-row justify-between mb-1">
                <p className="text-slate-700 font-medium">{city.city}</p>
                <p className="text-slate-900 font-bold">{city.count.toLocaleString()}</p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full" 
                  style={{ width: `${(city.count / (data.top_cities[0]?.count || 1)) * 100}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-slate-900 text-xl font-bold mb-4">Filter Usage</p>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm items-center">
          <p>Chart placeholder</p>
        </div>
      </div>
    </div>
  );
}

function TrustTab({ data, isLoading }) {
    if (isLoading && !data) return <p className="mt-10">Loading...</p>;
    if (!data) return <p className="text-slate-400 text-center mt-10">No trust data available</p>;
  
    const maxTrustCount = Math.max(...data.distribution.map((d) => d.count)) || 1;
  
    return (
      <div>
        <div className="mb-8">
          <p className="text-slate-900 text-xl font-bold mb-4">Trust Score Distribution</p>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex-row items-end h-[150] justify-between px-2">
              {data.distribution.map((item, idx) => (
                <div key={item.label} className="items-center w-[15%]">
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{item.count}</p>
                  <div 
                    className="w-full rounded-t-lg bg-sky-500" 
                    style={{ height: `${(item.count / maxTrustCount) * 100}%` }} 
                  />
                  <p className="text-[9px] text-slate-500 mt-2 text-center">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
  
        <div className="mb-6">
          <p className="text-slate-900 text-xl font-bold mb-4">Verification Status</p>
          <div className="flex-row flex-wrap justify-between">
            <MetricSmallCard title="Pending" value={data.verification_stats.pending.toString()} />
            <MetricSmallCard title="Approved" value={data.verification_stats.approved.toString()} />
            <MetricSmallCard title="Rejected" value={data.verification_stats.rejected.toString()} />
            <MetricSmallCard title="Total" value={data.verification_stats.total.toString()} />
          </div>
        </div>
      </div>
    );
  }
  
  function HouseholdsTab({ data, isLoading }) {
    if (isLoading && !data) return <p className="mt-10">Loading...</p>;
    if (!data) return <p className="text-slate-400 text-center mt-10">No household data available</p>;
  
    return (
      <div>
        <div className="flex-row flex-wrap justify-between mb-6">
          <MetricSmallCard title="Total Households" value={data.metrics.total_households.toString()} />
          <MetricSmallCard title="Active Households" value={data.metrics.active_households.toString()} />
          <MetricSmallCard title="Avg Members" value={data.metrics.avg_members.toString()} />
        </div>
  
        <div className="mb-6">
          <p className="text-slate-900 text-xl font-bold mb-4">Feature Adoption (30d)</p>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            {data.feature_adoption.map((item, index) => (
              <div key={item.label} className="mb-4">
                <div className="flex-row justify-between mb-1">
                  <p className="text-slate-700 font-medium">{item.label}</p>
                  <p className="text-slate-900 font-bold">{item.count}</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${(item.count / (data.metrics.total_households || 1)) * 100}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
