import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import type { MyListing } from "@/hooks/useHostListings";
import { formatCurrency } from "@/lib/format";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#22c55e", bg: "#f0fdf4" },
  paused: { label: "Paused", color: "#f59e0b", bg: "#fffbeb" },
  draft: { label: "Draft", color: "#64748b", bg: "#f1f5f9" },
  closed: { label: "Closed", color: "#ef4444", bg: "#fef2f2" },
};

interface MyListingCardProps {
  listing: MyListing;
}

export function MyListingCard({ listing }: MyListingCardProps) {
  const statusCfg = STATUS_CONFIG[listing.status] || STATUS_CONFIG.draft;

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 mb-3"
      onPress={() => router.push(`/listing/manage/${listing.id}` as any)}
      activeOpacity={0.7}
    >
      <View className="flex-row">
        {/* Thumbnail */}
        <View className="w-28 h-32 bg-slate-200">
          {listing.images && listing.images.length > 0 ? (
            <Image
              source={{ uri: listing.images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Feather name="home" size={24} color="#94a3b8" />
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1 p-3">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-base font-bold text-slate-900 flex-1 mr-2" numberOfLines={1}>
              {listing.title}
            </Text>
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: statusCfg.bg }}>
              <Text className="text-xs font-semibold" style={{ color: statusCfg.color }}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-slate-500 mb-1.5">
            {formatCurrency(listing.rent_monthly)}/mo · {listing.city}
          </Text>

          {/* Stat Row */}
          <View className="flex-row items-center gap-4 mt-auto">
            <View className="flex-row items-center gap-1">
              <Feather name="eye" size={12} color="#64748b" />
              <Text className="text-xs text-slate-500">{listing.view_count}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Feather name="heart" size={12} color="#ec4899" />
              <Text className="text-xs text-slate-500">{listing.interest_count}</Text>
            </View>
            {listing.new_interest_count > 0 && (
              <View className="bg-primary-500 rounded-full px-1.5 py-0.5">
                <Text className="text-xs text-white font-bold">
                  {listing.new_interest_count} new
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1">
              <Feather name="users" size={12} color="#64748b" />
              <Text className="text-xs text-slate-500">
                {listing.current_occupants}/{listing.available_spots + listing.current_occupants}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
