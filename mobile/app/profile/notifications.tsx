import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";

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

export default function NotificationsScreen() {
  // TODO(URB-29): Replace local-only preferences with backend-backed user notification settings
  // once the API endpoint is available.
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(SETTINGS.map((s) => [s.key, true]))
  );

  const toggle = (key: string) =>
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
      <Card className="mb-2">
        <View className="flex-row items-start gap-2">
          <Feather name="info" size={16} color="#f59e0b" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-amber-700 mb-0.5">Coming soon</Text>
            <Text className="text-sm text-slate-500">
              Push notification delivery is not yet available. These toggles are preview-only
              until server-side notification preferences are released.
            </Text>
          </View>
        </View>
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
              value={prefs[setting.key]}
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
