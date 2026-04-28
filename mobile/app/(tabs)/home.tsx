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
import { ListingCard } from "@/components/listing/ListingCard";
import ListingsMap from "@/components/map/ListingsMap";
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
      <View className="bg-white px-4 pt-6 pb-4">
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center gap-3">
            <View className="flex-row flex-wrap w-10 h-10 bg-[#065f46] rounded-xl p-1.5 items-center justify-center">
              <View className="w-full items-center mb-0.5">
                <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "white" }} />
              </View>
              <View className="flex-row gap-0.5">
                <View className="w-2.5 h-2.5 bg-white rounded-sm" />
                <View className="w-2.5 h-2.5 bg-white rounded-sm" />
              </View>
              <View className="flex-row gap-0.5 mt-0.5">
                <View className="w-2.5 h-2.5 bg-white rounded-sm" />
                <View className="w-2.5 h-2.5 bg-white rounded-sm" />
              </View>
            </View>
            <View>
              <Text className="text-[22px] font-black text-slate-900 tracking-tight">urbanhut</Text>
              <Text className="text-[#10b981] text-[11px] font-bold tracking-widest uppercase -mt-1">find your next home</Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="relative">
              <Feather name="bell" size={24} color="#0f172a" />
              <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ef4444] border-2 border-white rounded-full" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/listing/my-listings" as any)}
              className="flex-row items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm"
            >
              <Feather name="layers" size={16} color="#10b981" />
              <Text className="text-slate-700 text-sm font-bold">My Listings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & Action Row */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity 
            className="flex-1 flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 h-[72px]"
            onPress={openFilters}
          >
            <Feather name="map-pin" size={20} color="#10b981" />
            <View className="ml-3 flex-1">
              <Text className="text-slate-900 font-bold text-base">Jersey City, NJ</Text>
              <Text className="text-[#10b981] text-xs font-semibold">Current location</Text>
            </View>
            <Feather name="compass" size={18} color="#10b981" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white border border-slate-200 rounded-2xl w-[72px] h-[72px] items-center justify-center"
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            <Feather name={viewMode === "list" ? "map" : "list"} size={22} color="#0f172a" />
            <Text className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Map</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-white border border-slate-200 rounded-2xl w-[72px] h-[72px] items-center justify-center" 
            onPress={openFilters}
          >
            <Feather name="sliders" size={22} color="#0f172a" />
            <Text className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Filters</Text>
            {activeChips.length > 0 && (
              <View className="absolute top-1 right-1 w-5 h-5 bg-[#10b981] rounded-full items-center justify-center border-2 border-white">
                <Text className="text-white text-[10px] font-bold">{activeChips.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* List Header Info */}
        <View className="flex-row items-center justify-between mt-5">
          <Text className="text-slate-900 text-lg font-bold">
            {(listings || []).length} listings found
          </Text>
          <TouchableOpacity className="flex-row items-center gap-1 bg-slate-100 rounded-xl px-3 py-1.5">
            <Text className="text-slate-600 text-sm font-semibold">Sort: Recommended</Text>
            <Feather name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {activeChips.map((chip) => (
              <TouchableOpacity
                key={chip.key}
                onPress={() => clearFilter(chip.key)}
                className="flex-row items-center bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 gap-2"
              >
                <Text className="text-emerald-700 text-xs font-bold uppercase tracking-wider">{chip.label}</Text>
                <Feather name="x" size={12} color="#059669" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={clearFilters} className="rounded-full px-3 py-1.5 bg-red-50">
              <Text className="text-red-500 text-xs font-bold uppercase tracking-wider">Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ============ Content ============ */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="text-slate-400 mt-3">Loading listings...</Text>
        </View>
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
