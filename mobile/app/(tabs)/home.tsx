import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  RefreshControl,
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
import { OnboardingChecklist } from "@/components/ui/OnboardingChecklist";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useListings } from "@/hooks/useListings";
import { useUIStore } from "@/stores/uiStore";
import type { ListingFilters } from "@/stores/uiStore";

const URBAN_HUT_LOGO = require("@/assets/logo-vertical.png");

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
  { value: "relevance", label: "Recommended" },
  { value: "created_at", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

type LocationSuggestion = {
  id: string;
  label: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

type NominatimPlace = {
  place_id: number;
  display_name: string;
  type?: string;
  addresstype?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    suburb?: string;
    county?: string;
    state?: string;
    region?: string;
    province?: string;
    state_district?: string;
    postcode?: string;
    country_code?: string;
  };
};

/* ---------- Insight card data ---------- 
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
] as const; */

/* ---------- chip label helpers ---------- */
const FILTER_LABELS: Record<keyof ListingFilters, string> = {
  city: "City",
  state: "State",
  zip_code: "ZIP",
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

function cityFilterValue(city: string): string {
  return city.split(",")[0]?.trim() ?? "";
}

function stateFilterValue(input: string): string | undefined {
  const parts = input.split(",").map((part) => part.trim()).filter(Boolean);
  const state = parts[1]?.replace(/\b\d{4,10}(?:-\d{4})?\b/, "").trim();
  return state || undefined;
}

function zipFilterValue(input: string): string | undefined {
  return input.match(/\b\d{4,10}(?:-\d{4})?\b/)?.[0];
}

function formatNominatimPlace(place: NominatimPlace): LocationSuggestion | null {
  const address = place.address ?? {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.hamlet ||
    address.suburb ||
    address.county ||
    "";
  const state = address.state || address.region || address.province || address.state_district || "";
  const zipCode = address.postcode || "";
  const country = address.country_code?.toUpperCase();

  if (!city && !zipCode) return null;

  const cityState = [city, state].filter(Boolean).join(", ");
  const label = [cityState || place.display_name.split(",").slice(0, 2).join(", "), zipCode]
    .filter(Boolean)
    .join(" ");

  return {
    id: String(place.place_id),
    label,
    city: city || undefined,
    state: state || undefined,
    zipCode: zipCode || undefined,
    country,
  };
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
          className="mt-5 bg-[#10b981] rounded-2xl px-6 py-3"
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
        <TouchableOpacity onPress={onSwitchToList} className="mt-5 bg-[#10b981] rounded-2xl px-6 py-3">
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
  const [sortVisible, setSortVisible] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [locating, setLocating] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [locationTried, setLocationTried] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [draftPriceMin, setDraftPriceMin] = useState("");
  const [draftPriceMax, setDraftPriceMax] = useState("");
  const [draftAvailableFrom, setDraftAvailableFrom] = useState("");

  const viewMode = useUIStore((s) => s.listingViewMode);
  const setViewMode = useUIStore((s) => s.setListingViewMode);
  const listingFilters = useUIStore((s) => s.listingFilters);
  const updateFilter = useUIStore((s) => s.updateFilter);
  const clearFilters = useUIStore((s) => s.clearFilters);
  const clearFilter = useUIStore((s) => s.clearFilter);

  // Local city text for debounced search
  const [cityText, setCityText] = useState(listingFilters.city ?? "");
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);

  const updateLocationFilters = useCallback(
    (input: string, suggestion?: LocationSuggestion) => {
      const city = suggestion?.city ?? cityFilterValue(input);
      const state = suggestion?.state ?? stateFilterValue(input);
      const zipCode = suggestion?.zipCode ?? zipFilterValue(input);
      updateFilter("city", city || undefined);
      updateFilter("state", state || undefined);
      updateFilter("zip_code", zipCode || undefined);
    },
    [updateFilter],
  );

  const applyCity = useCallback(
    (city: string, suggestion?: LocationSuggestion) => {
      const nextCity = city.trim();
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      setCityText(nextCity);
      updateLocationFilters(nextCity, suggestion);
      setLocationSuggestions([]);
      setCityFocused(false);
      Keyboard.dismiss();
    },
    [updateLocationFilters],
  );

  const handleCityChange = useCallback(
    (text: string) => {
      setCityText(text);
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      cityDebounceRef.current = setTimeout(() => {
        updateLocationFilters(text);
      }, 500);
    },
    [updateLocationFilters],
  );

  const handleCitySubmit = useCallback(() => {
    applyCity(cityText);
  }, [applyCity, cityText]);

  const handleClearCity = useCallback(() => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    setCityText("");
    setLocationSuggestions([]);
    updateFilter("city", undefined);
    updateFilter("state", undefined);
    updateFilter("zip_code", undefined);
    setCityFocused(false);
    Keyboard.dismiss();
  }, [updateFilter]);

  const detectCurrentCity = useCallback(async (showAlerts: boolean) => {
    if (locating) return;
    setLocationTried(true);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (showAlerts) {
          Alert.alert(
            "Location permission needed",
            "Allow location access to detect your current city.",
          );
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const place = places[0];
      const detectedCity = place?.city || place?.subregion || place?.district || "";
      const detectedState = place?.region || "";
      const cityLabel = [detectedCity, detectedState].filter(Boolean).join(", ");

      if (!cityLabel) {
        if (showAlerts) {
          Alert.alert("Location found", "We could not determine a city from your current location.");
        }
        return;
      }

      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      setCityText(cityLabel);
      updateLocationFilters(cityLabel, {
        id: "current-location",
        label: cityLabel,
        city: detectedCity || undefined,
        state: detectedState || undefined,
      });
      setCityFocused(false);
    } catch {
      if (showAlerts) {
        Alert.alert("Location unavailable", "We could not get your current city. Please enter it manually.");
      }
    } finally {
      setLocating(false);
    }
  }, [locating, updateLocationFilters]);

  const handleUseCurrentLocation = useCallback(() => {
    detectCurrentCity(true);
  }, [detectCurrentCity]);

  // Sync cityText if filter is cleared externally
  useEffect(() => {
    if (!listingFilters.city && !listingFilters.state && !listingFilters.zip_code) setCityText("");
  }, [listingFilters.city, listingFilters.state, listingFilters.zip_code]);

  useEffect(() => {
    return () => {
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current);
      suggestionsAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!listingFilters.city && !listingFilters.state && !listingFilters.zip_code && !cityText && !locationTried) {
      detectCurrentCity(false);
    }
  }, [cityText, detectCurrentCity, listingFilters.city, listingFilters.state, listingFilters.zip_code, locationTried]);

  useEffect(() => {
    const query = cityText.trim();
    if (!cityFocused || query.length < 2) {
      setLocationSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionsError(false);
      suggestionsAbortRef.current?.abort();
      return;
    }

    if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current);
    suggestionsDebounceRef.current = setTimeout(async () => {
      suggestionsAbortRef.current?.abort();
      const controller = new AbortController();
      suggestionsAbortRef.current = controller;
      setSuggestionsLoading(true);
      setSuggestionsError(false);

      try {
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          addressdetails: "1",
          limit: "6",
          "accept-language": "en",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });
        if (!response.ok) throw new Error("location search failed");
        const data = (await response.json()) as NominatimPlace[];
        const seen = new Set<string>();
        const nextSuggestions = data
          .map(formatNominatimPlace)
          .filter((suggestion): suggestion is LocationSuggestion => Boolean(suggestion))
          .filter((suggestion) => {
            const key = `${suggestion.city ?? ""}|${suggestion.state ?? ""}|${suggestion.zipCode ?? ""}|${suggestion.country ?? ""}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 5);
        setLocationSuggestions(nextSuggestions);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestionsError(true);
          setLocationSuggestions([]);
        }
      } finally {
        setSuggestionsLoading(false);
      }
    }, 650);
  }, [cityFocused, cityText]);

  const {
    data: listings,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useListings(listingFilters);

  const selectedSort = listingFilters.sort_by ?? "relevance";
  const selectedSortOption = SORT_OPTIONS.find((opt) => opt.value === selectedSort) ?? SORT_OPTIONS[0];

  const applySort = useCallback(
    (value: (typeof SORT_OPTIONS)[number]["value"]) => {
      updateFilter("sort_by", value === "relevance" ? undefined : value);
      setSortVisible(false);
    },
    [updateFilter],
  );

  const sortedListings = useMemo(() => {
    const items = [...(listings ?? [])];
    if (selectedSort === "price_asc") {
      return items.sort((a: any, b: any) => (a.rent_monthly ?? 0) - (b.rent_monthly ?? 0));
    }
    if (selectedSort === "price_desc") {
      return items.sort((a: any, b: any) => (b.rent_monthly ?? 0) - (a.rent_monthly ?? 0));
    }
    if (selectedSort === "created_at") {
      return items.sort(
        (a: any, b: any) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );
    }
    return items;
  }, [listings, selectedSort]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof ListingFilters; label: string }[] = [];
    const keys = Object.keys(listingFilters) as (keyof ListingFilters)[];
    for (const k of keys) {
      const v = listingFilters[k];
      if (v === undefined || v === "" || k === "city" || k === "state" || k === "zip_code") continue;
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
    () => sortedListings.filter((l: any) => l.latitude != null && l.longitude != null),
    [sortedListings],
  );

  const hasActiveFilters = activeChips.length > 0 || !!cityText;
  const isEmptyResults = !isLoading && !isError && sortedListings.length === 0;
  const isFilteredEmpty = isEmptyResults && hasActiveFilters;

  const headerContent = (
    <View className="bg-white px-4 pt-6 pb-4">
        <View className="flex-row items-center justify-between mb-5">
          <View className="items-start">
            <Image
              source={URBAN_HUT_LOGO}
              resizeMode="contain"
              className="w-[170px] h-[44px]"
              style={{ width: 170, height: 44 }}
            />
            <Text
              className="self-end text-[#10b981] text-[10px] font-bold tracking-widest uppercase -mt-1"
              style={{ alignSelf: "flex-end", color: "#10b981", fontSize: 10, fontWeight: "700", marginTop: -4, textTransform: "uppercase" }}
            >
              find your next home
            </Text>
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

        {/* Search & Actions */}
        <View className="flex-row items-center gap-2" style={{ zIndex: 30 }}>
          <View className="flex-1" style={{ zIndex: 40 }}>
            <View
              className="flex-row items-center bg-white border border-slate-200 rounded-2xl pl-3 pr-2 h-[58px]"
              style={{ shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
            >
              <View className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center">
                <Feather name="search" size={18} color="#10b981" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search location</Text>
                <TextInput
                  value={cityText}
                  onChangeText={handleCityChange}
                  onFocus={() => setCityFocused(true)}
                  onSubmitEditing={handleCitySubmit}
                  returnKeyType="search"
                  placeholder={locating ? "Detecting city..." : "City, state, or ZIP"}
                  placeholderTextColor="#94a3b8"
                  className="text-slate-900 font-extrabold text-[15px] p-0"
                  style={{ padding: 0, minWidth: 0, lineHeight: 19 }}
                />
              </View>

              {!!cityText && (
                <TouchableOpacity
                  onPress={handleClearCity}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center mr-1"
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={15} color="#475569" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleUseCurrentLocation}
                disabled={locating}
                className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center"
                activeOpacity={0.8}
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Feather name="navigation" size={15} color="#10b981" />
                )}
              </TouchableOpacity>
            </View>

            {locationSuggestions.length > 0 && (
              <View
                className="absolute left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
                style={{ top: 66, zIndex: 50, shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}
              >
                {locationSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    onPress={() => applyCity(suggestion.label, suggestion)}
                    className="flex-row items-center px-4 py-3 border-b border-slate-100"
                    activeOpacity={0.85}
                  >
                    <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                      <Feather name="map-pin" size={15} color="#10b981" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-slate-900 text-sm font-bold">{suggestion.label}</Text>
                      <Text className="text-slate-500 text-xs">
                        {[suggestion.country, suggestion.zipCode ? "ZIP match" : "Area match"].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {cityFocused && cityText.trim().length >= 2 && locationSuggestions.length === 0 && !suggestionsLoading && (
              <View
                className="absolute left-0 right-0 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-lg"
                style={{ top: 66, zIndex: 50, shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}
              >
                <Text className="text-slate-500 text-sm font-medium">
                  {suggestionsError ? "Location lookup unavailable" : "No location suggestions found"}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            className="bg-white border border-slate-200 rounded-2xl w-[58px] h-[58px] items-center justify-center"
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
            activeOpacity={0.85}
          >
            <Feather name={viewMode === "list" ? "map" : "list"} size={21} color="#0f172a" />
            <Text className="text-[10px] font-bold text-slate-500 mt-1">{viewMode === "list" ? "Map" : "List"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-white border border-slate-200 rounded-2xl w-[58px] h-[58px] items-center justify-center" 
            onPress={openFilters}
            activeOpacity={0.85}
          >
            <Feather name="sliders" size={21} color="#0f172a" />
            <Text className="text-[10px] font-bold text-slate-500 mt-1">Filter</Text>
            {activeChips.length > 0 && (
              <View className="absolute top-1 right-1 w-5 h-5 bg-[#10b981] rounded-full items-center justify-center border-2 border-white">
                <Text className="text-white text-[10px] font-bold">{activeChips.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* List Header Info */}
        <View className="flex-row items-center justify-between mt-5">
          <Text className="text-slate-500 text-base font-medium">
            {sortedListings.length} listings found
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5"
            onPress={() => setSortVisible(true)}
            activeOpacity={0.8}
          >
            <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider">
              Sort: {selectedSortOption.label}
            </Text>
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
  );

  const emptyContent = isFilteredEmpty ? (
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
    <View className="items-center justify-center py-20">
      <Feather name="inbox" size={48} color="#cbd5e1" />
      <Text className="text-slate-400 mt-4 text-base">No listings found</Text>
      <Text className="text-slate-400 text-sm">Try adjusting your search</Text>
    </View>
  );

  /* ================================================================ */
  return (
    <View className="flex-1 bg-slate-50">
      {viewMode === "list" ? (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#10b981"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {headerContent}

          <View className="px-4 pt-4">
            {!isLoading && !isError && <OnboardingChecklist />}

            {isLoading ? (
              <SkeletonLoader count={4} />
            ) : isError ? (
              <View className="items-center justify-center px-8 py-20">
                <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
                  <Feather name="wifi-off" size={28} color="#ef4444" />
                </View>
                <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load listings</Text>
                <Text className="text-slate-400 text-sm text-center mt-2">
                  Check your connection and try again.
                </Text>
                <TouchableOpacity
                  onPress={() => refetch()}
                  className="mt-6 bg-[#10b981] rounded-2xl px-8 py-3 flex-row items-center gap-2"
                >
                  <Feather name="refresh-cw" size={16} color="#fff" />
                  <Text className="text-white font-semibold">Tap to Retry</Text>
                </TouchableOpacity>
              </View>
            ) : sortedListings.length > 0 ? (
              sortedListings.map((item: any) => (
                <ListingCard key={item.id} listing={item} compact />
              ))
            ) : (
              emptyContent
            )}
          </View>
        </ScrollView>
      ) : (
        <>
          {headerContent}
          {isLoading ? (
            <SkeletonLoader count={4} style={{ padding: 16 }} />
          ) : isError ? (
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
                className="mt-6 bg-[#10b981] rounded-2xl px-8 py-3 flex-row items-center gap-2"
              >
                <Feather name="refresh-cw" size={16} color="#fff" />
                <Text className="text-white font-semibold">Tap to Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <MapWithErrorBoundary
              listings={markersData}
              onPress={(id: string) => router.push(`/listing/${id}`)}
              onSwitchToList={() => setViewMode("list")}
            />
          )}
        </>
      )}

      {/* FAB */}
      {viewMode === "list" && (
        <TouchableOpacity
          onPress={() => router.push("/listing/create")}
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#10b981] rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.85}
        >
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ============ Sort Sheet ============ */}
      <Modal
        visible={sortVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setSortVisible(false)} />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-slate-900">Sort listings</Text>
              <TouchableOpacity onPress={() => setSortVisible(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((opt) => {
              const active = selectedSort === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => applySort(opt.value)}
                  className="flex-row items-center justify-between py-4 border-b border-slate-100"
                >
                  <Text className={`text-base font-semibold ${active ? "text-[#10b981]" : "text-slate-700"}`}>
                    {opt.label}
                  </Text>
                  {active && <Feather name="check" size={20} color="#10b981" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

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
                      className={`rounded-full px-3.5 py-2 border ${active ? "bg-[#10b981] border-[#10b981]" : "bg-white border-slate-200"}`}
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
                      className={`rounded-full px-3.5 py-2 border ${active ? "bg-[#10b981] border-[#10b981]" : "bg-white border-slate-200"}`}
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
                  trackColor={{ false: "#e2e8f0", true: "#10b981" }}
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
                      className={`flex-1 rounded-xl py-2.5 items-center border ${active ? "bg-[#10b981] border-[#10b981]" : "bg-white border-slate-200"}`}
                    >
                      <Text className={`text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}>{band}+</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-semibold text-slate-700 mt-5 mb-2">Sort By</Text>
              <View className="flex-row flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const active = selectedSort === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => updateFilter("sort_by", opt.value === "relevance" ? undefined : opt.value)}
                      className={`rounded-full px-3.5 py-2 border ${active ? "bg-[#10b981] border-[#10b981]" : "bg-white border-slate-200"}`}
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
                  className={`flex-1 rounded-xl py-3 items-center flex-row justify-center gap-2 ${filterApplying ? "bg-emerald-300" : "bg-[#10b981]"}`}
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
