import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useMemo, useCallback } from "react";
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

/* ================================================================== */
/*  HomeScreen                                                        */
/* ================================================================== */
export default function HomeScreen() {
  /* ---- filter modal visibility ---- */
  const [filterVisible, setFilterVisible] = useState(false);

  /* ---- local draft state for price inputs (to avoid writing every keystroke) ---- */
  const [draftPriceMin, setDraftPriceMin] = useState("");
  const [draftPriceMax, setDraftPriceMax] = useState("");
  const [draftAvailableFrom, setDraftAvailableFrom] = useState("");

  /* ---- store selectors ---- */
  const viewMode = useUIStore((s) => s.listingViewMode);
  const setViewMode = useUIStore((s) => s.setListingViewMode);
  const listingFilters = useUIStore((s) => s.listingFilters);
  const updateFilter = useUIStore((s) => s.updateFilter);
  const clearFilters = useUIStore((s) => s.clearFilters);
  const clearFilter = useUIStore((s) => s.clearFilter);
  const user = useAuthStore((s) => s.user);

  /* ---- derive search city from store ---- */
  const searchCity = listingFilters.city ?? "";

  const handleCityChange = useCallback(
    (text: string) => {
      updateFilter("city", text || undefined);
    },
    [updateFilter],
  );

  /* ---- listings query uses store filters ---- */
  const {
    data: listings,
    isLoading,
    refetch,
    isRefetching,
  } = useListings(listingFilters);

  /* ---- active filter chips (exclude city since it's in the search bar) ---- */
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

  /* ---- open filter modal: seed drafts ---- */
  const openFilters = useCallback(() => {
    setDraftPriceMin(
      listingFilters.price_min != null ? String(listingFilters.price_min) : "",
    );
    setDraftPriceMax(
      listingFilters.price_max != null ? String(listingFilters.price_max) : "",
    );
    setDraftAvailableFrom(listingFilters.available_from ?? "");
    setFilterVisible(true);
  }, [listingFilters]);

  /* ---- apply draft prices on close ---- */
  const applyAndClose = useCallback(() => {
    const min = draftPriceMin ? Number(draftPriceMin) : undefined;
    const max = draftPriceMax ? Number(draftPriceMax) : undefined;
    updateFilter("price_min", Number.isFinite(min) ? min : undefined);
    updateFilter("price_max", Number.isFinite(max) ? max : undefined);
    updateFilter("available_from", draftAvailableFrom || undefined);
    setFilterVisible(false);
  }, [draftPriceMin, draftPriceMax, draftAvailableFrom, updateFilter]);

  /* ---- map markers ---- */
  const markersData = useMemo(
    () =>
      (listings ?? []).filter(
        (l: any) => l.latitude != null && l.longitude != null,
      ),
    [listings],
  );

  /* ================================================================ */
  return (
    <View className="flex-1 bg-slate-50">
      {/* ============ Search Bar ============ */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-slate-100">
        {/* Greeting + My Listings */}
        {user && (
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-bold text-slate-900">
              Hi, {user.full_name.split(" ")[0]} 👋
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/listing/my-listings" as any)}
              className="flex-row items-center gap-1.5 bg-primary-50 rounded-full px-3 py-1.5"
            >
              <Feather name="layers" size={14} color="#0ea5e9" />
              <Text className="text-primary-600 text-xs font-semibold">
                My Listings
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5">
            <Feather name="search" size={18} color="#64748b" />
            <TextInput
              className="flex-1 ml-2 text-base text-slate-900"
              placeholder="Search by city..."
              placeholderTextColor="#94a3b8"
              value={searchCity}
              onChangeText={handleCityChange}
              onSubmitEditing={() => refetch()}
              returnKeyType="search"
            />
            {searchCity.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  clearFilter("city");
                }}
              >
                <Feather name="x" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* View toggle */}
          <TouchableOpacity
            className="bg-slate-100 rounded-xl p-2.5"
            onPress={() =>
              setViewMode(viewMode === "list" ? "map" : "list")
            }
          >
            <Feather
              name={viewMode === "list" ? "map" : "list"}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>

          {/* Filter button */}
          <TouchableOpacity
            className="bg-slate-100 rounded-xl p-2.5"
            onPress={openFilters}
          >
            <Feather name="sliders" size={20} color="#64748b" />
            {activeChips.length > 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {activeChips.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ---- Filter chips ---- */}
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
                <Text className="text-primary-700 text-xs font-medium">
                  {chip.label}
                </Text>
                <Feather name="x" size={12} color="#0369a1" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={clearFilters}
              className="flex-row items-center rounded-full px-2.5 py-1"
            >
              <Text className="text-red-500 text-xs font-semibold">
                Clear All
              </Text>
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
      ) : viewMode === "list" ? (
        /* ---------- List View ---------- */
        <FlatList
          data={listings || []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <ListingCard listing={item} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            <Text className="text-slate-500 text-sm mb-3">
              {(listings || []).length} listing
              {(listings || []).length !== 1 ? "s" : ""} found
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Feather name="inbox" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base">
                No listings found
              </Text>
              <Text className="text-slate-400 text-sm">
                Try adjusting your search
              </Text>
            </View>
          }
        />
      ) : (
        /* ---------- Map View (react-leaflet on web, react-native-maps on native) ---------- */
        <ListingsMap
          listings={markersData}
          onPress={(id: string) => router.push(`/listing/${id}`)}
        />
      )}

      {/* ============ FAB - Post Listing (hidden in map mode; map has its own locate button) ============ */}
      {viewMode === "list" && (
        <TouchableOpacity
          onPress={() => router.push("/listing/create")}
          className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-lg"
          style={{ elevation: 8 }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ============ Filter Modal ============ */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={applyAndClose}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-900">
                Filters
              </Text>
              <TouchableOpacity onPress={applyAndClose}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="px-5"
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              {/* ---- City ---- */}
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">
                City
              </Text>
              <TextInput
                className="bg-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900"
                placeholder="e.g. San Francisco"
                placeholderTextColor="#94a3b8"
                value={searchCity}
                onChangeText={handleCityChange}
              />

              {/* ---- Price Range ---- */}
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">
                Price Range ($/mo)
              </Text>
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

              {/* ---- Room Type ---- */}
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">
                Room Type
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {ROOM_TYPES.map((rt) => {
                  const active = listingFilters.room_type === rt.value;
                  return (
                    <TouchableOpacity
                      key={rt.value}
                      onPress={() =>
                        updateFilter(
                          "room_type",
                          active ? undefined : rt.value,
                        )
                      }
                      className={`rounded-full px-3.5 py-2 border ${
                        active
                          ? "bg-primary-500 border-primary-500"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active ? "text-white" : "text-slate-700"
                        }`}
                      >
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ---- Property Type ---- */}
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">
                Property Type
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PROPERTY_TYPES.map((pt) => {
                  const active = listingFilters.property_type === pt.value;
                  return (
                    <TouchableOpacity
                      key={pt.value}
                      onPress={() =>
                        updateFilter(
                          "property_type",
                          active ? undefined : pt.value,
                        )
                      }
                      className={`rounded-full px-3.5 py-2 border ${
                        active
                          ? "bg-primary-500 border-primary-500"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active ? "text-white" : "text-slate-700"
                        }`}
                      >
                        {pt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ---- Utilities Included ---- */}
              <View className="flex-row items-center justify-between mt-5">
                <Text className="text-sm font-semibold text-slate-700">
                  Utilities Included
                </Text>
                <Switch
                  value={listingFilters.utilities_included === true}
                  onValueChange={(val) =>
                    updateFilter(
                      "utilities_included",
                      val ? true : undefined,
                    )
                  }
                  trackColor={{ false: "#e2e8f0", true: "#0ea5e9" }}
                  thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                />
              </View>

              {/* ---- Minimum Trust Band ---- */}
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">
                Minimum Trust Score
              </Text>
              <View className="flex-row gap-2">
                {TRUST_BANDS.map((band) => {
                  const active = listingFilters.min_trust === band;
                  return (
                    <TouchableOpacity
                      key={band}
                      onPress={() =>
                        updateFilter(
                          "min_trust",
                          active ? undefined : band,
                        )
                      }
                      className={`flex-1 rounded-xl py-2.5 items-center border ${
                        active
                          ? "bg-primary-500 border-primary-500"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active ? "text-white" : "text-slate-700"
                        }`}
                      >
                        {band}+
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ---- Sort By ---- */}
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">
                Sort By
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const active = listingFilters.sort_by === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() =>
                        updateFilter(
                          "sort_by",
                          active ? undefined : opt.value,
                        )
                      }
                      className={`rounded-full px-3.5 py-2 border ${
                        active
                          ? "bg-primary-500 border-primary-500"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active ? "text-white" : "text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ---- Available From ---- */}
              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">
                Available From
              </Text>
              <TextInput
                className="bg-slate-100 rounded-xl px-3 py-2.5 text-base text-slate-900"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                value={draftAvailableFrom}
                onChangeText={setDraftAvailableFrom}
              />

              {/* ---- Action Buttons ---- */}
              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={() => {
                    clearFilters();
                    setDraftPriceMin("");
                    setDraftPriceMax("");
                    setDraftAvailableFrom("");
                  }}
                  className="flex-1 border border-slate-200 rounded-xl py-3 items-center"
                >
                  <Text className="text-slate-600 font-semibold">
                    Clear All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={applyAndClose}
                  className="flex-1 bg-primary-500 rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-semibold">
                    Apply Filters
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
