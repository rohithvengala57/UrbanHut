import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ServiceBooking,
  useCancelBooking,
  useMyBookings,
  useRescheduleBooking,
} from "@/hooks/useServices";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  rescheduled: "#0ea5e9",
  cancelled: "#ef4444",
  completed: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  completed: "Completed",
};

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export default function BookingsScreen() {
  const { data: bookings, isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const rescheduleBooking = useRescheduleBooking();

  const [rescheduleTarget, setRescheduleTarget] = useState<ServiceBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("09:00");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const handleCancel = (booking: ServiceBooking) => {
    Alert.alert(
      "Cancel Booking",
      `Cancel your appointment with ${booking.provider_name ?? "this provider"} on ${booking.scheduled_date}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: () =>
            cancelBooking.mutate(
              { bookingId: booking.id },
              {
                onError: (err: any) =>
                  Alert.alert("Error", err.response?.data?.detail || "Failed to cancel"),
              }
            ),
        },
      ]
    );
  };

  const handleReschedule = () => {
    if (!rescheduleTarget) return;
    rescheduleBooking.mutate(
      {
        bookingId: rescheduleTarget.id,
        scheduled_date: rescheduleDate,
        time_slot: rescheduleSlot,
        reason: rescheduleReason.trim() || undefined,
      },
      {
        onSuccess: () => {
          setRescheduleTarget(null);
          setRescheduleDate("");
          setRescheduleReason("");
          Alert.alert("Done", "Booking rescheduled.");
        },
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to reschedule"),
      }
    );
  };

  const openReschedule = (booking: ServiceBooking) => {
    setRescheduleTarget(booking);
    setRescheduleDate(booking.scheduled_date);
    setRescheduleSlot(booking.time_slot);
    setRescheduleReason("");
  };

  return (
    <>
      <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-xl font-bold text-slate-900 mb-4">My Bookings</Text>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : !bookings || bookings.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No bookings yet"
            message="Book a service provider to get started"
          />
        ) : (
          bookings.map((b) => (
            <Card key={b.id} className="mb-3">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <Text className="font-bold text-slate-900" numberOfLines={1}>
                    {b.provider_name ?? "Provider"}
                  </Text>
                  <Text className="text-slate-500 text-sm mt-0.5">
                    {b.scheduled_date} at {b.time_slot}
                  </Text>
                  {b.notes && (
                    <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                      {b.notes}
                    </Text>
                  )}
                </View>
                <View
                  className="px-2.5 py-1 rounded-full ml-3"
                  style={{ backgroundColor: `${STATUS_COLORS[b.status]}20` }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: STATUS_COLORS[b.status] }}
                  >
                    {STATUS_LABELS[b.status] ?? b.status}
                  </Text>
                </View>
              </View>

              {b.status === "rescheduled" && b.rescheduled_date && (
                <View className="bg-blue-50 rounded-xl p-2 mb-2">
                  <Text className="text-blue-600 text-xs">
                    Rescheduled from {b.rescheduled_date} {b.rescheduled_time_slot}
                    {b.reschedule_reason ? ` — ${b.reschedule_reason}` : ""}
                  </Text>
                </View>
              )}

              {b.status === "cancelled" && b.cancel_reason && (
                <Text className="text-red-400 text-xs mb-2">Reason: {b.cancel_reason}</Text>
              )}

              {/* Actions for active bookings */}
              {["pending", "confirmed", "rescheduled"].includes(b.status) && (
                <View className="flex-row gap-2 mt-1 pt-2 border-t border-slate-100">
                  <TouchableOpacity
                    onPress={() => openReschedule(b)}
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100"
                  >
                    <Feather name="clock" size={14} color="#0ea5e9" />
                    <Text className="text-primary-600 text-sm font-semibold">Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleCancel(b)}
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50"
                  >
                    <Feather name="x-circle" size={14} color="#ef4444" />
                    <Text className="text-red-500 text-sm font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* UH-802: Reschedule modal */}
      <Modal visible={!!rescheduleTarget} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900">Reschedule Booking</Text>
              <TouchableOpacity onPress={() => setRescheduleTarget(null)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-slate-700 mb-1">New Date (YYYY-MM-DD)</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900"
              placeholder="2026-05-20"
              placeholderTextColor="#94a3b8"
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
              keyboardType="numbers-and-punctuation"
            />

            <Text className="text-sm font-semibold text-slate-700 mb-2">New Time Slot</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setRescheduleSlot(slot)}
                  className={`px-3 py-2 rounded-xl border ${
                    rescheduleSlot === slot
                      ? "bg-primary-500 border-primary-500"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${rescheduleSlot === slot ? "text-white" : "text-slate-600"}`}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-semibold text-slate-700 mb-1">Reason (optional)</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-5 text-slate-900"
              placeholder="Why are you rescheduling?"
              placeholderTextColor="#94a3b8"
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
            />

            <TouchableOpacity
              onPress={handleReschedule}
              disabled={rescheduleBooking.isPending || !rescheduleDate}
              className={`rounded-xl py-4 items-center ${rescheduleDate ? "bg-primary-500" : "bg-slate-200"}`}
            >
              <Text className={`font-bold text-base ${rescheduleDate ? "text-white" : "text-slate-400"}`}>
                {rescheduleBooking.isPending ? "Rescheduling..." : "Confirm Reschedule"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
