import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

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
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const roomTypeLabels: Record<string, string> = {
    private_room: "Private",
    shared_room: "Shared",
    entire_place: "Entire",
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-4">
      <TouchableOpacity
        className="bg-white rounded-3xl overflow-hidden"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 6,
        }}
        onPress={() => router.push(`/listing/${listing.id}`)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image with gradient overlay */}
        <View className="h-52 bg-slate-200">
          {listing.images.length > 0 ? (
            <Image
              source={{ uri: listing.images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-100">
              <Feather name="home" size={40} color="#94a3b8" />
            </View>
          )}

          {/* Bottom gradient overlay */}
          <View className="absolute bottom-0 left-0 right-0 h-28">
            <Svg
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              preserveAspectRatio="none"
              width="100%"
              height="100%"
            >
              <Defs>
                <LinearGradient id="imgGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="0.7" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#imgGrad)" />
            </Svg>

            {/* Price + title on image */}
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-3">
              <Text className="text-white text-xl font-bold">
                {formatCurrency(listing.rent_monthly)}
                <Text className="text-sm font-normal opacity-80">/mo</Text>
              </Text>
              <Text className="text-white/80 text-sm" numberOfLines={1}>
                {listing.title}
              </Text>
            </View>
          </View>

          {/* Top badges */}
          <View className="absolute top-3 left-3 right-3 flex-row justify-between items-start">
            <View className="flex-row gap-2">
              {listing.is_verified && (
                <View className="bg-primary-500 rounded-full px-2.5 py-1 flex-row items-center gap-1">
                  <Feather name="check-circle" size={11} color="#fff" />
                  <Text className="text-white text-xs font-semibold">Verified</Text>
                </View>
              )}
              <View className="bg-black/30 backdrop-blur rounded-full px-2.5 py-1">
                <Text className="text-white text-xs font-medium">
                  {roomTypeLabels[listing.room_type] || listing.room_type}
                </Text>
              </View>
            </View>
            {compatibility !== undefined && (
              <View className="bg-emerald-500 rounded-full px-2.5 py-1">
                <Text className="text-white text-xs font-bold">
                  {Math.round(compatibility)}% Match
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Info row */}
        <View className="px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="flex-row items-center gap-1">
              <Feather name="map-pin" size={13} color="#64748b" />
              <Text className="text-slate-500 text-sm">
                {listing.city}, {listing.state}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Feather name="grid" size={13} color="#64748b" />
              <Text className="text-slate-500 text-sm">
                {listing.total_bedrooms}bd · {listing.total_bathrooms}ba
              </Text>
            </View>
          </View>

          {hostTrustScore !== undefined && (
            <TrustBadge score={hostTrustScore} size="sm" showLabel={false} />
          )}
        </View>

        {listing.nearest_transit && (
          <View className="px-4 pb-3 flex-row items-center gap-1">
            <Feather name="navigation" size={12} color="#94a3b8" />
            <Text className="text-slate-400 text-xs">
              {listing.nearest_transit}
              {listing.transit_walk_mins && ` · ${listing.transit_walk_mins} min walk`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
