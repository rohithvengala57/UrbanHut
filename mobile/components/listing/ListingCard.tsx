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
  compact?: boolean;
}

export function ListingCard({ listing, hostTrustScore, compatibility, compact = false }: ListingCardProps) {
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
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className={compact ? "mb-3" : "mb-6"}>
      <TouchableOpacity
        className={`${compact ? "rounded-3xl" : "rounded-[32px]"} bg-white overflow-hidden border border-slate-100`}
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: compact ? 5 : 8 },
          shadowOpacity: compact ? 0.06 : 0.08,
          shadowRadius: compact ? 16 : 24,
          elevation: compact ? 5 : 8,
        }}
        onPress={() => router.push(`/listing/${listing.id}`)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image Section */}
        <View className={`${compact ? "h-32" : "h-64"} bg-slate-200`}>
          {listing.images.length > 0 ? (
            <Image
              source={{ uri: listing.images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-100">
              <Feather name="home" size={compact ? 30 : 48} color="#94a3b8" />
            </View>
          )}

          {/* Top badges */}
          <View className={`absolute ${compact ? "top-3 left-3 right-3" : "top-4 left-4 right-4"} flex-row justify-between items-center`}>
            {listing.is_verified ? (
              <View className={`${compact ? "px-2.5 py-1" : "px-3 py-1.5"} bg-[#047857] rounded-full flex-row items-center gap-1.5 shadow-sm`}>
                <Feather name="check-circle" size={12} color="#fff" />
                <Text className="text-white text-[11px] font-bold uppercase tracking-wider">Verified</Text>
              </View>
            ) : (
              <View />
            )}
            <TouchableOpacity className={`${compact ? "w-7 h-7" : "w-10 h-10"} items-center justify-center`}>
              <Feather name="heart" size={compact ? 19 : 24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Carousel Dots */}
          <View className={`absolute ${compact ? "bottom-3" : "bottom-4"} left-0 right-0 flex-row justify-center gap-1.5`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                className={`${compact ? "h-1.5 w-1.5" : "h-2 w-2"} rounded-full ${i === 0 ? compact ? "bg-white w-3" : "bg-white w-4" : "bg-white/60"}`}
              />
            ))}
          </View>
        </View>

        {/* Info Section */}
        <View className={compact ? "p-3.5" : "p-5"}>
          {/* Price & Room Type Row */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-baseline gap-1.5">
              <Text className={`${compact ? "text-lg" : "text-2xl"} font-extrabold text-[#10b981]`}>
                {formatCurrency(listing.rent_monthly)}
              </Text>
              <Text className={`${compact ? "text-xs" : "text-sm"} text-slate-500 font-medium`}>/mo</Text>
            </View>
            <View className={`${compact ? "px-2.5 py-1" : "px-3 py-1"} bg-emerald-50 rounded-full border border-emerald-100`}>
              <Text className="text-emerald-700 text-[11px] font-bold uppercase">
                {roomTypeLabels[listing.room_type] || listing.room_type}
              </Text>
            </View>
          </View>

          {/* Deposit Row */}
          {listing.security_deposit && (
              <Text className={`text-slate-400 text-xs font-medium ${compact ? "mb-0.5" : "mb-2"}`}>
              {formatCurrency(listing.security_deposit)} deposit
            </Text>
          )}

          {/* Title */}
          <Text className={`${compact ? "text-[15px] mb-1" : "text-lg mb-2"} font-bold text-slate-900`} numberOfLines={1}>
            {listing.title}
          </Text>

          {/* Location */}
          <View className={`flex-row items-center gap-1.5 ${compact ? "mb-1.5" : "mb-3"}`}>
            <Feather name="map-pin" size={compact ? 12 : 14} color="#64748b" />
            <Text className={`${compact ? "text-xs" : "text-sm"} text-slate-500 font-medium`} numberOfLines={1}>
              {listing.city}, {listing.state} {listing.zip_code || ""}
            </Text>
          </View>

          {/* Stats Row */}
          <View className={`flex-row items-center gap-3 ${compact ? "mb-2.5 pb-2.5" : "mb-5 pb-5"} border-b border-slate-50`}>
            <View className="flex-row items-center gap-1.5">
              <Feather name="grid" size={compact ? 13 : 14} color="#64748b" />
              <Text className={`${compact ? "text-xs" : "text-sm"} text-slate-500 font-medium`}>{listing.total_bedrooms}bd</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Feather name="droplet" size={compact ? 13 : 14} color="#64748b" />
              <Text className={`${compact ? "text-xs" : "text-sm"} text-slate-500 font-medium`}>{listing.total_bathrooms}ba</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Feather name="users" size={compact ? 13 : 14} color="#64748b" />
              <Text className={`${compact ? "text-xs" : "text-sm"} text-slate-500 font-medium`}>{occupancyLabel}</Text>
            </View>
          </View>

          {/* Match & Trust Row */}
          <View className="flex-row items-center">
            <View className={`${compact ? "px-2.5 py-1" : "px-3 py-1.5"} flex-row items-center gap-2 bg-emerald-50 rounded-2xl border border-emerald-100`}>
              <Feather name="zap" size={compact ? 12 : 14} color="#10b981" />
              <Text className="text-emerald-700 text-xs font-bold">
                {compatibility || 76}% Match
              </Text>
            </View>
            <View className={`${compact ? "mx-2" : "mx-3"} h-4 w-[1px] bg-slate-200`} />
            <View className="flex-row items-center gap-2">
              <Feather name="shield" size={compact ? 12 : 14} color="#10b981" />
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
