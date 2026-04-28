import React from "react";
import { Text, View } from "react-native";

interface BadgeProps {
  label: string;
  color?: string;
  size?: "sm" | "md";
}

export function Badge({ label, color = "#10b981", size = "sm" }: BadgeProps) {
  return (
    <View
      className={`rounded-full ${size === "sm" ? "px-2.5 py-1" : "px-4 py-1.5"} border border-emerald-100`}
      style={{ backgroundColor: `${color}10` }}
    >
      <Text
        className={`font-black uppercase tracking-widest ${size === "sm" ? "text-[10px]" : "text-[11px]"}`}
        style={{ color }}
      >
        {label}
      </Text>
    </View>
  );
}
