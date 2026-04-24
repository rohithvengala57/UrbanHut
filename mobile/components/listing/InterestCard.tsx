import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { InterestDetail } from "@/hooks/useHostListings";
import { formatRelativeDate } from "@/lib/format";

type DecisionStatus = "shortlisted" | "accepted" | "rejected" | "archived";

interface InterestCardProps {
  interest: InterestDetail;
  onDecide: (interestId: string, status: DecisionStatus) => void;
  isLoading?: boolean;
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  interested: { label: "New", color: "#0ea5e9", bg: "#f0f9ff" },
  shortlisted: { label: "Shortlisted", color: "#8b5cf6", bg: "#f5f3ff" },
  accepted: { label: "Accepted", color: "#22c55e", bg: "#f0fdf4" },
  mutual: { label: "Mutual", color: "#22c55e", bg: "#f0fdf4" },
  rejected: { label: "Rejected", color: "#ef4444", bg: "#fef2f2" },
  archived: { label: "Archived", color: "#64748b", bg: "#f1f5f9" },
};

export function InterestCard({ interest, onDecide, isLoading }: InterestCardProps) {
  const badge = STATUS_BADGE[interest.status] || STATUS_BADGE.interested;
  const isActionable = interest.status === "interested" || interest.status === "shortlisted";

  const handleDecision = (status: DecisionStatus) => {
    if (status === "rejected") {
      Alert.alert(
        "Reject Interest",
        `Are you sure you want to reject ${interest.applicant_name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: () => onDecide(interest.id, status),
          },
        ]
      );
    } else {
      onDecide(interest.id, status);
    }
  };

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
      {/* Header */}
      <View className="flex-row items-start gap-3 mb-3">
        <Avatar name={interest.applicant_name} size={48} uri={interest.applicant_avatar} />
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-slate-900 text-base">
              {interest.applicant_name}
            </Text>
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: badge.bg }}>
              <Text className="text-xs font-semibold" style={{ color: badge.color }}>
                {badge.label}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2 mt-0.5">
            {interest.applicant_occupation && (
              <Text className="text-xs text-slate-500">{interest.applicant_occupation}</Text>
            )}
            {interest.applicant_city && (
              <View className="flex-row items-center gap-0.5">
                <Feather name="map-pin" size={10} color="#94a3b8" />
                <Text className="text-xs text-slate-400">{interest.applicant_city}</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center gap-3 mt-1">
            <TrustBadge score={interest.applicant_trust_score} size="sm" />
            {interest.compatibility_score && (
              <View className="flex-row items-center gap-1">
                <Feather name="zap" size={10} color="#f59e0b" />
                <Text className="text-xs font-medium text-amber-600">
                  {Math.round(interest.compatibility_score)}% match
                </Text>
              </View>
            )}
            <Text className="text-xs text-slate-400">
              {formatRelativeDate(interest.created_at)}
            </Text>
          </View>
        </View>
      </View>

      {/* Message */}
      {interest.message && (
        <View className="bg-slate-50 rounded-xl px-3 py-2 mb-3">
          <Text className="text-sm text-slate-600 italic">"{interest.message}"</Text>
        </View>
      )}

      {/* Actions */}
      {isActionable && (
        <View className="flex-row gap-2">
          {interest.status === "interested" && (
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-violet-50 rounded-xl py-2.5"
              onPress={() => handleDecision("shortlisted")}
              disabled={isLoading}
            >
              <Feather name="bookmark" size={14} color="#8b5cf6" />
              <Text className="text-sm font-semibold text-violet-600">Shortlist</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1.5 bg-green-50 rounded-xl py-2.5"
            onPress={() => handleDecision("accepted")}
            disabled={isLoading}
          >
            <Feather name="check-circle" size={14} color="#22c55e" />
            <Text className="text-sm font-semibold text-green-600">Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1.5 bg-red-50 rounded-xl py-2.5"
            onPress={() => handleDecision("rejected")}
            disabled={isLoading}
          >
            <Feather name="x-circle" size={14} color="#ef4444" />
            <Text className="text-sm font-semibold text-red-500">Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-center bg-slate-50 rounded-xl px-3 py-2.5"
            onPress={() => handleDecision("archived")}
            disabled={isLoading}
          >
            <Feather name="archive" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
