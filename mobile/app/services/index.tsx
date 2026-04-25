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
  useWindowDimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";

const CATEGORIES = ["All", "plumber", "electrician", "cleaner", "handyman", "mover", "painter"];

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  All: "grid",
  plumber: "droplets" as any,
  electrician: "zap",
  cleaner: "wind",
  handyman: "tool",
  mover: "truck",
  painter: "edit-3",
};

const CATEGORY_COLORS: Record<string, string> = {
  plumber: "#0ea5e9",
  electrician: "#f59e0b",
  cleaner: "#22c55e",
  handyman: "#8b5cf6",
  mover: "#ec4899",
  painter: "#ef4444",
};

type Provider = {
  id: string;
  name: string;
  category: string;
  phone: string;
  city: string;
  state: string;
  rating: number;
  review_count: number;
  verified: boolean;
};

function renderStars(rating: number) {
  const full = Math.floor(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function ServicesScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const { width } = useWindowDimensions();
  const cardWidth = (width - 48) / 2; // 2-col grid with padding

  const { data: providers, isLoading } = useQuery({
    queryKey: ["services", search, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("city", search);
      if (category !== "All") params.append("category", category);
      const res = await api.get(`/services/providers?${params.toString()}`);
      return res.data as Provider[];
    },
  });

  return (
    <View className="flex-1 bg-slate-50">
      {/* Search + filters */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center bg-slate-100 rounded-2xl px-3 py-3 mb-3">
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

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = category === item;
            const color = CATEGORY_COLORS[item] || "#0ea5e9";
            const icon = CATEGORY_ICONS[item] || "tool";
            return (
              <TouchableOpacity
                onPress={() => setCategory(item)}
                className={`mr-2 flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${
                  isActive ? "border-transparent" : "border-slate-200 bg-white"
                }`}
                style={isActive ? { backgroundColor: color } : {}}
                activeOpacity={0.85}
              >
                <Feather name={icon} size={13} color={isActive ? "#fff" : "#64748b"} />
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? "text-white" : "text-slate-600"
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
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
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const color = CATEGORY_COLORS[item.category] || "#64748b";
            return (
              <TouchableOpacity
                onPress={() => router.push(`/services/${item.id}` as any)}
                style={{
                  width: cardWidth,
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                activeOpacity={0.85}
              >
                {/* Category icon */}
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
                  style={{ backgroundColor: `${color}18` }}
                >
                  <Feather
                    name={CATEGORY_ICONS[item.category] || "tool"}
                    size={22}
                    color={color}
                  />
                </View>

                {/* Name + verified */}
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Text className="font-bold text-slate-900 text-sm flex-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.verified && (
                    <Feather name="check-circle" size={13} color="#0ea5e9" />
                  )}
                </View>

                {/* Category badge */}
                <View
                  className="self-start rounded-full px-2 py-0.5 mb-2"
                  style={{ backgroundColor: `${color}18` }}
                >
                  <Text className="text-xs font-semibold capitalize" style={{ color }}>
                    {item.category}
                  </Text>
                </View>

                {/* Location */}
                <View className="flex-row items-center gap-1 mb-2">
                  <Feather name="map-pin" size={11} color="#94a3b8" />
                  <Text className="text-xs text-slate-500" numberOfLines={1}>
                    {item.city}
                  </Text>
                </View>

                {/* Rating */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-amber-400 text-sm">{renderStars(item.rating)}</Text>
                  <Text className="text-slate-400 text-xs">{item.review_count}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
