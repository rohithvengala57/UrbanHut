import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

// ─── UH-801: Service Booking ──────────────────────────────────────────────────

export interface ServiceBooking {
  id: string;
  provider_id: string;
  provider_name: string | null;
  scheduled_date: string;
  time_slot: string;
  notes: string | null;
  status: "pending" | "confirmed" | "rescheduled" | "cancelled" | "completed";
  rescheduled_date: string | null;
  rescheduled_time_slot: string | null;
  reschedule_reason: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyBookings(statusFilter?: string) {
  return useQuery({
    queryKey: ["service-bookings", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get(`/services/bookings?${params.toString()}`);
      return res.data as ServiceBooking[];
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      provider_id: string;
      scheduled_date: string;
      time_slot: string;
      notes?: string;
    }) => {
      const res = await api.post("/services/bookings", data);
      return res.data as ServiceBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-bookings"] });
    },
  });
}

// ─── UH-802: Reschedule / Cancel ─────────────────────────────────────────────

export function useRescheduleBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      bookingId: string;
      scheduled_date: string;
      time_slot: string;
      reason?: string;
    }) => {
      const { bookingId, ...body } = data;
      const res = await api.patch(`/services/bookings/${bookingId}/reschedule`, body);
      return res.data as ServiceBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { bookingId: string; reason?: string }) => {
      const res = await api.patch(`/services/bookings/${data.bookingId}/cancel`, {
        reason: data.reason,
      });
      return res.data as ServiceBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-bookings"] });
    },
  });
}
