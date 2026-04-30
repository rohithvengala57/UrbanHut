import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackEvent } from "@/lib/analytics";
import { useAuthStore } from "@/stores/authStore";

const URBAN_HUT_LOGO = require("@/assets/urban-hut-mark.png");

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackedStart, setTrackedStart] = useState(false);
  const signup = useAuthStore((s) => s.signup);

  const handleSignup = async () => {
    if (!trackedStart) {
      setTrackedStart(true);
      void trackEvent("signup_started", { method: "email_password" });
    }

    if (!fullName || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await signup(
        email.trim().toLowerCase(),
        password,
        fullName.trim(),
        referralCode.trim() || undefined
      );
      router.replace("/onboarding/welcome");
    } catch (error: any) {
      Alert.alert("Signup Failed", error.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Header */}
            <View className="items-center mb-8">
              <Image
                source={URBAN_HUT_LOGO}
                resizeMode="contain"
                className="mb-4"
                style={{ width: 88, height: 88 }}
              />
              <Text className="text-3xl font-bold text-slate-900">Create Account</Text>
              <Text className="text-slate-500 mt-1 text-base">Join the Urban Hut community</Text>
            </View>

            {/* Form */}
            <View className="mb-6">
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <Input
                label="Referral Code (Optional)"
                placeholder="ENTER-CODE"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
              />
            </View>

            <Button title="Create Account" onPress={handleSignup} loading={loading} size="lg" />

            <View className="flex-row justify-center mt-6">
              <Text className="text-slate-500">Already have an account? </Text>
              <Link href="/(auth)/login" className="text-primary-500 font-semibold">
                Sign In
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
