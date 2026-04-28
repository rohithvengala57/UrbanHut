import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

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

  const content = (
    <View className="flex-row items-center gap-2">
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "secondary" ? "#fff" : "#10b981"} />
      ) : (
        <>
          {icon}
          <Text className={`${textVariantStyles[variant]} ${textSizeStyles[size]}`}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyle} ${disabled ? "opacity-50" : ""}`}
      activeOpacity={0.85}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className={`${sizeStyles[size]} w-full items-center justify-center`}
        >
          {content}
        </LinearGradient>
      ) : (
        <View className={`${sizeStyles[size]} ${variantStyles[variant]} w-full items-center justify-center`}>
          {content}
        </View>
      )}
    </TouchableOpacity>
  );
}
