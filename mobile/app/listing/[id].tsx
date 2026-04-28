import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
  const { data: listing, isLoading, isError, refetch } = useListing(id);
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

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#ef4444" />
        </View>
        <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load listing</Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="mt-6 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!listing) {
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
    <View className="flex-1 bg-white">
      {/* ── Custom Header ── */}
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-slate-50 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Feather name="chevron-left" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-slate-900 font-bold text-lg">Listing Details</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Feather name="heart" size={22} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Feather name="share-2" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* ── Hero image ── */}
        <View style={{ height: 360 }} className="bg-slate-200">
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
                    style={{ width, height: 360 }}
                    resizeMode="cover"
                  />
                )}
              />
              {/* Page indicator */}
              <View className="absolute top-6 right-4 bg-black/40 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">{carouselIndex + 1} / {imageCount}</Text>
              </View>
              
              {/* Carousel Arrows */}
              <View className="absolute top-1/2 left-4 -translate-y-5">
                <View className="w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm">
                  <Feather name="chevron-left" size={24} color="#0f172a" />
                </View>
              </View>
              <View className="absolute top-1/2 right-4 -translate-y-5">
                <View className="w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-sm">
                  <Feather name="chevron-right" size={24} color="#0f172a" />
                </View>
              </View>

              {/* Verified Badge */}
              {listing.is_verified && (
                <View className="absolute top-6 left-4 bg-[#047857] rounded-full px-3 py-1.5 flex-row items-center gap-1.5">
                  <Feather name="check-circle" size={12} color="#fff" />
                  <Text className="text-white text-[11px] font-bold uppercase tracking-wider">Verified</Text>
                </View>
              )}

              {/* Dots */}
              <View className="absolute bottom-6 left-0 right-0 flex-row justify-center gap-1.5">
                {listing.images.map((_: any, i: number) => (
                  <View key={i} className={`h-2 w-2 rounded-full ${i === carouselIndex ? "bg-white w-4" : "bg-white/60"}`} />
                ))}
              </View>
            </>
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-100">
              <Feather name="image" size={48} color="#94a3b8" />
            </View>
          )}
        </View>

        <View className="px-5 pt-6">
          {/* Price Header */}
          <View className="flex-row items-start justify-between mb-4">
            <View>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="text-[32px] font-black text-[#10b981]">
                  {formatCurrency(listing.rent_monthly)}
                </Text>
                <Text className="text-slate-500 font-medium text-lg">/mo</Text>
              </View>
              {listing.security_deposit && (
                <Text className="text-slate-400 text-sm font-medium mt-0.5">
                  {formatCurrency(listing.security_deposit)} deposit
                </Text>
              )}
            </View>
            <View className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
              <Text className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                {roomTypeLabels[listing.room_type] || listing.room_type}
              </Text>
            </View>
          </View>

          <Text className="text-2xl font-extrabold text-slate-900 mb-2">{listing.title}</Text>
          
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name="map-pin" size={16} color="#64748b" />
            <Text className="text-slate-500 text-base font-medium">{locationLabel}</Text>
          </View>
          
          {listing.nearest_transit && (
            <View className="flex-row items-center gap-2 mb-6">
              <Feather name="navigation" size={16} color="#64748b" />
              <Text className="text-slate-500 text-base font-medium">
                {listing.transit_walk_mins || 2} min walk to {listing.nearest_transit}
              </Text>
            </View>
          )}

          {/* Stats Grid */}
          <View className="flex-row bg-white border border-slate-100 rounded-[32px] py-6 shadow-sm mb-8">
            {[
              { icon: "grid" as const, value: String(listing.total_bedrooms), label: "Bedrooms" },
              { icon: "droplet" as const, value: String(listing.total_bathrooms), label: "Bathrooms" },
              { icon: "users" as const, value: occupancyLabel, label: "Occupants" },
              { icon: "maximize" as const, value: "1,200", label: "Sq ft" },
            ].map((stat, idx) => (
              <View key={stat.label} className={`flex-1 items-center ${idx > 0 ? "border-l border-slate-100" : ""}`}>
                <Feather name={stat.icon} size={20} color="#10b981" className="mb-2" />
                <Text className="text-lg font-black text-slate-900 mt-1">{stat.value}</Text>
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* About */}
          <View className="mb-8">
            <Text className="text-xl font-bold text-[#065f46] mb-3">About this place</Text>
            <Text className="text-slate-600 text-base leading-7" numberOfLines={4}>
              {listing.description}
            </Text>
            <TouchableOpacity className="flex-row items-center gap-1 mt-2">
              <Text className="text-[#10b981] font-bold">See more</Text>
              <Feather name="chevron-down" size={16} color="#10b981" />
            </TouchableOpacity>
          </View>

          {/* Amenities Grid */}
          <View className="mb-8">
            <Text className="text-xl font-bold text-[#065f46] mb-4">Amenities</Text>
            <View className="flex-row flex-wrap gap-y-6">
              {[
                { icon: "snowflake", label: "AC" },
                { icon: "washing-machine", label: "In-unit Laundry" },
                { icon: "dumbbell", label: "Gym" },
                { icon: "waves", label: "Pool" },
                { icon: "account-tie", label: "Doorman" },
                { icon: "wifi", label: "WiFi" },
              ].map((item, idx) => (
                <View key={idx} style={{ width: "33.3%" }} className="items-center">
                  <View className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center mb-2">
                    <MaterialCommunityIcons name={item.icon as any} size={24} color="#10b981" />
                  </View>
                  <Text className="text-slate-600 text-xs font-semibold">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Highlights */}
          <View className="mb-8 bg-slate-50/50 rounded-[32px] p-6 border border-slate-100">
            <Text className="text-xl font-bold text-[#065f46] mb-4">Highlights</Text>
            <View className="flex-row flex-wrap gap-y-4">
              {highlights.map((h, idx) => (
                <View key={idx} style={{ width: "50%" }} className="flex-row items-center gap-2">
                  <View className="w-5 h-5 bg-emerald-100 rounded-full items-center justify-center">
                    <Feather name="check" size={12} color="#10b981" />
                  </View>
                  <Text className="text-slate-600 text-xs font-medium flex-1" numberOfLines={1}>{h}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Nearby Section */}
          <View className="mb-8 border-t border-b border-slate-50 py-8">
            <Text className="text-xl font-bold text-[#065f46] mb-4">Nearby</Text>
            <View className="flex-row">
              <View className="flex-1 flex-row items-center gap-3">
                <View className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center">
                  <MaterialCommunityIcons name="shopping-outline" size={24} color="#64748b" />
                </View>
                <View>
                  <Text className="text-slate-900 font-bold text-sm">Newport Centre Mall</Text>
                  <Text className="text-slate-400 text-xs">5 min walk</Text>
                </View>
              </View>
              <View className="w-[1px] bg-slate-100 mx-2" />
              <View className="flex-1 flex-row items-center gap-3">
                <View className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center">
                  <MaterialCommunityIcons name="waves" size={24} color="#64748b" />
                </View>
                <View>
                  <Text className="text-slate-900 font-bold text-sm">Hudson River Waterfront</Text>
                  <Text className="text-slate-400 text-xs">8 min walk</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Roommates */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-[#065f46]">Current Roommates (1/2)</Text>
              <TouchableOpacity>
                <Text className="text-[#10b981] font-bold">View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
              {[1, 2, 3].map((i) => (
                <View key={i} className="w-72 bg-white border border-slate-100 rounded-[32px] p-5 mr-4 shadow-sm">
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="w-16 h-16 bg-slate-100 rounded-3xl overflow-hidden">
                      <Image source={{ uri: `https://i.pravatar.cc/150?u=${i}` }} className="w-full h-full" />
                    </View>
                    <View className={`px-3 py-1 rounded-full flex-row items-center gap-1 ${i === 1 ? "bg-primary-50" : "bg-emerald-50"}`}>
                      {i === 1 ? (
                        <>
                          <Feather name="star" size={10} color="#0ea5e9" />
                          <Text className="text-primary-600 text-[10px] font-bold uppercase">New</Text>
                        </>
                      ) : (
                        <>
                          <Feather name="star" size={10} color="#10b981" />
                          <Text className="text-emerald-600 text-[10px] font-bold uppercase">{4.5 + i/10}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Text className="text-base font-bold text-slate-900">21, Female</Text>
                  <Text className="text-slate-500 text-xs font-medium mb-4">Software Engineer · Google</Text>
                  <View className="gap-2">
                    {["Pays rent on time", "Clean & organized", "Respectful & friendly"].map((tag) => (
                      <View key={tag} className="flex-row items-center gap-2">
                        <Feather name="check-circle" size={12} color="#10b981" />
                        <Text className="text-slate-500 text-[11px] font-medium">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* House Rules */}
          <View className="mb-12">
            <Text className="text-xl font-bold text-[#065f46] mb-4">House Rules</Text>
            <View className="flex-row flex-wrap gap-y-6">
              {[
                { icon: "smoking-off", label: "No smoking" },
                { icon: "paw-off", label: "No pets" },
                { icon: "account-group-outline", label: "No parties" },
                { icon: "clock-outline", label: "Quiet hours\n10PM - 8AM" },
              ].map((item, idx) => (
                <View key={idx} style={{ width: "50%" }} className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-slate-50 rounded-xl items-center justify-center">
                    <MaterialCommunityIcons name={item.icon as any} size={20} color="#64748b" />
                  </View>
                  <Text className="text-slate-600 text-xs font-bold">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
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
                className="flex-row items-center justify-center gap-2 border border-[#10b981] rounded-2xl px-6 py-4"
                style={{ flex: 0.4 }}
              >
                <Feather name="message-circle" size={20} color="#10b981" />
                <Text className="text-[#10b981] font-bold text-base">Message</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleInterest}
              disabled={alreadyInterested}
              className={`flex-1 rounded-2xl py-4 items-center justify-center ${alreadyInterested ? "bg-slate-100" : "bg-[#064e3b]"}`}
            >
              <Text className={`${alreadyInterested ? "text-slate-400" : "text-white"} font-bold text-base`}>
                {alreadyInterested ? "Interest Sent ✓" : "I'm Interested"}
              </Text>
            </TouchableOpacity>
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
