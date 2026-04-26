import React from "react";
import { Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { radii, shadows, typography } from "@/constants/theme";

interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  badge?: number | string;
}

export function ActionTile({
  icon,
  label,
  sublabel,
  onPress,
  color = "#0ea5e9",
  style,
  badge,
}: ActionTileProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        {
          backgroundColor: "#ffffff",
          borderRadius: radii.lg,
          padding: 16,
          alignItems: "center",
          gap: 8,
          ...shadows.card,
        },
        style,
      ]}
    >
      <View style={{ position: "relative" }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: `${color}15`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        {badge !== undefined && (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              backgroundColor: "#ef4444",
              borderRadius: 9999,
              minWidth: 18,
              height: 18,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#ffffff" }}>
              {typeof badge === "number" && badge > 99 ? "99+" : badge}
            </Text>
          </View>
        )}
      </View>
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text style={{ ...typography.label, color: "#0f172a", textAlign: "center" }}>
          {label}
        </Text>
        {sublabel && (
          <Text style={{ ...typography.caption, textAlign: "center" }}>{sublabel}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
