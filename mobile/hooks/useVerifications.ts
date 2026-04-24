import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/services/api";

export interface VerificationRecord {
  id: string;
  type: string;
  status: string;
  document_url?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  metadata?: Record<string, unknown> | null;
  points_awarded: number;
}

export function useMyVerifications() {
  return useQuery({
    queryKey: ["verifications"],
    queryFn: async () => {
      const response = await api.get("/verifications/me");
      return response.data as VerificationRecord[];
    },
  });
}

export function useRequestPhoneOTP() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const response = await api.post("/auth/phone/request-otp", { phone });
      return response.data as { message: string; dev_code?: string };
    },
  });
}

export function useVerifyPhoneOTP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const response = await api.post("/auth/phone/verify-otp", { phone, code });
      return response.data as { message: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["verifications"] });
      await queryClient.invalidateQueries({ queryKey: ["trust-score"] });
      await queryClient.invalidateQueries({ queryKey: ["trust-events"] });
    },
  });
}

export function useSubmitVerification(type: "id" | "lease") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { document_url: string; notes?: string }) => {
      const response = await api.post(`/verifications/${type}`, payload);
      return response.data as VerificationRecord;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["verifications"] });
    },
  });
}
