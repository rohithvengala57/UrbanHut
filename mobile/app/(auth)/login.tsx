import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Login Failed", error.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login("rohith@test.com", "password123");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Demo Login Failed", "Make sure the backend server is running on port 8000");
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
          <View className="flex-1 px-6 pt-16 pb-8">
            {/* Header */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-primary-500 rounded-3xl items-center justify-center mb-4 shadow-lg">
                <Feather name="home" size={36} color="#fff" />
              </View>
              <Text className="text-3xl font-bold text-slate-900">Urban Hut</Text>
              <Text className="text-slate-500 mt-1 text-base">Find your perfect roommate</Text>
            </View>

            {/* Form */}
            <View className="mb-6">
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
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />

            {/* Demo Login */}
            <TouchableOpacity
              onPress={handleDemoLogin}
              disabled={loading}
              className="mt-3 py-3 items-center rounded-xl border-2 border-dashed border-slate-200"
            >
              <Text className="text-slate-500 text-sm font-medium">
                Try Demo Account (Rohith)
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-slate-500">Don't have an account? </Text>
              <Link href="/(auth)/signup" className="text-primary-500 font-semibold">
                Sign Up
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
