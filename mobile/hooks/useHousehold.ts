import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trackEvent } from "@/lib/analytics";
import api from "@/services/api";

// ─── Household ────────────────────────────────────────────────────────────────

export function useHousehold() {
  return useQuery({
    queryKey: ["household"],
    queryFn: async () => {
      try {
        const response = await api.get("/households/mine");
        return response.data;
      } catch (err: any) {
        // 404 means user has no household — not an error, just null
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useHouseholdMembers(enabled = true) {
  return useQuery({
    queryKey: ["household-members"],
    queryFn: async () => {
      const response = await api.get("/households/members");
      return response.data;
    },
    enabled,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; max_members?: number }) => {
      const response = await api.post("/households", data);
      return response.data;
    },
    onSuccess: async (household) => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      await trackEvent("household_created", {
        household_id: household.id ?? "unknown",
        max_members: household.max_members,
      });
    },
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invite_code: string) => {
      const response = await api.post("/households/join", { invite_code });
      return response.data;
    },
    onSuccess: async (household) => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      await trackEvent("household_member_joined", {
        household_id: household.id ?? "unknown",
      });
    },
  });
}

export function useGenerateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_?: undefined) => {
      const response = await api.post("/households/invite");
      return response.data as { invite_code: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export function useExpenses(page = 1, enabled = true) {
  return useQuery({
    queryKey: ["expenses", page],
    queryFn: async () => {
      const response = await api.get(`/expenses/?page=${page}`);
      return response.data as Array<{
        id: string;
        description: string;
        amount: number;
        category: string;
        date: string;
        paid_by: string;
        split_type: string;
        status: string;
        receipt_url: string | null;
        is_recurring: boolean;
        recurrence: string | null;
      }>;
    },
    enabled,
  });
}

export function useBalances(enabled = true) {
  return useQuery({
    queryKey: ["balances"],
    queryFn: async () => {
      const response = await api.get("/expenses/balances");
      return response.data as Array<{ user_id: string; full_name: string; net_balance: number }>;
    },
    enabled,
  });
}

export function useMyPendingSplits(enabled = true) {
  return useQuery({
    queryKey: ["my-splits"],
    queryFn: async () => {
      const response = await api.get("/expenses/my-splits");
      return response.data as Array<{
        split_id: string;
        expense_id: string;
        description: string;
        category: string;
        date: string;
        total_amount: number;
        paid_by_name: string;
        paid_by_id: string;
        amount_owed: number;
        status: string;
      }>;
    },
    enabled,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      description: string;
      amount: number;
      category: string;
      date: string;
      split_type: string;
      split_details?: Record<string, number>;
    }) => {
      const response = await api.post("/expenses", data);
      return response.data;
    },
    onSuccess: async (expense) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["my-splits"] });
      await trackEvent("expense_created", {
        expense_id: expense.id ?? "unknown",
        amount: expense.amount,
        category: expense.category,
      });
    },
  });
}

export function useSettleSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await api.post(`/expenses/${expenseId}/settle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["my-splits"] });
    },
  });
}

// ─── Chores – Templates ───────────────────────────────────────────────────────

export interface ChoreTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  weight: number;
  frequency: number;
  time_of_day: string;
  is_active: boolean;
}

export function useChoreTemplates(enabled = true) {
  return useQuery({
    queryKey: ["chore-templates"],
    queryFn: async () => {
      const response = await api.get("/chores/tasks");
      return response.data as ChoreTemplate[];
    },
    enabled,
  });
}

export function useCreateChoreTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      category?: string;
      weight: number;
      frequency: number;
      time_of_day: string;
    }) => {
      const response = await api.post("/chores/tasks", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-templates"] });
    },
  });
}

export function useUpdateChoreTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: Partial<{
        name: string;
        description: string;
        category: string;
        weight: number;
        frequency: number;
        time_of_day: string;
        is_active: boolean;
      }>;
    }) => {
      const response = await api.patch(`/chores/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-templates"] });
    },
  });
}

export function useDeleteChoreTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/chores/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-templates"] });
    },
  });
}

// ─── Chores – Constraints ─────────────────────────────────────────────────────

export interface ChoreConstraint {
  id: string;
  user_id: string | null;
  chore_id: string | null;
  type: string;
  day_of_week: number | null;
  max_frequency: number | null;
  priority: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export function useChoreConstraints(enabled = true) {
  return useQuery({
    queryKey: ["chore-constraints"],
    queryFn: async () => {
      const response = await api.get("/chores/constraints");
      return response.data as ChoreConstraint[];
    },
    enabled,
  });
}

export function useCreateConstraint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      user_id?: string;
      chore_id?: string;
      type: string;
      day_of_week?: number;
      max_frequency?: number;
    }) => {
      const response = await api.post("/chores/constraints", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-constraints"] });
    },
  });
}

