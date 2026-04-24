import React from "react";
import { Text, View } from "react-native";

interface BadgeProps {
  label: string;
  color?: string;
  size?: "sm" | "md";
}

export function Badge({ label, color = "#0ea5e9", size = "sm" }: BadgeProps) {
  return (
    <View
      className={`rounded-full ${size === "sm" ? "px-2 py-0.5" : "px-3 py-1"}`}
      style={{ backgroundColor: `${color}20` }}
    >
      <Text
        className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"}`}
        style={{ color }}
      >
        {label}
      </Text>
    </View>
  );
}
