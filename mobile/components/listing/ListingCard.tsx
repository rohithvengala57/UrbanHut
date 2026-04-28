import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { formatCurrency } from "@/lib/format";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    zip_code?: string;
    rent_monthly: number;
    security_deposit?: number;
    room_type: string;
    images: string[];
    total_bedrooms: number;
    total_bathrooms: number;
    available_spots: number;
    current_occupants: number;
    is_verified: boolean;
  };
  hostTrustScore?: number;
  compatibility?: number;
}

export function ListingCard({ listing, hostTrustScore, compatibility }: ListingCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const roomTypeLabels: Record<string, string> = {
    private_room: "Private Room",
    shared_room: "Shared Room",
    entire_place: "Entire Place",
  };

  const occupancyLabel = `${listing.current_occupants}/${listing.available_spots + listing.current_occupants} occupants`;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-6">
      <TouchableOpacity
        className="bg-white rounded-[32px] overflow-hidden border border-slate-100"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 8,
        }}
        onPress={() => router.push(`/listing/${listing.id}`)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image Section */}
        <View className="h-64 bg-slate-200">
          {listing.images.length > 0 ? (
            <Image
              source={{ uri: listing.images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-100">
              <Feather name="home" size={48} color="#94a3b8" />
            </View>
          )}

          {/* Top badges */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between items-center">
            {listing.is_verified ? (
              <View className="bg-[#047857] rounded-full px-3 py-1.5 flex-row items-center gap-1.5 shadow-sm">
                <Feather name="check-circle" size={12} color="#fff" />
                <Text className="text-white text-[11px] font-bold uppercase tracking-wider">Verified</Text>
              </View>
            ) : (
              <View />
            )}
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Feather name="heart" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Carousel Dots */}
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                className={`h-2 w-2 rounded-full ${i === 0 ? "bg-white w-4" : "bg-white/60"}`}
              />
            ))}
          </View>
        </View>

        {/* Info Section */}
        <View className="p-5">
          {/* Price & Room Type Row */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-2xl font-extrabold text-[#10b981]">
                {formatCurrency(listing.rent_monthly)}
              </Text>
              <Text className="text-slate-500 font-medium text-sm">/mo</Text>
            </View>
            <View className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <Text className="text-emerald-700 text-[11px] font-bold uppercase">
                {roomTypeLabels[listing.room_type] || listing.room_type}
              </Text>
            </View>
          </View>

          {/* Deposit Row */}
          {listing.security_deposit && (
            <Text className="text-slate-400 text-xs font-medium mb-2">
              {formatCurrency(listing.security_deposit)} deposit
            </Text>
          )}

          {/* Title */}
          <Text className="text-lg font-bold text-slate-900 mb-2" numberOfLines={1}>
            {listing.title}
          </Text>

          {/* Location */}
          <View className="flex-row items-center gap-1.5 mb-3">
            <Feather name="map-pin" size={14} color="#64748b" />
            <Text className="text-slate-500 text-sm font-medium">
              {listing.city}, {listing.state} {listing.zip_code || ""}
            </Text>
          </View>

          {/* Stats Row */}
          <View className="flex-row items-center gap-4 mb-5 pb-5 border-b border-slate-50">
            <View className="flex-row items-center gap-1.5">
              <Feather name="grid" size={14} color="#64748b" />
              <Text className="text-slate-500 text-sm font-medium">{listing.total_bedrooms}bd</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Feather name="droplet" size={14} color="#64748b" />
              <Text className="text-slate-500 text-sm font-medium">{listing.total_bathrooms}ba</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Feather name="users" size={14} color="#64748b" />
              <Text className="text-slate-500 text-sm font-medium">{occupancyLabel}</Text>
            </View>
          </View>

          {/* Match & Trust Row */}
          <View className="flex-row items-center">
            <View className="flex-row items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-100">
              <Feather name="zap" size={14} color="#10b981" />
              <Text className="text-emerald-700 text-xs font-bold">
                {compatibility || 76}% Match
              </Text>
            </View>
            <View className="mx-3 h-4 w-[1px] bg-slate-200" />
            <View className="flex-row items-center gap-2">
              <Feather name="shield" size={14} color="#10b981" />
              <Text className="text-slate-600 text-xs font-semibold">
                <Text className="text-[#10b981] font-bold">{hostTrustScore || 4.6}</Text> Avg Trust
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
