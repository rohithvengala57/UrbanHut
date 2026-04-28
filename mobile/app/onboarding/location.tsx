import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { OnboardingWrapper } from "@/components/ui/OnboardingWrapper";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";

const POPULAR_CITIES = [
  "New York, NY",
  "San Francisco, CA",
  "London, UK",
  "Berlin, DE",
  "Singapore, SG",
];

export default function LocationScreen() {
  const [city, setCity] = useState("");
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [loading, setLoading] = useState(false);

  const handleEnableLocation = () => {
    // In a real app, this would use Expo Location
    Alert.alert(
      "Location Access",
      "UrbanHut would like to use your current location to show nearby listings.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Allow", 
          onPress: () => {
            setCity("New York, NY"); // Mocking location detection
          } 
        },
      ]
    );
  };

  const handleContinue = async () => {
    if (!city) return;
    setLoading(true);
    try {
      await updateProfile({
        current_city: city.split(",")[0].trim(),
        current_state: city.split(",")[1]?.trim() || "",
      });
      router.push("/onboarding/ready");
    } catch (e) {
      console.error(e);
      router.push("/onboarding/ready");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingWrapper
      step={4}
      totalSteps={5}
      title="Where are you looking?"
      subtitle="Enter a city to start browsing roommates and rooms nearby."
      onContinue={handleContinue}
      canContinue={!!city}
      isLoading={loading}
      onSkip={() => router.push("/onboarding/ready")}
    >
      <View className="flex-1 pt-4">
        <Input
          placeholder="Enter city name..."
          value={city}
          onChangeText={setCity}
          autoFocus
          className="mb-6"
        />

        <TouchableOpacity
          onPress={handleEnableLocation}
          className="flex-row items-center gap-3 p-4 bg-primary-50 rounded-2xl mb-8"
        >
          <View className="w-10 h-10 bg-primary-500 rounded-full items-center justify-center">
            <Feather name="navigation" size={20} color="#fff" />
          </View>
          <View>
            <Text className="text-primary-900 font-bold">Use current location</Text>
            <Text className="text-primary-700 text-sm">Recommended for better results</Text>
          </View>
        </TouchableOpacity>

        <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
          Popular Cities
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {POPULAR_CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCity(c)}
              className={`px-4 py-2.5 rounded-full border-2 ${
                city === c
                  ? "border-primary-500 bg-primary-50"
                  : "border-slate-100 bg-white"
              }`}
            >
              <Text
                className={`font-medium ${
                  city === c ? "text-primary-900" : "text-slate-600"
                }`}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </OnboardingWrapper>
  );
}
