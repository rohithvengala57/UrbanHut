import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { InterestCard } from "@/components/listing/InterestCard";
import { MetricsFunnel } from "@/components/listing/MetricsFunnel";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useChatRooms } from "@/hooks/useChat";
import {
  useHostDecision,
  useListingInterests,
  useListingMetrics,
  useUpdateListing,
  useUpdateListingStatus,
} from "@/hooks/useHostListings";
import { useListing } from "@/hooks/useListings";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

type ManageTab = "overview" | "interests" | "messages" | "edit";

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
  } = useListingInterests(id, interestFilter);
  const { data: allInterests, isLoading: allInterestsLoading } = useListingInterests(id, "all");

  const { data: allChatRooms, isLoading: chatRoomsLoading } = useChatRooms();
  const listingChatRooms = allChatRooms?.filter(r => r.listing_id === id) || [];
  const unreadCount = listingChatRooms.reduce((acc, r) => acc + r.unread_count, 0);
  const interestByApplicantName = new Map((allInterests || []).map((i) => [i.applicant_name, i]));
  const interestCounts = (allInterests || []).reduce<Record<string, number>>(
    (acc, item) => {
      const normalizedStatus = item.status === "interested" ? "new" : item.status;
      acc.all += 1;
      acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
      return acc;
    },
    { all: 0, new: 0, shortlisted: 0, accepted: 0, rejected: 0, archived: 0 }
  );

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
        <ActivityIndicator size="large" color="#10b981" />
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

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-5 pt-6 pb-2">
        <View className="flex-row items-center gap-4 mb-5">
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-[40px] font-extrabold text-slate-900 tracking-tight">Manage Listing</Text>
        </View>

        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 bg-[#10b981] rounded-lg items-center justify-center">
              <Feather name="home" size={18} color="#fff" />
            </View>
            <View>
              <Text className="text-lg font-black text-slate-900 tracking-tight">urbanhut</Text>
              <Text className="text-[#10b981] text-[8px] font-bold tracking-widest uppercase -mt-1">find your next home</Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-4">
            <TouchableOpacity className="relative">
              <Feather name="bell" size={22} color="#0f172a" />
              <View className="absolute top-0 right-0 w-2 h-2 bg-[#ef4444] border-2 border-white rounded-full" />
            </TouchableOpacity>
            <View className="bg-emerald-50 px-2 py-1 rounded-full flex-row items-center gap-1.5 border border-emerald-100">
              <View className="w-1.5 h-1.5 bg-[#10b981] rounded-full" />
              <Text className="text-[#10b981] text-[10px] font-black uppercase tracking-wider">Active</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-4 mb-6">
          <View className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
            <Image source={{ uri: listing.images[0] }} className="w-full h-full" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-slate-900 mb-1" numberOfLines={1}>{listing.title}</Text>
            <Text className="text-slate-500 text-sm font-medium">
              <Text className="text-[#10b981] font-bold">{formatCurrency(listing.rent_monthly)}/mo</Text> · {listing.city}, {listing.state}
            </Text>
          </View>
          <TouchableOpacity 
            className="bg-white border border-slate-200 rounded-xl px-4 py-2"
            onPress={() => setActiveTab("edit")}
          >
            <View className="flex-row items-center gap-2">
              <Feather name="edit-2" size={14} color="#10b981" />
              <Text className="text-slate-700 text-xs font-bold">Edit Listing</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View className="flex-row justify-between">
          {(
            [
              { key: "overview", label: "Overview", icon: "bar-chart-2" },
              { key: "interests", label: "Interests", icon: "heart" },
              { key: "messages", label: "Messages", icon: "message-circle" },
              { key: "edit", label: "Edit Listing", icon: "edit-3" },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className="pb-3 px-1 items-center"
            >
              <View className="flex-row items-center gap-2 mb-1">
                <Feather
                  name={tab.icon as any}
                  size={16}
                  color={activeTab === tab.key ? "#10b981" : "#64748b"}
                />
                <Text
                  className={`text-xs font-bold ${
                    activeTab === tab.key ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {tab.label}
                  {tab.key === "messages" && unreadCount > 0 && (
                    <Text className="text-[#ef4444]"> {unreadCount}</Text>
                  )}
                </Text>
              </View>
              {activeTab === tab.key && (
                <View className="absolute bottom-0 w-full h-0.5 bg-[#10b981] rounded-full" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 bg-slate-50/50">
        {activeTab === "overview" && (
          <View className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-bold text-slate-900">Performance Overview</Text>
                <Text className="text-slate-400 text-xs font-medium">Last 30 days</Text>
              </View>
              <TouchableOpacity className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 flex-row items-center gap-2 shadow-sm">
                <Feather name="calendar" size={14} color="#64748b" />
                <Text className="text-slate-600 text-xs font-bold">Last 30 days</Text>
                <Feather name="chevron-down" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Metric Cards */}
            <View className="flex-row flex-wrap gap-3 mb-6">
              {[
                { label: "Views", value: String(metrics?.view_count || 0), icon: "eye", color: "#10b981", bg: "#ecfdf5" },
                { label: "Interests", value: String(metrics?.interest_count || 0), icon: "heart", color: "#f43f5e", bg: "#fff1f2" },
                { label: "Shortlisted", value: String(metrics?.shortlist_count || 0), icon: "bookmark", color: "#8b5cf6", bg: "#f5f3ff" },
                { label: "Accepted", value: String(metrics?.accept_count || 0), icon: "check-circle", color: "#10b981", bg: "#ecfdf5" },
              ].map((m, idx) => (
                <View key={idx} style={{ width: "48%" }} className="bg-white border border-slate-50 rounded-[24px] p-5 shadow-sm">
                  <View className="w-10 h-10 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: m.bg }}>
                    <Feather name={m.icon as any} size={18} color={m.color} />
                  </View>
                  <Text className="text-2xl font-black text-slate-900">{m.value}</Text>
                  <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider">{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Conversion Funnel */}
            <View className="bg-white border border-slate-50 rounded-[32px] p-6 mb-6 shadow-sm">
              <Text className="text-lg font-bold text-slate-900 mb-6">Conversion Funnel</Text>
              {metricsLoading ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <MetricsFunnel metrics={metrics || { 
                  listing_id: id as string,
                  view_count: 0, 
                  interest_count: 0, 
                  shortlist_count: 0, 
                  accept_count: 0,
                  reject_count: 0,
                  archive_count: 0,
                  funnel: []
                }} />
              )}
            </View>

            {/* Insights */}
            <TouchableOpacity className="bg-[#059669] rounded-[24px] p-5 flex-row items-center gap-4 mb-6">
              <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
                <Feather name="zap" size={24} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">Insights for you</Text>
                <Text className="text-white/80 text-[11px] font-medium leading-4 mt-1">
                  • Your listing is getting good visibility.{"\n"}
                  • Try adding more photos to increase interests.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Quick Actions & Snapshot */}
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1 gap-4">
                <Text className="text-base font-bold text-slate-900 ml-1">Quick Actions</Text>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    { label: "Edit Listing", icon: "edit-3", sub: "Update details" },
                    { label: "Update Photos", icon: "camera", sub: "Add new photos" },
                    { label: "View Insights", icon: "bar-chart-2", sub: "Detailed analytics" },
                    { label: "Boost Listing", icon: "zap", sub: "Increase visibility" },
                  ].map((a, idx) => (
                    <TouchableOpacity key={idx} style={{ width: "48%" }} className="bg-white border border-slate-50 rounded-2xl p-3 shadow-sm">
                      <Feather name={a.icon as any} size={16} color="#10b981" className="mb-2" />
                      <Text className="text-[11px] font-bold text-slate-900">{a.label}</Text>
                      <Text className="text-[9px] text-slate-400 font-medium">{a.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900 ml-1 mb-4">Listing Snapshot</Text>
                <View className="bg-white border border-slate-50 rounded-3xl p-4 shadow-sm gap-3">
                  {[
                    { label: "Rent", value: formatCurrency(listing.rent_monthly), icon: "home" },
                    { label: "Deposit", value: formatCurrency(listing.security_deposit || 0), icon: "shield" },
                    { label: "Available From", value: listing.available_from || "TBD", icon: "calendar" },
                  ].map((s, idx) => (
                    <View key={idx} className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Feather name={s.icon as any} size={12} color="#94a3b8" />
                        <Text className="text-slate-400 text-[10px] font-bold">{s.label}</Text>
                      </View>
                      <Text className="text-slate-900 text-[10px] font-black">{s.value}</Text>
                    </View>
                  ))}
                  <TouchableOpacity className="mt-2 items-center">
                    <Text className="text-[#10b981] text-[10px] font-bold">View Full Details ›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Listing Controls */}
            <View className="flex-row gap-4 mb-10">
              <TouchableOpacity 
                className="flex-1 bg-amber-50 rounded-[24px] p-5 flex-row items-center justify-between border border-amber-100"
                onPress={() => handleStatusChange("paused")}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-white rounded-2xl items-center justify-center">
                    <Feather name="pause" size={20} color="#f59e0b" />
                  </View>
                  <View>
                    <Text className="text-amber-700 font-bold text-sm">Pause Listing</Text>
                    <Text className="text-amber-600/70 text-[10px] font-medium">Temporarily hide</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#f59e0b" />
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 bg-red-50 rounded-[24px] p-5 flex-row items-center justify-between border border-red-100"
                onPress={() => handleStatusChange("closed")}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-white rounded-2xl items-center justify-center">
                    <Feather name="x" size={20} color="#ef4444" />
                  </View>
                  <View>
                    <Text className="text-red-700 font-bold text-sm">Close Listing</Text>
                    <Text className="text-red-600/70 text-[10px] font-medium">Permanently remove</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === "interests" && (
          <View className="flex-1 bg-white">
            {/* Interest Filter */}
            <View className="px-5 py-4 border-b border-slate-50">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  { key: "all", label: "Active" },
                  { key: "new", label: "New" },
                  { key: "shortlisted", label: "Shortlisted" },
                  { key: "accepted", label: "Accepted" },
                  { key: "rejected", label: "Rejected" },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setInterestFilter(f.key)}
                    className={`flex-row items-center gap-2 px-4 py-2 rounded-full mr-2 ${
                      interestFilter === f.key ? "bg-[#10b981]" : "bg-slate-100"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${interestFilter === f.key ? "text-white" : "text-slate-600"}`}>
                      {f.label}
                    </Text>
                    <View className={`w-5 h-5 rounded-full items-center justify-center ${interestFilter === f.key ? "bg-white/20" : "bg-white"}`}>
                      <Text className={`text-[10px] font-black ${interestFilter === f.key ? "text-white" : "text-slate-400"}`}>
                        {allInterestsLoading ? "…" : interestCounts[f.key] || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View className="flex-row items-center justify-end mt-4">
                <TouchableOpacity className="flex-row items-center gap-1 bg-slate-50 rounded-lg px-3 py-1.5">
                  <Text className="text-slate-500 text-[11px] font-bold">Sort by: Recently Active</Text>
                  <Feather name="chevron-down" size={12} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            {interestsLoading ? (
              <ActivityIndicator size="large" color="#10b981" className="mt-10" />
            ) : (interests || []).length > 0 ? (
              <View>
                {(interests || []).map((item: any) => (
                  <InterestCard
                    key={item.id}
                    interest={item}
                    onDecide={handleDecision}
                    isLoading={hostDecision.isPending}
                  />
                ))}
                
                {/* Footer Insight */}
                <View className="p-5">
                  <TouchableOpacity className="bg-emerald-50 rounded-[24px] p-5 flex-row items-center gap-4 border border-emerald-100">
                    <View className="w-12 h-12 bg-[#10b981] rounded-2xl items-center justify-center">
                      <Feather name="zap" size={24} color="#fff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-emerald-800 font-bold text-sm">Improve your matches</Text>
                      <Text className="text-emerald-700/70 text-[11px] font-medium leading-4 mt-1">
                        Adding more photos and details can help you get more quality interests.
                      </Text>
                    </View>
                    <TouchableOpacity className="bg-white border border-emerald-200 rounded-xl px-4 py-2">
                      <Text className="text-emerald-700 text-xs font-bold">Update Listing</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="py-20 px-8 items-center">
                <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                  <Feather name="users" size={30} color="#cbd5e1" />
                </View>
                <Text className="text-base font-bold text-slate-800">No interests found</Text>
                <Text className="text-sm text-slate-400 text-center mt-1">
                  No applicants match this filter right now.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "messages" && (
          <View className="flex-1 bg-white">
            {chatRoomsLoading ? (
              <View className="py-16 items-center">
                <ActivityIndicator size="large" color="#10b981" />
              </View>
            ) : listingChatRooms.length > 0 ? (
              <View>
                <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between">
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-2xl font-bold text-slate-900">Messages</Text>
                      {unreadCount > 0 && (
                        <View className="w-8 h-8 rounded-full bg-red-500 items-center justify-center">
                          <Text className="text-white font-bold">{unreadCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-slate-500 text-sm">All conversations from interested users</Text>
                  </View>
                  <TouchableOpacity className="flex-row items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200">
                    <Text className="text-slate-800 text-sm font-bold">All Messages</Text>
                    <Feather name="chevron-down" size={16} color="#0f172a" />
                  </TouchableOpacity>
                </View>
                {listingChatRooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    onPress={() => router.push(`/chat/${room.id}` as any)}
                    className="px-5 py-5 border-b border-slate-100 flex-row items-start"
                  >
                    <View className="relative">
                      <Avatar
                        uri={room.other_user_avatar}
                        name={room.other_user_name}
                        size={56}
                      />
                      {room.unread_count > 0 && (
                        <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </View>
                    <View className="flex-1 ml-4">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-2">
                          <View className="flex-row items-center gap-2 mb-1">
                            <Text className="text-base font-bold text-slate-900">{room.other_user_name}</Text>
                            {room.unread_count > 0 && (
                              <View className="bg-blue-100 rounded-lg px-2 py-1">
                                <Text className="text-blue-600 text-xs font-bold uppercase">New</Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text className="text-slate-600 text-sm">
                              {interestByApplicantName.get(room.other_user_name)?.applicant_occupation || "Renter"} · {interestByApplicantName.get(room.other_user_name)?.applicant_city || "Jersey City, NJ"}
                            </Text>
                            <View className="bg-rose-50 rounded-xl px-3 py-1">
                              <Text className="text-rose-500 text-sm font-semibold">
                                {Math.round(interestByApplicantName.get(room.other_user_name)?.compatibility_score || 70)}% match
                              </Text>
                            </View>
                          </View>
                          <Text className="text-slate-600 text-[15px] leading-7" numberOfLines={2}>
                            {room.last_message || "No messages yet"}
                          </Text>
                        </View>
                        <View className="items-end gap-4">
                          <Text className="text-slate-500 text-sm font-medium">
                            {room.last_message_at ? formatRelativeDate(room.last_message_at) : ""}
                          </Text>
                          <View className={`rounded-full px-4 py-2 ${room.unread_count > 0 ? "bg-emerald-50" : "bg-slate-100"}`}>
                            <Text className={`text-sm font-medium ${room.unread_count > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                              {room.unread_count > 0 ? "New" : room.status === "active" ? "Active" : "Inactive"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={32} color="#64748b" />
                  </TouchableOpacity>
                ))}
                <View className="p-5">
                  <TouchableOpacity className="bg-emerald-50 rounded-[24px] p-5 flex-row items-center gap-4 border border-emerald-100">
                    <View className="w-12 h-12 border-4 border-emerald-200 rounded-full items-center justify-center">
                      <Feather name="message-circle" size={22} color="#15803d" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-emerald-800 font-bold text-sm">Tip: Respond faster to get more acceptances</Text>
                      <Text className="text-emerald-700/80 text-[11px] font-medium leading-4 mt-1">
                        Listings with quick responses get 2x more conversions.
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={22} color="#15803d" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-20 bg-white">
                <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4">
                  <Feather name="message-circle" size={32} color="#cbd5e1" />
                </View>
                <Text className="text-slate-800 font-bold text-base">No messages yet</Text>
                <Text className="text-slate-400 text-sm mt-1 text-center px-10">
                  Conversations with accepted interests will appear here.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

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
