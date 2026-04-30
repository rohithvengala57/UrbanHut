import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trackEvent } from "@/lib/analytics";
import api from "@/services/api";
import type { ListingFilters } from "@/stores/uiStore";

export function useListings(filters: ListingFilters = {}) {
  return useQuery({
    queryKey: ["listings", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.city) params.append("city", filters.city);
      if (filters.state) params.append("state", filters.state);
      if (filters.zip_code) params.append("zip_code", filters.zip_code);
      if (filters.price_min) params.append("price_min", String(filters.price_min));
      if (filters.price_max) params.append("price_max", String(filters.price_max));
      if (filters.room_type) params.append("room_type", filters.room_type);
      if (filters.property_type) params.append("property_type", filters.property_type);
      if (filters.available_from) params.append("available_from", filters.available_from);
      if (filters.utilities_included !== undefined) params.append("utilities_included", String(filters.utilities_included));
      if (filters.min_trust) params.append("min_trust", String(filters.min_trust));
      if (filters.sort_by) params.append("sort_by", filters.sort_by);

      const query = params.toString();
      const response = await api.get(query ? `/listings/?${query}` : "/listings/");
      return response.data;
    },
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const response = await api.get(`/listings/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMyInterests() {
  return useQuery({
    queryKey: ["my-interests"],
    queryFn: async () => {
      const response = await api.get("/matching/interests");
      return response.data as Array<{ to_listing_id: string | null; to_user_id: string | null }>;
    },
  });
}

export function useExpressInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { to_listing_id?: string; to_user_id?: string; message?: string }) => {
      const response = await api.post("/matching/interest", payload);
      return response.data;
    },
    onMutate: async (newInterest) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["my-interests"] });

      // Snapshot the previous value
      const previousInterests = queryClient.getQueryData<any[]>(["my-interests"]);

      // Optimistically update to the new value
      if (previousInterests) {
        queryClient.setQueryData(["my-interests"], [
          ...previousInterests,
          {
            id: "temp-id-" + Math.random(),
            to_listing_id: newInterest.to_listing_id || null,
            to_user_id: newInterest.to_user_id || null,
            status: "new",
            created_at: new Date().toISOString(),
          }
        ]);
      }

      return { previousInterests };
    },
    onError: (err, newInterest, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousInterests) {
        queryClient.setQueryData(["my-interests"], context.previousInterests);
      }
    },
    onSuccess: async (_data, newInterest) => {
      if (newInterest.to_listing_id) {
        await trackEvent("interest_sent", {
          listing_id: newInterest.to_listing_id,
          has_message: Boolean(newInterest.message),
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to keep server and client in sync
      queryClient.invalidateQueries({ queryKey: ["my-interests"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}
