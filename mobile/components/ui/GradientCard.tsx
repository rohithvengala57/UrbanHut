import React from "react";
import { StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { radii, shadows } from "@/constants/theme";

interface GradientCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
  gradientStart?: string;
  gradientEnd?: string;
  direction?: "horizontal" | "diagonal" | "vertical";
}

export function GradientCard({
  children,
  onPress,
  style,
  padding = 20,
  gradientStart = "#0ea5e9",
  gradientEnd = "#10b981",
  direction = "diagonal",
}: GradientCardProps) {
  const gradientCoords =
    direction === "horizontal"
      ? { x1: "0", y1: "0.5", x2: "1", y2: "0.5" }
      : direction === "vertical"
        ? { x1: "0.5", y1: "0", x2: "0.5", y2: "1" }
        : { x1: "0", y1: "0", x2: "1", y2: "1" };

  const inner = (
    <View style={[styles.container, { borderRadius: radii.xl }, shadows.elevated, style]}>
      <Svg style={StyleSheet.absoluteFillObject} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="grad" {...gradientCoords}>
            <Stop offset="0" stopColor={gradientStart} stopOpacity="1" />
            <Stop offset="1" stopColor={gradientEnd} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grad)" rx={radii.xl} />
      </Svg>
      <View style={{ padding }}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ borderRadius: radii.xl }}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
