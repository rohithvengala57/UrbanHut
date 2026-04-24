import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";

function getApiErrorMessage(error: any) {
  const field = error?.response?.data?.error?.field;
  const message =
    error?.response?.data?.error?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    "Failed to create listing";

  return field ? `${field}: ${message}` : message;
}

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export default function CreateListingScreen() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "apartment",
    room_type: "private_room",
    address_line1: "",
    city: "",
    state: "",
    zip_code: "",
    rent_monthly: "",
    security_deposit: "",
    utilities_included: "false",
    utility_estimate: "",
    total_bedrooms: "",
    total_bathrooms: "",
    available_spots: "1",
    current_occupants: "0",
    available_from: "",
    available_until: "",
    lease_duration: "",
    nearest_transit: "",
    transit_walk_mins: "",
    amenities: "",
    house_rules: "",
    nearby_universities: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 8));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.address_line1 || !form.city || !form.rent_monthly) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (form.title.trim().length < 5) {
      Alert.alert("Error", "Title must be at least 5 characters long.");
      return;
    }

    if (form.description.trim().length < 20) {
      Alert.alert("Error", "Description must be at least 20 characters long.");
      return;
    }

    const rentMonthly = parseInt(form.rent_monthly, 10);
    if (!Number.isFinite(rentMonthly) || rentMonthly <= 0) {
      Alert.alert("Error", "Rent must be a valid amount greater than 0.");
      return;
    }

    const totalBedrooms = parseInt(form.total_bedrooms || "1", 10);
    if (!Number.isFinite(totalBedrooms) || totalBedrooms <= 0) {
      Alert.alert("Error", "Bedrooms must be at least 1.");
      return;
    }

    const totalBathrooms = parseFloat(form.total_bathrooms || "1");
    if (!Number.isFinite(totalBathrooms) || totalBathrooms <= 0) {
      Alert.alert("Error", "Bathrooms must be greater than 0.");
      return;
    }

    const availableSpots = parseInt(form.available_spots || "1", 10);
    if (!Number.isFinite(availableSpots) || availableSpots <= 0) {
      Alert.alert("Error", "Available spots must be at least 1.");
      return;
    }

    const currentOccupants = parseInt(form.current_occupants || "0", 10);
    if (!Number.isFinite(currentOccupants) || currentOccupants < 0) {
      Alert.alert("Error", "Current occupants cannot be negative.");
      return;
    }

    if (form.available_from && !isIsoDate(form.available_from)) {
      Alert.alert("Error", "Available From must use YYYY-MM-DD format.");
      return;
    }

    if (form.available_until && !isIsoDate(form.available_until)) {
      Alert.alert("Error", "Available Until must use YYYY-MM-DD format.");
      return;
    }

    if (form.available_from && form.available_until && form.available_until < form.available_from) {
      Alert.alert("Error", "Available Until cannot be earlier than Available From.");
      return;
    }

    const securityDeposit = form.security_deposit ? parseInt(form.security_deposit, 10) : null;
    if (securityDeposit !== null && (!Number.isFinite(securityDeposit) || securityDeposit < 0)) {
      Alert.alert("Error", "Security deposit must be 0 or greater.");
      return;
    }
    const securityDepositCents = securityDeposit !== null ? securityDeposit * 100 : null;

    const utilityEstimate = form.utility_estimate ? parseInt(form.utility_estimate, 10) : null;
    if (utilityEstimate !== null && (!Number.isFinite(utilityEstimate) || utilityEstimate < 0)) {
      Alert.alert("Error", "Utility estimate must be 0 or greater.");
      return;
    }
    const utilityEstimateCents = utilityEstimate !== null ? utilityEstimate * 100 : null;

    const transitWalkMins = form.transit_walk_mins ? parseInt(form.transit_walk_mins, 10) : null;
    if (transitWalkMins !== null && (!Number.isFinite(transitWalkMins) || transitWalkMins < 0)) {
      Alert.alert("Error", "Walk to transit must be 0 or greater.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/listings/", {
        ...form,
        images,
        rent_monthly: rentMonthly * 100,
        security_deposit: securityDepositCents,
        utilities_included: form.utilities_included === "true",
        utility_estimate: utilityEstimateCents,
        total_bedrooms: totalBedrooms,
        total_bathrooms: totalBathrooms,
        available_spots: availableSpots,
        current_occupants: currentOccupants,
        available_from: form.available_from || new Date().toISOString().split("T")[0],
        available_until: form.available_until || null,
        lease_duration: form.lease_duration || null,
        transit_walk_mins: transitWalkMins as number | null,
        amenities: parseCsvList(form.amenities),
        house_rules: parseCsvList(form.house_rules),
        nearby_universities: parseCsvList(form.nearby_universities),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
      ]);
      Alert.alert("Success", "Listing created!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const roomTypes = [
    { key: "private_room", label: "Private Room" },
    { key: "shared_room", label: "Shared Room" },
    { key: "entire_place", label: "Entire Place" },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>

        {/* Image Picker */}
        <Text className="text-sm font-medium text-slate-700 mb-1.5">Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {images.map((uri, index) => (
              <View key={uri} className="relative">
                <Image
                  source={{ uri }}
                  className="w-24 h-24 rounded-xl"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full w-5 h-5 items-center justify-center"
                >
                  <Feather name="x" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 8 && (
              <TouchableOpacity
                onPress={pickImages}
                className="w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 items-center justify-center"
              >
                <Feather name="plus" size={28} color="#94a3b8" />
                <Text className="text-slate-400 text-xs mt-1">Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <Input label="Title *" placeholder="Sunny room in downtown Jersey City" value={form.title} onChangeText={(v) => updateField("title", v)} autoCapitalize="sentences" />
        <Input label="Description *" placeholder="Describe your place..." value={form.description} onChangeText={(v) => updateField("description", v)} multiline autoCapitalize="sentences" />

        {/* Room Type Selector */}
        <Text className="text-sm font-medium text-slate-700 mb-1.5">Room Type</Text>
        <View className="flex-row gap-2 mb-4">
          {roomTypes.map((type) => (
            <TouchableOpacity
              key={type.key}
              onPress={() => updateField("room_type", type.key)}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                form.room_type === type.key
                  ? "bg-primary-50 border-primary-500"
                  : "border-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  form.room_type === type.key ? "text-primary-600" : "text-slate-600"
                }`}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Address *" placeholder="123 Main St" value={form.address_line1} onChangeText={(v) => updateField("address_line1", v)} />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="City *" placeholder="Jersey City" value={form.city} onChangeText={(v) => updateField("city", v)} />
          </View>
          <View className="flex-1">
            <Input label="State" placeholder="NJ" value={form.state} onChangeText={(v) => updateField("state", v)} />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Zip Code" placeholder="07302" value={form.zip_code} onChangeText={(v) => updateField("zip_code", v)} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Input label="Rent ($/mo) *" placeholder="1200" value={form.rent_monthly} onChangeText={(v) => updateField("rent_monthly", v)} keyboardType="numeric" />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Bedrooms" placeholder="2" value={form.total_bedrooms} onChangeText={(v) => updateField("total_bedrooms", v)} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Input label="Bathrooms" placeholder="1" value={form.total_bathrooms} onChangeText={(v) => updateField("total_bathrooms", v)} keyboardType="numeric" />
          </View>
        </View>

        <Input label="Security Deposit ($)" placeholder="1200" value={form.security_deposit} onChangeText={(v) => updateField("security_deposit", v)} keyboardType="numeric" />
        <Text className="text-sm font-medium text-slate-700 mb-1.5">Utilities Included</Text>
        <View className="flex-row gap-2 mb-4">
          {[
            { key: "true", label: "Included" },
            { key: "false", label: "Separate" },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => updateField("utilities_included", option.key)}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                form.utilities_included === option.key
                  ? "bg-primary-50 border-primary-500"
                  : "border-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  form.utilities_included === option.key ? "text-primary-600" : "text-slate-600"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label="Utility Estimate ($/mo)" placeholder="120" value={form.utility_estimate} onChangeText={(v) => updateField("utility_estimate", v)} keyboardType="numeric" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Available Spots" placeholder="1" value={form.available_spots} onChangeText={(v) => updateField("available_spots", v)} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Input label="Current Occupants" placeholder="0" value={form.current_occupants} onChangeText={(v) => updateField("current_occupants", v)} keyboardType="numeric" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Available From" placeholder="YYYY-MM-DD" value={form.available_from} onChangeText={(v) => updateField("available_from", v)} />
          </View>
          <View className="flex-1">
            <Input label="Available Until" placeholder="YYYY-MM-DD" value={form.available_until} onChangeText={(v) => updateField("available_until", v)} />
          </View>
        </View>
        <Input label="Lease Duration" placeholder="12 months" value={form.lease_duration} onChangeText={(v) => updateField("lease_duration", v)} />
        <Input label="Nearest Transit" placeholder="Journal Square PATH" value={form.nearest_transit} onChangeText={(v) => updateField("nearest_transit", v)} />
        <Input label="Walk to Transit (mins)" placeholder="5" value={form.transit_walk_mins} onChangeText={(v) => updateField("transit_walk_mins", v)} keyboardType="numeric" />
        <Input label="Amenities" placeholder="Laundry, Gym, Parking" value={form.amenities} onChangeText={(v) => updateField("amenities", v)} autoCapitalize="sentences" />
        <Input label="House Rules" placeholder="No smoking, Quiet after 10 PM" value={form.house_rules} onChangeText={(v) => updateField("house_rules", v)} autoCapitalize="sentences" />
        <Input label="Nearby Universities" placeholder="NJIT, Rutgers Newark" value={form.nearby_universities} onChangeText={(v) => updateField("nearby_universities", v)} autoCapitalize="words" />

        <View className="mt-4 mb-8">
          <Button title="Post Listing" onPress={handleSubmit} loading={loading} size="lg" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
