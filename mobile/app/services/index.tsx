import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import api from "@/services/api";

const CATEGORIES = ["All", "plumber", "electrician", "cleaner", "handyman", "mover", "painter"];

export default function ServicesScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: providers, isLoading } = useQuery({
    queryKey: ["services", search, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("city", search);
      if (category !== "All") params.append("category", category);
      const res = await api.get(`/services/providers?${params.toString()}`);
      return res.data as Array<{
        id: string;
        name: string;
        category: string;
        phone: string;
        city: string;
        state: string;
        rating: number;
        review_count: number;
        verified: boolean;
      }>;
    },
  });

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Search */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-slate-100">
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5 mb-3">
          <Feather name="search" size={18} color="#64748b" />
          <TextInput
            className="flex-1 ml-2 text-base text-slate-900"
            placeholder="Search by city..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setCategory(item)}
              className={`mr-2 px-4 py-1.5 rounded-full border ${
                category === item
                  ? "bg-primary-500 border-primary-500"
                  : "border-slate-200 bg-white"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  category === item ? "text-white" : "text-slate-600"
                }`}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={providers || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/services/${item.id}` as any)}>
              <Card className="mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="font-bold text-slate-900 text-base">{item.name}</Text>
                      {item.verified && (
                        <Feather name="check-circle" size={14} color="#0ea5e9" />
                      )}
                    </View>
                    <Badge label={item.category} />
                    <Text className="text-slate-500 text-sm mt-1.5">
                      {item.city}, {item.state}
                    </Text>
                    {item.phone && (
                      <Text className="text-slate-500 text-sm">{item.phone}</Text>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="text-amber-500 text-base">
                      {renderStars(item.rating)}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      {item.review_count} review{item.review_count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Feather name="tool" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base">No providers found</Text>
              <Text className="text-slate-400 text-sm">Try searching a different city</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
