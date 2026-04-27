import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trackEvent } from "@/lib/analytics";
import api from "@/services/api";

const DRAFT_KEY = "listing_create_draft";

const AMENITY_OPTIONS = [
  "WiFi", "Laundry in-unit", "Laundry on-site", "Dishwasher", "Air conditioning",
  "Heating", "Gym", "Pool", "Parking", "Storage", "Balcony", "Elevator",
  "Furnished", "Pet-friendly", "Hardwood floors", "Natural light", "Backyard",
];

const RULE_OPTIONS = [
  "No smoking", "No pets", "No parties", "Quiet after 10 PM", "No shoes inside",
  "Clean common areas", "Split utilities", "No overnight guests",
  "Vegetarian household", "No alcohol",
];

const STEPS = ["Photos", "Basic Info", "Details", "Amenities", "Rules"];

type FormState = {
  title: string;
  description: string;
  property_type: string;
  room_type: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  rent_monthly: string;
  security_deposit: string;
  utilities_included: string;
  utility_estimate: string;
  total_bedrooms: string;
  total_bathrooms: string;
  available_spots: string;
  current_occupants: string;
  available_from: string;
  available_until: string;
  lease_duration: string;
  nearest_transit: string;
  transit_walk_mins: string;
  nearby_universities: string;
};

const INITIAL_FORM: FormState = {
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
  nearby_universities: "",
};

