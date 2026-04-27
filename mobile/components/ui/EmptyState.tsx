import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { Button } from "./Button";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  cta?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, message, cta }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-20 px-6">
      <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-6">
        <Feather name={icon} size={36} color="#94a3b8" />
      </View>
      <Text className="text-slate-900 text-xl font-bold text-center">{title}</Text>
      <Text className="text-slate-500 text-center mt-2 mb-8 leading-5">
        {message}
      </Text>
      {cta && (
        <Button
          title={cta.label}
          onPress={cta.onPress}
          variant="primary"
          size="md"
        />
      )}
    </View>
  );
}
