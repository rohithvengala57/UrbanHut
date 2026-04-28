import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";

export default function VerifyEmailScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const loadUser = useAuthStore((s) => s.loadUser);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/verify-email", { code });
      await loadUser();
      await trackEvent("verification_submitted", {
        verification_type: "email",
        status: "verified",
      });
      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await trackEvent("verification_started", { verification_type: "email" });
      const res = await api.post("/auth/resend-verification");
      // In dev mode the API returns the code directly so we can show it
      const msg = res.data.dev_code
        ? `Code sent!\n\nDev mode code: ${res.data.dev_code}`
        : "A new code has been sent to your email.";
      Alert.alert("Code Sent", msg);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <View className="items-center mb-10">
        <View className="w-20 h-20 bg-primary-50 rounded-full items-center justify-center mb-4">
          <Feather name="mail" size={40} color="#0ea5e9" />
        </View>
        <Text className="text-2xl font-bold text-slate-900 mb-2">Check your email</Text>
        <Text className="text-slate-500 text-center">
          We sent a 6-digit verification code to your email address.
        </Text>
      </View>

      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-xl w-full px-4 py-3 text-center text-xl font-bold tracking-[12px] mb-8"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor="#94a3b8"
      />

      <Button title="Verify Email" onPress={handleVerify} loading={loading} size="lg" />

      <View className="items-center mt-6 flex-row justify-center gap-1">
        <Text className="text-slate-500 text-sm">Didn't receive a code?</Text>
        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text className="text-primary-500 text-sm font-semibold">
            {resending ? "Sending..." : "Resend"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/home")}
        className="items-center mt-4"
      >
        <Text className="text-slate-400 text-sm">Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}
