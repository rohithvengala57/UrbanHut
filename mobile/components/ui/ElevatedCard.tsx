import React from "react";
import { TouchableOpacity, View, ViewStyle } from "react-native";

import { radii, shadows } from "@/constants/theme";

interface ElevatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
}

export function ElevatedCard({
  children,
  onPress,
  style,
  padding = 16,
}: ElevatedCardProps) {
  const cardStyle: ViewStyle = {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding,
    ...shadows.elevated,
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[cardStyle, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
