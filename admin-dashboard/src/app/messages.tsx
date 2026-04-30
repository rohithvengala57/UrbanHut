import { Feather } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAdminMessages, AdminMessage } from "@/hooks/useAdminManagement";
import { Badge } from "@/components/ui/Badge";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  archived: "#64748b",
  blocked: "#ef4444",
};

function MessageRow({ message }: { message: AdminMessage }) {
  return (
    <View className="bg-white p-4 border-b border-slate-100 flex-row items-center">
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="font-bold text-slate-900">{message.user_a.full_name}</Text>
          <Text className="text-slate-400 mx-1 text-xs">&</Text>
          <Text className="font-bold text-slate-900">{message.user_b.full_name}</Text>
        </View>
        {message.listing_title && (
          <View className="flex-row items-center mb-1">
            <Feather name="home" size={10} color="#94a3b8" />
            <Text className="text-slate-500 text-[10px] ml-1">{message.listing_title}</Text>
          </View>
        )}
        <Text className="text-slate-500 text-xs italic" numberOfLines={1}>
          "{message.last_message || "No messages yet"}"
        </Text>
        <Text className="text-slate-400 text-[10px] mt-1">
          Last active: {new Date(message.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View className="items-end">
        <Badge 
          label={message.status} 
          color={STATUS_COLORS[message.status] || "#64748b"} 
        />
      </View>
    </View>
  );
}

export default function MessagesManagement() {
  const { messages, isLoading, error, refetch } = useAdminMessages();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredMessages = useMemo(() => {
    return (messages || []).filter((m) => {
      const matchesSearch = 
        m.user_a.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.user_b.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (m.listing_title || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.last_message || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? m.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [messages, search, statusFilter]);

  if (isLoading && (!messages || messages.length === 0)) {
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
            placeholder="Search messages..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={() => setStatusFilter(null)}
            className={`px-3 py-1 rounded-full mr-2 ${!statusFilter ? "bg-sky-600" : "bg-slate-100"}`}
          >
            <Text className={`text-xs font-medium ${!statusFilter ? "text-white" : "text-slate-600"}`}>All</Text>
          </TouchableOpacity>
          {["active", "archived", "blocked"].map((status) => (
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
        </View>
      </View>

      <FlatList
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageRow message={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#0ea5e9"]} />
        }
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className="text-slate-400">No messages found</Text>
          </View>
        }
      />
    </View>
  );
}
