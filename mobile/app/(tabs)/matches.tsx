import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { useCreateRoom } from "@/hooks/useChat";
import type { InterestDetail } from "@/hooks/useHostListings";
import { useExpressInterest, useMyInterests } from "@/hooks/useListings";
import { useReceivedInterests } from "@/hooks/useMatching";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import api from "@/services/api";

// ─── Tab definitions ────────────────────────────────────────────────────────
type TabKey = "recommendations" | "inbox" | "connections";

const TABS: { key: TabKey; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "recommendations", label: "Recommendations", icon: "heart" },
  { key: "inbox", label: "Inbox", icon: "inbox" },
  { key: "connections", label: "Connections", icon: "users" },
];

// ─── Inbox filter chips ─────────────────────────────────────────────────────
const INBOX_FILTERS = ["all", "new", "shortlisted", "accepted", "rejected"] as const;
type InboxFilter = (typeof INBOX_FILTERS)[number];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-blue-50", text: "text-blue-600" },
  shortlisted: { bg: "bg-amber-50", text: "text-amber-600" },
  accepted: { bg: "bg-green-50", text: "text-green-600" },
  rejected: { bg: "bg-red-50", text: "text-red-600" },
};

// ─── Main screen ────────────────────────────────────────────────────────────
export default function MatchesScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommendations");
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");

  // ── Recommendations data ────────────────────────────────────────────────
  const { data: recommendations, isLoading: recsLoading } = useQuery({
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
    expressInterest.mutate(
      { to_listing_id: listingId },
      {
        onSuccess: () =>
          Alert.alert("Interest Sent!", "The host will be notified of your interest."),
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to send interest"),
      },
    );
  };

  // ── Inbox data (UH-301) ────────────────────────────────────────────────
  const { data: receivedInterests, isLoading: inboxLoading } = useReceivedInterests(
    inboxFilter === "all" ? undefined : inboxFilter,
  );

  // ── Connections data ───────────────────────────────────────────────────
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const response = await api.get("/matching/connections");
      return response.data as InterestDetail[];
    },
  });

  const createRoom = useCreateRoom();

  const handleChat = (interestId: string) => {
    createRoom.mutate(interestId, {
      onSuccess: (room) => {
        router.push(`/chat/${room.id}` as any);
      },
      onError: (err: any) =>
        Alert.alert("Error", err.response?.data?.detail || "Failed to open chat"),
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-slate-50">
      {/* ── Segmented tab bar ──────────────────────────────────────────── */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row bg-slate-100 rounded-xl p-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 ${
                  isActive ? "bg-white shadow-sm" : ""
                }`}
              >
                <Feather
                  name={tab.icon}
                  size={14}
                  color={isActive ? "#0ea5e9" : "#94a3b8"}
                />
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? "text-primary-600" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </Text>
                {tab.key === "inbox" && receivedInterests && receivedInterests.length > 0 && (
                  <View className="bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                    <Text className="text-white text-[10px] font-bold">
                      {receivedInterests.length}
                    </Text>
                  </View>
                )}
                {tab.key === "connections" && connections && connections.length > 0 && (
                  <View className="bg-primary-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                    <Text className="text-white text-[10px] font-bold">
                      {connections.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      {activeTab === "recommendations" && (
        <RecommendationsTab
          recommendations={recommendations}
          isLoading={recsLoading}
          myInterests={myInterests}
          expressInterest={expressInterest}
          onInterest={handleInterest}
        />
      )}

      {activeTab === "inbox" && (
        <InboxTab
          interests={receivedInterests}
          isLoading={inboxLoading}
          filter={inboxFilter}
          onFilterChange={setInboxFilter}
        />
      )}

      {activeTab === "connections" && (
        <ConnectionsTab
          connections={connections}
          isLoading={connectionsLoading}
          onChat={handleChat}
          isChatLoading={createRoom.isPending}
        />
      )}
    </View>
  );
}

// ─── Recommendations Tab ────────────────────────────────────────────────────
function RecommendationsTab({
  recommendations,
  isLoading,
  myInterests,
  expressInterest,
  onInterest,
}: {
  recommendations: any[] | undefined;
  isLoading: boolean;
  myInterests: any[] | undefined;
  expressInterest: ReturnType<typeof useExpressInterest>;
  onInterest: (listingId: string) => void;
}) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <FlatList
      data={recommendations || []}
      keyExtractor={(item) => item.listing_id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => {
        const sent = myInterests?.some(
          (i: { to_listing_id: string | null }) => i.to_listing_id === item.listing_id,
        );
        return (
          <Card className="mb-3">
            <View className="flex-row">
              <View className="w-24 h-24 bg-slate-200 rounded-xl overflow-hidden mr-3">
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0] }} className="w-full h-full" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Feather name="home" size={24} color="#94a3b8" />
                  </View>
                )}
              </View>

              <View className="flex-1">
                <Text className="font-bold text-slate-900 text-base" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-slate-500 text-sm">{item.city}</Text>

                <View className="flex-row items-center gap-3 mt-1">
                  <Text className="font-bold text-primary-600">
                    {formatCurrency(item.rent_monthly)}/mo
                  </Text>
                  <View className="bg-green-50 rounded-full px-2 py-0.5">
                    <Text className="text-green-600 text-xs font-bold">
                      {Math.round(item.compatibility.total_score)}% Match
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2 mt-2">
                  <TouchableOpacity
                    onPress={() => onInterest(item.listing_id)}
                    disabled={sent || expressInterest.isPending}
                    className={`rounded-lg px-3 py-1.5 flex-row items-center gap-1 ${
                      sent ? "bg-slate-200" : "bg-primary-500"
                    }`}
                  >
                    <Feather
                      name={sent ? "check" : "heart"}
                      size={12}
                      color={sent ? "#64748b" : "#fff"}
                    />
                    <Text
                      className={`text-xs font-medium ${sent ? "text-slate-500" : "text-white"}`}
                    >
                      {sent ? "Sent" : "Interested"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Card>
        );
      }}
      ListEmptyComponent={
        <View className="items-center justify-center py-20">
          <Feather name="heart" size={48} color="#cbd5e1" />
          <Text className="text-slate-400 mt-4 text-base">No recommendations yet</Text>
          <Text className="text-slate-400 text-sm text-center mt-1">
            Complete your profile to get matched with compatible roommates
          </Text>
        </View>
      }
    />
  );
}

// ─── Inbox Tab (UH-301) ────────────────────────────────────────────────────
function InboxTab({
  interests,
  isLoading,
  filter,
  onFilterChange,
}: {
  interests: InterestDetail[] | undefined;
  isLoading: boolean;
  filter: InboxFilter;
  onFilterChange: (f: InboxFilter) => void;
}) {
  return (
    <View className="flex-1">
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {INBOX_FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => onFilterChange(f)}
              className={`rounded-full px-3.5 py-1.5 ${
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={interests || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <InboxCard interest={item} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Feather name="inbox" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base">No interests received</Text>
              <Text className="text-slate-400 text-sm text-center mt-1">
                When someone is interested in your listing, it will appear here
              </Text>
            </View>
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
        {/* Avatar */}
        <View className="mr-3">
          <Avatar uri={interest.applicant_avatar} name={interest.applicant_name} size={48} />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Header row: name + timestamp */}
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-slate-900 text-base" numberOfLines={1}>
              {interest.applicant_name}
            </Text>
            <Text className="text-slate-400 text-xs">{formatRelativeDate(interest.created_at)}</Text>
          </View>

          {/* Trust + compatibility row */}
          <View className="flex-row items-center gap-3 mt-1">
            <TrustBadge score={interest.applicant_trust_score} size="sm" />
            {interest.compatibility_score != null && (
              <View className="bg-green-50 rounded-full px-2 py-0.5">
                <Text className="text-green-600 text-xs font-bold">
                  {Math.round(interest.compatibility_score)}% Match
                </Text>
              </View>
            )}
          </View>

          {/* Message preview */}
          {interest.message && (
            <Text className="text-slate-500 text-sm mt-1.5" numberOfLines={2}>
              {interest.message}
            </Text>
          )}

          {/* Footer: listing context + status badge */}
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

// ─── Connections Tab ────────────────────────────────────────────────────────
function ConnectionsTab({
  connections,
  isLoading,
  onChat,
  isChatLoading,
}: {
  connections: InterestDetail[] | undefined;
  isLoading: boolean;
  onChat: (interestId: string) => void;
  isChatLoading: boolean;
}) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <FlatList
      data={connections || []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <Card className="mb-3">
          <View className="flex-row items-center">
            {/* Avatar */}
            <View className="mr-3">
              <Avatar uri={item.applicant_avatar} name={item.applicant_name} size={48} />
            </View>

            {/* Info */}
            <View className="flex-1">
              <Text className="font-bold text-slate-900 text-base" numberOfLines={1}>
                {item.applicant_name}
              </Text>

              <View className="flex-row items-center gap-2 mt-0.5">
                <TrustBadge score={item.applicant_trust_score} size="sm" showLabel={false} />
                {item.compatibility_score != null && (
                  <View className="bg-green-50 rounded-full px-2 py-0.5">
                    <Text className="text-green-600 text-xs font-bold">
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

            {/* Chat button */}
            <TouchableOpacity
              onPress={() => onChat(item.id)}
              disabled={isChatLoading}
              className="bg-primary-500 rounded-xl px-4 py-2.5 flex-row items-center gap-1.5"
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
        <View className="items-center justify-center py-20">
          <Feather name="users" size={48} color="#cbd5e1" />
          <Text className="text-slate-400 mt-4 text-base">No connections yet</Text>
          <Text className="text-slate-400 text-sm text-center mt-1">
            When a match is accepted, you can start chatting here
          </Text>
        </View>
      }
    />
  );
}
