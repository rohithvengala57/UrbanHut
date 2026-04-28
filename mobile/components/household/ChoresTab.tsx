import { Feather } from "@expo/vector-icons";
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

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  useApproveConstraint,
  useChoreConstraints,
  useChorePerformance,
  useChorePoints,
  useChoreSchedule,
  useChoreTemplates,
  useCompleteChore,
  useCreateChoreTemplate,
  useCreateConstraint,
  useDeleteChoreTemplate,
  useDeleteConstraint,
  useGenerateSchedule,
  useOverrideAssignment,
  useRejectConstraint,
  useSendChoreReminders,
  useUpdateChoreTemplate,
} from "@/hooks/useHousehold";
import { DAY_NAMES } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";

type ChoreSubTab = "mine" | "all" | "manage";

const CONSTRAINT_TYPES = [
  { key: "fixed_assignment", label: "Fixed (must do)" },
  { key: "restriction", label: "Restriction (cannot do)" },
  { key: "preference", label: "Preference (prefers)" },
  { key: "frequency_cap", label: "Frequency Cap (max times)" },
];

const TIME_OPTIONS = ["anytime", "morning", "afternoon", "evening", "night"];
const CATEGORIES = ["cleaning", "cooking", "laundry", "trash", "shopping", "maintenance", "other"];

interface Props {
  members: Array<{ id: string; full_name: string }>;
  isAdmin?: boolean;
}

function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date().setDate(diff));
  return monday.toISOString().split("T")[0];
}

function constraintStatusColor(status: string) {
  if (status === "approved") return "#22c55e";
  if (status === "rejected") return "#ef4444";
  return "#f59e0b"; // pending
}

function completionRateColor(rate: number) {
  if (rate >= 0.85) return "#22c55e";
  if (rate >= 0.6) return "#f59e0b";
  return "#ef4444";
}

function StarRating({ rate }: { rate: number }) {
  // Map 0-1 completion rate to 1-5 star display
  const stars = Math.round(rate * 5);
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={12}
          color={s <= stars ? "#f59e0b" : "#e2e8f0"}
        />
      ))}
    </View>
  );
}

