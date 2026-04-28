import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

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
  const baseStyle = "rounded-2xl flex-row items-center justify-center";
  const sizeStyles = {
    sm: "px-4 py-2",
    md: "px-6 py-3",
    lg: "px-8 py-4",
  };
  const variantStyles = {
    primary: "bg-[#10b981]",
    secondary: "bg-slate-700",
    outline: "border-2 border-[#10b981]",
    ghost: "",
  };
  const textVariantStyles = {
    primary: "text-white font-bold",
    secondary: "text-white font-bold",
    outline: "text-[#10b981] font-bold",
    ghost: "text-[#10b981] font-bold",
  };
  const textSizeStyles = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#10b981"} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`${textVariantStyles[variant]} ${textSizeStyles[size]}`}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
