import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/services/api";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SavedListingItem {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface CompareItem {
  id: string;
  title: string;
  city: string;
  state: string;
  rent_monthly: number;
  security_deposit: number | null;
  utilities_included: boolean;
  utility_estimate: number | null;
  total_bedrooms: number;
  total_bathrooms: number;
  available_spots: number;
  current_occupants: number;
  room_type: string;
  amenities: string[];
  nearest_transit: string | null;
  transit_walk_mins: number | null;
  images: string[];
  host_trust_score: number;
  avg_household_trust: number;
}

export interface SavedSearchItem {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  alerts_enabled: boolean;
  last_notified_count: number;
  new_matches: number;
  created_at: string;
  updated_at: string;
}

// ─── UH-204: Saved Listings ─────────────────────────────────────────────────
export function useSavedListingIds() {
  return useQuery({
    queryKey: ["saved-listing-ids"],
    queryFn: async () => {
      const response = await api.get("/saved/listings/ids");
      return response.data as string[];
    },
  });
}

export function useSavedListings() {
  return useQuery({
    queryKey: ["saved-listings"],
    queryFn: async () => {
      const response = await api.get("/saved/listings");
      return response.data as SavedListingItem[];
    },
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, isSaved }: { listingId: string; isSaved: boolean }) => {
      if (isSaved) {
        await api.delete(`/saved/listings/${listingId}`);
      } else {
        await api.post(`/saved/listings/${listingId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-listing-ids"] });
      queryClient.invalidateQueries({ queryKey: ["saved-listings"] });
    },
  });
}

export function useCompareListings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingIds: string[]) => {
      const response = await api.post("/saved/listings/compare", listingIds);
      return response.data as CompareItem[];
    },
  });
}

// ─── UH-205: Saved Searches ─────────────────────────────────────────────────
export function useSavedSearches() {
  return useQuery({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      const response = await api.get("/saved/searches");
      return response.data as SavedSearchItem[];
    },
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; filters: Record<string, unknown>; alerts_enabled?: boolean }) => {
      const response = await api.post("/saved/searches", data);
      return response.data as SavedSearchItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ searchId, data }: { searchId: string; data: { name?: string; alerts_enabled?: boolean } }) => {
      const response = await api.patch(`/saved/searches/${searchId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (searchId: string) => {
      await api.delete(`/saved/searches/${searchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}
