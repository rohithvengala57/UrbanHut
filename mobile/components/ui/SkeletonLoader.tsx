import React, { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      false
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["#e2e8f0", "#f1f5f9"]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as ViewStyle["width"],
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "#ffffff",
          borderRadius: 20,
          padding: 16,
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
          gap: 12,
        },
        style,
      ]}
    >
      <SkeletonBlock height={180} borderRadius={12} />
      <View style={{ gap: 8 }}>
        <SkeletonBlock width="70%" height={18} />
        <SkeletonBlock width="45%" height={14} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <SkeletonBlock width={60} height={24} borderRadius={12} />
        <SkeletonBlock width={60} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

export function SkeletonLoader({ count = 3, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View style={[{ gap: 16 }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
