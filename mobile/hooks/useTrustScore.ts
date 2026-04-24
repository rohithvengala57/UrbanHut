import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";

export function useTrustScore() {
  return useQuery({
    queryKey: ["trust-score"],
    queryFn: async () => {
      const response = await api.get("/trust/score");
      return response.data;
    },
  });
}

export function useTrustHistory() {
  return useQuery({
    queryKey: ["trust-history"],
    queryFn: async () => {
      const response = await api.get("/trust/history");
      return response.data;
    },
  });
}

export function useTrustEvents() {
  return useQuery({
    queryKey: ["trust-events"],
    queryFn: async () => {
      const response = await api.get("/trust/events");
      return response.data;
    },
  });
}
