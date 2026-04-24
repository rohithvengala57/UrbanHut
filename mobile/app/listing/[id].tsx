import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useExpressInterest, useListing, useMyInterests } from "@/hooks/useListings";
import { useSavedListings, useToggleSave } from "@/hooks/useSaved";
import { formatCurrency } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { data: listing, isLoading } = useListing(id);
  const { data: myInterests } = useMyInterests();
  const expressInterest = useExpressInterest();
  const user = useAuthStore((s) => s.user);
  const { data: savedListings } = useSavedListings();
  const toggleSave = useToggleSave();

  // UH-203: Roommate Summary
  const { data: roommateSummary } = useQuery({
    queryKey: ["roommate-summary", id],
    queryFn: async () => {
      const res = await api.get(`/listings/roommate-summary/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const isHost = listing && user && listing.host_id === user.id;
  const alreadyInterested = myInterests?.some((i) => i.to_listing_id === id);
  const isSaved = savedListings?.some((s) => s.listing_id === id);

  const handleToggleSave = () => {
    toggleSave.mutate(
      { listingId: id, isSaved: !!isSaved },
      {
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to update saved status"),
      }
    );
  };

  const handleInterest = () => {
    if (alreadyInterested) return;
    expressInterest.mutate(
      { to_listing_id: id },
      {
        onSuccess: () => Alert.alert("Interest Sent!", "The host will be notified of your interest."),
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to send interest"),
      }
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-slate-500">Listing not found</Text>
      </View>
    );
  }

  const roomTypeLabels: Record<string, string> = {
    private_room: "Private Room",
    shared_room: "Shared Room",
    entire_place: "Entire Place",
  };

  const locationLabel = `${listing.city}, ${listing.state} ${listing.zip_code}`;
  const occupancyLabel = `${listing.current_occupants}/${listing.available_spots + listing.current_occupants}`;

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Host Banner */}
        {isHost && (
          <View className="bg-primary-50 px-4 py-2.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Feather name="info" size={14} color="#0ea5e9" />
              <Text className="text-primary-700 text-sm font-medium">You own this listing</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/listing/manage/${id}` as any)}
              className="bg-primary-500 rounded-full px-3 py-1"
            >
              <Text className="text-white text-xs font-semibold">Manage</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Save button row (seekers only) */}
        {!isHost && (
          <View className="px-4 pt-3 pb-1 flex-row justify-end">
            <TouchableOpacity
              onPress={handleToggleSave}
              className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border ${
                isSaved ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"
              }`}
            >
              <Feather
                name={isSaved ? "bookmark" : "bookmark"}
                size={14}
                color={isSaved ? "#f59e0b" : "#94a3b8"}
              />
              <Text
                className={`text-xs font-semibold ${
                  isSaved ? "text-amber-600" : "text-slate-400"
                }`}
              >
                {isSaved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Image Carousel */}
        <View className="h-64 bg-slate-200">
          {listing.images && listing.images.length > 0 ? (
            <FlatList
              data={listing.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={{ width, height: 256 }} resizeMode="cover" />
              )}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Feather name="image" size={48} color="#94a3b8" />
            </View>
          )}
        </View>

        <View className="p-4">
          {/* Price & Type */}
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-3xl font-bold text-slate-900">
                {formatCurrency(listing.rent_monthly)}
                <Text className="text-lg font-normal text-slate-500">/mo</Text>
              </Text>
              {listing.security_deposit && (
                <Text className="text-sm text-slate-500">
                  {formatCurrency(listing.security_deposit)} deposit
                </Text>
              )}
            </View>
            <Badge label={roomTypeLabels[listing.room_type] || listing.room_type} size="md" />
          </View>

          <Text className="text-xl font-bold text-slate-900 mb-1">{listing.title}</Text>
          <View className="flex-row items-center gap-1 mb-4">
            <Feather name="map-pin" size={14} color="#64748b" />
            <Text className="text-slate-500">{locationLabel}</Text>
          </View>

          {/* Quick Stats */}
          <View className="flex-row gap-4 mb-4">
            <View className="bg-slate-50 rounded-xl px-4 py-3 flex-1 items-center">
              <Feather name="grid" size={18} color="#0ea5e9" />
              <Text className="text-sm font-bold text-slate-900 mt-1">{listing.total_bedrooms}</Text>
              <Text className="text-xs text-slate-500">Bedrooms</Text>
            </View>
            <View className="bg-slate-50 rounded-xl px-4 py-3 flex-1 items-center">
              <Feather name="droplet" size={18} color="#0ea5e9" />
              <Text className="text-sm font-bold text-slate-900 mt-1">{listing.total_bathrooms}</Text>
              <Text className="text-xs text-slate-500">Bathrooms</Text>
            </View>
            <View className="bg-slate-50 rounded-xl px-4 py-3 flex-1 items-center">
              <Feather name="users" size={18} color="#0ea5e9" />
              <Text className="text-sm font-bold text-slate-900 mt-1">{occupancyLabel}</Text>
              <Text className="text-xs text-slate-500">Occupants</Text>
            </View>
          </View>

          {/* Description */}
          <Card className="mb-4">
            <Text className="font-bold text-slate-900 mb-2">About</Text>
            <Text className="text-slate-600 leading-5">{listing.description}</Text>
          </Card>

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-2">Amenities</Text>
              <View className="flex-row flex-wrap gap-2">
                {listing.amenities.map((a: string) => (
                  <View key={a} className="bg-primary-50 rounded-full px-3 py-1.5">
                    <Text className="text-primary-700 text-sm">{a.replace(/_/g, " ")}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* House Rules */}
          {listing.house_rules && listing.house_rules.length > 0 && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-2">House Rules</Text>
              {listing.house_rules.map((rule: string) => (
                <View key={rule} className="flex-row items-center gap-2 mb-1.5">
                  <Feather name="alert-circle" size={14} color="#f59e0b" />
                  <Text className="text-slate-600 text-sm">{rule.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Transit */}
          {listing.nearest_transit && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-2">Transit</Text>
              <View className="flex-row items-center gap-2">
                <Feather name="navigation" size={16} color="#0ea5e9" />
                <Text className="text-slate-600">
                  {listing.nearest_transit}
                  {listing.transit_walk_mins && ` - ${listing.transit_walk_mins} min walk`}
                </Text>
              </View>
            </Card>
          )}

          {/* UH-203: Roommate Summary */}
          {roommateSummary && (roommateSummary.household_size > 0 || roommateSummary.occupants?.length > 0) && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-3">Current Roommates</Text>
              <View className="flex-row gap-3 mb-3">
                <View className="bg-slate-50 rounded-xl px-3 py-2.5 flex-1 items-center">
                  <Text className="text-sm font-bold text-slate-900">{roommateSummary.household_size}</Text>
                  <Text className="text-xs text-slate-500">Current</Text>
                </View>
                <View className="bg-slate-50 rounded-xl px-3 py-2.5 flex-1 items-center">
                  <Text className="text-sm font-bold text-slate-900">{roommateSummary.available_spots}</Text>
                  <Text className="text-xs text-slate-500">Open Spots</Text>
                </View>
                {roommateSummary.avg_trust_score > 0 && (
                  <View className="bg-slate-50 rounded-xl px-3 py-2.5 flex-1 items-center">
                    <Text className="text-sm font-bold text-primary-600">{Math.round(roommateSummary.avg_trust_score)}</Text>
                    <Text className="text-xs text-slate-500">Avg Trust</Text>
                  </View>
                )}
              </View>
              {roommateSummary.occupants?.map((occ: any, idx: number) => {
                const occupantLabel = String(occ.label || String.fromCharCode(65 + idx));
                const occupantTitle = `Roommate ${occupantLabel}`;
                const lifestyleSummary =
                  occ.lifestyle_tags?.length > 0 ? occ.lifestyle_tags.slice(0, 3).join(" · ") : null;
                const tenureSummary =
                  occ.tenure_months ? `${occ.tenure_months}mo tenure` : null;

                return (
                  <View
                    key={`${occupantLabel}-${idx}`}
                    className={`flex-row items-center justify-between py-2.5 ${idx > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center">
                        <Text className="text-xs font-bold text-primary-600">{occupantLabel}</Text>
                      </View>
                      <View>
                        <Text className="text-sm font-medium text-slate-800">{occupantTitle}</Text>
                        {lifestyleSummary && (
                          <Text className="text-xs text-slate-400">{lifestyleSummary}</Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end">
                      <View className="bg-primary-50 rounded-full px-2 py-0.5">
                        <Text className="text-xs text-primary-600 font-medium">{occ.trust_band}</Text>
                      </View>
                      {tenureSummary && (
                        <Text className="text-xs text-slate-400 mt-0.5">{tenureSummary}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          {/* Utilities */}
          <Card className="mb-6">
            <Text className="font-bold text-slate-900 mb-2">Utilities</Text>
            <Text className="text-slate-600">
              {listing.utilities_included
                ? "Included in rent"
                : listing.utility_estimate
                  ? `Estimated ${formatCurrency(listing.utility_estimate)}/mo`
                  : "Not included (estimate unavailable)"}
            </Text>
          </Card>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-4 py-4 bg-white border-t border-slate-100">
        {isHost ? (
          <Button
            title="Manage Listing"
            onPress={() => router.push(`/listing/manage/${id}` as any)}
            size="lg"
            icon={<Feather name="settings" size={18} color="#fff" />}
          />
        ) : (
          <Button
            title={alreadyInterested ? "Interest Sent" : "I'm Interested"}
            onPress={handleInterest}
            size="lg"
            loading={expressInterest.isPending}
            disabled={alreadyInterested}
            variant={alreadyInterested ? "outline" : "primary"}
          />
        )}
      </View>
    </View>
  );
}
