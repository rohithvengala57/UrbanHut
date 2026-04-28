import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

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
    <View className="bg-white border-b border-slate-50">
      <View className="px-5 py-4 flex-row items-center gap-4">
        <View className="relative">
          <Image 
            source={{ uri: interest.applicant_avatar || `https://i.pravatar.cc/150?u=${interest.from_user_id}` }} 
            className="w-14 h-14 rounded-full"
          />
          {interest.status === "interested" && (
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-0.5">
            <Text className="text-base font-bold text-slate-900">{interest.applicant_name}</Text>
            {interest.status === "interested" && (
              <View className="bg-primary-50 px-1.5 py-0.5 rounded">
                <Text className="text-primary-600 text-[9px] font-black uppercase">New</Text>
              </View>
            )}
          </View>

          <Text className="text-slate-500 text-xs font-medium mb-2">
            {interest.applicant_occupation || "Applicant"} · {interest.applicant_city || "Jersey City, NJ"}
          </Text>

          <View className="flex-row items-center gap-3 mb-2">
            <View className="flex-row items-center gap-1">
              <MaterialCommunityIcons name="shield-check" size={12} color="#10b981" />
              <Text className="text-[#10b981] text-[11px] font-bold">{Math.round(interest.applicant_trust_score || 85)}</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              <Feather name="zap" size={10} color="#10b981" />
              <Text className="text-emerald-700 text-[10px] font-bold">
                {Math.round(interest.compatibility_score || 77)}% match
              </Text>
            </View>
            <Text className="text-slate-400 text-[10px] font-medium">Active {formatRelativeDate(interest.created_at)}</Text>
          </View>

          {interest.message && (
            <Text className="text-slate-500 text-xs italic" numberOfLines={2}>
              "{interest.message}"
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          <View className={`px-2.5 py-1 rounded-full ${interest.status === 'accepted' || interest.status === 'mutual' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            <Text className={`text-[10px] font-bold uppercase ${interest.status === 'accepted' || interest.status === 'mutual' ? 'text-emerald-600' : 'text-slate-500'}`}>
              {badge.label}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#cbd5e1" />
        </View>
      </View>

      {isActionable && (
        <View className="flex-row gap-2 px-5 pb-4">
          {interest.status === "interested" && (
            <TouchableOpacity 
              onPress={() => onDecide(interest.id, "shortlisted")}
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 py-2.5 rounded-xl items-center"
            >
              <Text className="text-slate-700 text-xs font-bold">Shortlist</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => onDecide(interest.id, "accepted")}
            disabled={isLoading}
            className="flex-[1.5] bg-[#10b981] py-2.5 rounded-xl items-center flex-row justify-center gap-2"
          >
            <Feather name="check" size={14} color="#fff" />
            <Text className="text-white text-xs font-bold">Accept Interest</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDecide(interest.id, "rejected")}
            disabled={isLoading}
            className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center border border-red-100"
          >
            <Feather name="x" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
