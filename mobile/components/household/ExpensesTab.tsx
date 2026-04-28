import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  useAddExpense,
  useAttachReceipt,
  useBalances,
  useExpenses,
  useMyPendingSplits,
  useReceiptUploadUrl,
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

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "groceries",
    date: new Date().toISOString().split("T")[0],
    split_type: "equal" as "equal" | "exact",
  });
  const [exactSplits, setExactSplits] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: expenses } = useExpenses(1, true);
  const { data: balances } = useBalances(true);
  const { data: mySplits } = useMyPendingSplits(true);
  const addExpense = useAddExpense();
  const settleSplit = useSettleSplit();
  const receiptUploadUrl = useReceiptUploadUrl();
  const attachReceipt = useAttachReceipt();

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
        Alert.alert(
          "Error",
          `Split amounts ($${(total / 100).toFixed(2)}) don't add up to $${(amountCents / 100).toFixed(2)}`
        );
        return;
      }
    }

    const performAdd = () => {
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
            Alert.alert(
              "Error",
              err.response?.data?.detail || "Failed to add expense",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Retry", onPress: performAdd }
              ]
            ),
        }
      );
    };

    performAdd();
  };

  const splitTotal = Object.values(exactSplits).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );
  const amountNum = parseFloat(form.amount) || 0;
  const isSplitMismatch =
    form.split_type === "exact" && Math.abs(splitTotal - amountNum) > 0.01;

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setForm((p) => ({
        ...p,
        date: selectedDate.toISOString().split("T")[0],
      }));
    }
  };

  const netBalance = myBalance?.net_balance ?? 0;
  const isPositive = netBalance >= 0;

  return (
    <View className="flex-1">
      {/* Sub-tab toggle */}
      <View className="flex-row bg-slate-100 rounded-2xl p-1 mb-4">
        {(["dashboard", "history"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSplitView(tab)}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              splitView === tab ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                splitView === tab ? "text-slate-900" : "text-slate-500"
              }`}
            >
              {tab === "dashboard" ? "Dashboard" : "All Expenses"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {splitView === "dashboard" && (
        <>
          {/* "You are owed" highlight card */}
          <View
            className="rounded-3xl overflow-hidden mb-4"
            style={{
              shadowColor: isPositive ? "#22c55e" : "#ef4444",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <Svg
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id="balGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop
                    offset="0"
                    stopColor={isPositive ? "#22c55e" : "#ef4444"}
                    stopOpacity="1"
                  />
                  <Stop
                    offset="1"
                    stopColor={isPositive ? "#10b981" : "#f97316"}
                    stopOpacity="1"
                  />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#balGrad)" />
            </Svg>
            <View className="px-5 py-5">
              {myBalance ? (
                <>
                  <Text className="text-white/75 text-sm mb-1">
                    {isPositive ? "You are owed" : "You owe"}
                  </Text>
                  <Text className="text-white text-4xl font-bold">
                    {isPositive ? "+" : ""}
                    {formatCurrencyDecimal(netBalance)}
                  </Text>
                  <Text className="text-white/60 text-sm mt-1">
                    {isPositive
                      ? `${owedToMe.length} pending payment${owedToMe.length !== 1 ? "s" : ""}`
                      : `${owed.length} pending payment${owed.length !== 1 ? "s" : ""}`}
                  </Text>
                </>
              ) : (
                <Text className="text-white/80">No transactions yet</Text>
              )}
            </View>
          </View>

          {/* Household balances */}
          {balances && balances.length > 1 && (
            <Card className="mb-4">
              <Text className="font-bold text-slate-900 mb-3">Household Balances</Text>
              {balances.map((b) => (
                <View
                  key={b.user_id}
                  className="flex-row justify-between items-center py-2.5 border-b border-slate-50 last:border-b-0"
                >
                  <Text className="text-slate-700 font-medium">{b.full_name}</Text>
                  <Text
                    className={`font-bold ${
                      b.net_balance >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {b.net_balance >= 0 ? "+" : ""}
                    {formatCurrencyDecimal(b.net_balance)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* You Owe */}
          {owed.length > 0 && (
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-7 h-7 bg-red-50 rounded-full items-center justify-center">
                  <Feather name="arrow-up-circle" size={16} color="#ef4444" />
                </View>
                <Text className="font-bold text-slate-900">You Owe</Text>
              </View>
              {owed.map((s) => (
                <View
                  key={s.split_id}
                  className="flex-row justify-between items-center py-3 border-b border-slate-50 last:border-b-0"
                >
                  <View className="flex-1">
                    <Text className="text-slate-800 font-semibold text-sm">
                      {s.description}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      To {s.paid_by_name} · {s.date}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-red-500 font-bold">
                      {formatCurrencyDecimal(s.amount_owed)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleSettle(s.expense_id, s.description)}
                      className="bg-primary-500 rounded-xl px-3 py-1.5"
                      activeOpacity={0.85}
                    >
                      <Text className="text-white text-xs font-bold">Pay</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Owed to You */}
          {owedToMe.length > 0 && (
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-7 h-7 bg-green-50 rounded-full items-center justify-center">
                  <Feather name="arrow-down-circle" size={16} color="#22c55e" />
                </View>
                <Text className="font-bold text-slate-900">Owed to You</Text>
              </View>
              {owedToMe.map((s) => (
                <View
                  key={s.split_id}
                  className="flex-row justify-between items-center py-3 border-b border-slate-50 last:border-b-0"
                >
                  <View className="flex-1">
                    <Text className="text-slate-800 font-semibold text-sm">
                      {s.description}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">{s.date}</Text>
                  </View>
                  <Text className="text-green-600 font-bold">
                    {formatCurrencyDecimal(s.amount_owed)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {owed.length === 0 && owedToMe.length === 0 && (
            <View className="items-center py-10">
              <View className="w-14 h-14 bg-green-50 rounded-2xl items-center justify-center mb-3">
                <Feather name="check-circle" size={28} color="#22c55e" />
              </View>
              <Text className="text-slate-700 font-bold">All settled up!</Text>
              <Text className="text-slate-400 text-sm mt-1">No pending balances.</Text>
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
                      {expense.is_recurring && (
                        <View className="flex-row items-center gap-0.5">
                          <Feather name="repeat" size={10} color="#0ea5e9" />
                          <Text className="text-xs text-primary-500">{expense.recurrence}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-slate-400 mt-0.5">
                      Split: {expense.split_type}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="font-bold text-slate-900 text-base">
                      {formatCurrencyDecimal(expense.amount)}
                    </Text>
                    {/* UH-502: Receipt indicator */}
                    <TouchableOpacity
                      onPress={() => {
                        if (expense.receipt_url) {
                          Alert.alert("Receipt", "Receipt is attached to this expense.");
                        } else {
                          Alert.alert(
                            "Add Receipt",
                            "To attach a receipt, use the Upload Receipt option.",
                            [{ text: "OK" }]
                          );
                        }
                      }}
                      className="flex-row items-center gap-1"
                    >
                      <Feather
                        name="file-text"
                        size={13}
                        color={expense.receipt_url ? "#22c55e" : "#cbd5e1"}
                      />
                      <Text
                        className={`text-xs ${expense.receipt_url ? "text-green-600" : "text-slate-300"}`}
                      >
                        {expense.receipt_url ? "Receipt" : "No receipt"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </>
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        className="absolute bottom-4 right-0 w-14 h-14 bg-primary-500 rounded-full items-center justify-center"
        style={{
          elevation: 6,
          shadowColor: "#0ea5e9",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        }}
        activeOpacity={0.85}
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

              <Text className="text-sm font-medium text-slate-700 mb-1">Description *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
                placeholder="e.g. Groceries run"
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                autoCapitalize="sentences"
              />

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
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-slate-900">{form.date}</Text>
                    <Feather name="calendar" size={16} color="#64748b" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(form.date)}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </View>
              </View>

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
                          form.category === cat
                            ? "text-primary-600 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

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

              {form.split_type === "exact" && members.length > 0 && (
                <View className="mb-3 bg-slate-50 rounded-xl p-3">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs font-medium text-slate-500">
                      Enter each person's share ($)
                    </Text>
                    <Text
                      className={`text-xs font-bold ${
                        isSplitMismatch ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      Total: ${splitTotal.toFixed(2)} / ${amountNum.toFixed(2)}
                    </Text>
                  </View>
                  {isSplitMismatch && (
                    <View className="bg-red-50 rounded-lg px-2 py-1 mb-2">
                      <Text className="text-red-600 text-[10px]">
                        Mismatch: ${Math.abs(splitTotal - amountNum).toFixed(2)}
                      </Text>
                    </View>
                  )}
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

              <Button title="Add Expense" onPress={handleAdd} loading={addExpense.isPending} size="lg" />
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
