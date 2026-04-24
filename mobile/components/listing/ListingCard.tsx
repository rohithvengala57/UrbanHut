import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { formatCurrency } from "@/lib/format";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    rent_monthly: number;
    room_type: string;
    images: string[];
    total_bedrooms: number;
    total_bathrooms: number;
    nearest_transit?: string;
    transit_walk_mins?: number;
    is_verified: boolean;
  };
  hostTrustScore?: number;
  compatibility?: number;
}

export function ListingCard({ listing, hostTrustScore, compatibility }: ListingCardProps) {
  const roomTypeLabels: Record<string, string> = {
    private_room: "Private Room",
    shared_room: "Shared Room",
    entire_place: "Entire Place",
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 mb-3"
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View className="h-48 bg-slate-200">
        {listing.images.length > 0 ? (
          <Image source={{ uri: listing.images[0] }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Feather name="home" size={40} color="#94a3b8" />
          </View>
        )}
        {listing.is_verified && (
          <View className="absolute top-3 left-3 bg-primary-500 rounded-full px-2 py-1 flex-row items-center gap-1">
            <Feather name="check-circle" size={12} color="#fff" />
            <Text className="text-white text-xs font-medium">Verified</Text>
          </View>
        )}
        {compatibility !== undefined && (
          <View className="absolute top-3 right-3 bg-white/90 rounded-full px-2.5 py-1">
            <Text className="text-primary-600 text-xs font-bold">{Math.round(compatibility)}% Match</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="p-3">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-lg font-bold text-slate-900 flex-1" numberOfLines={1}>
            {formatCurrency(listing.rent_monthly)}
            <Text className="text-sm font-normal text-slate-500">/mo</Text>
          </Text>
          <View className="bg-slate-100 rounded-full px-2 py-0.5">
            <Text className="text-xs text-slate-600">{roomTypeLabels[listing.room_type] || listing.room_type}</Text>
          </View>
        </View>

        <Text className="text-slate-600 text-sm mb-2" numberOfLines={1}>
          {listing.title}
        </Text>

        <View className="flex-row items-center gap-3 mb-2">
          <View className="flex-row items-center gap-1">
            <Feather name="map-pin" size={12} color="#64748b" />
            <Text className="text-xs text-slate-500">
              {listing.city}, {listing.state}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Feather name="grid" size={12} color="#64748b" />
            <Text className="text-xs text-slate-500">
              {listing.total_bedrooms}bd / {listing.total_bathrooms}ba
            </Text>
          </View>
        </View>

        {listing.nearest_transit && (
          <View className="flex-row items-center gap-1">
            <Feather name="navigation" size={12} color="#64748b" />
            <Text className="text-xs text-slate-500">
              {listing.nearest_transit}
              {listing.transit_walk_mins && ` · ${listing.transit_walk_mins} min walk`}
            </Text>
          </View>
        )}

        {hostTrustScore !== undefined && (
          <View className="mt-2 pt-2 border-t border-slate-100">
            <TrustBadge score={hostTrustScore} size="sm" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
