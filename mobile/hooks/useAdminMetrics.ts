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
