import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { InterestCard } from "@/components/listing/InterestCard";
import { MetricsFunnel } from "@/components/listing/MetricsFunnel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  useHostDecision,
  useListingInterests,
  useListingMetrics,
  useUpdateListing,
  useUpdateListingStatus,
} from "@/hooks/useHostListings";
import { useListing } from "@/hooks/useListings";
import { formatCurrency } from "@/lib/format";

type ManageTab = "overview" | "interests" | "edit";

const INTEREST_FILTERS = [
  { key: "all", label: "Active" },
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ManageListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<ManageTab>("overview");
  const [interestFilter, setInterestFilter] = useState("all");

  const { data: listing, isLoading: listingLoading } = useListing(id);
  const { data: metrics, isLoading: metricsLoading } = useListingMetrics(id);
  const {
    data: interests,
    isLoading: interestsLoading,
    refetch: refetchInterests,
    isRefetching: interestsRefetching,
  } = useListingInterests(id, interestFilter);

  const hostDecision = useHostDecision(id);
  const updateStatus = useUpdateListingStatus();
  const updateListing = useUpdateListing();

  // Edit form state
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Initialize edit form when listing loads
  React.useEffect(() => {
    if (listing && Object.keys(editForm).length === 0) {
      setEditForm({
        title: listing.title || "",
        description: listing.description || "",
        rent_monthly: listing.rent_monthly ? String(listing.rent_monthly / 100) : "",
        security_deposit: listing.security_deposit ? String(listing.security_deposit / 100) : "",
        utilities_included: listing.utilities_included ? "true" : "false",
        utility_estimate: listing.utility_estimate ? String(listing.utility_estimate / 100) : "",
        available_spots: String(listing.available_spots || 1),
        current_occupants: String(listing.current_occupants || 0),
        available_from: listing.available_from || "",
        available_until: listing.available_until || "",
        lease_duration: listing.lease_duration || "",
        nearest_transit: listing.nearest_transit || "",
        transit_walk_mins: listing.transit_walk_mins ? String(listing.transit_walk_mins) : "",
        amenities: Array.isArray(listing.amenities) ? listing.amenities.join(", ") : "",
        house_rules: Array.isArray(listing.house_rules) ? listing.house_rules.join(", ") : "",
        nearby_universities: Array.isArray(listing.nearby_universities)
          ? listing.nearby_universities.join(", ")
          : "",
      });
    }
  }, [listing]);

  const handleDecision = (interestId: string, status: "shortlisted" | "accepted" | "rejected" | "archived") => {
    hostDecision.mutate(
      { interestId, status },
      {
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to update interest"),
      }
    );
  };

  const handleStatusChange = (newStatus: "active" | "paused" | "closed") => {
    const action = newStatus === "closed" ? "close" : newStatus === "paused" ? "pause" : "activate";
    const isDestructive = newStatus === "closed";

    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Listing`,
      isDestructive
        ? "Closing this listing will hide it from all searches. Are you sure?"
        : `Are you sure you want to ${action} this listing?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: isDestructive ? "destructive" : "default",
          onPress: () => {
            updateStatus.mutate(
              { listingId: id, status: newStatus },
              {
                onSuccess: () => Alert.alert("Success", `Listing ${newStatus}`),
                onError: (err: any) =>
                  Alert.alert("Error", err.response?.data?.detail || "Failed to update status"),
              }
            );
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      const data: Record<string, unknown> = {};
      if (editForm.title) data.title = editForm.title;
      if (editForm.description) data.description = editForm.description;
      if (editForm.rent_monthly) data.rent_monthly = parseInt(editForm.rent_monthly) * 100;
      if (editForm.security_deposit) data.security_deposit = parseInt(editForm.security_deposit) * 100;
      if (editForm.utilities_included) data.utilities_included = editForm.utilities_included === "true";
      if (editForm.utility_estimate) data.utility_estimate = parseInt(editForm.utility_estimate) * 100;
      if (editForm.available_spots) data.available_spots = parseInt(editForm.available_spots);
      if (editForm.current_occupants !== undefined) data.current_occupants = parseInt(editForm.current_occupants);
      if (editForm.available_from) data.available_from = editForm.available_from;
      if (editForm.available_until !== undefined) data.available_until = editForm.available_until || null;
      if (editForm.lease_duration) data.lease_duration = editForm.lease_duration;
      if (editForm.nearest_transit) data.nearest_transit = editForm.nearest_transit;
      if (editForm.transit_walk_mins) data.transit_walk_mins = parseInt(editForm.transit_walk_mins);
      if (editForm.amenities !== undefined) data.amenities = parseCsvList(editForm.amenities);
      if (editForm.house_rules !== undefined) data.house_rules = parseCsvList(editForm.house_rules);
      if (editForm.nearby_universities !== undefined) {
        data.nearby_universities = parseCsvList(editForm.nearby_universities);
      }

      await updateListing.mutateAsync({ listingId: id, data });
      Alert.alert("Success", "Listing updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Failed to update listing");
    } finally {
      setEditLoading(false);
    }
  };

  if (listingLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Feather name="alert-circle" size={48} color="#cbd5e1" />
        <Text className="text-slate-400 mt-4 text-base">Listing not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-500 font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    active: "#22c55e",
    paused: "#f59e0b",
    draft: "#64748b",
    closed: "#ef4444",
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-4 pt-2 pb-3 border-b border-slate-100">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
              {listing.title}
            </Text>
            <Text className="text-sm text-slate-500">
              {formatCurrency(listing.rent_monthly)}/mo · {listing.city}
            </Text>
          </View>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${STATUS_COLORS[listing.status] || "#64748b"}15` }}
          >
            <Text
              className="text-xs font-bold uppercase"
              style={{ color: STATUS_COLORS[listing.status] || "#64748b" }}
            >
              {listing.status}
            </Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View className="flex-row gap-1 bg-slate-100 rounded-xl p-1">
          {(
            [
              { key: "overview", label: "Overview", icon: "bar-chart-2" },
              { key: "interests", label: "Interests", icon: "heart" },
              { key: "edit", label: "Edit", icon: "edit-2" },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg ${
                activeTab === tab.key ? "bg-white shadow-sm" : ""
              }`}
            >
              <Feather
                name={tab.icon}
                size={14}
                color={activeTab === tab.key ? "#0ea5e9" : "#64748b"}
              />
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key ? "text-primary-500" : "text-slate-500"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {metricsLoading ? (
            <ActivityIndicator size="large" color="#0ea5e9" className="mt-10" />
          ) : metrics ? (
            <MetricsFunnel metrics={metrics} />
          ) : (
            <View className="items-center py-10">
              <Feather name="bar-chart-2" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 mt-3">No metrics available yet</Text>
            </View>
          )}

          {/* Status Control Panel */}
          <Card className="mt-4">
            <Text className="font-bold text-slate-900 mb-3">Listing Controls</Text>
            <View className="gap-2">
              {listing.status !== "active" && (
                <TouchableOpacity
                  className="flex-row items-center gap-3 bg-green-50 rounded-xl px-4 py-3"
                  onPress={() => handleStatusChange("active")}
                >
                  <Feather name="play-circle" size={20} color="#22c55e" />
                  <View className="flex-1">
                    <Text className="font-medium text-green-700">Activate</Text>
                    <Text className="text-xs text-green-600">Make visible in search results</Text>
                  </View>
                </TouchableOpacity>
              )}
              {listing.status === "active" && (
                <TouchableOpacity
                  className="flex-row items-center gap-3 bg-amber-50 rounded-xl px-4 py-3"
                  onPress={() => handleStatusChange("paused")}
                >
                  <Feather name="pause-circle" size={20} color="#f59e0b" />
                  <View className="flex-1">
                    <Text className="font-medium text-amber-700">Pause</Text>
                    <Text className="text-xs text-amber-600">Temporarily hide from searches</Text>
                  </View>
                </TouchableOpacity>
              )}
              {listing.status !== "closed" && (
                <TouchableOpacity
                  className="flex-row items-center gap-3 bg-red-50 rounded-xl px-4 py-3"
                  onPress={() => handleStatusChange("closed")}
                >
                  <Feather name="x-octagon" size={20} color="#ef4444" />
                  <View className="flex-1">
                    <Text className="font-medium text-red-700">Close</Text>
                    <Text className="text-xs text-red-600">Permanently remove from all searches</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </ScrollView>
      )}

      {activeTab === "interests" && (
        <View className="flex-1">
          {/* Interest Filter */}
          <View className="bg-white px-4 py-2 border-b border-slate-100">
            <FlatList
              horizontal
              data={INTEREST_FILTERS}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setInterestFilter(item.key)}
                  className={`rounded-full px-3 py-1.5 mr-2 ${
                    interestFilter === item.key ? "bg-primary-500" : "bg-slate-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      interestFilter === item.key ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {interestsLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
          ) : (
            <FlatList
              data={interests || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <InterestCard
                  interest={item}
                  onDecide={handleDecision}
                  isLoading={hostDecision.isPending}
                />
              )}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              onRefresh={refetchInterests}
              refreshing={interestsRefetching}
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <Feather name="inbox" size={48} color="#cbd5e1" />
                  <Text className="text-slate-400 mt-4 text-base">
                    {interestFilter === "all"
                      ? "No active interests yet"
                      : `No ${interestFilter} interests`}
                  </Text>
                  <Text className="text-slate-400 text-sm mt-1">
                    Interests from seekers will appear here
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === "edit" && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Input
              label="Title"
              placeholder="Listing title"
              value={editForm.title || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, title: v }))}
              autoCapitalize="sentences"
            />
            <Input
              label="Description"
              placeholder="Describe your listing"
              value={editForm.description || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, description: v }))}
              multiline
              autoCapitalize="sentences"
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Rent ($/mo)"
                  placeholder="1200"
                  value={editForm.rent_monthly || ""}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, rent_monthly: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Deposit ($)"
                  placeholder="1200"
                  value={editForm.security_deposit || ""}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, security_deposit: v }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text className="text-sm font-medium text-slate-700 mb-1.5">Utilities Included</Text>
            <View className="flex-row gap-2 mb-4">
              {[
                { key: "true", label: "Included" },
                { key: "false", label: "Separate" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setEditForm((p) => ({ ...p, utilities_included: option.key }))}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${
                    editForm.utilities_included === option.key
                      ? "bg-primary-50 border-primary-500"
                      : "border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      editForm.utilities_included === option.key
                        ? "text-primary-600"
                        : "text-slate-600"
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              label="Utility Estimate ($/mo)"
              placeholder="120"
              value={editForm.utility_estimate || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, utility_estimate: v }))}
              keyboardType="numeric"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Available Spots"
                  placeholder="1"
                  value={editForm.available_spots || ""}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, available_spots: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Current Occupants"
                  placeholder="0"
                  value={editForm.current_occupants || ""}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, current_occupants: v }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Available From"
                  placeholder="YYYY-MM-DD"
                  value={editForm.available_from || ""}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, available_from: v }))}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Available Until"
                  placeholder="YYYY-MM-DD"
                  value={editForm.available_until || ""}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, available_until: v }))}
                />
              </View>
            </View>
            <Input
              label="Lease Duration"
              placeholder="12 months"
              value={editForm.lease_duration || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, lease_duration: v }))}
            />
            <Input
              label="Nearest Transit"
              placeholder="Journal Square PATH"
              value={editForm.nearest_transit || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, nearest_transit: v }))}
            />
            <Input
              label="Walk to Transit (mins)"
              placeholder="5"
              value={editForm.transit_walk_mins || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, transit_walk_mins: v }))}
              keyboardType="numeric"
            />
            <Input
              label="Amenities"
              placeholder="Laundry, Gym, Parking"
              value={editForm.amenities || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, amenities: v }))}
              autoCapitalize="sentences"
            />
            <Input
              label="House Rules"
              placeholder="No smoking, Quiet after 10 PM"
              value={editForm.house_rules || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, house_rules: v }))}
              autoCapitalize="sentences"
            />
            <Input
              label="Nearby Universities"
              placeholder="NJIT, Rutgers Newark"
              value={editForm.nearby_universities || ""}
              onChangeText={(v) => setEditForm((p) => ({ ...p, nearby_universities: v }))}
              autoCapitalize="words"
            />

            <View className="mt-4">
              <Button
                title="Save Changes"
                onPress={handleSaveEdit}
                loading={editLoading}
                size="lg"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
