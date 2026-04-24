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

import { ChoresTab } from "@/components/household/ChoresTab";
import { ExpensesTab } from "@/components/household/ExpensesTab";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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

  const { data: household, isLoading: loadingHousehold } = useHousehold();
  const hasHousehold = !!household;
  const isAdmin = !!(household && currentUser && household.admin_id === currentUser.id);
  const { data: members } = useHouseholdMembers(hasHousehold);
  const { data: balances } = useBalances(hasHousehold);
  const createHousehold = useCreateHousehold();
  const joinHousehold = useJoinHousehold();
  const generateInvite = useGenerateInvite();

  const memberList: Array<{ id: string; full_name: string; avatar_url?: string }> = members || [];

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
        Alert.alert("Invite Code", `Share this code with your roommates:\n\n${data.invite_code}`, [
          { text: "OK" },
        ]),
      onError: (err: any) =>
        Alert.alert("Error", err.response?.data?.detail || "Failed to generate invite"),
    });
  };

  if (loadingHousehold) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!household) {
    return (
      <View className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="users" size={64} color="#cbd5e1" />
          <Text className="text-xl font-bold text-slate-900 mt-4">No Household Yet</Text>
          <Text className="text-slate-500 text-center mt-2">
            Create a household or join one with an invite code.
          </Text>
          <View className="flex-row gap-3 mt-6">
            <Button title="Create" onPress={() => setShowCreateModal(true)} variant="primary" />
            <Button title="Join" onPress={() => setShowJoinModal(true)} variant="outline" />
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
              <Button title="Create Household" onPress={handleCreate} loading={createHousehold.isPending} size="lg" />
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
              <Button title="Join Household" onPress={handleJoin} loading={joinHousehold.isPending} size="lg" />
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

  return (
    <View className="flex-1 bg-slate-50">
      {/* Top tab bar */}
      <View className="bg-white border-b border-slate-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-row items-center gap-1.5 px-4 py-3 mr-1 border-b-2 ${
                activeTab === tab.key ? "border-primary-500" : "border-transparent"
              }`}
            >
              <Feather
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? "#0ea5e9" : "#94a3b8"}
              />
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key ? "text-primary-500" : "text-slate-500"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── OVERVIEW ─────────────────────────────────── */}
        {activeTab === "overview" && (
          <View>
            <Card className="mb-4">
              <View className="flex-row justify-between items-start mb-3">
                <Text className="text-lg font-bold text-slate-900">{household.name}</Text>
                <TouchableOpacity
                  onPress={handleGenerateInvite}
                  className="flex-row items-center gap-1.5 bg-primary-50 rounded-lg px-3 py-1.5"
                >
                  <Feather name="share-2" size={14} color="#0ea5e9" />
                  <Text className="text-xs text-primary-600 font-semibold">Invite</Text>
                </TouchableOpacity>
              </View>
              {household.invite_code && (
                <View className="bg-slate-50 rounded-xl px-3 py-2 mb-3 flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500">Code:</Text>
                  <Text className="text-sm font-bold text-slate-700 tracking-widest">
                    {household.invite_code}
                  </Text>
                </View>
              )}
              <View className="flex-row flex-wrap gap-3">
                {memberList.map((m) => (
                  <View key={m.id} className="items-center">
                    <Avatar name={m.full_name} size={48} uri={m.avatar_url} />
                    <Text className="text-xs text-slate-600 mt-1">{m.full_name.split(" ")[0]}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {balances && balances.length > 0 && (
              <Card className="mb-4">
                <Text className="font-bold text-slate-900 mb-2">Balances</Text>
                {balances.map((b) => (
                  <View key={b.user_id} className="flex-row justify-between py-1.5 border-b border-slate-50 last:border-b-0">
                    <Text className="text-slate-600">{b.full_name}</Text>
                    <Text className={`font-medium ${b.net_balance >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {b.net_balance >= 0 ? "+" : ""}
                      {formatCurrencyDecimal(b.net_balance)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Quick shortcuts */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setActiveTab("expenses")}
                className="flex-1 bg-green-50 rounded-xl p-4 items-center"
              >
                <Feather name="dollar-sign" size={24} color="#22c55e" />
                <Text className="text-green-700 font-semibold text-sm mt-1">Expenses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("chores")}
                className="flex-1 bg-blue-50 rounded-xl p-4 items-center"
              >
                <Feather name="check-square" size={24} color="#3b82f6" />
                <Text className="text-blue-700 font-semibold text-sm mt-1">Chores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("services")}
                className="flex-1 bg-amber-50 rounded-xl p-4 items-center"
              >
                <Feather name="tool" size={24} color="#f59e0b" />
                <Text className="text-amber-700 font-semibold text-sm mt-1">Services</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── EXPENSES ─────────────────────────────────── */}
        {activeTab === "expenses" && (
          <ExpensesTab members={memberList.map((m) => ({ id: m.id, full_name: m.full_name }))} />
        )}

        {/* ── CHORES ───────────────────────────────────── */}
        {activeTab === "chores" && (
          <ChoresTab
            members={memberList.map((m) => ({ id: m.id, full_name: m.full_name }))}
            isAdmin={isAdmin}
          />
        )}

        {/* ── SERVICES ─────────────────────────────────── */}
        {activeTab === "services" && (
          <View className="items-center py-12">
            <Feather name="tool" size={48} color="#cbd5e1" />
            <Text className="text-slate-400 mt-4 text-base">Service Directory</Text>
            <Text className="text-slate-400 text-sm text-center mt-1">
              Find plumbers, electricians, cleaners and more.
            </Text>
            <View className="mt-4">
              <Button
                title="Browse Services"
                onPress={() => router.push("/services" as any)}
                variant="outline"
                size="sm"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