function getApiErrorMessage(error: any) {
  const field = error?.response?.data?.error?.field;
  const message =
    error?.response?.data?.error?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    "Failed to create listing";
  return field ? `${field}: ${message}` : message;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function formatDateDisplay(isoDate: string) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* ── Date picker modal ── */
function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  label,
}: {
  visible: boolean;
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  label: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());

  useEffect(() => {
    if (visible) {
      if (value && isIsoDate(value)) {
        const parts = value.split("-");
        setYear(parseInt(parts[0], 10));
        setMonth(parseInt(parts[1], 10));
        setDay(parseInt(parts[2], 10));
      } else {
        setYear(today.getFullYear());
        setMonth(today.getMonth() + 1);
        setDay(today.getDate());
      }
    }
  }, [visible]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const years = Array.from({ length: 6 }, (_, i) => today.getFullYear() + i);

  const handleConfirm = () => {
    const safeDay = Math.min(day, daysInMonth);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
    onSelect(iso);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>{label}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            {/* Month */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, textAlign: "center" }}>Month</Text>
              <ScrollView style={{ height: 160 }} showsVerticalScrollIndicator={false}>
                {months.map((m, idx) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMonth(idx + 1)}
                    style={{ paddingVertical: 10, alignItems: "center", backgroundColor: month === idx + 1 ? "#e0f2fe" : "transparent", borderRadius: 8, marginBottom: 2 }}
                  >
                    <Text style={{ color: month === idx + 1 ? "#0ea5e9" : "#334155", fontWeight: month === idx + 1 ? "700" : "400" }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* Day */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, textAlign: "center" }}>Day</Text>
              <ScrollView style={{ height: 160 }} showsVerticalScrollIndicator={false}>
                {days.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDay(d)}
                    style={{ paddingVertical: 10, alignItems: "center", backgroundColor: day === d ? "#e0f2fe" : "transparent", borderRadius: 8, marginBottom: 2 }}
                  >
                    <Text style={{ color: day === d ? "#0ea5e9" : "#334155", fontWeight: day === d ? "700" : "400" }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* Year */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, textAlign: "center" }}>Year</Text>
              <ScrollView style={{ height: 160 }} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYear(y)}
                    style={{ paddingVertical: 10, alignItems: "center", backgroundColor: year === y ? "#e0f2fe" : "transparent", borderRadius: 8, marginBottom: 2 }}
                  >
                    <Text style={{ color: year === y ? "#0ea5e9" : "#334155", fontWeight: year === y ? "700" : "400" }}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            style={{ backgroundColor: "#0ea5e9", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Confirm Date</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ── Chip selector ── */
function ChipSelector({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onToggle(opt)}
            style={{
              paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
              borderWidth: 1.5, borderColor: active ? "#0ea5e9" : "#e2e8f0",
              backgroundColor: active ? "#e0f2fe" : "#f8fafc",
            }}
          >
            <Text style={{ fontSize: 13, color: active ? "#0369a1" : "#475569", fontWeight: active ? "600" : "400" }}>
              {active && "✓ "}{opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── Inline field error ── */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={{ color: "#ef4444", fontSize: 12, marginTop: -6, marginBottom: 8, marginLeft: 2 }}>{message}</Text>;
}

/* ── Toggle chip row ── */
function ToggleRow({ options, value, onSelect }: { options: { key: string; label: string }[]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onSelect(opt.key)}
          style={{
            flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1.5,
            borderColor: value === opt.key ? "#0ea5e9" : "#e2e8f0",
            backgroundColor: value === opt.key ? "#e0f2fe" : "#fff",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: value === opt.key ? "#0369a1" : "#64748b" }}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ================================================================ */
export default function CreateListingScreen() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [datePickerField, setDatePickerField] = useState<"available_from" | "available_until" | null>(null);
  const draftSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft on mount
  useEffect(() => {
    (async () => {
      try {
        const draft = await SecureStore.getItemAsync(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.form) setForm({ ...INITIAL_FORM, ...parsed.form });
          if (parsed.amenities) setAmenities(parsed.amenities);
          if (parsed.houseRules) setHouseRules(parsed.houseRules);
        }
      } catch {}
    })();
  }, []);

  const persistDraft = useCallback(
    (nextForm: FormState, nextAmenities: string[], nextRules: string[]) => {
      if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
      draftSaveRef.current = setTimeout(async () => {
        try {
          await SecureStore.setItemAsync(
            DRAFT_KEY,
            JSON.stringify({ form: nextForm, amenities: nextAmenities, houseRules: nextRules }),
          );
        } catch {}
      }, 500);
    },
    [],
  );

  const updateField = (field: keyof FormState, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    persistDraft(next, amenities, houseRules);
  };

  const toggleAmenity = (item: string) => {
    const next = amenities.includes(item) ? amenities.filter((a) => a !== item) : [...amenities, item];
    setAmenities(next);
    persistDraft(form, next, houseRules);
  };

  const toggleRule = (item: string) => {
    const next = houseRules.includes(item) ? houseRules.filter((r) => r !== item) : [...houseRules, item];
    setHouseRules(next);
    persistDraft(form, amenities, next);
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

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const validateStep = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (step === 1) {
      if (!form.title.trim()) errs.title = "Title is required";
      else if (form.title.trim().length < 5) errs.title = "Must be at least 5 characters";
      if (!form.description.trim()) errs.description = "Description is required";
      else if (form.description.trim().length < 20) errs.description = "Must be at least 20 characters";
    }
    if (step === 2) {
      if (!form.address_line1.trim()) errs.address_line1 = "Address is required";
      if (!form.city.trim()) errs.city = "City is required";
      if (!form.rent_monthly.trim()) errs.rent_monthly = "Rent is required";
      else if (isNaN(parseInt(form.rent_monthly, 10)) || parseInt(form.rent_monthly, 10) <= 0)
        errs.rent_monthly = "Must be greater than 0";
      if (form.total_bedrooms && (isNaN(parseInt(form.total_bedrooms, 10)) || parseInt(form.total_bedrooms, 10) <= 0))
        errs.total_bedrooms = "Must be at least 1";
      if (form.total_bathrooms && (isNaN(parseFloat(form.total_bathrooms)) || parseFloat(form.total_bathrooms) <= 0))
        errs.total_bathrooms = "Must be greater than 0";
    }
    if (step === 4) {
      if (form.available_from && !isIsoDate(form.available_from)) errs.available_from = "Invalid date";
      if (form.available_until && !isIsoDate(form.available_until)) errs.available_until = "Invalid date";
      if (form.available_from && form.available_until && form.available_until < form.available_from)
        errs.available_until = "Must be after Available From";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    const rentMonthly = parseInt(form.rent_monthly, 10);
    const totalBedrooms = parseInt(form.total_bedrooms || "1", 10);
    const totalBathrooms = parseFloat(form.total_bathrooms || "1");
    const availableSpots = parseInt(form.available_spots || "1", 10);
    const currentOccupants = parseInt(form.current_occupants || "0", 10);
    const securityDeposit = form.security_deposit ? parseInt(form.security_deposit, 10) : null;
    const utilityEstimate = form.utility_estimate ? parseInt(form.utility_estimate, 10) : null;
    const transitWalkMins = form.transit_walk_mins ? parseInt(form.transit_walk_mins, 10) : null;

    setLoading(true);
    try {
      const response = await api.post("/listings/", {
        ...form,
        images,
        rent_monthly: rentMonthly * 100,
        security_deposit: securityDeposit !== null ? securityDeposit * 100 : null,
        utilities_included: form.utilities_included === "true",
        utility_estimate: utilityEstimate !== null ? utilityEstimate * 100 : null,
        total_bedrooms: totalBedrooms,
        total_bathrooms: totalBathrooms,
        available_spots: availableSpots,
        current_occupants: currentOccupants,
        available_from: form.available_from || new Date().toISOString().split("T")[0],
        available_until: form.available_until || null,
        lease_duration: form.lease_duration || null,
        transit_walk_mins: transitWalkMins,
        amenities,
        house_rules: houseRules,
        nearby_universities: form.nearby_universities
          ? form.nearby_universities.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      });
      const listingId = response.data.id ?? response.data.listing_id ?? "unknown";
      await trackEvent("listing_created", {
        listing_id: listingId,
        city: response.data.city ?? form.city,
        room_type: response.data.room_type ?? form.room_type,
      });
      await trackEvent("listing_published", {
        listing_id: listingId,
        city: response.data.city ?? form.city,
        room_type: response.data.room_type ?? form.room_type,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
      ]);
      await SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});
      Alert.alert("Success", "Listing created!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  /* ── Section header ── */
  const SectionHead = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: "#64748b", fontSize: 14 }}>{subtitle}</Text>
    </View>
  );

  /* ── Date row ── */
  const DateRow = ({ field, label, optional }: { field: "available_from" | "available_until"; label: string; optional?: boolean }) => (
    <>
      <TouchableOpacity
        onPress={() => setDatePickerField(field)}
        style={{
          backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, marginBottom: 6,
          borderColor: errors[field] ? "#ef4444" : form[field] ? "#0ea5e9" : "#e2e8f0",
          paddingHorizontal: 14, paddingVertical: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{label}{optional ? " (optional)" : ""}</Text>
          <Text style={{ color: form[field] ? "#0f172a" : "#cbd5e1", fontSize: 15 }}>
            {form[field] ? formatDateDisplay(form[field]) : "Select date"}
          </Text>
        </View>
        <Feather name="calendar" size={18} color={form[field] ? "#0ea5e9" : "#94a3b8"} />
      </TouchableOpacity>
      <FieldError message={errors[field]} />
    </>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      {/* Progress bar */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          {STEPS.map((s, i) => (
            <TouchableOpacity key={s} onPress={() => i < step && setStep(i)} disabled={i >= step}>
              <Text style={{
                fontSize: 11,
                color: i === step ? "#0ea5e9" : i < step ? "#22c55e" : "#cbd5e1",
                fontWeight: i <= step ? "700" : "400",
              }}>
                {i < step ? "✓ " : ""}{s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 4, backgroundColor: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
          <View style={{
            height: "100%",
            width: `${(step / (STEPS.length - 1)) * 100}%`,
            backgroundColor: "#0ea5e9", borderRadius: 2,
          }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: "#f8fafc" }} contentContainerStyle={{ padding: 16 }}>

        {/* Step 0: Photos */}
        {step === 0 && (
          <View>
            <SectionHead title="Add Photos" subtitle="Great photos attract more roommates. Add up to 8." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {images.map((uri, index) => (
                  <View key={uri} style={{ position: "relative" }}>
                    <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 12 }} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" }}
                    >
                      <Feather name="x" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 8 && (
                  <TouchableOpacity
                    onPress={pickImages}
                    style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: "#f1f5f9", borderWidth: 2, borderStyle: "dashed", borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" }}
                  >
                    <Feather name="plus" size={28} color="#94a3b8" />
                    <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            {images.length === 0 && (
              <View style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#92400e", fontSize: 13 }}>
                  You can proceed without photos, but listings with photos get more views.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <View>
            <SectionHead title="Basic Info" subtitle="Give your listing a compelling title and description." />
            <Input
              label="Title *"
              placeholder="Sunny room in downtown Jersey City"
              value={form.title}
              onChangeText={(v) => updateField("title", v)}
              autoCapitalize="sentences"
            />
            <FieldError message={errors.title} />
            <Input
              label="Description *"
              placeholder="Describe your place, the neighborhood, and ideal roommate..."
              value={form.description}
              onChangeText={(v) => updateField("description", v)}
              multiline
              autoCapitalize="sentences"
            />
            <FieldError message={errors.description} />

            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8, marginTop: 4 }}>Room Type</Text>
            <ToggleRow
              options={[
                { key: "private_room", label: "Private Room" },
                { key: "shared_room", label: "Shared Room" },
                { key: "entire_place", label: "Entire Place" },
              ]}
              value={form.room_type}
              onSelect={(v) => updateField("room_type", v)}
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 }}>Property Type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {[
                { key: "apartment", label: "Apartment" },
                { key: "house", label: "House" },
                { key: "condo", label: "Condo" },
                { key: "townhouse", label: "Townhouse" },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => updateField("property_type", type.key)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
                    borderColor: form.property_type === type.key ? "#0ea5e9" : "#e2e8f0",
                    backgroundColor: form.property_type === type.key ? "#e0f2fe" : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: form.property_type === type.key ? "#0369a1" : "#64748b" }}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Location & Pricing */}
        {step === 2 && (
          <View>
            <SectionHead title="Location & Pricing" subtitle="Where is the listing and how much does it cost?" />

            <Input label="Address *" placeholder="123 Main St" value={form.address_line1} onChangeText={(v) => updateField("address_line1", v)} />
            <FieldError message={errors.address_line1} />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 2 }}>
                <Input label="City *" placeholder="Jersey City" value={form.city} onChangeText={(v) => updateField("city", v)} />
                <FieldError message={errors.city} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="State" placeholder="NJ" value={form.state} onChangeText={(v) => updateField("state", v)} />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="Zip Code" placeholder="07302" value={form.zip_code} onChangeText={(v) => updateField("zip_code", v)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Rent ($/mo) *" placeholder="1200" value={form.rent_monthly} onChangeText={(v) => updateField("rent_monthly", v)} keyboardType="numeric" />
                <FieldError message={errors.rent_monthly} />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="Bedrooms" placeholder="2" value={form.total_bedrooms} onChangeText={(v) => updateField("total_bedrooms", v)} keyboardType="numeric" />
                <FieldError message={errors.total_bedrooms} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Bathrooms" placeholder="1" value={form.total_bathrooms} onChangeText={(v) => updateField("total_bathrooms", v)} keyboardType="numeric" />
                <FieldError message={errors.total_bathrooms} />
              </View>
            </View>

            <Input label="Security Deposit ($)" placeholder="1200" value={form.security_deposit} onChangeText={(v) => updateField("security_deposit", v)} keyboardType="numeric" />

            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8, marginTop: 4 }}>Utilities Included</Text>
            <ToggleRow
              options={[{ key: "true", label: "Included" }, { key: "false", label: "Separate" }]}
              value={form.utilities_included}
              onSelect={(v) => updateField("utilities_included", v)}
            />

            {form.utilities_included === "false" && (
              <Input label="Utility Estimate ($/mo)" placeholder="120" value={form.utility_estimate} onChangeText={(v) => updateField("utility_estimate", v)} keyboardType="numeric" />
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="Available Spots" placeholder="1" value={form.available_spots} onChangeText={(v) => updateField("available_spots", v)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Current Occupants" placeholder="0" value={form.current_occupants} onChangeText={(v) => updateField("current_occupants", v)} keyboardType="numeric" />
              </View>
            </View>

            <Input label="Nearest Transit" placeholder="Journal Square PATH" value={form.nearest_transit} onChangeText={(v) => updateField("nearest_transit", v)} />
            <Input label="Walk to Transit (mins)" placeholder="5" value={form.transit_walk_mins} onChangeText={(v) => updateField("transit_walk_mins", v)} keyboardType="numeric" />
            <Input label="Nearby Universities" placeholder="NJIT, Rutgers Newark" value={form.nearby_universities} onChangeText={(v) => updateField("nearby_universities", v)} autoCapitalize="words" />
          </View>
        )}

        {/* Step 3: Amenities */}
        {step === 3 && (
          <View>
            <SectionHead title="Amenities" subtitle="What does your place offer? Tap to add." />
            <ChipSelector options={AMENITY_OPTIONS} selected={amenities} onToggle={toggleAmenity} />
            {amenities.length > 0 && (
              <View style={{ marginTop: 16, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#166534", fontSize: 13, fontWeight: "600" }}>
                  {amenities.length} amenity{amenities.length !== 1 ? "ies" : ""} selected
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 4: Rules + Dates */}
        {step === 4 && (
          <View>
            <SectionHead title="House Rules & Dates" subtitle="Set expectations and availability dates." />

            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 10 }}>House Rules</Text>
            <ChipSelector options={RULE_OPTIONS} selected={houseRules} onToggle={toggleRule} />

            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginTop: 24, marginBottom: 10 }}>Availability</Text>
            <DateRow field="available_from" label="Available From" />
            <DateRow field="available_until" label="Available Until" optional />

            <Input label="Lease Duration" placeholder="12 months" value={form.lease_duration} onChangeText={(v) => updateField("lease_duration", v)} />
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerField !== null}
        value={datePickerField ? form[datePickerField] : ""}
        label={datePickerField === "available_from" ? "Available From" : "Available Until"}
        onSelect={(date) => {
          if (datePickerField) {
            updateField(datePickerField, date);
            setDatePickerField(null);
          }
        }}
        onClose={() => setDatePickerField(null)}
      />

      {/* Navigation footer */}
      <View style={{ backgroundColor: "#fff", padding: 16, flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
        {step > 0 && (
          <TouchableOpacity
            onPress={goBack}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center" }}
          >
            <Text style={{ color: "#475569", fontWeight: "600", fontSize: 15 }}>Back</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            onPress={goNext}
            style={{ flex: step > 0 ? 2 : 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#0ea5e9", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Continue →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: loading ? "#7dd3fc" : "#0ea5e9", alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{loading ? "Posting..." : "Post Listing"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
