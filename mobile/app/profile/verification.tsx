import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  VerificationRecord,
  useMyVerifications,
  useRequestPhoneOTP,
  useSubmitVerification,
  useVerifyPhoneOTP,
} from "@/hooks/useVerifications";
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

type ModalMode = null | "phone_request" | "phone_verify" | "id" | "lease";

interface VerificationItem {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  points: number;
  action: () => void;
}

function getVerificationStatus(
  verifications: VerificationRecord[] | undefined,
  type: string
): VerificationRecord | undefined {
  return verifications?.find((item) => item.type === type);
}

function statusLabel(status?: string) {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending":
      return "Pending review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Not started";
  }
}

export default function VerificationScreen() {
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const { data: verifications, refetch } = useMyVerifications();
  const requestPhoneOTP = useRequestPhoneOTP();
  const verifyPhoneOTP = useVerifyPhoneOTP();
  const submitIdVerification = useSubmitVerification("id");
  const submitLeaseVerification = useSubmitVerification("lease");

  const [activeModal, setActiveModal] = useState<ModalMode>(null);
  const [phone, setPhone] = useState(user?.phone || "");
  const [phoneCode, setPhoneCode] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");

  const emailVerification = getVerificationStatus(verifications, "email");
  const phoneVerification = getVerificationStatus(verifications, "phone");
  const idVerification = getVerificationStatus(verifications, "id");
  const leaseVerification = getVerificationStatus(verifications, "lease");

  const totalEarned = useMemo(
    () => (verifications || []).reduce((sum, item) => sum + (item.points_awarded || 0), 0),
    [verifications]
  );

  const resetDocumentState = () => {
    setDocumentUrl("");
    setDocumentNotes("");
  };

  const handleVerifyEmail = async () => {
    try {
      const res = await fetchEmailCode();
      Alert.alert(
        "Verify Email",
        res.dev_code
          ? `Dev mode: your code is ${res.dev_code}.`
          : "A verification code has been sent to your email.",
        [{ text: "Enter Code", onPress: () => router.push("/(auth)/verify-email") }]
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Failed to send code");
    }
  };

  const fetchEmailCode = async () => {
    return (await api.post("/auth/resend-verification")).data as {
      message: string;
      dev_code?: string;
    };
  };

  const handleRequestPhoneOTP = async () => {
    if (!phone.trim()) {
      Alert.alert("Phone Required", "Enter a phone number to continue.");
      return;
    }

    try {
      const res = await requestPhoneOTP.mutateAsync(phone.trim());
      setActiveModal("phone_verify");
      Alert.alert(
        "OTP Sent",
        res.dev_code ? `Dev mode OTP: ${res.dev_code}` : "Check your phone for the OTP."
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || err.message || "Failed to send OTP");
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (phoneCode.length !== 6) {
      Alert.alert("OTP Required", "Enter the 6-digit OTP.");
      return;
    }

    try {
      await verifyPhoneOTP.mutateAsync({ phone: phone.trim(), code: phoneCode });
      await refetch();
      await loadUser();
      setPhoneCode("");
      setActiveModal(null);
      Alert.alert("Phone Verified", "Your phone number has been verified.");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || err.message || "Failed to verify OTP");
    }
  };

  const handleSubmitDocument = async (type: "id" | "lease") => {
    if (!documentUrl.trim()) {
      Alert.alert("Document Required", "Add a document URL or secure reference.");
      return;
    }

    try {
      if (type === "id") {
        await submitIdVerification.mutateAsync({
          document_url: documentUrl.trim(),
          notes: documentNotes.trim() || undefined,
        });
      } else {
        await submitLeaseVerification.mutateAsync({
          document_url: documentUrl.trim(),
          notes: documentNotes.trim() || undefined,
        });
      }
      await refetch();
      resetDocumentState();
      setActiveModal(null);
      Alert.alert(
        "Submitted",
        type === "id"
          ? "Your ID verification is now pending review."
          : "Your lease verification is now pending review."
      );
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || err.message || "Submission failed");
    }
  };

  const verificationsConfig: VerificationItem[] = [
    {
      key: "email",
      label: "Email Address",
      description: "Verify your email to build trust with potential roommates",
      icon: "mail",
      points: 4,
      action: handleVerifyEmail,
    },
    {
      key: "phone",
      label: "Phone Number",
      description: "Add and verify your phone number via OTP",
      icon: "phone",
      points: 4,
      action: () => setActiveModal(phoneVerification?.status === "pending" ? "phone_verify" : "phone_request"),
    },
    {
      key: "id",
      label: "Government ID",
      description: "Submit an identity document for manual review",
      icon: "credit-card",
      points: 5,
      action: () => {
        resetDocumentState();
        setActiveModal("id");
      },
    },
    {
      key: "lease",
      label: "Lease Document",
      description: "Submit lease or tenancy proof to strengthen your rental credibility",
      icon: "file-text",
      points: 3,
      action: () => {
        resetDocumentState();
        setActiveModal("lease");
      },
    },
  ];

  const verificationByKey: Record<string, VerificationRecord | undefined> = {
    email: emailVerification,
    phone: phoneVerification,
    id: idVerification,
    lease: leaseVerification,
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
      <Card className="mb-4 bg-primary-50 border border-primary-100">
        <View className="flex-row items-center gap-3">
          <Feather name="shield" size={24} color="#0ea5e9" />
          <View className="flex-1">
            <Text className="font-bold text-primary-800">Verification Pillar</Text>
            <Text className="text-primary-600 text-sm">
              Complete verifications to earn up to 16 trust points
            </Text>
          </View>
        </View>
        <View className="mt-3 bg-white/70 rounded-lg px-3 py-2">
          <Text className="text-slate-700 text-sm font-medium">
            Verification points earned: {totalEarned}
          </Text>
        </View>
      </Card>

      {verificationsConfig.map((item) => {
        const verification = verificationByKey[item.key];
        const isDone = verification?.status === "verified" || verification?.status === "approved";
        const isPending = verification?.status === "pending";

        return (
          <Card key={item.key} className="mb-3">
            <View className="flex-row items-center gap-3">
              <View
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  isDone ? "bg-green-100" : isPending ? "bg-amber-100" : "bg-slate-100"
                }`}
              >
                <Feather
                  name={item.icon}
                  size={22}
                  color={isDone ? "#22c55e" : isPending ? "#f59e0b" : "#64748b"}
                />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="font-semibold text-slate-900">{item.label}</Text>
                  <View className="bg-amber-50 rounded-full px-2 py-0.5">
                    <Text className="text-amber-600 text-xs font-bold">+{item.points} pts</Text>
                  </View>
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      isDone
                        ? "bg-green-50"
                        : isPending
                          ? "bg-amber-50"
                          : verification?.status === "rejected"
                            ? "bg-red-50"
                            : "bg-slate-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isDone
                          ? "text-green-600"
                          : isPending
                            ? "text-amber-600"
                            : verification?.status === "rejected"
                              ? "text-red-500"
                              : "text-slate-500"
                      }`}
                    >
                      {statusLabel(verification?.status)}
                    </Text>
                  </View>
                </View>

                <Text className="text-slate-500 text-xs mt-0.5">{item.description}</Text>
                {!!verification?.review_notes && (
                  <Text className="text-slate-400 text-xs mt-1">{verification.review_notes}</Text>
                )}
              </View>

              {isDone ? (
                <Feather name="check-circle" size={22} color="#22c55e" />
              ) : (
                <TouchableOpacity
                  onPress={item.action}
                  disabled={isPending && item.key !== "phone"}
                  className={`rounded-lg px-3 py-1.5 ${
                    isPending && item.key !== "phone" ? "bg-slate-200" : "bg-primary-500"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isPending && item.key !== "phone" ? "text-slate-500" : "text-white"
                    }`}
                  >
                    {isPending && item.key !== "phone" ? "Waiting" : "Verify"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        );
      })}

      <Modal visible={activeModal === "phone_request"} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-slate-900 mb-4">Verify Phone</Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-4"
              placeholder="+1 555 000 0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Button
              title="Send OTP"
              onPress={handleRequestPhoneOTP}
              loading={requestPhoneOTP.isPending}
              size="lg"
            />
            <TouchableOpacity onPress={() => setActiveModal(null)} className="items-center mt-4">
              <Text className="text-slate-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === "phone_verify"} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-slate-900 mb-4">Enter OTP</Text>
            <Text className="text-slate-500 text-sm mb-3">
              Enter the 6-digit code sent to {phone || "your phone"}.
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-[10px] text-slate-900 mb-4"
              placeholder="000000"
              value={phoneCode}
              onChangeText={(value) => setPhoneCode(value.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Button
              title="Verify Phone"
              onPress={handleVerifyPhoneOTP}
              loading={verifyPhoneOTP.isPending}
              size="lg"
            />
            <TouchableOpacity onPress={() => setActiveModal("phone_request")} className="items-center mt-4">
              <Text className="text-primary-500 font-medium">Resend / change number</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === "id" || activeModal === "lease"} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-slate-900 mb-4">
              {activeModal === "id" ? "Submit ID Verification" : "Submit Lease Verification"}
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
              placeholder="Secure document URL or reference"
              value={documentUrl}
              onChangeText={setDocumentUrl}
              autoCapitalize="none"
            />
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-4 min-h-[110px]"
              placeholder="Optional notes for the reviewer"
              value={documentNotes}
              onChangeText={setDocumentNotes}
              multiline
              textAlignVertical="top"
            />
            <Button
              title="Submit for Review"
              onPress={() => handleSubmitDocument(activeModal === "id" ? "id" : "lease")}
              loading={submitIdVerification.isPending || submitLeaseVerification.isPending}
              size="lg"
            />
            <TouchableOpacity onPress={() => setActiveModal(null)} className="items-center mt-4">
              <Text className="text-slate-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
