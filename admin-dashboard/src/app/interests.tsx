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

import { useAdminInterests, AdminInterest } from "@/hooks/useAdminManagement";
import { Badge } from "@/components/ui/Badge";

const STATUS_COLORS: Record<string, string> = {
  interested: "#0ea5e9",
  contacted: "#8b5cf6",
  matched: "#10b981",
  declined: "#ef4444",
};

function InterestRow({ interest }: { interest: AdminInterest }) {
  const targetTitle = interest.to_listing?.title || interest.to_user?.full_name || "Unknown";
  const targetType = interest.to_listing ? "Listing" : "User";

  return (
    <View className="bg-white p-4 border-b border-slate-100 flex-row items-center">
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="font-bold text-slate-900">{interest.from_user.full_name}</Text>
          <Feather name="arrow-right" size={12} color="#94a3b8" className="mx-2" />
          <Text className="text-slate-600 font-medium" numberOfLines={1}>{targetTitle}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-slate-400 text-[10px] uppercase font-bold mr-3">{targetType}</Text>
          <View className="flex-row items-center mr-3">
            <Feather name="zap" size={10} color="#f59e0b" />
            <Text className="text-amber-600 text-[10px] font-bold ml-0.5">
              {interest.compatibility_score}% Match
            </Text>
          </View>
          <Text className="text-slate-400 text-[10px]">
            {new Date(interest.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Badge 
          label={interest.status} 
          color={STATUS_COLORS[interest.status] || "#64748b"} 
        />
      </View>
    </View>
  );
}

export default function InterestsManagement() {
  const { interests, isLoading, error, refetch } = useAdminInterests();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredInterests = useMemo(() => {
    return (interests || []).filter((i) => {
      const matchesSearch = 
        i.from_user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (i.to_listing?.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.to_user?.full_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? i.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [interests, search, statusFilter]);

  if (isLoading && (!interests || interests.length === 0)) {
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
            placeholder="Search interests..."
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
          {["interested", "contacted", "matched", "declined"].map((status) => (
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
        data={filteredInterests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InterestRow interest={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#0ea5e9"]} />
        }
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className="text-slate-400">No interests found</Text>
          </View>
        }
      />
    </View>
  );
}
