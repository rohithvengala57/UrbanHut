import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { useChatRooms } from "@/hooks/useChat";
import { formatRelativeDate } from "@/lib/format";

export default function ChatRoomsScreen() {
  const { data: rooms, isLoading, refetch, isRefetching } = useChatRooms();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-14 pb-3 border-b border-slate-100">
        <Text className="text-2xl font-bold text-slate-900">Messages</Text>
      </View>

      <FlatList
        data={rooms ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
          />
        }
        contentContainerStyle={
          (!rooms || rooms.length === 0) ? { flex: 1 } : { paddingVertical: 4 }
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${item.id}` as any)}
            className="flex-row items-center px-4 py-3 border-b border-slate-50"
            activeOpacity={0.7}
          >
            {/* Avatar */}
            <Avatar
              uri={item.other_user_avatar}
              name={item.other_user_name}
              size={52}
            />

            {/* Content */}
            <View className="flex-1 ml-3">
              <View className="flex-row items-center justify-between">
                <Text
                  className="font-semibold text-slate-900 text-base"
                  numberOfLines={1}
                >
                  {item.other_user_name}
                </Text>
                {item.last_message_at && (
                  <Text className="text-xs text-slate-400">
                    {formatRelativeDate(item.last_message_at)}
                  </Text>
                )}
              </View>

              {/* Listing context */}
              {item.listing_title && (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Feather name="home" size={10} color="#94a3b8" />
                  <Text
                    className="text-xs text-slate-400"
                    numberOfLines={1}
                  >
                    {item.listing_title}
                  </Text>
                </View>
              )}

              {/* Last message preview */}
              <View className="flex-row items-center justify-between mt-0.5">
                <Text
                  className={`text-sm flex-1 mr-2 ${
                    item.unread_count > 0
                      ? "text-slate-700 font-medium"
                      : "text-slate-400"
                  }`}
                  numberOfLines={1}
                >
                  {item.last_message ?? "No messages yet"}
                </Text>

                {/* Unread badge */}
                {item.unread_count > 0 && (
                  <View className="bg-primary-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
                    <Text className="text-white text-xs font-bold">
                      {item.unread_count > 99 ? "99+" : item.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Chevron */}
            <Feather
              name="chevron-right"
              size={16}
              color="#cbd5e1"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Feather name="message-circle" size={48} color="#cbd5e1" />
            <Text className="text-slate-400 mt-4 text-base font-medium">
              No conversations yet
            </Text>
            <Text className="text-slate-400 text-sm text-center mt-1 px-8">
              Express interest in a listing or get matched to start chatting
            </Text>
          </View>
        }
      />
    </View>
  );
}
