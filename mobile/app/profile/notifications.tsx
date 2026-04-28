import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, ScrollView, Switch, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import api from "@/services/api";

interface NotifSetting {
  key: string;
  label: string;
  description: string;
}

const SETTINGS: NotifSetting[] = [
  { key: "new_match", label: "New Matches", description: "When someone matches your listing criteria" },
  { key: "interest_received", label: "Interest Received", description: "When someone expresses interest in your listing" },
  { key: "mutual_match", label: "Mutual Connections", description: "When a match becomes mutual" },
  { key: "expense_added", label: "New Expenses", description: "When a household member adds an expense" },
  { key: "chore_reminder", label: "Chore Reminders", description: "Daily reminder for pending chores" },
  { key: "community_reply", label: "Community Replies", description: "When someone replies to your post" },
  { key: "trust_change", label: "Trust Score Changes", description: "Weekly trust score summary" },
];

const DEFAULT_PREFS = Object.fromEntries(SETTINGS.map((s) => [s.key, true]));

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const res = await api.get("/users/me/notification-preferences");
      return res.data.prefs as Record<string, boolean>;
    },
  });

  const { mutate: savePref } = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      await api.put("/users/me/notification-preferences", { prefs });
    },
    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: ["notification-prefs"] });
      const prev = queryClient.getQueryData<Record<string, boolean>>(["notification-prefs"]);
      queryClient.setQueryData(["notification-prefs"], prefs);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["notification-prefs"], ctx.prev);
    },
  });

  const prefs = data ?? DEFAULT_PREFS;

  const toggle = (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePref(updated);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
      <Card className="mb-2">
        <Text className="text-sm text-slate-500 mb-1">
          Notification preferences are saved to your account and applied across devices.
        </Text>
      </Card>

      <Card>
        {SETTINGS.map((setting, idx) => (
          <View
            key={setting.key}
            className={`flex-row items-center justify-between py-3 ${
              idx < SETTINGS.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <View className="flex-1 pr-4">
              <Text className="text-slate-800 font-medium">{setting.label}</Text>
              <Text className="text-slate-400 text-xs mt-0.5">{setting.description}</Text>
            </View>
            <Switch
              value={prefs[setting.key] ?? true}
              onValueChange={() => toggle(setting.key)}
              trackColor={{ false: "#e2e8f0", true: "#0ea5e9" }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
