import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCreateRoom } from "@/hooks/useChat";
import type { InterestDetail } from "@/hooks/useHostListings";
import { useExpressInterest, useMyInterests } from "@/hooks/useListings";
import { useReceivedInterests } from "@/hooks/useMatching";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import api from "@/services/api";

type TabKey = "recommendations" | "inbox" | "connections";

const TABS: { key: TabKey; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "recommendations", label: "Discover", icon: "heart" },
  { key: "inbox", label: "Inbox", icon: "inbox" },
  { key: "connections", label: "Connected", icon: "users" },
];

const INBOX_FILTERS = ["all", "new", "shortlisted", "accepted", "rejected"] as const;
type InboxFilter = (typeof INBOX_FILTERS)[number];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-blue-50", text: "text-blue-600" },
  shortlisted: { bg: "bg-amber-50", text: "text-amber-600" },
  accepted: { bg: "bg-green-50", text: "text-green-600" },
  rejected: { bg: "bg-red-50", text: "text-red-600" },
};

export default function MatchesScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommendations");
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading: recsLoading, isError: recsError, isRefetching: recsRefetching, refetch: refetchRecs } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const response = await api.get("/matching/recommendations");
      return response.data;
    },
  });

  const { data: myInterests } = useMyInterests();
  const expressInterest = useExpressInterest();

  const handleInterest = (listingId: string) => {
    const alreadySent = myInterests?.some(
      (i: { to_listing_id: string | null }) => i.to_listing_id === listingId,
    );
    if (alreadySent) return;

    const performMutation = () => {
      expressInterest.mutate(
        { to_listing_id: listingId },
        {
          onError: (err: any) =>
            Alert.alert(
              "Error",
              err.response?.data?.detail || "Failed to send interest",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Retry", onPress: performMutation }
              ]
            ),
        },
      );
    };

    performMutation();
  };

  const {
    data: allReceivedInterests,
    isLoading: inboxLoading,
    isError: inboxError,
    isRefetching: inboxRefetching,
    refetch: refetchInbox,
  } = useReceivedInterests("all");

  const filteredInterests = useMemo(() => {
    if (!allReceivedInterests) return [];
    if (inboxFilter === "all") return allReceivedInterests;
    return allReceivedInterests.filter(i => i.status === inboxFilter);
  }, [allReceivedInterests, inboxFilter]);

  const inboxCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allReceivedInterests?.length || 0 };
    allReceivedInterests?.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return counts;
  }, [allReceivedInterests]);

  const {
    data: connections,
    isLoading: connectionsLoading,
    isError: connectionsError,
    isRefetching: connectionsRefetching,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const response = await api.get("/matching/connections");
      return response.data as InterestDetail[];
    },
  });

  const createRoom = useCreateRoom();

  const handleChat = (interestId: string) => {
    createRoom.mutate(interestId, {
      onSuccess: (room) => router.push(`/chat/${room.id}` as any),
      onError: (err: any) =>
        Alert.alert("Error", err.response?.data?.detail || "Failed to open chat"),
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Tab bar */}
      <View className="bg-white px-4 pt-3 pb-0 border-b border-slate-100">
        <View className="flex-row">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === "inbox" 
              ? inboxCounts.new || 0 
              : tab.key === "connections" 
                ? connections?.length || 0 
                : 0;
            
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="flex-1 items-center pb-3"
                style={{ borderBottomWidth: 2, borderBottomColor: isActive ? "#0ea5e9" : "transparent" }}
              >
                <View className="flex-row items-center gap-1.5">
                  <Feather name={tab.icon} size={15} color={isActive ? "#0ea5e9" : "#94a3b8"} />
                  <Text
                    className={`text-sm font-semibold ${
                      isActive ? "text-primary-600" : "text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View className={`${tab.key === "inbox" ? "bg-red-500" : "bg-primary-500"} rounded-full min-w-[18px] h-[18px] items-center justify-center px-1`}>
                      <Text className="text-white text-[10px] font-bold">
                        {count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeTab === "recommendations" && (
        <RecommendationsTab
          recommendations={recommendations}
          isLoading={recsLoading}
          isError={recsError}
          isRefreshing={recsRefetching}
          onRefresh={refetchRecs}
          myInterests={myInterests}
          expressInterest={expressInterest}
          onInterest={handleInterest}
        />
      )}

      {activeTab === "inbox" && (
        <InboxTab
          interests={filteredInterests}
          counts={inboxCounts}
          isLoading={inboxLoading}
          isError={inboxError}
          isRefreshing={inboxRefetching}
          onRefresh={refetchInbox}
          filter={inboxFilter}
          onFilterChange={setInboxFilter}
        />
      )}

      {activeTab === "connections" && (
        <ConnectionsTab
          connections={connections}
          isLoading={connectionsLoading}
          isError={connectionsError}
          isRefreshing={connectionsRefetching}
          onRefresh={refetchConnections}
          onChat={handleChat}
          isChatLoading={createRoom.isPending}
        />
      )}
    </View>
  );
}

/* ── Recommendations: full-width image cards ── */
function RecommendationsTab({
  recommendations,
  isLoading,
  isError,
  isRefreshing,
  onRefresh,
  myInterests,
  expressInterest,
  onInterest,
}: {
  recommendations: any[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  myInterests: any[] | undefined;
  expressInterest: ReturnType<typeof useExpressInterest>;
  onInterest: (listingId: string) => void;
}) {
  if (isLoading && !isRefreshing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#ef4444" />
        </View>
        <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load recommendations</Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={onRefresh}
          className="mt-6 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={recommendations || []}
      keyExtractor={(item) => item.listing_id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      onEndReached={() => {
        // Since backend is limited to 20, we just show a message for now
      }}
      ListFooterComponent={
        recommendations && recommendations.length > 0 ? (
          <View className="py-6 items-center">
            <Text className="text-slate-400 text-xs">No more recommendations for now</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const sent = myInterests?.some(
          (i: { to_listing_id: string | null }) => i.to_listing_id === item.listing_id,
        );
        const matchScore = Math.round(item.compatibility?.total_score ?? 0);
        return (
          <View
            className="mb-4 rounded-3xl overflow-hidden bg-white"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            {/* Image */}
            <View className="h-48 bg-slate-200">
              {item.images && item.images.length > 0 ? (
                <Image
                  source={{ uri: item.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-slate-100">
                  <Feather name="home" size={36} color="#94a3b8" />
                </View>
              )}

              {/* Gradient overlay */}
              <View className="absolute bottom-0 left-0 right-0 h-24">
                <Svg
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                  width="100%"
                  height="100%"
                  preserveAspectRatio="none"
                >
                  <Defs>
                    <LinearGradient id="recGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                      <Stop offset="0" stopColor="#000" stopOpacity="0" />
                      <Stop offset="1" stopColor="#000" stopOpacity="0.65" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#recGrad)" />
                </Svg>
                <View className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex-row justify-between items-end">
                  <View>
                    <Text className="text-white text-lg font-bold">
                      {formatCurrency(item.rent_monthly)}/mo
                    </Text>
                    <Text className="text-white/75 text-sm" numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                  <View className="bg-emerald-500 rounded-full px-3 py-1">
                    <Text className="text-white text-sm font-bold">{matchScore}% Match</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Details row */}
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1">
                  <Feather name="map-pin" size={13} color="#64748b" />
                  <Text className="text-slate-500 text-sm">{item.city}</Text>
                </View>
                {item.compatibility?.reasons?.[0] && (
                  <View className="bg-primary-50 rounded-full px-2.5 py-1">
                    <Text className="text-primary-600 text-xs font-medium">
                      {item.compatibility.reasons[0]}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => onInterest(item.listing_id)}
                disabled={sent || expressInterest.isPending}
                className={`rounded-2xl px-4 py-2 flex-row items-center gap-1.5 ${
                  sent ? "bg-slate-100" : "bg-primary-500"
                }`}
                activeOpacity={0.85}
              >
                <Feather
                  name={sent ? "check" : "heart"}
                  size={14}
                  color={sent ? "#64748b" : "#fff"}
                />
                <Text
                  className={`text-sm font-semibold ${
                    sent ? "text-slate-500" : "text-white"
                  }`}
                >
                  {sent ? "Sent" : "Interested"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="heart"
          title="No recommendations yet"
          message="Complete your profile to get matched with compatible roommates"
          cta={{
            label: "Complete Profile",
            onPress: () => router.push("/profile/edit"),
          }}
        />
      }
    />
  );
}

/* ── Inbox tab ── */
function InboxTab({
  interests,
  counts,
  isLoading,
  isError,
  isRefreshing,
  onRefresh,
  filter,
  onFilterChange,
}: {
  interests: InterestDetail[] | undefined;
  counts: Record<string, number>;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  filter: InboxFilter;
  onFilterChange: (f: InboxFilter) => void;
}) {
  return (
    <View className="flex-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {INBOX_FILTERS.map((f) => {
          const isActive = filter === f;
          const count = counts[f] || 0;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => onFilterChange(f)}
              className={`rounded-full px-3.5 py-1.5 flex-row items-center gap-1.5 ${
                isActive ? "bg-primary-500" : "bg-white border border-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-semibold capitalize ${
                  isActive ? "text-white" : "text-slate-500"
                }`}
              >
                {f}
              </Text>
              {count > 0 && (
                <View className={`rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : "bg-slate-100"}`}>
                  <Text className={`text-[10px] font-bold ${isActive ? "text-white" : "text-slate-500"}`}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
            <Feather name="wifi-off" size={28} color="#ef4444" />
          </View>
          <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load inbox</Text>
          <Text className="text-slate-400 text-sm text-center mt-2">
            Pull to refresh or retry.
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="mt-6 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={interests || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => <InboxCard interest={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title="No interests received"
              message={filter === "all" 
                ? "When someone is interested in your listing, it will appear here"
                : `No interests found with status "${filter}"`}
            />
          }
        />
      )}
    </View>
  );
}

function InboxCard({ interest }: { interest: InterestDetail }) {
  const statusStyle = STATUS_COLORS[interest.status] || STATUS_COLORS.new;
  return (
    <Card className="mb-3">
      <View className="flex-row items-start">
        <View className="mr-3">
          <Avatar uri={interest.applicant_avatar} name={interest.applicant_name} size={48} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-slate-900 text-base" numberOfLines={1}>
              {interest.applicant_name}
            </Text>
            <Text className="text-slate-400 text-xs">
              {formatRelativeDate(interest.created_at)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2 mt-1">
            <TrustBadge score={interest.applicant_trust_score} size="sm" />
            {interest.compatibility_score != null && (
              <View className="bg-emerald-50 rounded-full px-2 py-0.5">
                <Text className="text-emerald-600 text-xs font-bold">
                  {Math.round(interest.compatibility_score)}% Match
                </Text>
              </View>
            )}
          </View>
          {interest.message && (
            <Text className="text-slate-500 text-sm mt-1.5" numberOfLines={2}>
              {interest.message}
            </Text>
          )}
          <View className="flex-row items-center justify-between mt-2">
            {interest.listing_title && (
              <View className="flex-row items-center gap-1 flex-1 mr-2">
                <Feather name="home" size={12} color="#94a3b8" />
                <Text className="text-slate-400 text-xs" numberOfLines={1}>
                  {interest.listing_title}
                </Text>
              </View>
            )}
            <View className={`rounded-full px-2.5 py-0.5 ${statusStyle.bg}`}>
              <Text className={`text-xs font-semibold capitalize ${statusStyle.text}`}>
                {interest.status}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

/* ── Connections tab ── */
function ConnectionsTab({
  connections,
  isLoading,
  isError,
  isRefreshing,
  onRefresh,
  onChat,
  isChatLoading,
}: {
  connections: InterestDetail[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onChat: (interestId: string) => void;
  isChatLoading: boolean;
}) {
  if (isLoading && !isRefreshing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#ef4444" />
        </View>
        <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load connections</Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={onRefresh}
          className="mt-6 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={connections || []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <Card className="mb-3">
          <View className="flex-row items-center">
            <View className="mr-3">
              <Avatar uri={item.applicant_avatar} name={item.applicant_name} size={52} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-900 text-base" numberOfLines={1}>
                {item.applicant_name}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <TrustBadge score={item.applicant_trust_score} size="sm" showLabel={false} />
                {item.compatibility_score != null && (
                  <View className="bg-emerald-50 rounded-full px-2 py-0.5">
                    <Text className="text-emerald-600 text-xs font-bold">
                      {Math.round(item.compatibility_score)}% Match
                    </Text>
                  </View>
                )}
              </View>
              {item.listing_title && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Feather name="home" size={12} color="#94a3b8" />
                  <Text className="text-slate-400 text-xs" numberOfLines={1}>
                    {item.listing_title}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => onChat(item.id)}
              disabled={isChatLoading}
              className="bg-primary-500 rounded-2xl px-4 py-2.5 flex-row items-center gap-1.5"
              activeOpacity={0.85}
            >
              {isChatLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="message-circle" size={14} color="#fff" />
                  <Text className="text-white text-sm font-semibold">Chat</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="users"
          title="No connections yet"
          message="When a match is accepted, you can start chatting here"
        />
      }
    />
  );
}
