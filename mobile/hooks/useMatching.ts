import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";
import type { InterestDetail } from "@/hooks/useHostListings";

// ─── UH-301: Received Interests Inbox ────────────────────────────────────────
export function useReceivedInterests(interestStatus?: string) {
  return useQuery({
    queryKey: ["received-interests", interestStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (interestStatus && interestStatus !== "all") {
        params.append("interest_status", interestStatus);
      }
      const query = params.toString();
      const response = await api.get(query ? `/matching/received?${query}` : "/matching/received");
      return response.data as InterestDetail[];
    },
  });
}

// ─── UH-203: Roommate Summary ────────────────────────────────────────────────
export interface RoommateSummary {
  listing_id: string;
  household_size: number;
  available_spots: number;
  avg_trust_score: number;
  occupants: Array<{
    label: string;
    trust_band: string;
    lifestyle: {
      sleep_schedule: string;
      noise_tolerance: string;
      cleanliness_level: number;
      smoking: boolean;
      pet_friendly: boolean;
      guest_frequency: string;
    };
    tenure_months: number | null;
    occupation_type: string;
  }>;
}

export function useRoommateSummary(listingId: string) {
  return useQuery({
    queryKey: ["roommate-summary", listingId],
    queryFn: async () => {
      const response = await api.get(`/listings/roommate-summary/${listingId}`);
      return response.data as RoommateSummary;
    },
    enabled: !!listingId,
  });
}

// ─── UH-302: Status Machine ─────────────────────────────────────────────────
export function useStatusMachine() {
  return useQuery({
    queryKey: ["status-machine"],
    queryFn: async () => {
      const response = await api.get("/matching/status-machine");
      return response.data as {
        statuses: string[];
        transitions: Record<string, string[]>;
      };
    },
    staleTime: Infinity, // Static data
  });
}
