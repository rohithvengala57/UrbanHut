import React from "react";
import { Text, TouchableOpacity, View, ViewStyle } from "react-native";

interface PillTagProps {
  label: string;
  color?: string;
  size?: "sm" | "md";
  onPress?: () => void;
  filled?: boolean;
  style?: ViewStyle;
}

export function PillTag({
  label,
  color = "#0ea5e9",
  size = "sm",
  onPress,
  filled = false,
  style,
}: PillTagProps) {
  const paddingH = size === "sm" ? 10 : 14;
  const paddingV = size === "sm" ? 4 : 6;
  const fontSize = size === "sm" ? 12 : 14;

  const containerStyle: ViewStyle = {
    backgroundColor: filled ? color : `${color}18`,
    borderRadius: 9999,
    paddingHorizontal: paddingH,
    paddingVertical: paddingV,
    alignSelf: "flex-start",
  };

  const content = (
    <Text
      style={{
        fontSize,
        fontWeight: "600",
        color: filled ? "#ffffff" : color,
        letterSpacing: 0.1,
      }}
    >
      {label}
    </Text>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[containerStyle, style]}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{content}</View>;
}
