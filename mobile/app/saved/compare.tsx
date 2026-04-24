import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Button } from "@/components/ui/Button";
import { useCompareListings, type CompareItem } from "@/hooks/useSaved";
import { formatCurrency } from "@/lib/format";
import { useUIStore } from "@/stores/uiStore";

// ─── Helpers ────────────────────────────────────────────────────────────────
const roomTypeLabels: Record<string, string> = {
  private_room: "Private Room",
  shared_room: "Shared Room",
  entire_place: "Entire Place",
};

/** Returns "best" (green) / "worst" (red) / undefined for a numeric stat */
function rankColor(
  items: CompareItem[],
  value: number,
  getter: (i: CompareItem) => number,
  lowerIsBetter: boolean
): string | undefined {
  if (items.length < 2) return undefined;
  const values = items.map(getter);
  const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  const worst = lowerIsBetter ? Math.max(...values) : Math.min(...values);
  if (value === best && best !== worst) return "#10b981"; // green
  if (value === worst && best !== worst) return "#ef4444"; // red
  return undefined;
}

// ─── Stat Row ───────────────────────────────────────────────────────────────
function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View className="flex-row items-center gap-2 mb-2">
      <Feather name={icon} size={14} color="#64748b" />
      <Text className="text-xs text-slate-500 flex-1">{label}</Text>
      <Text
        className="text-sm font-semibold"
        style={{ color: color || "#0f172a" }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Compare Card ───────────────────────────────────────────────────────────
function CompareCard({
  item,
  allItems,
}: {
  item: CompareItem;
  allItems: CompareItem[];
}) {
  const rentColor = rankColor(allItems, item.rent_monthly, (i) => i.rent_monthly, true);
  const depositColor = item.security_deposit
    ? rankColor(allItems, item.security_deposit, (i) => i.security_deposit ?? 0, true)
    : undefined;
  const trustColor = rankColor(allItems, item.host_trust_score, (i) => i.host_trust_score, false);
  const householdTrustColor = rankColor(
    allItems,
    item.avg_household_trust,
    (i) => i.avg_household_trust,
    false
  );

  return (
    <View className="w-72 bg-white rounded-2xl border border-slate-100 shadow-sm mr-4 overflow-hidden">
      {/* Image */}
      <View className="h-40 bg-slate-200">
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Feather name="home" size={32} color="#94a3b8" />
          </View>
        )}
      </View>

      <View className="p-4">
        {/* Title & location */}
        <Text className="text-base font-bold text-slate-900 mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        <View className="flex-row items-center gap-1 mb-3">
          <Feather name="map-pin" size={12} color="#64748b" />
          <Text className="text-xs text-slate-500">
            {item.city}, {item.state}
          </Text>
        </View>

        {/* Rent */}
        <StatRow
          icon="dollar-sign"
          label="Rent"
          value={`${formatCurrency(item.rent_monthly)}/mo`}
          color={rentColor}
        />

        {/* Deposit */}
        <StatRow
          icon="lock"
          label="Deposit"
          value={
            item.security_deposit
              ? formatCurrency(item.security_deposit)
              : "None"
          }
          color={depositColor}
        />

        {/* Bedrooms */}
        <StatRow
          icon="grid"
          label="Bedrooms"
          value={String(item.total_bedrooms)}
        />

        {/* Bathrooms */}
        <StatRow
          icon="droplet"
          label="Bathrooms"
          value={String(item.total_bathrooms)}
        />

        {/* Occupancy */}
        <StatRow
          icon="users"
          label="Occupancy"
          value={`${item.current_occupants}/${item.current_occupants + item.available_spots}`}
        />

        {/* Room type */}
        <StatRow
          icon="layout"
          label="Room Type"
          value={roomTypeLabels[item.room_type] || item.room_type}
        />

        {/* Utilities */}
        <StatRow
          icon="zap"
          label="Utilities"
          value={item.utilities_included ? "Included" : "Not included"}
        />
        {!item.utilities_included && item.utility_estimate && (
          <StatRow
            icon="zap"
            label="Utility Est."
            value={`${formatCurrency(item.utility_estimate)}/mo`}
          />
        )}

        {/* Transit */}
        {item.nearest_transit && (
          <StatRow
            icon="navigation"
            label="Transit"
            value={
              item.transit_walk_mins
                ? `${item.nearest_transit} (${item.transit_walk_mins} min)`
                : item.nearest_transit
            }
          />
        )}

        {/* Amenities */}
        {item.amenities && item.amenities.length > 0 && (
          <View className="mt-2 pt-2 border-t border-slate-100">
            <Text className="text-xs font-semibold text-slate-700 mb-1.5">
              Amenities
            </Text>
            <View className="flex-row flex-wrap gap-1">
              {item.amenities.map((a) => (
                <View
                  key={a}
                  className="bg-primary-50 rounded-full px-2 py-0.5"
                >
                  <Text className="text-primary-700 text-xs">
                    {a.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Trust scores */}
        <View className="mt-3 pt-3 border-t border-slate-100">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs text-slate-500">Host Trust</Text>
            <View className="flex-row items-center gap-1">
              <TrustBadge score={item.host_trust_score} size="sm" />
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-500">Household Avg</Text>
            <Text
              className="text-sm font-bold"
              style={{
                color: householdTrustColor || "#0f172a",
              }}
            >
              {Math.round(item.avg_household_trust)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function CompareScreen() {
  const compareIds = useUIStore((s) => s.compareIds);
  const clearCompare = useUIStore((s) => s.clearCompare);
  const compare = useCompareListings();

  useEffect(() => {
    if (compareIds.length >= 2) {
      compare.mutate(compareIds);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = () => {
    clearCompare();
    router.back();
  };

  if (compareIds.length < 2) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Feather name="columns" size={48} color="#cbd5e1" />
        <Text className="text-slate-400 mt-4 text-base text-center">
          Select at least 2 listings to compare
        </Text>
        <View className="mt-6">
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  if (compare.isPending) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="text-slate-400 mt-3">Loading comparison...</Text>
      </View>
    );
  }

  if (compare.isError) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text className="text-slate-500 mt-4 text-base text-center">
          Failed to load comparison data
        </Text>
        <View className="mt-4">
          <Button
            title="Retry"
            onPress={() => compare.mutate(compareIds)}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  const items = compare.data || [];

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Feather name="columns" size={18} color="#0ea5e9" />
          <Text className="text-lg font-bold text-slate-900">
            Compare ({items.length})
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleClear}
          className="flex-row items-center gap-1.5 bg-red-50 rounded-full px-3 py-1.5"
        >
          <Feather name="x" size={14} color="#ef4444" />
          <Text className="text-red-500 text-xs font-semibold">Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal comparison */}
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400">No comparison data available</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
          className="flex-1"
        >
          {items.map((item) => (
            <CompareCard key={item.id} item={item} allItems={items} />
          ))}
        </ScrollView>
      )}

      {/* Bottom actions */}
      <View className="px-4 py-4 bg-white border-t border-slate-100">
        <Button
          title="Back to Saved"
          onPress={() => router.back()}
          variant="outline"
          icon={<Feather name="arrow-left" size={18} color="#0ea5e9" />}
        />
      </View>
    </View>
  );
}
