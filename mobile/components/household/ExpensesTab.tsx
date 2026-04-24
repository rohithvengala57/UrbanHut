import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  useAddExpense,
  useBalances,
  useExpenses,
  useMyPendingSplits,
  useSettleSplit,
} from "@/hooks/useHousehold";
import { formatCurrencyDecimal } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";

const CATEGORIES = ["rent", "groceries", "utilities", "internet", "food", "transport", "other"];

interface Props {
  members: Array<{ id: string; full_name: string }>;
}

export function ExpensesTab({ members }: Props) {
  const user = useAuthStore((s) => s.user);
  const [showAddModal, setShowAddModal] = useState(false);
  const [splitView, setSplitView] = useState<"dashboard" | "history">("dashboard");

  // Form state
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "groceries",
    date: new Date().toISOString().split("T")[0],
    split_type: "equal" as "equal" | "exact",
  });
  const [exactSplits, setExactSplits] = useState<Record<string, string>>({});

  const { data: expenses } = useExpenses(1, true);
  const { data: balances } = useBalances(true);
  const { data: mySplits } = useMyPendingSplits(true);
  const addExpense = useAddExpense();
  const settleSplit = useSettleSplit();

  const myBalance = balances?.find((b) => b.user_id === user?.id);
  const owed = (mySplits || []).filter((s) => s.status === "pending" && s.paid_by_id !== user?.id);
  const owedToMe = (mySplits || []).filter(
    (s) => s.status === "pending" && s.paid_by_id === user?.id
  );

  const handleSettle = (expenseId: string, description: string) => {
    Alert.alert("Mark as Paid", `Mark your share of "${description}" as paid?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Paid",
        onPress: () =>
          settleSplit.mutate(expenseId, {
            onError: (err: any) =>
              Alert.alert("Error", err.response?.data?.detail || "Failed to settle"),
          }),
      },
    ]);
  };

  const handleAdd = () => {
    if (!form.description || !form.amount) {
      Alert.alert("Error", "Please fill in description and amount");
      return;
    }
    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      Alert.alert("Error", "Invalid amount");
      return;
    }

    let split_details: Record<string, number> | undefined;
    if (form.split_type === "exact") {
      split_details = {};
      let total = 0;
      for (const [uid, val] of Object.entries(exactSplits)) {
        const cents = Math.round(parseFloat(val || "0") * 100);
        split_details[uid] = cents;
        total += cents;
      }
      if (Math.abs(total - amountCents) > 2) {
        Alert.alert("Error", `Split amounts ($${(total / 100).toFixed(2)}) don't add up to $${(amountCents / 100).toFixed(2)}`);
        return;
      }
    }

    addExpense.mutate(
      { ...form, amount: amountCents, split_details },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setForm({
            description: "",
            amount: "",
            category: "groceries",
            date: new Date().toISOString().split("T")[0],
            split_type: "equal",
          });
          setExactSplits({});
        },
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to add expense"),
      }
    );
  };

  return (
    <View className="flex-1">
      {/* Sub-tab toggle */}
      <View className="flex-row bg-slate-100 rounded-xl p-1 mx-0 mb-4">
        {(["dashboard", "history"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSplitView(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${splitView === tab ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`text-sm font-medium ${splitView === tab ? "text-slate-900" : "text-slate-500"}`}
            >
              {tab === "dashboard" ? "Dashboard" : "All Expenses"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {splitView === "dashboard" && (
        <>
          {/* Net Balance Card */}
          <Card className="mb-4">
            <Text className="font-bold text-slate-900 mb-3">Your Balance</Text>
            {myBalance ? (
              <View
                className={`rounded-xl p-4 items-center ${
                  myBalance.net_balance >= 0 ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <Text
                  className={`text-3xl font-bold ${
                    myBalance.net_balance >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {myBalance.net_balance >= 0 ? "+" : ""}
                  {formatCurrencyDecimal(myBalance.net_balance)}
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    myBalance.net_balance >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {myBalance.net_balance >= 0 ? "You are owed overall" : "You owe overall"}
                </Text>
              </View>
            ) : (
              <Text className="text-slate-400 text-sm">No transactions yet</Text>
            )}
          </Card>

          {/* All Members Balances */}
          {balances && balances.length > 1 && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-2">Household Balances</Text>
              {balances.map((b) => (
                <View key={b.user_id} className="flex-row justify-between items-center py-2 border-b border-slate-50 last:border-b-0">
                  <Text className="text-slate-700 font-medium">{b.full_name}</Text>
                  <Text
                    className={`font-bold ${b.net_balance >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {b.net_balance >= 0 ? "+" : ""}
                    {formatCurrencyDecimal(b.net_balance)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* You Owe Section */}
          {owed.length > 0 && (
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Feather name="arrow-up-circle" size={18} color="#ef4444" />
                <Text className="font-bold text-slate-900">You Owe</Text>
              </View>
              {owed.map((s) => (
                <View key={s.split_id} className="flex-row justify-between items-center py-2 border-b border-slate-50">
                  <View className="flex-1">
                    <Text className="text-slate-800 font-medium text-sm">{s.description}</Text>
                    <Text className="text-slate-400 text-xs">To {s.paid_by_name} · {s.date}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-red-500 font-bold">
                      {formatCurrencyDecimal(s.amount_owed)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleSettle(s.expense_id, s.description)}
                      className="bg-primary-500 rounded-lg px-2 py-1"
                    >
                      <Text className="text-white text-xs font-semibold">Pay</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Owed To You Section */}
          {owedToMe.length > 0 && (
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Feather name="arrow-down-circle" size={18} color="#22c55e" />
                <Text className="font-bold text-slate-900">Owed to You</Text>
              </View>
              {owedToMe.map((s) => (
                <View key={s.split_id} className="flex-row justify-between items-center py-2 border-b border-slate-50">
                  <View className="flex-1">
                    <Text className="text-slate-800 font-medium text-sm">{s.description}</Text>
                    <Text className="text-slate-400 text-xs">{s.date}</Text>
                  </View>
                  <Text className="text-green-600 font-bold">
                    {formatCurrencyDecimal(s.amount_owed)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {owed.length === 0 && owedToMe.length === 0 && (
            <View className="items-center py-8">
              <Feather name="check-circle" size={40} color="#22c55e" />
              <Text className="text-slate-500 mt-3 font-medium">All settled up!</Text>
            </View>
          )}
        </>
      )}

      {splitView === "history" && (
        <>
          {(expenses || []).length === 0 ? (
            <View className="items-center py-12">
              <Feather name="dollar-sign" size={40} color="#cbd5e1" />
              <Text className="text-slate-400 mt-3">No expenses yet</Text>
            </View>
          ) : (
            (expenses || []).map((expense) => (
              <Card key={expense.id} className="mb-3">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-900">{expense.description}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Badge label={expense.category} />
                      <Text className="text-xs text-slate-500">{expense.date}</Text>
                    </View>
                    <Text className="text-xs text-slate-400 mt-0.5">
                      Split: {expense.split_type}
                    </Text>
                  </View>
                  <Text className="font-bold text-slate-900 text-base">
                    {formatCurrencyDecimal(expense.amount)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </>
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        className="absolute bottom-4 right-0 w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-xl font-bold text-slate-900">Add Expense</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text className="text-sm font-medium text-slate-700 mb-1">Description *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
                placeholder="e.g. Groceries run"
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                autoCapitalize="sentences"
              />

              {/* Amount + Date row */}
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-700 mb-1">Amount ($) *</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                    placeholder="0.00"
                    value={form.amount}
                    onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-700 mb-1">Date</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                    placeholder="YYYY-MM-DD"
                    value={form.date}
                    onChangeText={(v) => setForm((p) => ({ ...p, date: v }))}
                  />
                </View>
              </View>

              {/* Category */}
              <Text className="text-sm font-medium text-slate-700 mb-1">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setForm((p) => ({ ...p, category: cat }))}
                      className={`px-3 py-1.5 rounded-full border ${
                        form.category === cat
                          ? "bg-primary-50 border-primary-500"
                          : "border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          form.category === cat ? "text-primary-600 font-medium" : "text-slate-600"
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Split Type */}
              <Text className="text-sm font-medium text-slate-700 mb-1">Split</Text>
              <View className="flex-row gap-2 mb-3">
                {(["equal", "exact"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setForm((p) => ({ ...p, split_type: type }))}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      form.split_type === type
                        ? "bg-primary-50 border-primary-500"
                        : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        form.split_type === type ? "text-primary-600" : "text-slate-600"
                      }`}
                    >
                      {type === "equal" ? "Split Equally" : "Custom Amounts"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Exact split inputs */}
              {form.split_type === "exact" && members.length > 0 && (
                <View className="mb-3 bg-slate-50 rounded-xl p-3">
                  <Text className="text-xs font-medium text-slate-500 mb-2">
                    Enter each person's share ($)
                  </Text>
                  {members.map((m) => (
                    <View key={m.id} className="flex-row items-center justify-between mb-2">
                      <Text className="text-slate-700 flex-1">{m.full_name}</Text>
                      <TextInput
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 w-24 text-right"
                        placeholder="0.00"
                        value={exactSplits[m.id] || ""}
                        onChangeText={(v) =>
                          setExactSplits((prev) => ({ ...prev, [m.id]: v }))
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  ))}
                </View>
              )}

              <Button
                title="Add Expense"
                onPress={handleAdd}
                loading={addExpense.isPending}
                size="lg"
              />
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
