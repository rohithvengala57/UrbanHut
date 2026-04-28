import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Dimensions,
} from "react-native";

import { Button } from "./Button";
import { gradients } from "@/constants/theme";

interface OnboardingWrapperProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  isLoading?: boolean;
  canContinue?: boolean;
  onSkip?: () => void;
}

const { width } = Dimensions.get("window");

export const OnboardingWrapper = ({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel = "Continue",
  isLoading = false,
  canContinue = true,
  onSkip,
}: OnboardingWrapperProps) => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row justify-between items-center h-14">
          <View className="flex-row gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full ${
                  i < step ? "bg-primary-500" : "bg-slate-100"
                }`}
                style={{ width: (width - 48 - (totalSteps - 1) * 4) / totalSteps }}
              />
            ))}
          </View>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} className="ml-4">
              <Text className="text-slate-400 font-medium">Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View className="flex-1 pt-8">
          <Text className="text-3xl font-bold text-slate-900 mb-2">{title}</Text>
          {subtitle && (
            <Text className="text-lg text-slate-500 mb-8">{subtitle}</Text>
          )}
          <View className="flex-1">{children}</View>
        </View>

        {/* Footer */}
        <View className="py-6">
          <Button
            title={continueLabel}
            onPress={onContinue}
            loading={isLoading}
            disabled={!canContinue}
            size="lg"
            variant="primary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};
