import { Feather } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { COLORS } from "@/constants/config";
import { useAuthStore } from "@/stores/authStore";

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role !== "admin") {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Tabs
      screenOptions={{
        lazy: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e2e8f0",
          paddingBottom: 8,
          paddingTop: 8,
          height: 85,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          headerTitle: "Admin Dashboard",
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: "Listings",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => <Feather name="alert-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
