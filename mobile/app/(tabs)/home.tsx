import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { ListingCard } from "@/components/listing/ListingCard";
import ListingsMap from "@/components/map/ListingsMap";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useListings } from "@/hooks/useListings";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import type { ListingFilters } from "@/stores/uiStore";

/* ---------- constants ---------- */
const ROOM_TYPES = [
  { value: "private_room", label: "Private Room" },
  { value: "shared_room", label: "Shared Room" },
  { value: "entire_place", label: "Entire Place" },
] as const;

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
] as const;

const TRUST_BANDS = [25, 50, 75] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

/* ---------- Insight card data ---------- */
const INSIGHT_CARDS = [
  {
    key: "match",
    title: "Best Match Today",
    subtitle: "92% compatibility",
    icon: "heart" as const,
    gradientStart: "#0ea5e9",
    gradientEnd: "#10b981",
  },
  {
    key: "nearby",
    title: "Homes Near You",
    subtitle: "14 new this week",
    icon: "map-pin" as const,
    gradientStart: "#8b5cf6",
    gradientEnd: "#0ea5e9",
  },
  {
    key: "people",
    title: "People Looking",
    subtitle: "37 active seekers",
    icon: "users" as const,
    gradientStart: "#f59e0b",
    gradientEnd: "#ef4444",
  },
] as const;

/* ---------- chip label helpers ---------- */
const FILTER_LABELS: Record<keyof ListingFilters, string> = {
  city: "City",
  price_min: "Min $",
  price_max: "Max $",
  room_type: "Room",
  property_type: "Property",
  available_from: "From",
  utilities_included: "Utilities",
  min_trust: "Trust",
  sort_by: "Sort",
};

function chipLabel(key: keyof ListingFilters, value: unknown): string {
  if (key === "utilities_included") return "Utilities Incl.";
  if (key === "room_type") {
    const found = ROOM_TYPES.find((r) => r.value === value);
    return found ? found.label : String(value);
  }
  if (key === "property_type") {
    const found = PROPERTY_TYPES.find((p) => p.value === value);
    return found ? found.label : String(value);
  }
  if (key === "sort_by") {
    const found = SORT_OPTIONS.find((s) => s.value === value);
    return found ? found.label : String(value);
  }
  if (key === "min_trust") return `Trust ${value}+`;
  const prefix = FILTER_LABELS[key] ?? key;
  return `${prefix}: ${value}`;
}

