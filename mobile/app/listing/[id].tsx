import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useExpressInterest, useListing, useMyInterests } from "@/hooks/useListings";
import { useSavedListings, useToggleSave } from "@/hooks/useSaved";
import { formatCurrency } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";

/* ── Toast component ── */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      style={{
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: "#0f172a",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>{message}</Text>
    </View>
  );
}

/* ── Interest tooltip ── */
function InterestTooltip({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  if (!visible) return null;
  return (
    <TouchableOpacity
      onPress={onDismiss}
      style={{
        position: "absolute",
        bottom: 76,
        left: 20,
        right: 20,
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 12,
        zIndex: 998,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 13, textAlign: "center" }}>
        You've already expressed interest — the host will be in touch.
      </Text>
    </TouchableOpacity>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { data: listing, isLoading, isError } = useListing(id);
  const { data: myInterests } = useMyInterests();
  const expressInterest = useExpressInterest();
  const user = useAuthStore((s) => s.user);
  const { data: savedListings } = useSavedListings();
  const toggleSave = useToggleSave();

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Toast state
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Interest tooltip state
  const [showInterestTooltip, setShowInterestTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask a Question modal
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [sendingQuestion, setSendingQuestion] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const { data: roommateSummary } = useQuery({
    queryKey: ["roommate-summary", id],
    queryFn: async () => {
      const res = await api.get(`/listings/roommate-summary/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const isHost = listing && user && listing.host_id === user.id;
  const alreadyInterested = myInterests?.some((i) => i.to_listing_id === id);
  const isSaved = savedListings?.some((s) => s.listing_id === id);

  const handleToggleSave = () => {
    toggleSave.mutate(
      { listingId: id, isSaved: !!isSaved },
      {
        onSuccess: () => showToast(isSaved ? "Removed from saved" : "Saved ✓"),
        onError: () => showToast("Failed to update saved status"),
      },
    );
  };

  const handleInterest = () => {
    if (alreadyInterested) {
      setShowInterestTooltip(true);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => setShowInterestTooltip(false), 3000);
      return;
    }
    expressInterest.mutate(
      { to_listing_id: id },
      {
        onSuccess: () => showToast("Interest sent! The host will be notified."),
        onError: (err: any) => showToast(err.response?.data?.detail || "Failed to send interest"),
      },
    );
  };

  const handleSendQuestion = async () => {
    if (!questionText.trim()) return;
    setSendingQuestion(true);
    try {
      await api.post("/matching/interest", {
        to_listing_id: id,
        message: questionText.trim(),
      });
      setQuestionModalVisible(false);
      setQuestionText("");
      showToast("Question sent to the host!");
    } catch {
      showToast("Failed to send. Please try again.");
    } finally {
      setSendingQuestion(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
          <Feather name="alert-circle" size={28} color="#94a3b8" />
        </View>
        <Text className="text-slate-800 font-bold text-lg text-center">Listing not found</Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          This listing may have been removed or is no longer available.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 flex-row items-center gap-2 bg-slate-100 rounded-2xl px-6 py-3"
        >
          <Feather name="arrow-left" size={16} color="#475569" />
          <Text className="text-slate-600 font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const roomTypeLabels: Record<string, string> = {
    private_room: "Private Room",
    shared_room: "Shared Room",
    entire_place: "Entire Place",
  };

  const locationLabel = `${listing.city}, ${listing.state} ${listing.zip_code}`;
  const occupancyLabel = `${listing.current_occupants}/${listing.available_spots + listing.current_occupants}`;

  const highlights = [
    listing.utilities_included && "Utilities included",
    listing.nearest_transit && `Near ${listing.nearest_transit}`,
    listing.pet_policy === "allowed" && "Pet friendly",
    listing.parking_available && "Parking available",
  ].filter(Boolean) as string[];

  const imageCount = listing.images?.length ?? 0;

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Hero image ── */}
        <View style={{ height: 320 }} className="bg-slate-200">
          {imageCount > 0 ? (
            <>
              <FlatList
                data={listing.images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                  setCarouselIndex(idx);
                }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={{ width, height: 320 }}
                    resizeMode="cover"
                  />
                )}
              />
              {/* Page indicator */}
              {imageCount > 1 && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 56,
                    right: 14,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                    {carouselIndex + 1} / {imageCount}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-100">
              <Feather name="image" size={48} color="#94a3b8" />
            </View>
          )}

          {/* Bottom gradient */}
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140 }}>
            <Svg
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id="detailGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                  <Stop offset="0" stopColor="#000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000" stopOpacity="0.75" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#detailGrad)" />
            </Svg>
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16 }}>
              <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800" }}>
                {formatCurrency(listing.rent_monthly)}
                <Text style={{ fontSize: 16, fontWeight: "400", opacity: 0.8 }}>/mo</Text>
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }} numberOfLines={1}>
                {listing.title}
              </Text>
            </View>
          </View>

          {/* Top-right actions — positioned directly inside hero container */}
          <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 8 }}>
            {!isHost && (
              <TouchableOpacity
                onPress={handleToggleSave}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Feather name="bookmark" size={18} color={isSaved ? "#f59e0b" : "#64748b"} />
              </TouchableOpacity>
            )}
            {listing.is_verified && (
              <View
                style={{
                  height: 40, borderRadius: 20, backgroundColor: "#0ea5e9",
                  paddingHorizontal: 12, alignItems: "center", justifyContent: "center",
                  flexDirection: "row", gap: 4,
                }}
              >
                <Feather name="check-circle" size={13} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-4 pt-4">
          {/* Host banner */}
          {isHost && (
            <View className="bg-primary-50 rounded-2xl px-4 py-3 flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <Feather name="info" size={14} color="#0ea5e9" />
                <Text className="text-primary-700 text-sm font-medium">You own this listing</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push(`/listing/manage/${id}` as any)}
                className="bg-primary-500 rounded-xl px-3 py-1.5"
              >
                <Text className="text-white text-xs font-semibold">Manage</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Location + type row */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-1.5 flex-1">
              <Feather name="map-pin" size={14} color="#64748b" />
              <Text className="text-slate-500 text-sm flex-1" numberOfLines={1}>{locationLabel}</Text>
            </View>
            <Badge label={roomTypeLabels[listing.room_type] || listing.room_type} size="md" />
          </View>

          {/* Highlights */}
          {highlights.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {highlights.map((h) => (
                  <View key={h} className="flex-row items-center gap-1.5 bg-emerald-50 rounded-full px-3 py-1.5">
                    <Feather name="check" size={12} color="#10b981" />
                    <Text className="text-emerald-700 text-xs font-medium">{h}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Quick stats */}
          <View className="flex-row gap-3 mb-4">
            {[
              { icon: "grid" as const, value: String(listing.total_bedrooms), label: "Bedrooms" },
              { icon: "droplet" as const, value: String(listing.total_bathrooms), label: "Bathrooms" },
              { icon: "users" as const, value: occupancyLabel, label: "Occupants" },
            ].map((stat) => (
              <View
                key={stat.label}
                className="flex-1 bg-white rounded-2xl px-3 py-3 items-center"
                style={{ shadowColor: "#0f172a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}
              >
                <Feather name={stat.icon} size={18} color="#0ea5e9" />
                <Text className="text-sm font-bold text-slate-900 mt-1">{stat.value}</Text>
                <Text className="text-xs text-slate-400">{stat.label}</Text>
              </View>
            ))}
            {listing.security_deposit != null && (
              <View
                className="flex-1 bg-white rounded-2xl px-3 py-3 items-center"
                style={{ shadowColor: "#0f172a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}
              >
                <Feather name="shield" size={18} color="#0ea5e9" />
                <Text className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(listing.security_deposit)}</Text>
                <Text className="text-xs text-slate-400">Deposit</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Card className="mb-4">
            <Text className="font-bold text-slate-900 mb-2">About</Text>
            <Text className="text-slate-600 leading-6">{listing.description}</Text>
          </Card>

          {/* Roommate Summary */}
          {roommateSummary &&
            (roommateSummary.household_size > 0 || roommateSummary.occupants?.length > 0) && (
              <Card className="mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-bold text-slate-900">Current Roommates</Text>
                  {roommateSummary.avg_trust_score > 0 && (
                    <View className="flex-row items-center gap-1.5 bg-primary-50 rounded-full px-3 py-1">
                      <Feather name="shield" size={12} color="#0ea5e9" />
                      <Text className="text-xs text-primary-600 font-bold">
                        Avg {Math.round(roommateSummary.avg_trust_score)} trust
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row gap-3 mb-3">
                  <View className="bg-slate-50 rounded-xl px-3 py-2.5 flex-1 items-center">
                    <Text className="text-sm font-bold text-slate-900">{roommateSummary.household_size}</Text>
                    <Text className="text-xs text-slate-500">Current</Text>
                  </View>
                  <View className="bg-slate-50 rounded-xl px-3 py-2.5 flex-1 items-center">
                    <Text className="text-sm font-bold text-slate-900">{roommateSummary.available_spots}</Text>
                    <Text className="text-xs text-slate-500">Open Spots</Text>
                  </View>
                </View>
                {roommateSummary.occupants?.map((occ: any, idx: number) => {
                  const occupantLabel = String(occ.label || String.fromCharCode(65 + idx));
                  const lifestyleSummary = occ.lifestyle_tags?.length > 0 ? occ.lifestyle_tags.slice(0, 3).join(" · ") : null;
                  return (
                    <View
                      key={`${occupantLabel}-${idx}`}
                      className={`flex-row items-center justify-between py-3 ${idx > 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View className="w-9 h-9 bg-primary-100 rounded-full items-center justify-center">
                          <Text className="text-xs font-bold text-primary-600">{occupantLabel}</Text>
                        </View>
                        <View>
                          <Text className="text-sm font-semibold text-slate-800">Roommate {occupantLabel}</Text>
                          {lifestyleSummary && <Text className="text-xs text-slate-400">{lifestyleSummary}</Text>}
                        </View>
                      </View>
                      <View className="items-end gap-1">
                        <View className="bg-primary-50 rounded-full px-2.5 py-0.5">
                          <Text className="text-xs text-primary-600 font-semibold">{occ.trust_band}</Text>
                        </View>
                        {occ.tenure_months && (
                          <Text className="text-xs text-slate-400">{occ.tenure_months}mo</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-3">Amenities</Text>
              <View className="flex-row flex-wrap gap-2">
                {listing.amenities.map((a: string) => (
                  <View key={a} className="bg-primary-50 rounded-full px-3 py-1.5 flex-row items-center gap-1">
                    <Feather name="check" size={11} color="#0ea5e9" />
                    <Text className="text-primary-700 text-sm">{a.replace(/_/g, " ")}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* House Rules */}
          {listing.house_rules && listing.house_rules.length > 0 && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-2">House Rules</Text>
              {listing.house_rules.map((rule: string) => (
                <View key={rule} className="flex-row items-center gap-2 mb-2">
                  <View className="w-5 h-5 bg-amber-50 rounded-full items-center justify-center">
                    <Feather name="alert-circle" size={12} color="#f59e0b" />
                  </View>
                  <Text className="text-slate-600 text-sm flex-1">{rule.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Transit */}
          {listing.nearest_transit && (
            <Card className="mb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-primary-50 rounded-xl items-center justify-center">
                  <Feather name="navigation" size={18} color="#0ea5e9" />
                </View>
                <View>
                  <Text className="font-semibold text-slate-900">{listing.nearest_transit}</Text>
                  {listing.transit_walk_mins && (
                    <Text className="text-slate-400 text-sm">{listing.transit_walk_mins} min walk</Text>
                  )}
                </View>
              </View>
            </Card>
          )}

          {/* Utilities */}
          <Card className="mb-6">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center">
                <Feather name="zap" size={18} color="#22c55e" />
              </View>
              <View>
                <Text className="font-semibold text-slate-900">Utilities</Text>
                <Text className="text-slate-500 text-sm">
                  {listing.utilities_included
                    ? "Included in rent"
                    : listing.utility_estimate
                      ? `~${formatCurrency(listing.utility_estimate)}/mo estimate`
                      : "Not included"}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Toast */}
      <Toast message={toastMsg} visible={toastVisible} />

      {/* Interest tooltip */}
      <InterestTooltip visible={showInterestTooltip} onDismiss={() => setShowInterestTooltip(false)} />

      {/* Bottom CTA */}
      <View
        className="px-4 py-4 bg-white border-t border-slate-100"
        style={{ shadowColor: "#0f172a", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 }}
      >
        {isHost ? (
          <Button
            title="Manage Listing"
            onPress={() => router.push(`/listing/manage/${id}` as any)}
            size="lg"
            icon={<Feather name="settings" size={18} color="#fff" />}
          />
        ) : (
          <View className="flex-row gap-3">
            {!alreadyInterested && (
              <TouchableOpacity
                onPress={() => setQuestionModalVisible(true)}
                className="flex-row items-center gap-1.5 border border-slate-200 rounded-2xl px-4 py-3"
              >
                <Feather name="message-circle" size={18} color="#64748b" />
                <Text className="text-slate-600 font-semibold text-sm">Ask</Text>
              </TouchableOpacity>
            )}
            <View className="flex-1">
              <Button
                title={alreadyInterested ? "Interest Sent ✓" : "I'm Interested"}
                onPress={handleInterest}
                size="lg"
                loading={expressInterest.isPending}
                disabled={alreadyInterested}
                variant={alreadyInterested ? "outline" : "primary"}
              />
            </View>
          </View>
        )}
      </View>

      {/* Ask a Question Modal */}
      <Modal
        visible={questionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuestionModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>Ask the Host a Question</Text>
              <TouchableOpacity onPress={() => setQuestionModalVisible(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={{
                backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1.5,
                borderColor: "#e2e8f0", padding: 14, fontSize: 15, color: "#0f172a",
                minHeight: 100, textAlignVertical: "top", marginBottom: 16,
              }}
              placeholder="e.g. Is the room furnished? Are utilities split equally?"
              placeholderTextColor="#94a3b8"
              multiline
              value={questionText}
              onChangeText={setQuestionText}
              autoFocus
            />

            <TouchableOpacity
              onPress={handleSendQuestion}
              disabled={sendingQuestion || !questionText.trim()}
              style={{
                backgroundColor: !questionText.trim() || sendingQuestion ? "#7dd3fc" : "#0ea5e9",
                borderRadius: 14, paddingVertical: 14, alignItems: "center",
                flexDirection: "row", justifyContent: "center", gap: 8,
              }}
            >
              {sendingQuestion ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={16} color="#fff" />
              )}
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {sendingQuestion ? "Sending…" : "Send Question"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
