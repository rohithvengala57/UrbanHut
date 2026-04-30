import { Feather } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAdminListings, AdminListing } from "@/hooks/useAdminManagement";
import { Badge } from "@/components/ui/Badge";

const STATUS_COLORS: Record<string, string> = {
  published: "#10b981",
  draft: "#64748b",
  paused: "#f59e0b",
  closed: "#ef4444",
};

function ListingRow({ listing }: { listing: AdminListing }) {
  return (
    <View className="bg-white p-4 border-b border-slate-100 flex-row items-center">
      <View className="flex-1">
        <Text className="font-bold text-slate-900 mb-1" numberOfLines={1}>
          {listing.title}
        </Text>
        <View className="flex-row items-center mb-1">
          <Feather name="user" size={10} color="#94a3b8" />
          <Text className="text-slate-500 text-xs ml-1 mr-3">{listing.owner.full_name}</Text>
          <Feather name="map-pin" size={10} color="#94a3b8" />
          <Text className="text-slate-500 text-xs ml-1">{listing.city}</Text>
        </View>
        <Text className="text-slate-400 text-[10px]">
          Created: {new Date(listing.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View className="items-end ml-4">
        <View className="mb-2">
          <Badge 
            label={listing.status} 
            color={STATUS_COLORS[listing.status] || "#64748b"} 
          />
        </View>
        <View className="flex-row items-center">
          <View className="flex-row items-center mr-3">
            <Feather name="eye" size={10} color="#64748b" />
            <Text className="text-xs text-slate-600 ml-1">{listing.metrics.view_count}</Text>
          </View>
          <View className="flex-row items-center">
            <Feather name="heart" size={10} color="#64748b" />
            <Text className="text-xs text-slate-600 ml-1">{listing.metrics.interest_count}</Text>
          </View>
        </View>
        {listing.rent_monthly && (
          <Text className="text-sky-600 font-bold mt-1">${listing.rent_monthly}/mo</Text>
        )}
      </View>
    </View>
  );
}

export default function ListingsManagement() {
  const { listings, isLoading, error, refetch } = useAdminListings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      const matchesSearch = 
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.owner.full_name.toLowerCase().includes(search.toLowerCase()) ||
        l.city.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? l.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [listings, search, statusFilter]);

  if (isLoading && listings.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="p-4 bg-white border-b border-slate-200">
        <View className="flex-row items-center bg-slate-100 px-3 py-2 rounded-lg mb-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-slate-900"
            placeholder="Search listings..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-row">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              onPress={() => setStatusFilter(null)}
              className={`px-3 py-1 rounded-full mr-2 ${!statusFilter ? "bg-sky-600" : "bg-slate-100"}`}
            >
              <Text className={`text-xs font-medium ${!statusFilter ? "text-white" : "text-slate-600"}`}>All</Text>
            </TouchableOpacity>
            {["published", "draft", "paused", "closed"].map((status) => (
              <TouchableOpacity 
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full mr-2 ${statusFilter === status ? "bg-sky-600" : "bg-slate-100"}`}
              >
                <Text className={`text-xs font-medium ${statusFilter === status ? "text-white" : "text-slate-600"}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingRow listing={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#0ea5e9"]} />
        }
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className="text-slate-400">No listings found</Text>
          </View>
        }
      />
    </View>
  );
}
