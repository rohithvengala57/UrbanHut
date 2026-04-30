import { useEffect, useState } from "react";
import api from "@/services/api";

export interface AdminKPIs {
  total_users: number;
  new_users_today: number;
  dau: number;
  total_listings: number;
  active_listings: number;
  total_households: number;
  listing_views: number;
  interests_sent: number;
  messages_sent: number;
  chores_completed: number;
  expenses_created: number;
  avg_session_time: number;
}

export interface AdminOverview {
  kpis: AdminKPIs;
  highlights: {
    stickiness: number;
    marketplace_health: string;
  };
}

export interface UserGrowthPoint {
  date: string;
  count: number;
}

export interface FeatureUsagePoint {
  name: string;
  total_hits: number;
  unique_users: number;
}

export function useAdminOverview() {
  return useAdminRequest<AdminOverview>("/admin/metrics/overview");
}

export function useAdminUserGrowth(days = 14) {
  return useAdminRequest<{ days: number; data: UserGrowthPoint[] }>(`/admin/metrics/user-growth?days=${days}`);
}

export function useAdminFeatureUsage(days = 14) {
  return useAdminRequest<{ window_days: number; features: FeatureUsagePoint[] }>(`/admin/metrics/feature-usage?days=${days}`);
}

export function useAdminRecentUsers(pageSize = 5) {
  return useAdminRequest<{ items: any[] }>(`/admin/users?page_size=${pageSize}`);
}

export function useAdminRecentListings(pageSize = 5) {
  return useAdminRequest<{ items: any[] }>(`/admin/listings?page_size=${pageSize}`);
}

export interface FunnelStep {
  label: string;
  count: number;
}

export interface FunnelData {
  window_days: number;
  onboarding: FunnelStep[];
  marketplace: FunnelStep[];
}

export function useAdminFunnels(days = 30) {
  return useAdminRequest<FunnelData>(`/admin/metrics/funnels?days=${days}`);
}

export interface CohortData {
  cohort: string;
  size: number;
  retention: number[];
}

export interface RetentionData {
  metrics: {
    d1: number;
    d7: number;
    d30: number;
    stickiness: number;
  };
  cohorts: CohortData[];
}

export function useAdminRetention() {
  return useAdminRequest<RetentionData>("/admin/metrics/retention");
}

export interface SearchAnalyticsData {
  window_days: number;
  top_cities: { city: string; count: number }[];
  filter_usage: { label: string; value: number }[];
}

export function useAdminSearchAnalytics(days = 30) {
  return useAdminRequest<SearchAnalyticsData>(`/admin/metrics/search-analytics?days=${days}`);
}

export interface TrustAnalyticsData {
  distribution: { label: string; count: number }[];
  verification_stats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export function useAdminTrustAnalytics() {
  return useAdminRequest<TrustAnalyticsData>("/admin/metrics/trust-analytics");
}

export interface HouseholdAnalyticsData {
  metrics: {
    total_households: number;
    active_households: number;
    avg_members: number;
  };
  feature_adoption: { label: string; count: number }[];
}

export function useAdminHouseholdAnalytics() {
  return useAdminRequest<HouseholdAnalyticsData>("/admin/metrics/household-analytics");
}

function useAdminRequest<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(path);
      setData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch admin metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [path]);

  return { data, isLoading, error, refetch: fetchMetrics };
}