export function useDeleteConstraint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (constraintId: string) => {
      await api.delete(`/chores/constraints/${constraintId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-constraints"] });
    },
  });
}

// ─── Chores – Schedule ────────────────────────────────────────────────────────

export interface ChoreAssignment {
  id: string;
  chore_id: string;
  assigned_to: string;
  day_of_week: number;
  week_start: string;
  status: "pending" | "completed" | "missed";
  completed_at: string | null;
  completed_by: string | null;
  note: string | null;
  admin_verified: boolean;
  points_earned: number;
}

export function useChoreSchedule(enabled = true) {
  return useQuery({
    queryKey: ["chore-schedule"],
    queryFn: async () => {
      const response = await api.get("/chores/schedule");
      return response.data as ChoreAssignment[];
    },
    enabled,
  });
}

export function useGenerateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (week_start: string) => {
      const response = await api.post("/chores/generate", { week_start });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["chore-points"] });
    },
  });
}

export function useCompleteChore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      note,
      completedBy,
    }: {
      assignmentId: string;
      note?: string;
      completedBy?: string;
    }) => {
      const response = await api.post(`/chores/schedule/${assignmentId}/complete`, {
        note,
        completed_by: completedBy,
      });
      return response.data;
    },
    onSuccess: async (assignment) => {
      queryClient.invalidateQueries({ queryKey: ["chore-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["chore-points"] });
      queryClient.invalidateQueries({ queryKey: ["chore-performance"] });
      await trackEvent("chore_completed", {
        assignment_id: assignment.id ?? "unknown",
        chore_id: assignment.chore_id,
      });
    },
  });
}

export function useOverrideAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      newUserId,
    }: {
      assignmentId: string;
      newUserId: string;
    }) => {
      const response = await api.patch(`/chores/schedule/${assignmentId}/override`, {
        new_user_id: newUserId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-schedule"] });
    },
  });
}

export function useApproveConstraint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (constraintId: string) => {
      const response = await api.patch(`/chores/constraints/${constraintId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-constraints"] });
    },
  });
}

export function useRejectConstraint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (constraintId: string) => {
      const response = await api.patch(`/chores/constraints/${constraintId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chore-constraints"] });
    },
  });
}

export function useChorePoints(enabled = true) {
  return useQuery({
    queryKey: ["chore-points"],
    queryFn: async () => {
      const response = await api.get("/chores/points");
      return response.data as Array<{
        user_id: string;
        full_name: string;
        total_points: number;
      }>;
    },
    enabled,
  });
}

export interface ChorePerformance {
  user_id: string;
  full_name: string;
  assigned: number;
  completed: number;
  missed: number;
  completion_rate: number;
  total_points: number;
}

export function useChorePerformance(weeks = 4, enabled = true) {
  return useQuery({
    queryKey: ["chore-performance", weeks],
    queryFn: async () => {
      const response = await api.get(`/chores/performance?weeks=${weeks}`);
      return response.data as ChorePerformance[];
    },
    enabled,
  });
}

export function useChoreHistory(weeks = 4, enabled = true) {
  return useQuery({
    queryKey: ["chore-history", weeks],
    queryFn: async () => {
      const response = await api.get(`/chores/history?weeks=${weeks}`);
      return response.data as ChoreAssignment[];
    },
    enabled,
  });
}

// ─── UH-602: Chore Reminders ─────────────────────────────────────────────────

export function useSendChoreReminders() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/chores/remind");
      return response.data as { sent: number; message?: string };
    },
  });
}

// ─── UH-502: Expense Receipts ─────────────────────────────────────────────────

export function useReceiptUploadUrl() {
  return useMutation({
    mutationFn: async ({ expenseId, filename, contentType }: { expenseId: string; filename: string; contentType?: string }) => {
      const response = await api.post(`/expenses/${expenseId}/receipt-upload-url`, {
        filename,
        content_type: contentType ?? "image/jpeg",
      });
      return response.data as { upload_url: string; s3_key: string };
    },
  });
}

export function useAttachReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, s3Key }: { expenseId: string; s3Key: string }) => {
      const response = await api.patch(`/expenses/${expenseId}/receipt?s3_key=${encodeURIComponent(s3Key)}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useReceiptDownloadUrl(expenseId: string | null) {
  return useQuery({
    queryKey: ["receipt-url", expenseId],
    queryFn: async () => {
      const response = await api.get(`/expenses/${expenseId}/receipt-url`);
      return response.data as { url: string; expires_in_seconds: number };
    },
    enabled: !!expenseId,
    staleTime: 10 * 60 * 1000, // 10 min — well within the 15-min presigned expiry
  });
}
