import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";

const SLEEP_OPTIONS = ["early_bird", "night_owl", "normal"];
const NOISE_OPTIONS = ["quiet", "moderate", "loud"];
const GUEST_OPTIONS = ["never", "rarely", "sometimes", "often"];
const DRINK_OPTIONS = ["never", "social", "regularly"];

function OptionPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-slate-700 mb-1.5">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              className={`px-4 py-2 rounded-xl border ${
                value === opt ? "bg-primary-50 border-primary-500" : "border-slate-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  value === opt ? "text-primary-600" : "text-slate-600"
                }`}
              >
                {opt.replace(/_/g, " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      className="flex-row justify-between items-center py-3 border-b border-slate-100"
    >
      <Text className="text-slate-700">{label}</Text>
      <View
        className={`w-12 h-6 rounded-full items-center justify-center ${value ? "bg-primary-500" : "bg-slate-200"}`}
      >
        <View
          className={`w-5 h-5 rounded-full bg-white absolute ${value ? "right-0.5" : "left-0.5"}`}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    bio: user?.bio ?? "",
    occupation: user?.occupation ?? "",
    phone: user?.phone ?? "",
    current_city: user?.current_city ?? "",
    current_state: user?.current_state ?? "",
    budget_min: user?.budget_min ? String(user.budget_min) : "",
    budget_max: user?.budget_max ? String(user.budget_max) : "",
    sleep_schedule: user?.sleep_schedule ?? "normal",
    noise_tolerance: user?.noise_tolerance ?? "moderate",
    guest_frequency: user?.guest_frequency ?? "sometimes",
    drinking: user?.drinking ?? "social",
    smoking: user?.smoking ?? false,
    pet_friendly: user?.pet_friendly ?? true,
    cleanliness_level: user?.cleanliness_level ?? 3,
  });

  const set = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        ...form,
        budget_min: form.budget_min ? parseInt(form.budget_min) : undefined,
        budget_max: form.budget_max ? parseInt(form.budget_max) : undefined,
      });
      Alert.alert("Saved", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-base font-bold text-slate-700 mb-3">Basic Info</Text>

        <Input
          label="Full Name *"
          value={form.full_name}
          onChangeText={(v) => set("full_name", v)}
          autoCapitalize="words"
        />
        <Input
          label="Bio"
          value={form.bio}
          onChangeText={(v) => set("bio", v)}
          multiline
          placeholder="Tell roommates about yourself..."
          autoCapitalize="sentences"
        />
        <Input
          label="Occupation"
          value={form.occupation}
          onChangeText={(v) => set("occupation", v)}
          placeholder="e.g. Software Engineer"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(v) => set("phone", v)}
          keyboardType="phone-pad"
          placeholder="+1 555 000 0000"
        />

        <Text className="text-base font-bold text-slate-700 mb-3 mt-2">Location & Budget</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="City"
              value={form.current_city}
              onChangeText={(v) => set("current_city", v)}
              placeholder="Jersey City"
            />
          </View>
          <View className="flex-1">
            <Input
              label="State"
              value={form.current_state}
              onChangeText={(v) => set("current_state", v)}
              placeholder="NJ"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="Budget Min ($)"
              value={form.budget_min}
              onChangeText={(v) => set("budget_min", v)}
              keyboardType="numeric"
              placeholder="800"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Budget Max ($)"
              value={form.budget_max}
              onChangeText={(v) => set("budget_max", v)}
              keyboardType="numeric"
              placeholder="1500"
            />
          </View>
        </View>

        <Text className="text-base font-bold text-slate-700 mb-3 mt-2">Lifestyle</Text>

        <OptionPicker
          label="Sleep Schedule"
          options={SLEEP_OPTIONS}
          value={form.sleep_schedule}
          onChange={(v) => set("sleep_schedule", v)}
        />
        <OptionPicker
          label="Noise Tolerance"
          options={NOISE_OPTIONS}
          value={form.noise_tolerance}
          onChange={(v) => set("noise_tolerance", v)}
        />
        <OptionPicker
          label="Guest Frequency"
          options={GUEST_OPTIONS}
          value={form.guest_frequency}
          onChange={(v) => set("guest_frequency", v)}
        />
        <OptionPicker
          label="Drinking"
          options={DRINK_OPTIONS}
          value={form.drinking}
          onChange={(v) => set("drinking", v)}
        />

        <View className="mb-4">
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Cleanliness Level: {form.cleanliness_level}/5
          </Text>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => set("cleanliness_level", n)}
                className={`flex-1 py-2.5 rounded-xl items-center border ${
                  form.cleanliness_level === n
                    ? "bg-primary-50 border-primary-500"
                    : "border-slate-200"
                }`}
              >
                <Text
                  className={`font-bold ${
                    form.cleanliness_level === n ? "text-primary-600" : "text-slate-400"
                  }`}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-6">
          <ToggleRow label="Smoking" value={form.smoking} onChange={(v) => set("smoking", v)} />
          <ToggleRow
            label="Pet Friendly"
            value={form.pet_friendly}
            onChange={(v) => set("pet_friendly", v)}
          />
        </View>

        <Button title="Save Changes" onPress={handleSave} loading={loading} size="lg" />
        <View className="h-8" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
