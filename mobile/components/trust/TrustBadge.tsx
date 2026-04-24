import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { getTrustBadge, getTrustColor } from "@/lib/trust";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function TrustBadge({ score, size = "sm", showLabel = true }: TrustBadgeProps) {
  const badge = getTrustBadge(score);
  const color = getTrustColor(score);

  const sizeMap = {
    sm: { circle: 28, text: 10, icon: 10 },
    md: { circle: 40, text: 14, icon: 14 },
    lg: { circle: 64, text: 22, icon: 20 },
  };

  const s = sizeMap[size];

  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: s.circle,
          height: s.circle,
          backgroundColor: `${color}15`,
          borderWidth: 2,
          borderColor: color,
        }}
      >
        <Text style={{ fontSize: s.text, color, fontWeight: "700" }}>
          {Math.round(score)}
        </Text>
      </View>
      {showLabel && (
        <View className="flex-row items-center gap-0.5">
          <Feather name="shield" size={s.icon} color={color} />
          <Text style={{ fontSize: s.text, color }} className="font-medium">
            {badge.label}
          </Text>
        </View>
      )}
    </View>
  );
}
