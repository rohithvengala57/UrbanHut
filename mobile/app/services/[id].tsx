import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui/Card";
import { useCreateBooking } from "@/hooks/useServices";
import api from "@/services/api";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [pendingRating, setPendingRating] = useState(0);

  // Booking modal state
  const [showBooking, setShowBooking] = useState(false);
  const [bookDate, setBookDate] = useState(tomorrow());
  const [bookSlot, setBookSlot] = useState("09:00");
  const [bookNotes, setBookNotes] = useState("");

  const { data: provider, isLoading } = useQuery({
    queryKey: ["service-provider", id],
    queryFn: async () => {
      const res = await api.get(`/services/providers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const submitReview = useMutation({
    mutationFn: async (rating: number) => {
      await api.post(`/services/providers/${id}/review?rating=${rating}`);
    },
    onSuccess: () => {
      setPendingRating(0);
      queryClient.invalidateQueries({ queryKey: ["service-provider", id] });
      Alert.alert("Thanks!", "Your review has been submitted.");
    },
    onError: (err: any) =>
      Alert.alert("Error", err.response?.data?.detail || "Failed to submit review"),
  });

  const createBooking = useCreateBooking();

  const handleReview = () => {
    if (pendingRating === 0) {
      Alert.alert("Select Rating", "Tap a star to rate this provider");
      return;
    }
    submitReview.mutate(pendingRating);
  };

  const handleBook = () => {
    if (!bookDate) {
      Alert.alert("Date required", "Please enter a date (YYYY-MM-DD)");
      return;
    }
    createBooking.mutate(
      {
        provider_id: id!,
        scheduled_date: bookDate,
        time_slot: bookSlot,
        notes: bookNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowBooking(false);
          setBookDate(tomorrow());
          setBookSlot("09:00");
          setBookNotes("");
          Alert.alert("Booked!", "Your booking request has been submitted.", [
            { text: "View Bookings", onPress: () => router.push("/services/bookings" as any) },
            { text: "OK" },
          ]);
        },
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to create booking"),
      }
    );
  };

  if (isLoading || !provider) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
        {/* Provider info */}
        <Card className="mb-4">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-xl font-bold text-slate-900">{provider.name}</Text>
                {provider.verified && <Feather name="check-circle" size={16} color="#0ea5e9" />}
              </View>
              <Text className="text-slate-500 capitalize">{provider.category}</Text>
              <Text className="text-slate-500 text-sm mt-1">
                {provider.city}, {provider.state}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold text-slate-900">
                {provider.rating.toFixed(1)}
              </Text>
              <Text className="text-amber-500 text-lg">
                {"★".repeat(Math.round(provider.rating))}
              </Text>
              <Text className="text-slate-400 text-xs">{provider.review_count} reviews</Text>
            </View>
          </View>

          {provider.phone && (
            <View className="flex-row items-center gap-2 pt-2 border-t border-slate-100">
              <Feather name="phone" size={14} color="#64748b" />
              <Text className="text-slate-600">{provider.phone}</Text>
            </View>
          )}
          {provider.email && (
            <View className="flex-row items-center gap-2 mt-1">
              <Feather name="mail" size={14} color="#64748b" />
              <Text className="text-slate-600">{provider.email}</Text>
            </View>
          )}
        </Card>

        {/* UH-801: Book this provider */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-bold text-slate-900">Book this Provider</Text>
            <TouchableOpacity onPress={() => router.push("/services/bookings" as any)}>
              <Text className="text-primary-500 text-sm font-semibold">My Bookings →</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-500 text-sm mb-3">
            Request an appointment with {provider.name}.
          </Text>
          <TouchableOpacity
            onPress={() => setShowBooking(true)}
            className="bg-primary-500 rounded-xl py-3 items-center flex-row justify-center gap-2"
          >
            <Feather name="calendar" size={16} color="#fff" />
            <Text className="text-white font-semibold">Book Appointment</Text>
          </TouchableOpacity>
        </Card>

        {/* Leave a Review */}
        <Card className="mb-4">
          <Text className="font-bold text-slate-900 mb-3">Leave a Review</Text>
          <View className="flex-row gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setPendingRating(n)}>
                <Text className={`text-3xl ${n <= pendingRating ? "text-amber-400" : "text-slate-200"}`}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={handleReview}
            disabled={submitReview.isPending || pendingRating === 0}
            className={`rounded-xl py-3 items-center ${
              pendingRating > 0 ? "bg-primary-500" : "bg-slate-200"
            }`}
          >
            <Text className={`font-semibold ${pendingRating > 0 ? "text-white" : "text-slate-400"}`}>
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Reviews */}
        {provider.reviews && provider.reviews.length > 0 && (
          <View>
            <Text className="font-bold text-slate-700 mb-2">Reviews</Text>
            {provider.reviews.map((r: any) => (
              <Card key={r.id} className="mb-2">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text>
                  <Text className="text-slate-400 text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {r.comment && <Text className="text-slate-600 text-sm">{r.comment}</Text>}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* UH-801: Booking modal */}
      <Modal visible={showBooking} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900">Book {provider.name}</Text>
              <TouchableOpacity onPress={() => setShowBooking(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Date */}
            <Text className="text-sm font-semibold text-slate-700 mb-1">Date (YYYY-MM-DD)</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900"
              placeholder="2026-05-15"
              placeholderTextColor="#94a3b8"
              value={bookDate}
              onChangeText={setBookDate}
              keyboardType="numbers-and-punctuation"
            />

            {/* Time slots */}
            <Text className="text-sm font-semibold text-slate-700 mb-2">Time Slot</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setBookSlot(slot)}
                  className={`px-3 py-2 rounded-xl border ${
                    bookSlot === slot
                      ? "bg-primary-500 border-primary-500"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${bookSlot === slot ? "text-white" : "text-slate-600"}`}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text className="text-sm font-semibold text-slate-700 mb-1">Notes (optional)</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-5 text-slate-900"
              placeholder="Any special instructions..."
              placeholderTextColor="#94a3b8"
              value={bookNotes}
              onChangeText={setBookNotes}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              onPress={handleBook}
              disabled={createBooking.isPending}
              className="bg-primary-500 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">
                {createBooking.isPending ? "Booking..." : "Confirm Booking"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