/* ── Insight card component ── */
function InsightCard({
  title,
  subtitle,
  icon,
  gradientStart,
  gradientEnd,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof import("@expo/vector-icons").Feather.glyphMap;
  gradientStart: string;
  gradientEnd: string;
}) {
  return (
    <View className="rounded-2xl overflow-hidden mr-3" style={{ width: 150, height: 90 }}>
      <Svg
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={`ig-${icon}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientStart} stopOpacity="1" />
            <Stop offset="1" stopColor={gradientEnd} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#ig-${icon})`} />
      </Svg>
      <View className="flex-1 p-3 justify-between">
        <View className="w-8 h-8 bg-white/20 rounded-xl items-center justify-center">
          <Feather name={icon} size={16} color="#fff" />
        </View>
        <View>
          <Text className="text-white font-bold text-sm" numberOfLines={1}>{title}</Text>
          <Text className="text-white/75 text-xs">{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

/* ── Map error wrapper ── */
function MapWithErrorBoundary({
  listings,
  onPress,
  onSwitchToList,
}: {
  listings: any[];
  onPress: (id: string) => void;
  onSwitchToList: () => void;
}) {
  const [mapFailed, setMapFailed] = useState(false);

  if (mapFailed) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Feather name="alert-triangle" size={48} color="#cbd5e1" />
        <Text className="text-slate-500 font-semibold text-base mt-4 text-center">Map unavailable</Text>
        <Text className="text-slate-400 text-sm text-center mt-1">
          There was a problem loading the map.
        </Text>
        <TouchableOpacity
          onPress={onSwitchToList}
          className="mt-5 bg-primary-500 rounded-2xl px-6 py-3"
        >
          <Text className="text-white font-semibold">Switch to List View</Text>
        </TouchableOpacity>
      </View>
    );
  }

  try {
    return (
      <ListingsMap
        listings={listings}
        onPress={onPress}
        onError={() => setMapFailed(true)}
      />
    );
  } catch {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Feather name="alert-triangle" size={48} color="#cbd5e1" />
        <Text className="text-slate-500 font-semibold text-base mt-4 text-center">Map unavailable</Text>
        <TouchableOpacity onPress={onSwitchToList} className="mt-5 bg-primary-500 rounded-2xl px-6 py-3">
          <Text className="text-white font-semibold">Switch to List View</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

/* ================================================================== */
/*  HomeScreen                                                        */
/* ================================================================== */
export default function HomeScreen() {
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [draftPriceMin, setDraftPriceMin] = useState("");
  const [draftPriceMax, setDraftPriceMax] = useState("");
  const [draftAvailableFrom, setDraftAvailableFrom] = useState("");

  const viewMode = useUIStore((s) => s.listingViewMode);
  const setViewMode = useUIStore((s) => s.setListingViewMode);
  const listingFilters = useUIStore((s) => s.listingFilters);
  const updateFilter = useUIStore((s) => s.updateFilter);
  const clearFilters = useUIStore((s) => s.clearFilters);
  const clearFilter = useUIStore((s) => s.clearFilter);
  const user = useAuthStore((s) => s.user);

  // Local city text for debounced search
  const [cityText, setCityText] = useState(listingFilters.city ?? "");
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCityChange = useCallback(
    (text: string) => {
      setCityText(text);
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      cityDebounceRef.current = setTimeout(() => {
        updateFilter("city", text || undefined);
      }, 500);
    },
    [updateFilter],
  );

  // Sync cityText if filter is cleared externally
  useEffect(() => {
    if (!listingFilters.city) setCityText("");
  }, [listingFilters.city]);

  const {
    data: listings,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useListings(listingFilters);

  const activeChips = useMemo(() => {
    const chips: { key: keyof ListingFilters; label: string }[] = [];
    const keys = Object.keys(listingFilters) as (keyof ListingFilters)[];
    for (const k of keys) {
      const v = listingFilters[k];
      if (v === undefined || v === "" || k === "city") continue;
      chips.push({ key: k, label: chipLabel(k, v) });
    }
    return chips;
  }, [listingFilters]);

  const openFilters = useCallback(() => {
    setDraftPriceMin(listingFilters.price_min != null ? String(listingFilters.price_min) : "");
    setDraftPriceMax(listingFilters.price_max != null ? String(listingFilters.price_max) : "");
    setDraftAvailableFrom(listingFilters.available_from ?? "");
    setFilterVisible(true);
  }, [listingFilters]);

  const applyAndClose = useCallback(async () => {
    setFilterApplying(true);
    const min = draftPriceMin ? Number(draftPriceMin) : undefined;
    const max = draftPriceMax ? Number(draftPriceMax) : undefined;
    updateFilter("price_min", Number.isFinite(min) ? min : undefined);
    updateFilter("price_max", Number.isFinite(max) ? max : undefined);
    updateFilter("available_from", draftAvailableFrom || undefined);
    try {
      await refetch();
    } finally {
      setFilterApplying(false);
      setFilterVisible(false);
    }
  }, [draftPriceMin, draftPriceMax, draftAvailableFrom, updateFilter, refetch]);

  const markersData = useMemo(
    () => (listings ?? []).filter((l: any) => l.latitude != null && l.longitude != null),
    [listings],
  );

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const hasActiveFilters = activeChips.length > 0 || !!cityText;
  const isEmptyResults = !isLoading && !isError && (listings ?? []).length === 0;
  const isFilteredEmpty = isEmptyResults && hasActiveFilters;

  /* ================================================================ */
  return (
    <View className="flex-1 bg-slate-50">
      {/* ============ Header ============ */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100">
        {user && (
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-2xl font-bold text-slate-900">Hi, {firstName} 👋</Text>
              <Text className="text-slate-400 text-sm">Find your perfect home</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/listing/my-listings" as any)}
              className="flex-row items-center gap-1.5 bg-primary-50 rounded-2xl px-3 py-2"
            >
              <Feather name="layers" size={15} color="#0ea5e9" />
              <Text className="text-primary-600 text-sm font-semibold">My Listings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search bar */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-slate-100 rounded-2xl px-3 py-3">
            <Feather name="search" size={18} color="#64748b" />
            <TextInput
              className="flex-1 ml-2 text-base text-slate-900"
              placeholder="Search by city..."
              placeholderTextColor="#94a3b8"
              value={cityText}
              onChangeText={handleCityChange}
              onSubmitEditing={() => refetch()}
              returnKeyType="search"
            />
            {cityText.length > 0 && (
              <TouchableOpacity onPress={() => { clearFilter("city"); setCityText(""); }}>
                <Feather name="x" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            className="bg-slate-100 rounded-2xl p-3"
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            <Feather name={viewMode === "list" ? "map" : "list"} size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-slate-100 rounded-2xl p-3" onPress={openFilters}>
            <Feather name="sliders" size={20} color="#64748b" />
            {activeChips.length > 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{activeChips.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2"
            contentContainerStyle={{ gap: 6 }}
          >
            {activeChips.map((chip) => (
              <TouchableOpacity
                key={chip.key}
                onPress={() => clearFilter(chip.key)}
                className="flex-row items-center bg-primary-50 rounded-full px-2.5 py-1 gap-1"
              >
                <Text className="text-primary-700 text-xs font-medium">{chip.label}</Text>
                <Feather name="x" size={12} color="#0369a1" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={clearFilters} className="rounded-full px-2.5 py-1">
              <Text className="text-red-500 text-xs font-semibold">Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ============ Content ============ */}
      {isLoading ? (
        <SkeletonLoader count={4} style={{ padding: 16 }} />
      ) : isError ? (
        /* API error state */
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
            <Feather name="wifi-off" size={28} color="#ef4444" />
          </View>
          <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load listings</Text>
          <Text className="text-slate-400 text-sm text-center mt-2">
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-6 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text className="text-white font-semibold">Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === "list" ? (
        <FlatList
          data={listings || []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => <ListingCard listing={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            <View>
              {/* Smart insight cards */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-5"
                contentContainerStyle={{ paddingRight: 4 }}
              >
                {INSIGHT_CARDS.map(({ key, ...cardProps }) => (
                  <InsightCard key={key} {...cardProps} />
                ))}
              </ScrollView>

              {!isFilteredEmpty && (
                <Text className="text-slate-500 text-sm mb-3">
                  {(listings || []).length} listing{(listings || []).length !== 1 ? "s" : ""} found
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            isFilteredEmpty ? (
              /* Filtered-empty state: distinct from blank */
              <View className="items-center justify-center py-16 px-8">
                <Feather name="search" size={48} color="#cbd5e1" />
                <Text className="text-slate-600 mt-4 text-base font-semibold text-center">No listings match your filters</Text>
                <Text className="text-slate-400 text-sm text-center mt-1">Try broadening your search or clearing some filters.</Text>
                <TouchableOpacity
                  onPress={() => { clearFilters(); setCityText(""); }}
                  className="mt-5 border border-slate-300 rounded-2xl px-6 py-2.5"
                >
                  <Text className="text-slate-600 font-semibold">Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Generic empty */
              <View className="items-center justify-center py-20">
                <Feather name="inbox" size={48} color="#cbd5e1" />
                <Text className="text-slate-400 mt-4 text-base">No listings found</Text>
                <Text className="text-slate-400 text-sm">Try adjusting your search</Text>
              </View>
            )
          }
        />
      ) : (
        <MapWithErrorBoundary
          listings={markersData}
          onPress={(id: string) => router.push(`/listing/${id}`)}
          onSwitchToList={() => setViewMode("list")}
        />
      )}

      {/* FAB */}
      {viewMode === "list" && (
        <TouchableOpacity
          onPress={() => router.push("/listing/create")}
          className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center"
          style={{
            elevation: 8,
            shadowColor: "#0ea5e9",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
          }}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ============ Filter Modal ============ */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-900">Filters</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">City</Text>
              <TextInput
                className="bg-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900"
                placeholder="e.g. San Francisco"
                placeholderTextColor="#94a3b8"
                value={cityText}
                onChangeText={handleCityChange}
              />

              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">Price Range ($/mo)</Text>
              <View className="flex-row gap-3">
                <TextInput
                  className="flex-1 bg-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900"
                  placeholder="Min"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={draftPriceMin}
                  onChangeText={setDraftPriceMin}
                />
                <TextInput
                  className="flex-1 bg-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900"
                  placeholder="Max"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={draftPriceMax}
                  onChangeText={setDraftPriceMax}
                />
              </View>

              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">Room Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {ROOM_TYPES.map((rt) => {
                  const active = listingFilters.room_type === rt.value;
                  return (
                    <TouchableOpacity
                      key={rt.value}
                      onPress={() => updateFilter("room_type", active ? undefined : rt.value)}
                      className={`rounded-full px-3.5 py-2 border ${active ? "bg-primary-500 border-primary-500" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-sm font-medium ${active ? "text-white" : "text-slate-700"}`}>{rt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">Property Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {PROPERTY_TYPES.map((pt) => {
                  const active = listingFilters.property_type === pt.value;
                  return (
                    <TouchableOpacity
                      key={pt.value}
                      onPress={() => updateFilter("property_type", active ? undefined : pt.value)}
                      className={`rounded-full px-3.5 py-2 border ${active ? "bg-primary-500 border-primary-500" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-sm font-medium ${active ? "text-white" : "text-slate-700"}`}>{pt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View className="flex-row items-center justify-between mt-5">
                <Text className="text-sm font-semibold text-slate-700">Utilities Included</Text>
                <Switch
                  value={listingFilters.utilities_included === true}
                  onValueChange={(val) => updateFilter("utilities_included", val ? true : undefined)}
                  trackColor={{ false: "#e2e8f0", true: "#0ea5e9" }}
                  thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                />
              </View>

              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">Minimum Trust Score</Text>
              <View className="flex-row gap-2">
                {TRUST_BANDS.map((band) => {
                  const active = listingFilters.min_trust === band;
                  return (
                    <TouchableOpacity
                      key={band}
                      onPress={() => updateFilter("min_trust", active ? undefined : band)}
                      className={`flex-1 rounded-xl py-2.5 items-center border ${active ? "bg-primary-500 border-primary-500" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}>{band}+</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">Sort By</Text>
              <View className="flex-row flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const active = listingFilters.sort_by === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => updateFilter("sort_by", active ? undefined : opt.value)}
                      className={`rounded-full px-3.5 py-2 border ${active ? "bg-primary-500 border-primary-500" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-sm font-medium ${active ? "text-white" : "text-slate-700"}`}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">Available From</Text>
              <TextInput
                className="bg-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                value={draftAvailableFrom}
                onChangeText={setDraftAvailableFrom}
              />

              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={() => {
                    clearFilters();
                    setCityText("");
                    setDraftPriceMin("");
                    setDraftPriceMax("");
                    setDraftAvailableFrom("");
                  }}
                  className="flex-1 border border-slate-200 rounded-xl py-3 items-center"
                >
                  <Text className="text-slate-600 font-semibold">Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={applyAndClose}
                  disabled={filterApplying}
                  className={`flex-1 rounded-xl py-3 items-center flex-row justify-center gap-2 ${filterApplying ? "bg-primary-300" : "bg-primary-500"}`}
                >
                  {filterApplying ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text className="text-white font-semibold">Applying…</Text>
                    </>
                  ) : (
                    <Text className="text-white font-semibold">Apply Filters</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
