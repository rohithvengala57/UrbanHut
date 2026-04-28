import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { ChoresTab } from "@/components/household/ChoresTab";
import { ExpensesTab } from "@/components/household/ExpensesTab";
import { Avatar } from "@/components/ui/Avatar";
import { ActionTile } from "@/components/ui/ActionTile";
import { Button } from "@/components/ui/Button";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Card } from "@/components/ui/Card";
import {
  useBalances,
  useCreateHousehold,
  useGenerateInvite,
  useHousehold,
  useHouseholdMembers,
  useJoinHousehold,
} from "@/hooks/useHousehold";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrencyDecimal } from "@/lib/format";

type TabName = "overview" | "expenses" | "chores" | "services";

export default function HouseholdScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabName>("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [maxMembers, setMaxMembers] = useState("6");
  const [inviteCode, setInviteCode] = useState("");

  const { data: household, isLoading: loadingHousehold, isError: householdError, refetch: refetchHousehold } = useHousehold();
  const hasHousehold = !!household;
  const isAdmin = !!(household && currentUser && household.admin_id === currentUser.id);
  const { data: members } = useHouseholdMembers(hasHousehold);
  const { data: balances } = useBalances(hasHousehold);
  const createHousehold = useCreateHousehold();
  const joinHousehold = useJoinHousehold();
  const generateInvite = useGenerateInvite();

  const memberList: Array<{ id: string; full_name: string; avatar_url?: string }> =
    members || [];

  const handleCreate = () => {
    if (!householdName.trim()) {
      Alert.alert("Error", "Please enter a household name");
      return;
    }
    createHousehold.mutate(
      { name: householdName.trim(), max_members: parseInt(maxMembers) || 6 },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setHouseholdName("");
        },
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to create household"),
      }
    );
  };

  const handleJoin = () => {
    if (!inviteCode.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }
    joinHousehold.mutate(inviteCode.trim(), {
      onSuccess: () => {
        setShowJoinModal(false);
        setInviteCode("");
      },
      onError: (err: any) =>
        Alert.alert("Error", err.response?.data?.detail || "Invalid invite code"),
    });
  };

  const handleGenerateInvite = () => {
    generateInvite.mutate(undefined, {
      onSuccess: (data) =>
        Alert.alert(
          "Invite Code",
          `Share this code with your roommates:\n\n${data.invite_code}`,
          [{ text: "OK" }]
        ),
      onError: (err: any) =>
        Alert.alert("Error", err.response?.data?.detail || "Failed to generate invite"),
    });
  };

  if (loadingHousehold) {
    return (
      <View className="flex-1 bg-slate-50">
        <SkeletonLoader count={3} style={{ padding: 20, paddingTop: 32 }} />
      </View>
    );
  }

  if (householdError) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#ef4444" />
        </View>
        <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load household</Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => refetchHousehold()}
          className="mt-6 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!household) {
    return (
      <View className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-3xl bg-primary-50 items-center justify-center mb-4">
            <Feather name="users" size={36} color="#0ea5e9" />
          </View>
          <Text className="text-2xl font-bold text-slate-900">No Household Yet</Text>
          <Text className="text-slate-500 text-center mt-2">
            Create a household or join one with an invite code.
          </Text>
          <View className="flex-row gap-3 mt-8">
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="flex-1 bg-primary-500 rounded-2xl py-4 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-base">Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowJoinModal(true)}
              className="flex-1 border-2 border-primary-500 rounded-2xl py-4 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-primary-600 font-bold text-base">Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showCreateModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-slate-900">Create Household</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Name *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-4"
                placeholder="e.g. 42 Oak Street"
                value={householdName}
                onChangeText={setHouseholdName}
                autoCapitalize="words"
                autoFocus
              />
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Max Members</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-6"
                placeholder="6"
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="numeric"
              />
              <Button
                title="Create Household"
                onPress={handleCreate}
                loading={createHousehold.isPending}
                size="lg"
              />
            </View>
          </View>
        </Modal>

        <Modal visible={showJoinModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-slate-900">Join Household</Text>
                <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Invite Code *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-center text-xl tracking-widest mb-6"
                placeholder="Enter code"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Button
                title="Join Household"
                onPress={handleJoin}
                loading={joinHousehold.isPending}
                size="lg"
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const tabs: { key: TabName; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "overview", label: "Overview", icon: "layout" },
    { key: "expenses", label: "Expenses", icon: "dollar-sign" },
    { key: "chores", label: "Chores", icon: "check-square" },
    { key: "services", label: "Services", icon: "tool" },
  ];

  // Find my balance
  const myBalance = balances?.find((b) => (b as any).user_id === currentUser?.id);
  const netBalance = (myBalance as any)?.net_balance ?? 0;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Tab bar */}
      <View className="bg-white border-b border-slate-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-row items-center gap-1.5 px-4 py-3.5 mr-1 border-b-2 ${
                activeTab === tab.key ? "border-primary-500" : "border-transparent"
              }`}
            >
              <Feather
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? "#0ea5e9" : "#94a3b8"}
              />
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab.key ? "text-primary-500" : "text-slate-500"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <View>
            {/* Summary gradient card */}
            <View
              className="rounded-3xl overflow-hidden mb-4 shadow-elevated"
            >
              <Svg
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                width="100%"
                height="100%"
                preserveAspectRatio="none"
              >
                <Defs>
                  <LinearGradient id="hhGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#0ea5e9" stopOpacity="1" />
                    <Stop offset="1" stopColor="#10b981" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#hhGrad)" />
              </Svg>

              <View className="p-5">
                {/* Household name + invite */}
                <View className="flex-row justify-between items-start mb-4">
                  <View>
                    <Text className="text-white text-xl font-bold">{household.name}</Text>
                    <Text className="text-white/70 text-sm">
                      {memberList.length} member{memberList.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleGenerateInvite}
                    className="flex-row items-center gap-1.5 bg-white/20 rounded-xl px-3 py-2"
                  >
                    <Feather name="share-2" size={14} color="#fff" />
                    <Text className="text-white text-sm font-semibold">Invite</Text>
                  </TouchableOpacity>
                </View>

                {/* Net balance */}
                <View className="bg-white/15 rounded-2xl px-4 py-3 mb-4">
                  <Text className="text-white/70 text-xs mb-1">Your Balance</Text>
                  <Text
                    className="text-white text-2xl font-bold"
                  >
                    {netBalance >= 0 ? "+" : ""}
                    {formatCurrencyDecimal(netBalance)}
                  </Text>
                  <Text className="text-white/70 text-xs mt-0.5">
                    {netBalance >= 0 ? "You are owed" : "You owe"}
                  </Text>
                </View>

                {/* Member avatars */}
                <View className="flex-row items-center gap-3 flex-wrap">
                  {memberList.map((m) => (
                    <View key={m.id} className="items-center">
                      <Avatar name={m.full_name} size={44} uri={m.avatar_url} />
                      <Text className="text-white/80 text-xs mt-1">
                        {m.full_name.split(" ")[0]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Action tiles */}
            <View className="flex-row gap-3 mb-4">
              <ActionTile
                icon={<Feather name="dollar-sign" size={22} color="#22c55e" />}
                label="Expenses"
                onPress={() => setActiveTab("expenses")}
                color="#22c55e"
                style={{ flex: 1 }}
              />
              <ActionTile
                icon={<Feather name="check-square" size={22} color="#0ea5e9" />}
                label="Chores"
                onPress={() => setActiveTab("chores")}
                color="#0ea5e9"
                style={{ flex: 1 }}
              />
              <ActionTile
                icon={<Feather name="tool" size={22} color="#f59e0b" />}
                label="Services"
                onPress={() => setActiveTab("services")}
                color="#f59e0b"
                style={{ flex: 1 }}
              />
            </View>

            {/* Balances breakdown */}
            {balances && balances.length > 1 && (
              <Card className="mb-4">
                <Text className="font-bold text-slate-900 mb-3">Household Balances</Text>
                {balances.map((b) => (
                  <View
                    key={(b as any).user_id}
                    className="flex-row justify-between items-center py-2.5 border-b border-slate-50 last:border-b-0"
                  >
                    <Text className="text-slate-700 font-medium">{(b as any).full_name}</Text>
                    <Text
                      className={`font-bold ${
                        (b as any).net_balance >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {(b as any).net_balance >= 0 ? "+" : ""}
                      {formatCurrencyDecimal((b as any).net_balance)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {household.invite_code && (
              <Card>
                <View className="flex-row items-center justify-between">
                  <Text className="text-slate-500 text-sm">Invite Code</Text>
                  <Text className="text-slate-800 font-bold tracking-widest text-base">
                    {household.invite_code}
                  </Text>
                </View>
              </Card>
            )}
          </View>
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            members={memberList.map((m) => ({ id: m.id, full_name: m.full_name }))}
          />
        )}

        {activeTab === "chores" && (
          <ChoresTab
            members={memberList.map((m) => ({ id: m.id, full_name: m.full_name }))}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "services" && (
          <View className="items-center py-16">
            <View className="w-16 h-16 bg-amber-50 rounded-2xl items-center justify-center mb-4">
              <Feather name="tool" size={28} color="#f59e0b" />
            </View>
            <Text className="text-slate-700 font-bold text-lg">Service Directory</Text>
            <Text className="text-slate-400 text-sm text-center mt-1">
              Find plumbers, electricians, cleaners and more.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/services" as any)}
              className="mt-5 border-2 border-amber-400 rounded-2xl px-6 py-3"
              activeOpacity={0.85}
            >
              <Text className="text-amber-600 font-semibold">Browse Services</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
