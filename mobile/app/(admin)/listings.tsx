import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { AdminListingRow, fetchAdminListings } from "@/hooks/useAdminMetrics";

function ListingCard({ listing }: { listing: AdminListingRow }) {
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
      <Text className="text-slate-900 font-semibold">{listing.title}</Text>
      <Text className="text-xs text-slate-500 mt-0.5">
        {listing.city}, {listing.state} • ${listing.rent_monthly}/mo
      </Text>
      <View className="flex-row mt-3">
        <Text className="text-xs text-slate-500">Host: </Text>
        <Text className="text-xs text-slate-700 font-semibold">{listing.host_name}</Text>
      </View>
      <View className="flex-row mt-1">
        <Text className="text-xs text-slate-500">Status: </Text>
        <Text className="text-xs text-slate-700 font-semibold">{listing.status}</Text>
        <Text className="text-xs text-slate-500 ml-4">Views: </Text>
        <Text className="text-xs text-slate-700 font-semibold">{listing.view_count}</Text>
      </View>
      <View className="flex-row mt-1">
        <Text className="text-xs text-slate-500">Interest: </Text>
        <Text className="text-xs text-slate-700 font-semibold">{listing.interest_count}</Text>
        <Text className="text-xs text-slate-500 ml-4">Verified: </Text>
        <Text className="text-xs text-slate-700 font-semibold">{listing.is_verified ? "Yes" : "No"}</Text>
      </View>
    </View>
  );
}

export default function Listings() {
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await fetchAdminListings(40);
      setListings(rows);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load listings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  if (isLoading && listings.length === 0) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadListings} color="#6366f1" />}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-slate-900">Listing Management</Text>
        <View className="bg-indigo-100 px-2 py-1 rounded-full">
          <Text className="text-indigo-700 text-xs font-semibold">{listings.length} listings</Text>
        </View>
      </View>
      {error ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 flex-row items-center">
          <Feather name="alert-triangle" size={16} color="#dc2626" />
          <Text className="text-red-700 text-sm ml-2 flex-1">{error}</Text>
        </View>
      ) : null}
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </ScrollView>
  );
}
