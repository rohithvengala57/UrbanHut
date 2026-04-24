import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/services/api";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ChatRoom {
  id: string;
  interest_id: string | null;
  listing_id: string | null;
  user_a_id: string;
  user_b_id: string;
  status: string;
  created_at: string;
  other_user_name: string;
  other_user_avatar: string | null;
  other_user_trust: number;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  listing_title: string | null;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface AppointmentItem {
  id: string;
  room_id: string;
  proposer_id: string;
  responder_id: string;
  appointment_type: string;
  proposed_time: string;
  alt_time_1: string | null;
  alt_time_2: string | null;
  confirmed_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  proposer_name: string;
  responder_name: string;
}

// ─── UH-303: Chat ───────────────────────────────────────────────────────────
export function useChatRooms() {
  return useQuery({
    queryKey: ["chat-rooms"],
    queryFn: async () => {
      const response = await api.get("/chat/rooms");
      return response.data as ChatRoom[];
    },
    refetchInterval: 10000, // Poll every 10s
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (interestId: string) => {
      const response = await api.post(`/chat/rooms/from-match/${interestId}`);
      return response.data as ChatRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

export function useMessages(roomId: string, page = 1) {
  return useQuery({
    queryKey: ["messages", roomId, page],
    queryFn: async () => {
      const response = await api.get(`/chat/rooms/${roomId}/messages?page=${page}`);
      return response.data as Message[];
    },
    enabled: !!roomId,
    refetchInterval: 5000, // Poll every 5s
  });
}

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const response = await api.post(`/chat/rooms/${roomId}/messages`, { body });
      return response.data as Message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const response = await api.get("/chat/unread-count");
      return response.data.unread_count as number;
    },
    refetchInterval: 15000,
  });
}

// ─── UH-304: Appointments ───────────────────────────────────────────────────
export function useAppointments(roomId: string) {
  return useQuery({
    queryKey: ["appointments", roomId],
    queryFn: async () => {
      const response = await api.get(`/chat/rooms/${roomId}/appointments`);
      return response.data as AppointmentItem[];
    },
    enabled: !!roomId,
  });
}

export function useProposeAppointment(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      appointment_type: string;
      proposed_time: string;
      alt_time_1?: string;
      alt_time_2?: string;
      notes?: string;
    }) => {
      const response = await api.post(`/chat/rooms/${roomId}/appointments`, data);
      return response.data as AppointmentItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", roomId] });
    },
  });
}

export function useRespondAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: { status: string; confirmed_time?: string; notes?: string };
    }) => {
      const response = await api.patch(`/chat/appointments/${appointmentId}`, data);
      return response.data as AppointmentItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", data.room_id] });
    },
  });
}
