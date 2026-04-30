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

import { useAdminHouseholds, AdminHousehold } from "@/hooks/useAdminManagement";
import { Badge } from "@/components/ui/Badge";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  inactive: "#64748b",
  suspended: "#ef4444",
};

function HouseholdRow({ household }: { household: AdminHousehold }) {
  return (
    <View className="bg-white p-4 border-b border-slate-100 flex-row items-center">
      <View className="flex-1">
        <Text className="font-bold text-slate-900 mb-1">{household.name}</Text>
        <View className="flex-row items-center">
          <Feather name="users" size={10} color="#94a3b8" />
          <Text className="text-slate-500 text-xs ml-1 mr-3">{household.member_count} members</Text>
          <Text className="text-slate-400 text-[10px]">
            Created: {new Date(household.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Badge 
          label={household.status} 
          color={STATUS_COLORS[household.status] || "#64748b"} 
        />
      </View>
    </View>
  );
}

export default function HouseholdsManagement() {
  const { households, isLoading, error, refetch } = useAdminHouseholds();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredHouseholds = useMemo(() => {
    return (households || []).filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? h.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [households, search, statusFilter]);

  if (isLoading && (!households || households.length === 0)) {
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
            placeholder="Search households..."
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
          {["active", "inactive"].map((status) => (
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
        data={filteredHouseholds}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HouseholdRow household={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#0ea5e9"]} />
        }
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className="text-slate-400">No households found</Text>
          </View>
        }
      />
    </View>
  );
}
