import React from "react";

import { EmptyState, MiniBarChart } from "../components/admin/MetricCharts";
import { useAdminCommunityAnalytics } from "../hooks/useAdminMetrics";

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 w-[48%] mb-3">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-slate-900 text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function CommunityAdminScreen() {
  const { data, isLoading, refetch } = useAdminCommunityAnalytics(30);

  if (isLoading && !data) {
    return (
      <div className="flex-1 items-center justify-center bg-slate-50">
        <p>Loading...</p>
      </div>
    );
  }

  const metrics = data?.metrics;
  const topCities = (data?.top_cities || []).map((row) => ({
    label: row.city || "Unknown",
    value: row.posts,
    hint: `${row.replies} replies, ${row.upvotes} upvotes`,
  }));

  return (
    <div
      className="flex-1 bg-slate-50"
      style={{ padding: 16, paddingBottom: 32, overflowY: 'auto' }}
    >
      <p className="text-2xl font-bold text-slate-900">Community Analytics</p>
      <p className="text-slate-500 mt-1 mb-4">Content creation, engagement, and city-level participation.</p>

      <div className="flex-row flex-wrap justify-between mb-2">
        <StatCard label="Total Posts" value={metrics?.total_posts || 0} />
        <StatCard label="Total Replies" value={metrics?.total_replies || 0} />
        <StatCard label="New Posts (30d)" value={metrics?.new_posts || 0} />
        <StatCard label="New Replies (30d)" value={metrics?.new_replies || 0} />
        <StatCard label="Contributors" value={metrics?.active_contributors || 0} />
        <StatCard label="Avg Replies/Post" value={metrics?.avg_replies_per_post || 0} />
      </div>

      {topCities.length ? (
        <MiniBarChart title="Top Cities by Posts" subtitle="Last 30 days" data={topCities} color="#0ea5e9" />
      ) : (
        <EmptyState message="No community activity captured yet for this period." />
      )}
    </div>
  );
}