export function ChoresTab({ members, isAdmin = false }: Props) {
  const user = useAuthStore((s) => s.user);
  const [activeSubTab, setActiveSubTab] = useState<ChoreSubTab>("mine");

  // Modals
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddConstraint, setShowAddConstraint] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState<string | null>(null); // assignment id
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null); // assignment id
  const [completeNote, setCompleteNote] = useState("");
  const [overrideUserId, setOverrideUserId] = useState("");

  // Task form
  const [taskForm, setTaskForm] = useState({
    name: "",
    description: "",
    category: "",
    weight: "1.0",
    frequency: "7",
    time_of_day: "anytime",
  });

  // Constraint form
  const [constraintForm, setConstraintForm] = useState({
    type: "restriction",
    user_id: "",
    chore_id: "",
    day_of_week: "",
    max_frequency: "",
  });

  const {
    data: templates,
    isLoading: templatesLoading,
    isError: templatesError,
    refetch: refetchTemplates,
  } = useChoreTemplates(true);
  const {
    data: constraints,
    isLoading: constraintsLoading,
    isError: constraintsError,
    refetch: refetchConstraints,
  } = useChoreConstraints(true);
  const {
    data: schedule,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule,
  } = useChoreSchedule(true);
  const {
    data: points,
    isLoading: pointsLoading,
    isError: pointsError,
    refetch: refetchPoints,
  } = useChorePoints(true);
  const {
    data: performance,
    isLoading: performanceLoading,
    isError: performanceError,
    refetch: refetchPerformance,
  } = useChorePerformance(4, true);

  const createTemplate = useCreateChoreTemplate();
  const updateTemplate = useUpdateChoreTemplate();
  const deleteTemplate = useDeleteChoreTemplate();
  const createConstraint = useCreateConstraint();
  const deleteConstraint = useDeleteConstraint();
  const approveConstraint = useApproveConstraint();
  const rejectConstraint = useRejectConstraint();
  const generateSchedule = useGenerateSchedule();
  const completeChore = useCompleteChore();
  const overrideAssignment = useOverrideAssignment();
  const sendReminders = useSendChoreReminders();

  // Maps for display
  const templateMap = new Map((templates || []).map((t) => [t.id, t]));
  const memberMap = new Map((members || []).map((m) => [m.id, m.full_name]));

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddTask = () => {
    if (!taskForm.name.trim()) {
      Alert.alert("Error", "Task name is required");
      return;
    }
    const weight = parseFloat(taskForm.weight);
    const frequency = parseInt(taskForm.frequency);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert("Error", "Invalid weight");
      return;
    }
    createTemplate.mutate(
      {
        name: taskForm.name.trim(),
        description: taskForm.description.trim() || undefined,
        category: taskForm.category || undefined,
        weight,
        frequency: Math.min(7, Math.max(1, frequency || 7)),
        time_of_day: taskForm.time_of_day,
      },
      {
        onSuccess: () => {
          setShowAddTask(false);
          setTaskForm({ name: "", description: "", category: "", weight: "1.0", frequency: "7", time_of_day: "anytime" });
        },
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to add task"),
      }
    );
  };

  const handleToggleActive = (id: string, currentlyActive: boolean) => {
    updateTemplate.mutate(
      { taskId: id, data: { is_active: !currentlyActive } },
      {
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to update"),
      }
    );
  };

  const handleDeleteTask = (id: string, name: string) => {
    Alert.alert("Delete Task", `Remove "${name}"? This will also delete its schedule.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteTemplate.mutate(id, {
            onError: (err: any) =>
              Alert.alert("Error", err.response?.data?.detail || "Failed to delete"),
          }),
      },
    ]);
  };

  const handleAddConstraint = () => {
    if (!constraintForm.user_id && !constraintForm.chore_id) {
      Alert.alert("Error", "Select at least a person or a task");
      return;
    }
    const payload: any = { type: constraintForm.type };
    if (constraintForm.user_id) payload.user_id = constraintForm.user_id;
    if (constraintForm.chore_id) payload.chore_id = constraintForm.chore_id;
    if (constraintForm.day_of_week !== "") {
      payload.day_of_week = parseInt(constraintForm.day_of_week);
    }
    if (constraintForm.type === "frequency_cap" && constraintForm.max_frequency) {
      payload.max_frequency = parseInt(constraintForm.max_frequency);
    }
    createConstraint.mutate(payload, {
      onSuccess: () => {
        setShowAddConstraint(false);
        setConstraintForm({ type: "restriction", user_id: "", chore_id: "", day_of_week: "", max_frequency: "" });
      },
      onError: (err: any) =>
        Alert.alert("Error", err.response?.data?.detail || "Failed to add rule"),
    });
  };

  const handleGenerate = () => {
    if (!templates || templates.filter((t) => t.is_active).length === 0) {
      Alert.alert("No Active Tasks", "Enable at least one task before generating a schedule.");
      return;
    }
    const weekStart = getMondayOfCurrentWeek();
    Alert.alert(
      "Generate Schedule",
      `Generate a new schedule for the week of ${weekStart}? Pending assignments will be replaced; completed ones are preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: () =>
            generateSchedule.mutate(weekStart, {
              onSuccess: () => {
                Alert.alert("Success", "Schedule generated!");
                setActiveSubTab("all");
              },
              onError: (err: any) =>
                Alert.alert(
                  "Cannot Generate",
                  err.response?.data?.detail ||
                    "Constraints may be too restrictive. Try relaxing some rules."
                ),
            }),
        },
      ]
    );
  };

  const handleComplete = (assignmentId: string) => {
    completeChore.mutate(
      { assignmentId, note: completeNote || undefined },
      {
        onSuccess: () => {
          setShowCompleteModal(null);
          setCompleteNote("");
        },
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to mark complete"),
      }
    );
  };

  const handleOverride = (assignmentId: string) => {
    if (!overrideUserId) {
      Alert.alert("Error", "Select a member to reassign to");
      return;
    }
    overrideAssignment.mutate(
      { assignmentId, newUserId: overrideUserId },
      {
        onSuccess: () => {
          setShowOverrideModal(null);
          setOverrideUserId("");
        },
        onError: (err: any) =>
          Alert.alert("Error", err.response?.data?.detail || "Failed to reassign"),
      }
    );
  };

  // ── Sub-tabs ──────────────────────────────────────────────────────────────

  const subTabs: { key: ChoreSubTab; label: string }[] = [
    { key: "mine", label: "My Tasks" },
    { key: "all", label: "Schedule" },
    { key: "manage", label: "Manage" },
  ];

  // Derive my pending assignments and all assignments from schedule
  const myPendingAssignments = (schedule || []).filter(
    (a) => a.assigned_to === user?.id && a.status === "pending"
  );
  const allPendingAssignments = (schedule || []).filter((a) => a.status === "pending");
  const completedAssignments = (schedule || []).filter((a) => a.status === "completed");
  const missedAssignments = (schedule || []).filter((a) => a.status === "missed");
  const historyAssignments = [...completedAssignments, ...missedAssignments].sort((a, b) => 
    new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
  );
  const choresLoading =
    templatesLoading ||
    constraintsLoading ||
    scheduleLoading ||
    pointsLoading ||
    performanceLoading;
  const choresError =
    templatesError ||
    constraintsError ||
    scheduleError ||
    pointsError ||
    performanceError;

  if (choresLoading) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (choresError) {
    return (
      <View className="flex-1 items-center justify-center px-8 py-10">
        <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#ef4444" />
        </View>
        <Text className="text-slate-800 font-bold text-lg text-center">Couldn't load chores</Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => {
            refetchTemplates();
            refetchConstraints();
            refetchSchedule();
            refetchPoints();
            refetchPerformance();
          }}
          className="mt-6 bg-primary-500 rounded-2xl px-8 py-3 flex-row items-center gap-2"
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Sub-tab bar */}
      <View className="flex-row bg-slate-100 rounded-2xl p-1 mb-4">
        {subTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveSubTab(tab.key)}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              activeSubTab === tab.key ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeSubTab === tab.key ? "text-primary-600" : "text-slate-400"
              }`}
            >
              {tab.label}
            </Text>
            {tab.key === "mine" && myPendingAssignments.length > 0 && (
              <View className="absolute top-1 right-2 w-4 h-4 bg-primary-500 rounded-full items-center justify-center">
                <Text className="text-white text-[9px] font-bold">
                  {myPendingAssignments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* UH-602/UH-603: Reminder + Calendar actions */}
      <View className="flex-row gap-2 mb-3">
        <TouchableOpacity
          onPress={() => {
            sendReminders.mutate(undefined, {
              onSuccess: (data) => {
                const msg = data.sent > 0
                  ? `${data.sent} reminder${data.sent !== 1 ? "s" : ""} sent`
                  : data.message ?? "No pending chores today";
                Alert.alert("Reminders", msg);
              },
              onError: () => Alert.alert("Error", "Could not send reminders"),
            });
          }}
          disabled={sendReminders.isPending}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 border border-amber-100"
        >
          <Feather name="bell" size={14} color="#f59e0b" />
          <Text className="text-amber-600 text-sm font-semibold">
            {sendReminders.isPending ? "Sending..." : "Send Reminders"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert("Calendar Export", "Download chores.ics from:\n/api/v1/chores/calendar.ics\n\nOpen in your calendar app to import.")}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-50 border border-blue-100"
        >
          <Feather name="download" size={14} color="#0ea5e9" />
          <Text className="text-primary-600 text-sm font-semibold">Export iCal</Text>
        </TouchableOpacity>
      </View>

      {/* ── MY TASKS ──────────────────────────────────────── */}
      {activeSubTab === "mine" && (
        <View>
          {myPendingAssignments.length === 0 ? (
            <View className="items-center py-14">
              <View className="w-16 h-16 bg-green-50 rounded-2xl items-center justify-center mb-4">
                <Feather name="check-circle" size={28} color="#22c55e" />
              </View>
              <Text className="text-slate-700 font-bold text-base">All caught up!</Text>
              <Text className="text-slate-400 text-sm mt-1">No pending tasks assigned to you.</Text>
            </View>
          ) : (
            myPendingAssignments.map((a) => {
              const choreName = templateMap.get(a.chore_id)?.name || "Unknown";
              const dayName = DAY_NAMES[a.day_of_week] || "";
              return (
                <Card key={a.id} className="mb-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-10 h-10 bg-primary-50 rounded-xl items-center justify-center">
                        <Feather name="check-square" size={18} color="#0ea5e9" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-slate-900">{choreName}</Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <View className="bg-slate-100 rounded-full px-2 py-0.5">
                            <Text className="text-xs text-slate-500">{dayName}</Text>
                          </View>
                          <Text className="text-xs text-slate-400">
                            {templateMap.get(a.chore_id)?.weight ?? 1} pt
                          </Text>
                          {a.note && (
                            <Text className="text-xs text-slate-400 italic" numberOfLines={1}>
                              "{a.note}"
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setShowCompleteModal(a.id);
                        setCompleteNote("");
                      }}
                      className="bg-primary-500 rounded-xl px-3 py-2"
                      activeOpacity={0.85}
                    >
                      <Text className="text-white text-xs font-bold">Done ✓</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* ── ALL (Schedule) ───────────────────────────────────────────── */}
      {activeSubTab === "all" && (
        <View>
          {isAdmin && (
            <TouchableOpacity
              onPress={handleGenerate}
              className="flex-row items-center justify-center gap-2 bg-primary-500 rounded-2xl py-3 mb-4"
              activeOpacity={0.85}
            >
              <Feather name="zap" size={16} color="#fff" />
              <Text className="text-white font-bold">Generate This Week's Schedule</Text>
            </TouchableOpacity>
          )}

          {allPendingAssignments.length === 0 && historyAssignments.length === 0 ? (
            <View className="items-center py-12">
              <Feather name="calendar" size={40} color="#cbd5e1" />
              <Text className="text-slate-400 mt-3">No chores scheduled</Text>
              <Text className="text-slate-400 text-sm text-center mt-1">
                {isAdmin
                  ? "Generate a schedule to assign chores"
                  : "Ask your admin to generate the schedule"}
              </Text>
            </View>
          ) : (
            <>
              {allPendingAssignments.length > 0 && (
                <Text className="text-slate-500 text-xs font-bold uppercase mb-3 px-1">This Week</Text>
              )}
              {DAY_NAMES.map((dayName, dayIdx) => {
                const dayAssignments = allPendingAssignments.filter(
                  (a) => a.day_of_week === dayIdx
                );
                if (dayAssignments.length === 0) return null;
                return (
                  <Card key={dayIdx} className="mb-3">
                    <Text className="font-bold text-slate-900 mb-2">{dayName}</Text>
                    {dayAssignments.map((a) => {
                      const choreName = templateMap.get(a.chore_id)?.name || "Unknown";
                      const assigneeName = memberMap.get(a.assigned_to) || "Unknown";
                      const isMe = a.assigned_to === user?.id;
                      const canComplete = isMe || isAdmin;

                      return (
                        <View
                          key={a.id}
                          className={`flex-row justify-between items-center py-2.5 border-b border-slate-50 last:border-b-0 ${
                            isMe ? "bg-primary-50 -mx-3 px-3 rounded-xl" : ""
                          }`}
                        >
                          <View className="flex-1">
                            <Text className="text-slate-800 font-semibold text-sm">
                              {choreName}
                            </Text>
                            <Text
                              className={`text-xs mt-0.5 ${
                                isMe ? "text-primary-600 font-medium" : "text-slate-400"
                              }`}
                            >
                              {isMe ? "You" : assigneeName}
                              {` · ${templateMap.get(a.chore_id)?.weight ?? 1} pt`}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-2">
                            {isAdmin && !isMe && (
                              <TouchableOpacity
                                onPress={() => {
                                  setShowOverrideModal(a.id);
                                  setOverrideUserId("");
                                }}
                                className="bg-slate-100 rounded-lg p-1.5"
                              >
                                <Feather name="shuffle" size={13} color="#64748b" />
                              </TouchableOpacity>
                            )}
                            {canComplete && (
                              <TouchableOpacity
                                onPress={() => {
                                  setShowCompleteModal(a.id);
                                  setCompleteNote("");
                                }}
                                className="bg-primary-500 rounded-xl px-3 py-1.5"
                                activeOpacity={0.85}
                              >
                                <Text className="text-white text-xs font-bold">Done ✓</Text>
                              </TouchableOpacity>
                            )}
                            {!canComplete && (
                              <View className="bg-amber-50 rounded-xl px-2.5 py-1.5">
                                <Text className="text-amber-600 text-xs font-medium">Pending</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                );
              })}

              {historyAssignments.length > 0 && (
                <View className="mt-4">
                  <Text className="text-slate-500 text-xs font-bold uppercase mb-3 px-1">Recent History</Text>
                  {historyAssignments.slice(0, 10).map((a) => {
                    const choreName = templateMap.get(a.chore_id)?.name || "Unknown";
                    const assigneeName = memberMap.get(a.assigned_to) || "Unknown";
                    const isMe = a.assigned_to === user?.id;
                    const isDone = a.status === "completed";
                    const dayName = DAY_NAMES[a.day_of_week] || "";
                    return (
                      <Card key={a.id} className="mb-2 opacity-80">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-3 flex-1">
                            <View
                              className={`w-9 h-9 rounded-xl items-center justify-center ${
                                isDone ? "bg-green-50" : "bg-red-50"
                              }`}
                            >
                              <Feather
                                name={isDone ? "check-circle" : "alert-circle"}
                                size={18}
                                color={isDone ? "#22c55e" : "#ef4444"}
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="font-semibold text-slate-800 text-sm">{choreName}</Text>
                              <View className="flex-row items-center gap-2 mt-0.5">
                                <Text className="text-[10px] text-slate-400">{dayName}</Text>
                                <Text className="text-[10px] text-slate-400">
                                  {isMe ? "You" : assigneeName}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View
                            className={`rounded-full px-2 py-0.5 ${
                              isDone ? "bg-green-50" : "bg-red-50"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-bold ${
                                isDone ? "text-green-600" : "text-red-500"
                              }`}
                            >
                              {isDone ? "Done" : "Missed"}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* ── MANAGE ────────────────────────────────────────── */}
      {activeSubTab === "manage" && (
        <View>
          {/* Admin generate schedule */}
          {isAdmin && (
            <TouchableOpacity
              onPress={handleGenerate}
              className="flex-row items-center justify-center gap-2 bg-primary-500 rounded-2xl py-3 mb-4"
              activeOpacity={0.85}
            >
              <Feather name="zap" size={16} color="#fff" />
              <Text className="text-white font-bold">Generate This Week's Schedule</Text>
            </TouchableOpacity>
          )}

          {/* TASKS */}
          <Text className="text-slate-500 text-xs font-bold uppercase mb-2">Tasks</Text>
          {!isAdmin && (
            <Card className="mb-3 bg-blue-50 border border-blue-100">
              <Text className="text-blue-700 text-xs">
                Only the household admin can add or remove tasks.
              </Text>
            </Card>
          )}
          {(templates || []).length === 0 ? (
            <View className="items-center py-8">
              <Feather name="list" size={36} color="#cbd5e1" />
              <Text className="text-slate-400 mt-2">No tasks yet</Text>
            </View>
          ) : (
            (templates || []).map((t) => (
              <Card key={t.id} className={`mb-2 ${!t.is_active ? "opacity-50" : ""}`}>
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <Text className="font-semibold text-slate-900">{t.name}</Text>
                      {t.category && (
                        <View className="bg-slate-100 rounded-full px-2 py-0.5">
                          <Text className="text-xs text-slate-500">{t.category}</Text>
                        </View>
                      )}
                      {!t.is_active && (
                        <View className="bg-slate-200 rounded-full px-2 py-0.5">
                          <Text className="text-xs text-slate-500">inactive</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-slate-500">
                      Weight: {t.weight} · {t.frequency}×/week · {t.time_of_day}
                    </Text>
                  </View>
                  {isAdmin && (
                    <View className="flex-row items-center gap-3 ml-2">
                      <TouchableOpacity onPress={() => handleToggleActive(t.id, t.is_active)}>
                        <Feather
                          name={t.is_active ? "toggle-right" : "toggle-left"}
                          size={20}
                          color={t.is_active ? "#0ea5e9" : "#94a3b8"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTask(t.id, t.name)}>
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setShowAddTask(true)}
              className="mt-1 mb-4 flex-row items-center justify-center gap-2 border-2 border-dashed border-primary-300 rounded-2xl py-3"
            >
              <Feather name="plus" size={18} color="#0ea5e9" />
              <Text className="text-primary-600 font-semibold">Add Task</Text>
            </TouchableOpacity>
          )}

          {/* RULES */}
          <Text className="text-slate-500 text-xs font-bold uppercase mb-2 mt-2">Rules</Text>
          <Card className="mb-3 bg-amber-50 border border-amber-100">
            <Text className="text-amber-800 text-xs font-medium mb-1">Constraint Rules</Text>
            <Text className="text-amber-700 text-xs">
              Fixed · Restriction · Preference · Frequency Cap
              {!isAdmin ? "\n(Submitted for admin approval)" : ""}
            </Text>
          </Card>

          {(constraints || []).length === 0 ? (
            <View className="items-center py-6">
              <Text className="text-slate-400">No rules yet</Text>
            </View>
          ) : (
            (constraints || []).map((c) => {
              const memberName = c.user_id ? memberMap.get(c.user_id) || "Unknown" : "Anyone";
              const choreName = c.chore_id
                ? templateMap.get(c.chore_id)?.name || "Unknown"
                : "Any task";
              const dayLabel =
                c.day_of_week !== null ? DAY_NAMES[c.day_of_week!] : "Any day";
              const typeLabel =
                CONSTRAINT_TYPES.find((t) => t.key === c.type)?.label || c.type;
              const statusColor = constraintStatusColor(c.status);
              return (
                <Card key={c.id} className="mb-2">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                        <Badge label={typeLabel} />
                        <View
                          style={{
                            backgroundColor: statusColor + "22",
                            borderRadius: 99,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: statusColor,
                              fontSize: 11,
                              fontWeight: "700",
                              textTransform: "capitalize",
                            }}
                          >
                            {c.status}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-slate-800 font-medium">{memberName}</Text>
                      <Text className="text-slate-500 text-xs">
                        {choreName} · {dayLabel}
                        {c.max_frequency ? ` · max ${c.max_frequency}×` : ""}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2 ml-2">
                      {isAdmin && c.status === "pending" && (
                        <>
                          <TouchableOpacity
                            onPress={() =>
                              approveConstraint.mutate(c.id, {
                                onError: (err: any) =>
                                  Alert.alert("Error", err.response?.data?.detail || "Failed"),
                              })
                            }
                            className="bg-green-100 rounded-lg p-1.5"
                          >
                            <Feather name="check" size={14} color="#22c55e" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              rejectConstraint.mutate(c.id, {
                                onError: (err: any) =>
                                  Alert.alert("Error", err.response?.data?.detail || "Failed"),
                              })
                            }
                            className="bg-red-100 rounded-lg p-1.5"
                          >
                            <Feather name="x" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity
                        onPress={() =>
                          deleteConstraint.mutate(c.id, {
                            onError: (err: any) =>
                              Alert.alert("Error", err.response?.data?.detail || "Failed to delete"),
                          })
                        }
                      >
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          <TouchableOpacity
            onPress={() => setShowAddConstraint(true)}
            className="mt-1 mb-4 flex-row items-center justify-center gap-2 border-2 border-dashed border-primary-300 rounded-2xl py-3"
          >
            <Feather name="plus" size={18} color="#0ea5e9" />
            <Text className="text-primary-600 font-semibold">Request Rule</Text>
          </TouchableOpacity>

          {/* PERFORMANCE */}
          <Text className="text-slate-500 text-xs font-bold uppercase mb-3 mt-2">Performance</Text>

          {points && points.length > 1 && (() => {
            const vals = points.map((p) => p.total_points);
            const maxPts = Math.max(...vals);
            const minPts = Math.min(...vals);
            const fairness =
              maxPts > 0 ? Math.round((1 - (maxPts - minPts) / maxPts) * 100) : 100;
            const color =
              fairness >= 80 ? "#22c55e" : fairness >= 60 ? "#f59e0b" : "#ef4444";
            return (
              <Card className="mb-4">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="font-bold text-slate-900">Weekly Fairness</Text>
                    <Text className="text-slate-400 text-xs">How evenly work is distributed</Text>
                  </View>
                  <Text className="text-3xl font-bold" style={{ color }}>
                    {fairness}%
                  </Text>
                </View>
                <View className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${fairness}%`, backgroundColor: color }}
                  />
                </View>
              </Card>
            );
          })()}

          {performance && performance.length > 0 && (
            <>
              {performance.map((p, idx) => {
                const isMe = p.user_id === user?.id;
                const rateColor = completionRateColor(p.completion_rate);
                const ratePercent = Math.round(p.completion_rate * 100);
                const medal =
                  idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                return (
                  <Card
                    key={p.user_id}
                    className={`mb-3 ${isMe ? "border border-primary-200 bg-primary-50/30" : ""}`}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View>
                        <View className="flex-row items-center gap-1.5">
                          {medal && <Text className="text-base">{medal}</Text>}
                          <Text
                            className={`font-bold text-sm ${
                              isMe ? "text-primary-700" : "text-slate-800"
                            }`}
                          >
                            {isMe ? "You" : p.full_name}
                          </Text>
                        </View>
                        <StarRating rate={p.completion_rate} />
                      </View>
                      <View className="items-end">
                        <Text className="font-bold text-slate-700 text-base">
                          {p.total_points} pts
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: rateColor }}>
                          {ratePercent}% done
                        </Text>
                      </View>
                    </View>
                    <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <View
                        className="h-full rounded-full"
                        style={{ width: `${ratePercent}%`, backgroundColor: rateColor }}
                      />
                    </View>
                    <View className="flex-row gap-4">
                      <View className="items-center">
                        <Text className="text-xs text-slate-400">Assigned</Text>
                        <Text className="text-sm font-bold text-slate-700">{p.assigned}</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xs text-slate-400">Done</Text>
                        <Text className="text-sm font-bold text-green-600">{p.completed}</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xs text-slate-400">Missed</Text>
                        <Text className="text-sm font-bold text-red-500">{p.missed}</Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </>
          )}
        </View>
      )}

      <Modal
        visible={showCompleteModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompleteModal(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-lg font-bold text-slate-900 mb-1">Mark Complete</Text>
            <Text className="text-slate-400 text-sm mb-4">
              Optionally leave a note (e.g. "done before dinner")
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-4"
              placeholder="Add a note… (optional)"
              value={completeNote}
              onChangeText={setCompleteNote}
              multiline
              numberOfLines={2}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowCompleteModal(null)}
                className="flex-1 bg-slate-100 rounded-xl py-3 items-center"
              >
                <Text className="text-slate-600 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => showCompleteModal && handleComplete(showCompleteModal)}
                className="flex-1 bg-primary-500 rounded-xl py-3 items-center"
              >
                <Text className="text-white font-semibold">Mark Done ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Reassign Modal (Admin) ─────────────────────────── */}
      <Modal
        visible={showOverrideModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOverrideModal(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-lg font-bold text-slate-900 mb-1">Reassign Chore</Text>
            <Text className="text-slate-400 text-sm mb-4">
              Select a household member to reassign this chore to
            </Text>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setOverrideUserId(m.id)}
                className={`flex-row items-center gap-3 py-3 px-4 rounded-xl mb-2 border ${
                  overrideUserId === m.id
                    ? "bg-primary-50 border-primary-400"
                    : "border-slate-200"
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    overrideUserId === m.id
                      ? "border-primary-500 bg-primary-500"
                      : "border-slate-300"
                  }`}
                >
                  {overrideUserId === m.id && (
                    <View className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </View>
                <Text
                  className={`font-medium ${
                    overrideUserId === m.id ? "text-primary-700" : "text-slate-700"
                  }`}
                >
                  {m.full_name}
                  {m.id === user?.id ? " (You)" : ""}
                </Text>
              </TouchableOpacity>
            ))}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => setShowOverrideModal(null)}
                className="flex-1 bg-slate-100 rounded-xl py-3 items-center"
              >
                <Text className="text-slate-600 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => showOverrideModal && handleOverride(showOverrideModal)}
                className="flex-1 bg-primary-500 rounded-xl py-3 items-center"
              >
                <Text className="text-white font-semibold">Reassign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Task Modal ─────────────────────────────────── */}
      <Modal visible={showAddTask} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-slate-900">Add Task</Text>
              <TouchableOpacity onPress={() => setShowAddTask(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-slate-700 mb-1">Task Name *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
                placeholder="e.g. Cooking, Dishes, Trash…"
                value={taskForm.name}
                onChangeText={(v) => setTaskForm((p) => ({ ...p, name: v }))}
                autoCapitalize="words"
                autoFocus
              />

              <Text className="text-sm font-medium text-slate-700 mb-1">Description (optional)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
                placeholder="Brief note about this task…"
                value={taskForm.description}
                onChangeText={(v) => setTaskForm((p) => ({ ...p, description: v }))}
                multiline
                numberOfLines={2}
              />

              <Text className="text-sm font-medium text-slate-700 mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setTaskForm((p) => ({ ...p, category: "" }))}
                    className={`px-3 py-1.5 rounded-full border ${
                      !taskForm.category ? "bg-primary-50 border-primary-500" : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        !taskForm.category ? "text-primary-600 font-medium" : "text-slate-600"
                      }`}
                    >
                      none
                    </Text>
                  </TouchableOpacity>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setTaskForm((p) => ({ ...p, category: cat }))}
                      className={`px-3 py-1.5 rounded-full border ${
                        taskForm.category === cat
                          ? "bg-primary-50 border-primary-500"
                          : "border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          taskForm.category === cat
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

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-700 mb-1">Weight (effort)</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                    placeholder="1.0"
                    value={taskForm.weight}
                    onChangeText={(v) => setTaskForm((p) => ({ ...p, weight: v }))}
                    keyboardType="decimal-pad"
                  />
                  <Text className="text-xs text-slate-400 mt-0.5">Cooking=2, Trash=0.5</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-700 mb-1">Times/week</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                    placeholder="7"
                    value={taskForm.frequency}
                    onChangeText={(v) => setTaskForm((p) => ({ ...p, frequency: v }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text className="text-sm font-medium text-slate-700 mb-1">Time of Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {TIME_OPTIONS.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setTaskForm((p) => ({ ...p, time_of_day: t }))}
                      className={`px-3 py-1.5 rounded-full border ${
                        taskForm.time_of_day === t
                          ? "bg-primary-50 border-primary-500"
                          : "border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          taskForm.time_of_day === t
                            ? "text-primary-600 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Button
                title="Add Task"
                onPress={handleAddTask}
                loading={createTemplate.isPending}
                size="lg"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Constraint Modal ───────────────────────────── */}
      <Modal visible={showAddConstraint} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView>
            <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10 mt-20">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-xl font-bold text-slate-900">Request Rule</Text>
                <TouchableOpacity onPress={() => setShowAddConstraint(false)}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {!isAdmin && (
                <Card className="mb-3 bg-blue-50 border border-blue-100">
                  <Text className="text-blue-700 text-xs">
                    Your rule request will be pending until the admin approves it. It won't affect
                    the schedule until then.
                  </Text>
                </Card>
              )}

              {/* Rule type */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Rule Type</Text>
              {CONSTRAINT_TYPES.map((ct) => (
                <TouchableOpacity
                  key={ct.key}
                  onPress={() => setConstraintForm((p) => ({ ...p, type: ct.key }))}
                  className={`flex-row items-center gap-2 py-2.5 px-3 rounded-xl mb-1.5 border ${
                    constraintForm.type === ct.key
                      ? "bg-primary-50 border-primary-400"
                      : "border-slate-200"
                  }`}
                >
                  <View
                    className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                      constraintForm.type === ct.key
                        ? "border-primary-500 bg-primary-500"
                        : "border-slate-300"
                    }`}
                  >
                    {constraintForm.type === ct.key && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <Text
                    className={`text-sm ${
                      constraintForm.type === ct.key
                        ? "text-primary-700 font-medium"
                        : "text-slate-600"
                    }`}
                  >
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Person */}
              <Text className="text-sm font-medium text-slate-700 mb-2 mt-3">Person</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setConstraintForm((p) => ({ ...p, user_id: "" }))}
                    className={`px-3 py-1.5 rounded-full border ${
                      !constraintForm.user_id
                        ? "bg-primary-50 border-primary-500"
                        : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        !constraintForm.user_id ? "text-primary-600 font-medium" : "text-slate-600"
                      }`}
                    >
                      Anyone
                    </Text>
                  </TouchableOpacity>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setConstraintForm((p) => ({ ...p, user_id: m.id }))}
                      className={`px-3 py-1.5 rounded-full border ${
                        constraintForm.user_id === m.id
                          ? "bg-primary-50 border-primary-500"
                          : "border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          constraintForm.user_id === m.id
                            ? "text-primary-600 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        {m.full_name.split(" ")[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Task */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Task</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setConstraintForm((p) => ({ ...p, chore_id: "" }))}
                    className={`px-3 py-1.5 rounded-full border ${
                      !constraintForm.chore_id
                        ? "bg-primary-50 border-primary-500"
                        : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        !constraintForm.chore_id
                          ? "text-primary-600 font-medium"
                          : "text-slate-600"
                      }`}
                    >
                      Any task
                    </Text>
                  </TouchableOpacity>
                  {Array.from(templateMap.values()).map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setConstraintForm((p) => ({ ...p, chore_id: t.id }))}
                      className={`px-3 py-1.5 rounded-full border ${
                        constraintForm.chore_id === t.id
                          ? "bg-primary-50 border-primary-500"
                          : "border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          constraintForm.chore_id === t.id
                            ? "text-primary-600 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Day of week */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Day (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setConstraintForm((p) => ({ ...p, day_of_week: "" }))}
                    className={`px-3 py-1.5 rounded-full border ${
                      constraintForm.day_of_week === ""
                        ? "bg-primary-50 border-primary-500"
                        : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        constraintForm.day_of_week === ""
                          ? "text-primary-600 font-medium"
                          : "text-slate-600"
                      }`}
                    >
                      Any day
                    </Text>
                  </TouchableOpacity>
                  {DAY_NAMES.map((day, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() =>
                        setConstraintForm((p) => ({ ...p, day_of_week: String(idx) }))
                      }
                      className={`px-3 py-1.5 rounded-full border ${
                        constraintForm.day_of_week === String(idx)
                          ? "bg-primary-50 border-primary-500"
                          : "border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          constraintForm.day_of_week === String(idx)
                            ? "text-primary-600 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Max frequency (only for frequency_cap) */}
              {constraintForm.type === "frequency_cap" && (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-slate-700 mb-1">Max times/week</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                    placeholder="e.g. 2"
                    value={constraintForm.max_frequency}
                    onChangeText={(v) => setConstraintForm((p) => ({ ...p, max_frequency: v }))}
                    keyboardType="number-pad"
                  />
                </View>
              )}

              <Button
                title={isAdmin ? "Add Rule" : "Submit Request"}
                onPress={handleAddConstraint}
                loading={createConstraint.isPending}
                size="lg"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
