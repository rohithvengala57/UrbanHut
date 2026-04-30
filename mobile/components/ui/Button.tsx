import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { gradients } from "@/constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
}: ButtonProps) {
  const baseStyle = "rounded-2xl overflow-hidden flex-row items-center justify-center";
  const sizeStyles = {
    sm: "px-4 py-2",
    md: "px-6 py-3",
    lg: "px-8 py-4",
  };
  const sizeFallbackStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };
  const variantStyles = {
    primary: "",
    secondary: "bg-slate-700",
    outline: "border-2 border-primary-500",
    ghost: "",
  };
  const textVariantStyles = {
    primary: "text-white font-bold",
    secondary: "text-white font-semibold",
    outline: "text-primary-500 font-semibold",
    ghost: "text-primary-500 font-medium",
  };
  const textSizeStyles = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };
  const textSizeFallbackStyles = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  };

  const content = (
    <View className="flex-row items-center gap-2" style={styles.content}>
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "secondary" ? "#fff" : "#10b981"} />
      ) : (
        <>
          {icon}
          <Text
            className={`${textVariantStyles[variant]} ${textSizeStyles[size]}`}
            style={[styles.text, textFallbackStyles[variant], textSizeFallbackStyles[size]]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyle} ${disabled ? "opacity-50" : ""}`}
      style={[styles.base, disabled && styles.disabled]}
      activeOpacity={0.85}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className={`${sizeStyles[size]} w-full items-center justify-center`}
          style={[styles.inner, sizeFallbackStyles[size]]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          className={`${sizeStyles[size]} ${variantStyles[variant]} w-full items-center justify-center`}
          style={[styles.inner, variantFallbackStyles[variant], sizeFallbackStyles[size]]}
        >
          {content}
        </View>
      )}
    </TouchableOpacity>
  );
}

const variantFallbackStyles = {
  primary: {},
  secondary: {
    backgroundColor: "#334155",
  },
  outline: {
    borderColor: "#0ea5e9",
    borderWidth: 2,
  },
  ghost: {},
};

const textFallbackStyles = {
  primary: {
    color: "#fff",
    fontWeight: "700" as const,
  },
  secondary: {
    color: "#fff",
    fontWeight: "600" as const,
  },
  outline: {
    color: "#0ea5e9",
    fontWeight: "600" as const,
  },
  ghost: {
    color: "#0ea5e9",
    fontWeight: "500" as const,
  },
};

const styles = StyleSheet.create({
  base: {
    alignSelf: "stretch",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.5,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  sizeSm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sizeMd: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sizeLg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  text: {
    textAlign: "center",
  },
  textSm: {
    fontSize: 12,
  },
  textMd: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 16,
  },
});
