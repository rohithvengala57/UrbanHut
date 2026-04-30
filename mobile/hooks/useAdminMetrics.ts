import { useEffect, useState } from "react";
import api from "@/services/api";

export interface AdminKPIs {
  total_users: number;
  new_users_today: number;
  dau: number;
  total_listings: number;
  active_listings: number;
  total_households: number;
}

export interface AdminOverview {
  kpis: AdminKPIs;
  highlights: {
    stickiness: number;
    marketplace_health: string;
  };
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  trust_score: number;
  created_at: string | null;
  listing_count: number;
}

export interface AdminListingRow {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  rent_monthly: number;
  is_verified: boolean;
  view_count: number;
  created_at: string | null;
  host_name: string;
  host_email: string;
  interest_count: number;
}

export interface AdminFeatureUsageRow {
  name: string;
  total_hits: number;
  unique_users: number;
}

export function useAdminMetrics() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/metrics/overview");
      setOverview(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch admin metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return { overview, isLoading, error, refetch: fetchMetrics };
}

export async function fetchAdminUsers(limit = 30): Promise<AdminUserRow[]> {
  const response = await api.get("/admin/metrics/users", { params: { limit } });
  return response.data?.users ?? [];
}

export async function fetchAdminListings(limit = 30): Promise<AdminListingRow[]> {
  const response = await api.get("/admin/metrics/listings", { params: { limit } });
  return response.data?.listings ?? [];
}

export async function fetchAdminFeatureUsage(days = 14): Promise<AdminFeatureUsageRow[]> {
  const response = await api.get("/admin/metrics/feature-usage", { params: { days } });
  return response.data?.features ?? [];
}
