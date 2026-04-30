import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { AdminUserRow, fetchAdminUsers } from "@/hooks/useAdminMetrics";

function UserCard({ user }: { user: AdminUserRow }) {
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-slate-900 font-semibold">{user.full_name}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{user.email}</Text>
        </View>
        <View className="bg-slate-100 px-2 py-1 rounded-full">
          <Text className="text-slate-700 text-[10px] font-bold uppercase">{user.role}</Text>
        </View>
      </View>
      <View className="flex-row mt-3">
        <Text className="text-xs text-slate-500">Status: </Text>
        <Text className="text-xs font-semibold text-slate-700">{user.status}</Text>
      </View>
      <View className="flex-row mt-1">
        <Text className="text-xs text-slate-500">Trust: </Text>
        <Text className="text-xs font-semibold text-slate-700">{user.trust_score.toFixed(1)}</Text>
        <Text className="text-xs text-slate-500 ml-4">Listings: </Text>
        <Text className="text-xs font-semibold text-slate-700">{user.listing_count}</Text>
      </View>
    </View>
  );
}

export default function Users() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await fetchAdminUsers(40);
      setUsers(rows);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (isLoading && users.length === 0) {
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
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadUsers} color="#6366f1" />}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-slate-900">User Management</Text>
        <View className="bg-indigo-100 px-2 py-1 rounded-full">
          <Text className="text-indigo-700 text-xs font-semibold">{users.length} users</Text>
        </View>
      </View>
      {error ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 flex-row items-center">
          <Feather name="alert-triangle" size={16} color="#dc2626" />
          <Text className="text-red-700 text-sm ml-2 flex-1">{error}</Text>
        </View>
      ) : null}
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </ScrollView>
  );
}
