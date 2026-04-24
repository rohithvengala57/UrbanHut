import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/services/api";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface MyListing {
  id: string;
  host_id: string;
  title: string;
  description: string;
  property_type: string;
  room_type: string;
  city: string;
  state: string;
  rent_monthly: number;
  available_spots: number;
  current_occupants: number;
  images: string[];
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  interest_count: number;
  new_interest_count: number;
  shortlist_count: number;
  accept_count: number;
}

export interface InterestDetail {
  id: string;
  from_user_id: string;
  to_listing_id: string | null;
  to_user_id: string | null;
  compatibility_score: number | null;
  status: string;
  message: string | null;
  created_at: string;
  applicant_name: string;
  applicant_avatar: string | null;
  applicant_trust_score: number;
  applicant_occupation: string | null;
  applicant_city: string | null;
  listing_title: string | null;
}

export interface ListingMetrics {
  listing_id: string;
  view_count: number;
  interest_count: number;
  shortlist_count: number;
  accept_count: number;
  reject_count: number;
  archive_count: number;
  funnel: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
}

// ─── UH-101: My Listings Dashboard ──────────────────────────────────────────
export function useMyListings(status?: string) {
  return useQuery({
    queryKey: ["my-listings", status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status && status !== "all") params.append("listing_status", status);
      const query = params.toString();
      const response = await api.get(query ? `/listings/mine?${query}` : "/listings/mine");
      return response.data as MyListing[];
    },
  });
}

// ─── UH-102: Listing Interest Inbox ─────────────────────────────────────────
export function useListingInterests(listingId: string, interestStatus?: string) {
  return useQuery({
    queryKey: ["listing-interests", listingId, interestStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (interestStatus && interestStatus !== "all") {
        params.append("interest_status", interestStatus);
      }
      const query = params.toString();
      const response = await api.get(
        query
          ? `/listings/${listingId}/interests?${query}`
          : `/listings/${listingId}/interests`
      );
      return response.data as InterestDetail[];
    },
    enabled: !!listingId,
  });
}

// ─── UH-104: Listing Performance Metrics ────────────────────────────────────
export function useListingMetrics(listingId: string) {
  return useQuery({
    queryKey: ["listing-metrics", listingId],
    queryFn: async () => {
      const response = await api.get(`/listings/${listingId}/metrics`);
      return response.data as ListingMetrics;
    },
    enabled: !!listingId,
  });
}

// ─── UH-103: Host Decision Mutation ─────────────────────────────────────────
export function useHostDecision(listingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      interestId,
      status,
    }: {
      interestId: string;
      status: "shortlisted" | "accepted" | "rejected" | "archived";
    }) => {
      const response = await api.patch(
        `/listings/${listingId}/interests/${interestId}`,
        { status }
      );
      return response.data as InterestDetail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-interests", listingId] });
      queryClient.invalidateQueries({ queryKey: ["listing-metrics", listingId] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });
}

// ─── UH-105: Update Listing Status ──────────────────────────────────────────
export function useUpdateListingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
      status,
    }: {
      listingId: string;
      status: "active" | "paused" | "closed" | "draft";
    }) => {
      const response = await api.patch(`/listings/${listingId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

// ─── UH-105: Update Listing Details ─────────────────────────────────────────
export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
      data,
    }: {
      listingId: string;
      data: Record<string, unknown>;
    }) => {
      const response = await api.patch(`/listings/${listingId}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing", variables.listingId] });
    },
  });
}
