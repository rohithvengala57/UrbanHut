import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { radii, shadows } from "@/constants/theme";

type ButtonVariant = "primary" | "gradient" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface RoundedButtonProps extends Omit<TouchableOpacityProps, "style"> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: ViewStyle;
  fullWidth?: boolean;
}

const sizeMap = {
  sm: { paddingH: 16, paddingV: 10, fontSize: 14, radius: radii.md },
  md: { paddingH: 24, paddingV: 14, fontSize: 16, radius: radii.lg },
  lg: { paddingH: 32, paddingV: 16, fontSize: 17, radius: radii.xl },
};

const variantMap: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: "#0ea5e9", text: "#ffffff" },
  gradient: { bg: "gradient", text: "#ffffff" },
  secondary: { bg: "#0f172a", text: "#ffffff" },
  outline: { bg: "transparent", text: "#0ea5e9", border: "#0ea5e9" },
  ghost: { bg: "transparent", text: "#0ea5e9" },
  danger: { bg: "#ef4444", text: "#ffffff" },
};

export function RoundedButton({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  style,
  fullWidth = false,
  ...rest
}: RoundedButtonProps) {
  const s = sizeMap[size];
  const v = variantMap[variant];
  const isGradient = variant === "gradient";

  const containerStyle: ViewStyle = {
    borderRadius: s.radius,
    paddingHorizontal: s.paddingH,
    paddingVertical: s.paddingV,
    backgroundColor: isGradient ? "transparent" : v.bg,
    borderWidth: v.border ? 1.5 : 0,
    borderColor: v.border,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
    overflow: "hidden",
    ...(variant === "primary" || isGradient ? shadows.card : {}),
  };

  const labelStyle = {
    fontSize: s.fontSize,
    fontWeight: "600" as const,
    color: v.text,
    letterSpacing: 0.1,
  };

  const innerContent = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon && iconPosition === "left" && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={labelStyle}>{title}</Text>
          {icon && iconPosition === "right" && <View style={styles.iconRight}>{icon}</View>}
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[containerStyle, style]}
      {...rest}
    >
      {isGradient && (
        <Svg style={StyleSheet.absoluteFillObject} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="btnGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#0ea5e9" stopOpacity="1" />
              <Stop offset="1" stopColor="#10b981" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#btnGrad)" />
        </Svg>
      )}
      {innerContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
