import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui/Card";
import api from "@/services/api";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [pendingRating, setPendingRating] = useState(0);

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

  const handleReview = () => {
    if (pendingRating === 0) {
      Alert.alert("Select Rating", "Tap a star to rate this provider");
      return;
    }
    submitReview.mutate(pendingRating);
  };

  if (isLoading || !provider) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
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
  );
}
