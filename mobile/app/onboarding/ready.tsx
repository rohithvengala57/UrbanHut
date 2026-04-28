import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, View, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";

import { OnboardingWrapper } from "@/components/ui/OnboardingWrapper";
import { useAuthStore } from "@/stores/authStore";

export default function ReadyScreen() {
  const user = useAuthStore((s) => s.user);
  const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);
  const [loading, setLoading] = useState(false);
  const city = user?.current_city || "your area";
  
  const [scale] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFinish = async () => {
    setLoading(true);
    try {
      await setHasCompletedOnboarding();
      router.replace("/(tabs)/home");
    } catch (e) {
      console.error(e);
      router.replace("/(tabs)/home");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingWrapper
      step={5}
      totalSteps={5}
      title="You're all set!"
      subtitle={`Finding the best matches in ${city} for you...`}
      onContinue={handleFinish}
      continueLabel="Get Started"
      isLoading={loading}
    >
      <View className="flex-1 items-center justify-center">
        <Animated.View 
          style={{ 
            transform: [{ scale }],
            opacity,
          }}
          className="w-32 h-32 bg-accent-500 rounded-full items-center justify-center mb-8 shadow-xl"
        >
          <Feather name="check" size={64} color="#fff" />
        </Animated.View>
        
        <Text className="text-slate-500 text-center text-lg px-8">
          Your profile is ready. You can now browse listings, message roommates, and join the community.
        </Text>
      </View>
    </OnboardingWrapper>
  );
}
