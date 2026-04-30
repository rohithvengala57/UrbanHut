import React from "react";
import { Feather } from "lucide-react";
import { useAdminInvestorInsights } from "../hooks/useAdminMetrics";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function InvestorScreen() {
  const { data, isLoading, error } = useAdminInvestorInsights(180);

  if (isLoading && !data) {
    return (
      <div className="flex-1 bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Investor Dashboard</h1>
        <p className="text-slate-500 mb-4">Loading investor metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Investor Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 bg-slate-50 p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Investor Dashboard</h1>
        <p className="text-slate-400 italic">No investor data available</p>
      </div>
    );
  }

  const { revenue, conversion, geography, window_days } = data;

  return (
    <div className="flex-1 bg-slate-50 p-4 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Investor Dashboard</h1>
        <p className="text-slate-500 text-sm">
          Revenue, conversion funnel, and geographic expansion metrics for the last {window_days} days
        </p>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(revenue.total_revenue_cents)}
          icon="dollar-sign"
          subtitle={`Last ${window_days} days`}
        />
        <MetricCard
          title="MRR"
          value={formatCurrency(revenue.mrr_cents)}
          icon="trending-up"
          subtitle="Monthly Recurring Revenue"
        />
        <MetricCard
          title="ARPU"
          value={formatCurrency(revenue.arpu_cents)}
          icon="users"
          subtitle="Average Revenue Per User"
        />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="mb-4">
          <h2 className="text-slate-900 text-lg font-bold mb-1">Revenue Trend</h2>
          <p className="text-slate-500 text-xs">Monthly revenue breakdown</p>
        </div>
        {revenue.trend && revenue.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenue.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getFullYear() % 100}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar dataKey="revenue_cents" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center bg-slate-50 rounded-xl">
            <p className="text-slate-400 text-sm italic">No revenue trend data</p>
          </div>
        )}
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="mb-4">
          <h2 className="text-slate-900 text-lg font-bold mb-1">Conversion Funnel</h2>
          <p className="text-slate-500 text-xs">User journey from search to close</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <FunnelStepCard
            label="Search Users"
            value={conversion.funnel.search_users}
            color="bg-sky-100"
            textColor="text-sky-700"
          />
          <FunnelStepCard
            label="Interest Users"
            value={conversion.funnel.interest_users}
            color="bg-emerald-100"
            textColor="text-emerald-700"
            conversion={conversion.search_to_interest_pct}
          />
          <FunnelStepCard
            label="Close Users"
            value={conversion.funnel.close_users}
            color="bg-violet-100"
            textColor="text-violet-700"
            conversion={conversion.interest_to_close_pct}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ConversionMetricCard
            label="Search → Interest"
            percentage={conversion.search_to_interest_pct}
          />
          <ConversionMetricCard
            label="Interest → Close"
            percentage={conversion.interest_to_close_pct}
          />
        </div>
      </div>

      {/* Geographic Expansion */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="mb-4">
          <h2 className="text-slate-900 text-lg font-bold mb-1">Geographic Expansion</h2>
          <p className="text-slate-500 text-xs">Supply and demand by city</p>
        </div>

        {geography.city_growth && geography.city_growth.length > 0 ? (
          <div className="space-y-3">
            {geography.city_growth.slice(0, 10).map((city) => (
              <CityGrowthRow key={city.city} city={city} />
            ))}
          </div>
        ) : (
          <div className="h-[150px] flex items-center justify-center bg-slate-50 rounded-xl">
            <p className="text-slate-400 text-sm italic">No geographic data available</p>
          </div>
        )}
      </div>

      {/* Supply/Demand Heatmap */}
      {geography.supply_demand_heatmap && geography.supply_demand_heatmap.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="mb-4">
            <h2 className="text-slate-900 text-lg font-bold mb-1">Supply vs Demand</h2>
            <p className="text-slate-500 text-xs">Market balance by city</p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={geography.supply_demand_heatmap.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="city"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="supply" fill="#10b981" name="Supply" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demand" fill="#f59e0b" name="Demand" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, subtitle }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center mb-2">
        <div className="p-2 bg-sky-50 rounded-lg mr-2">
          <Feather name={icon} size={16} color="#0ea5e9" />
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

function FunnelStepCard({ label, value, color, textColor, conversion }) {
  return (
    <div className={`${color} p-3 rounded-xl`}>
      <p className="text-xs text-slate-600 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value.toLocaleString()}</p>
      {conversion !== undefined && (
        <p className="text-xs text-slate-600 mt-1">
          {conversion}% conversion
        </p>
      )}
    </div>
  );
}

function ConversionMetricCard({ label, percentage }) {
  const getColorClass = (pct) => {
    if (pct >= 50) return 'text-emerald-600';
    if (pct >= 25) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-slate-50 p-3 rounded-xl">
      <p className="text-xs text-slate-600 font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${getColorClass(percentage)}`}>
        {percentage}%
      </p>
    </div>
  );
}

function CityGrowthRow({ city }) {
  const total = city.new_supply + city.new_demand;
  const supplyPct = total > 0 ? (city.new_supply / total) * 100 : 0;
  const demandPct = total > 0 ? (city.new_demand / total) * 100 : 0;

  return (
    <div className="pb-3 border-b border-slate-100 last:border-0">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-bold text-slate-700">{city.city}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-medium">
            {city.new_supply} supply
          </span>
          <span className="text-amber-600 font-medium">
            {city.new_demand} demand
          </span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${supplyPct}%` }}
        />
        <div
          className="h-full bg-amber-500"
          style={{ width: `${demandPct}%` }}
        />
      </div>
    </div>
  );
}

function formatCurrency(cents) {
  const dollars = cents / 100;
  if (dollars >= 1000000) {
    return `$${(dollars / 1000000).toFixed(2)}M`;
  }
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(2)}K`;
  }
  return `$${dollars.toFixed(2)}`;
}
