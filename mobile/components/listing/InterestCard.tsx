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

  return (
    <TouchableOpacity 
      className="bg-white px-5 py-4 border-b border-slate-50 flex-row items-center gap-4"
      onPress={() => router.push(`/chat/${interest.id}` as any)}
    >
      <View className="relative">
        <Image 
          source={{ uri: interest.applicant_avatar || `https://i.pravatar.cc/150?u=${interest.applicant_id}` }} 
          className="w-14 h-14 rounded-full"
        />
        {interest.status === "interested" && (
          <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-0.5">
          <Text className="text-base font-bold text-slate-900">{interest.applicant_name}</Text>
          <View className="bg-primary-50 px-1.5 py-0.5 rounded">
            <Text className="text-primary-600 text-[9px] font-black uppercase">New</Text>
          </View>
        </View>

        <Text className="text-slate-500 text-xs font-medium mb-2">
          {interest.applicant_occupation || "Applicant"} · {interest.applicant_city || "Jersey City, NJ"}
        </Text>

        <View className="flex-row items-center gap-3 mb-2">
          <View className="w-5 h-5 bg-red-50 rounded-full items-center justify-center">
            <Text className="text-[10px] font-bold text-red-500">15</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Feather name="check-circle" size={12} color="#10b981" />
            <Text className="text-[#10b981] text-[11px] font-bold">Verified</Text>
          </View>
          <View className="flex-row items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <Feather name="zap" size={10} color="#10b981" />
            <Text className="text-emerald-700 text-[10px] font-bold">
              {Math.round(interest.compatibility_score || 77)}% match
            </Text>
          </View>
          <Text className="text-slate-400 text-[10px] font-medium">Active 10:24 AM</Text>
        </View>

        {interest.message && (
          <Text className="text-slate-500 text-xs" numberOfLines={2}>
            {interest.message}
          </Text>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        <View className={`px-2.5 py-1 rounded-full ${interest.status === 'accepted' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
          <Text className={`text-[10px] font-bold uppercase ${interest.status === 'accepted' ? 'text-emerald-600' : 'text-slate-500'}`}>
            {badge.label}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}
