import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { MyListingCard } from "@/components/listing/MyListingCard";
import { useMyListings } from "@/hooks/useHostListings";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Drafts" },
  { key: "closed", label: "Closed" },
];

export default function MyListingsScreen() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const { data: listings, isLoading, refetch, isRefetching } = useMyListings(
    selectedStatus !== "all" ? selectedStatus : undefined
  );

  const statusCounts = React.useMemo(() => {
    if (!listings) return {};
    const counts: Record<string, number> = {};
    listings.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [listings]);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Status Filter */}
      <View className="bg-white border-b border-slate-100 px-4 py-2">
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedStatus(item.key)}
              className={`rounded-full px-4 py-2 mr-2 ${
                selectedStatus === item.key ? "bg-primary-500" : "bg-slate-100"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedStatus === item.key ? "text-white" : "text-slate-600"
                }`}
              >
                {item.label}
                {item.key !== "all" && statusCounts[item.key]
                  ? ` (${statusCounts[item.key]})`
                  : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Listings */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="text-slate-400 mt-3">Loading your listings...</Text>
        </View>
      ) : (
        <FlatList
          data={listings || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MyListingCard listing={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            listings && listings.length > 0 ? (
              <Text className="text-slate-500 text-sm mb-3">
                {listings.length} listing{listings.length !== 1 ? "s" : ""}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Feather name="inbox" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base">
                {selectedStatus === "all"
                  ? "No listings yet"
                  : `No ${selectedStatus} listings`}
              </Text>
              <Text className="text-slate-400 text-sm mt-1">
                {selectedStatus === "all"
                  ? "Create your first listing to start finding roommates"
                  : "Try selecting a different filter"}
              </Text>
              {selectedStatus === "all" && (
                <TouchableOpacity
                  onPress={() => router.push("/listing/create")}
                  className="bg-primary-500 rounded-xl px-6 py-3 mt-4 flex-row items-center gap-2"
                >
                  <Feather name="plus" size={18} color="#fff" />
                  <Text className="text-white font-semibold">Create Listing</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/listing/create")}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 8 }}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
