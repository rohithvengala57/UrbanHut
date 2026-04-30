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

import { useAdminUsers, AdminUser } from "@/hooks/useAdminManagement";
import { Badge } from "@/components/ui/Badge";

const ROLE_COLORS: Record<string, string> = {
  admin: "#0ea5e9",
  member: "#64748b",
  host: "#f59e0b",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  inactive: "#64748b",
  suspended: "#ef4444",
};

function UserRow({ user }: { user: AdminUser }) {
  return (
    <View className="bg-white p-4 border-b border-slate-100 flex-row items-center">
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="font-bold text-slate-900 mr-2">{user.full_name}</Text>
          <Badge 
            label={user.role} 
            color={ROLE_COLORS[user.role] || "#64748b"} 
          />
        </View>
        <Text className="text-slate-500 text-xs mb-1">{user.email}</Text>
        <Text className="text-slate-400 text-[10px]">
          Joined: {new Date(user.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View className="items-end">
        <View className="mb-2">
          <Badge 
            label={user.status} 
            color={STATUS_COLORS[user.status] || "#64748b"} 
          />
        </View>
        <View className="flex-row items-center">
          <Feather name="shield" size={10} color="#64748b" />
          <Text className="text-xs font-semibold text-slate-700 ml-1">
            {user.trust_score}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function UsersManagement() {
  const { users, isLoading, error, refetch } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      const matchesSearch = 
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter ? u.role === roleFilter : true;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  if (isLoading && (!users || users.length === 0)) {
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
            placeholder="Search users..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={() => setRoleFilter(null)}
            className={`px-3 py-1 rounded-full mr-2 ${!roleFilter ? "bg-sky-600" : "bg-slate-100"}`}
          >
            <Text className={`text-xs font-medium ${!roleFilter ? "text-white" : "text-slate-600"}`}>All</Text>
          </TouchableOpacity>
          {["admin", "host", "member"].map((role) => (
            <TouchableOpacity 
              key={role}
              onPress={() => setRoleFilter(role)}
              className={`px-3 py-1 rounded-full mr-2 ${roleFilter === role ? "bg-sky-600" : "bg-slate-100"}`}
            >
              <Text className={`text-xs font-medium ${roleFilter === role ? "text-white" : "text-slate-600"}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserRow user={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={["#0ea5e9"]} />
        }
        ListEmptyComponent={
          <View className="p-8 items-center">
            <Text className="text-slate-400">No users found</Text>
          </View>
        }
      />
    </View>
  );
}
