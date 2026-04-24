import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useListing } from "@/hooks/useListings";
import {
  useSavedListings,
  useSavedSearches,
  useToggleSave,
  useUpdateSavedSearch,
  useDeleteSavedSearch,
  type SavedListingItem,
  type SavedSearchItem,
} from "@/hooks/useSaved";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { useUIStore } from "@/stores/uiStore";

// ─── Inline listing preview (fetches full data for a saved item) ────────────
function SavedListingRow({ item }: { item: SavedListingItem }) {
  const { data: listing, isLoading } = useListing(item.listing_id);
  const toggleSave = useToggleSave();
  const compareIds = useUIStore((s) => s.compareIds);
  const toggleCompare = useUIStore((s) => s.toggleCompare);

  const isComparing = compareIds.includes(item.listing_id);

  if (isLoading) {
    return (
      <Card className="mb-3 flex-row items-center justify-center py-6">
        <ActivityIndicator size="small" color="#0ea5e9" />
      </Card>
    );
  }

  if (!listing) {
    return (
      <Card className="mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-400 text-sm">Listing unavailable</Text>
          <TouchableOpacity
            onPress={() =>
              toggleSave.mutate({ listingId: item.listing_id, isSaved: true })
            }
          >
            <Feather name="trash-2" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <Card
      className="mb-3"
      onPress={() => router.push(`/listing/${item.listing_id}`)}
    >
      <View className="flex-row">
        {/* Thumbnail */}
        <View className="w-24 h-24 rounded-xl bg-slate-200 overflow-hidden mr-3">
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

        {/* Details */}
        <View className="flex-1 justify-between">
          <View>
            <Text
              className="text-base font-bold text-slate-900"
              numberOfLines={1}
            >
              {listing.title}
            </Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Feather name="map-pin" size={12} color="#64748b" />
              <Text className="text-xs text-slate-500">
                {listing.city}, {listing.state}
              </Text>
            </View>
            <Text className="text-primary-600 font-bold mt-1">
              {formatCurrency(listing.rent_monthly)}
              <Text className="text-xs font-normal text-slate-500">/mo</Text>
            </Text>
          </View>
        </View>

        {/* Actions column */}
        <View className="items-center justify-between ml-2">
          {/* Unsave */}
          <TouchableOpacity
            onPress={() =>
              toggleSave.mutate({ listingId: item.listing_id, isSaved: true })
            }
            className="p-1"
          >
            <Feather name="trash-2" size={18} color="#ef4444" />
          </TouchableOpacity>

          {/* Compare toggle */}
          <TouchableOpacity
            onPress={() => toggleCompare(item.listing_id)}
            className={`p-1.5 rounded-lg ${isComparing ? "bg-primary-100" : "bg-slate-100"}`}
          >
            <Feather
              name="columns"
              size={16}
              color={isComparing ? "#0ea5e9" : "#94a3b8"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

// ─── Filter summary helper ──────────────────────────────────────────────────
function filterSummary(filters: Record<string, unknown>): string {
  const parts: string[] = [];
  if (filters.city) parts.push(String(filters.city));
  if (filters.price_min || filters.price_max) {
    const min = filters.price_min ? `$${Number(filters.price_min) / 100}` : "";
    const max = filters.price_max ? `$${Number(filters.price_max) / 100}` : "";
    parts.push(min && max ? `${min}-${max}` : min || `up to ${max}`);
  }
  if (filters.room_type) parts.push(String(filters.room_type).replace(/_/g, " "));
  if (filters.min_trust) parts.push(`trust ${filters.min_trust}+`);
  return parts.length > 0 ? parts.join(" | ") : "All listings";
}

// ─── Saved Search Row ───────────────────────────────────────────────────────
function SavedSearchRow({ item }: { item: SavedSearchItem }) {
  const updateSearch = useUpdateSavedSearch();
  const deleteSearch = useDeleteSavedSearch();
  const setListingFilters = useUIStore((s) => s.setListingFilters);

  const handleApplySearch = () => {
    setListingFilters(item.filters as any);
    router.push("/(tabs)/home");
  };

  return (
    <Card className="mb-3" onPress={handleApplySearch}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-slate-900">
              {item.name}
            </Text>
            {item.new_matches > 0 && (
              <Badge label={`${item.new_matches} new`} color="#10b981" />
            )}
          </View>
          <Text className="text-xs text-slate-500 mt-1">
            {filterSummary(item.filters)}
          </Text>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => deleteSearch.mutate(item.id)}
          className="p-1"
        >
          <Feather name="trash-2" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Alerts toggle */}
      <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
        <View className="flex-row items-center gap-1.5">
          <Feather
            name="bell"
            size={14}
            color={item.alerts_enabled ? "#0ea5e9" : "#94a3b8"}
          />
          <Text className="text-sm text-slate-600">Alerts</Text>
        </View>
        <Switch
          value={item.alerts_enabled}
          onValueChange={(value) =>
            updateSearch.mutate({
              searchId: item.id,
              data: { alerts_enabled: value },
            })
          }
          trackColor={{ false: "#e2e8f0", true: "#bae6fd" }}
          thumbColor={item.alerts_enabled ? "#0ea5e9" : "#f1f5f9"}
        />
      </View>
    </Card>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
type Tab = "listings" | "searches";

export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("listings");

  const {
    data: savedListings,
    isLoading: listingsLoading,
    refetch: refetchListings,
    isRefetching: listingsRefetching,
  } = useSavedListings();

  const {
    data: savedSearches,
    isLoading: searchesLoading,
    refetch: refetchSearches,
    isRefetching: searchesRefetching,
  } = useSavedSearches();

  const compareIds = useUIStore((s) => s.compareIds);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Tab bar */}
      <View className="bg-white border-b border-slate-100 px-4 pt-2">
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setActiveTab("listings")}
            className={`flex-1 items-center pb-3 border-b-2 ${
              activeTab === "listings"
                ? "border-primary-500"
                : "border-transparent"
            }`}
          >
            <View className="flex-row items-center gap-1.5">
              <Feather
                name="heart"
                size={16}
                color={activeTab === "listings" ? "#0ea5e9" : "#94a3b8"}
              />
              <Text
                className={`text-sm font-semibold ${
                  activeTab === "listings"
                    ? "text-primary-600"
                    : "text-slate-400"
                }`}
              >
                Saved Listings
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("searches")}
            className={`flex-1 items-center pb-3 border-b-2 ${
              activeTab === "searches"
                ? "border-primary-500"
                : "border-transparent"
            }`}
          >
            <View className="flex-row items-center gap-1.5">
              <Feather
                name="search"
                size={16}
                color={activeTab === "searches" ? "#0ea5e9" : "#94a3b8"}
              />
              <Text
                className={`text-sm font-semibold ${
                  activeTab === "searches"
                    ? "text-primary-600"
                    : "text-slate-400"
                }`}
              >
                Saved Searches
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {activeTab === "listings" ? (
        <>
          {listingsLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-slate-400 mt-3">
                Loading saved listings...
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedListings || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <SavedListingRow item={item} />}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              onRefresh={refetchListings}
              refreshing={listingsRefetching}
              ListHeaderComponent={
                compareIds.length > 0 ? (
                  <View className="flex-row items-center gap-2 mb-3 bg-primary-50 rounded-xl px-3 py-2">
                    <Feather name="columns" size={14} color="#0ea5e9" />
                    <Text className="text-primary-700 text-sm flex-1">
                      {compareIds.length} selected to compare
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <Feather name="heart" size={48} color="#cbd5e1" />
                  <Text className="text-slate-400 mt-4 text-base">
                    No saved listings yet
                  </Text>
                  <Text className="text-slate-400 text-sm">
                    Tap the heart on any listing to save it
                  </Text>
                </View>
              }
            />
          )}

          {/* Compare FAB */}
          <View className="absolute bottom-6 left-4 right-4">
            <Button
              title={`Compare (${compareIds.length})`}
              onPress={() => router.push("/saved/compare" as any)}
              disabled={compareIds.length < 2}
              icon={<Feather name="columns" size={18} color="#fff" />}
              size="lg"
            />
          </View>
        </>
      ) : (
        <>
          {searchesLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-slate-400 mt-3">
                Loading saved searches...
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedSearches || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <SavedSearchRow item={item} />}
              contentContainerStyle={{ padding: 16 }}
              onRefresh={refetchSearches}
              refreshing={searchesRefetching}
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <Feather name="search" size={48} color="#cbd5e1" />
                  <Text className="text-slate-400 mt-4 text-base">
                    No saved searches
                  </Text>
                  <Text className="text-slate-400 text-sm">
                    Save a search from the home screen to get alerts
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}
