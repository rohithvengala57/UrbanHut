import { useEffect, useState } from "react";
import api from "@/services/api";

export function useAdminOverview() {
  return useAdminRequest("/admin/metrics/overview");
}

export function useAdminUserGrowth(days = 14) {
  return useAdminRequest(`/admin/metrics/user-growth?days=${days}`);
}

export function useAdminFeatureUsage(days = 14) {
  return useAdminRequest(`/admin/metrics/feature-usage?days=${days}`);
}

export function useAdminRecentUsers(pageSize = 5) {
  return useAdminRequest(`/admin/users?page_size=${pageSize}`);
}

export function useAdminRecentListings(pageSize = 5) {
  return useAdminRequest(`/admin/listings?page_size=${pageSize}`);
}

export function useAdminFunnels(days = 30) {
  return useAdminRequest(`/admin/metrics/funnels?days=${days}`);
}

export function useAdminRetention() {
  return useAdminRequest("/admin/metrics/retention");
}

export function useAdminSearchAnalytics(days = 30) {
  return useAdminRequest(`/admin/metrics/search-analytics?days=${days}`);
}

export function useAdminTrustAnalytics() {
  return useAdminRequest("/admin/metrics/trust-analytics");
}

export function useAdminHouseholdAnalytics() {
  return useAdminRequest("/admin/metrics/household-analytics");
}

export function useAdminCommunityAnalytics(days = 30) {
  return useAdminRequest(`/admin/metrics/community-analytics?days=${days}`);
}

export function useAdminServicesAnalytics(days = 30) {
  return useAdminRequest(`/admin/metrics/services-analytics?days=${days}`);
}

export function useAdminInvestorInsights(days = 180) {
  return useAdminRequest(`/admin/metrics/investor-insights?days=${days}`);
}

function useAdminRequest(path) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(path);
      setData(response.data);
      setError(null);
    } catch (err) {
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
