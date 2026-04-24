import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  useAppointments,
  useChatRooms,
  useMessages,
  useProposeAppointment,
  useSendMessage,
} from "@/hooks/useChat";
import type { Message } from "@/hooks/useChat";
import { formatRelativeDate } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const { data: rooms } = useChatRooms();
  const room = rooms?.find((r) => r.id === id);

  const { data: messages, isLoading: messagesLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const { data: appointments } = useAppointments(id);
  const proposeAppointment = useProposeAppointment(id);

  const [inputText, setInputText] = useState("");
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [appointmentType, setAppointmentType] = useState<"tour" | "call">("tour");
  const [proposedTime, setProposedTime] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  const handleSend = () => {
    const body = inputText.trim();
    if (!body) return;
    sendMessage.mutate(body, {
      onSuccess: () => setInputText(""),
    });
  };

  const handleProposeAppointment = () => {
    if (!proposedTime.trim()) return;
    proposeAppointment.mutate(
      {
        appointment_type: appointmentType,
        proposed_time: proposedTime.trim(),
        notes: appointmentNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setScheduleModalVisible(false);
          setProposedTime("");
          setAppointmentNotes("");
        },
      },
    );
  };

  const upcomingAppointments = appointments?.filter(
    (a) => a.status !== "completed" && a.status !== "rejected",
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isSent = item.sender_id === user?.id;
    return (
      <View
        className={`px-4 mb-2 ${isSent ? "items-end" : "items-start"}`}
      >
        <View
          className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${
            isSent
              ? "bg-primary-500 rounded-br-sm"
              : "bg-slate-100 rounded-bl-sm"
          }`}
        >
          <Text
            className={`text-base ${isSent ? "text-white" : "text-slate-900"}`}
          >
            {item.body}
          </Text>
        </View>
        <Text className="text-xs text-slate-400 mt-1 px-1">
          {formatRelativeDate(item.created_at)}
        </Text>
      </View>
    );
  };

  if (messagesLoading && !messages) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View className="px-4 pt-14 pb-3 border-b border-slate-100 bg-white">
        <View className="flex-row items-center">
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3"
            hitSlop={8}
          >
            <Feather name="chevron-left" size={24} color="#0f172a" />
          </TouchableOpacity>

          {/* Other user info */}
          {room && (
            <>
              <Avatar
                uri={room.other_user_avatar}
                name={room.other_user_name}
                size={36}
              />
              <View className="ml-2.5 flex-1">
                <Text className="font-semibold text-slate-900 text-base">
                  {room.other_user_name}
                </Text>
                <TrustBadge score={room.other_user_trust} size="sm" showLabel={false} />
              </View>
            </>
          )}

          {/* Schedule button */}
          <TouchableOpacity
            onPress={() => setScheduleModalVisible(true)}
            className="bg-primary-50 rounded-full p-2.5"
          >
            <Feather name="calendar" size={18} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Upcoming appointments banner */}
      {upcomingAppointments && upcomingAppointments.length > 0 && (
        <View className="bg-amber-50 px-4 py-2.5 border-b border-amber-100">
          {upcomingAppointments.map((apt) => (
            <View key={apt.id} className="flex-row items-center gap-2 mb-1 last:mb-0">
              <Feather
                name={apt.appointment_type === "tour" ? "map-pin" : "phone"}
                size={14}
                color="#d97706"
              />
              <Text className="text-amber-800 text-sm flex-1" numberOfLines={1}>
                {apt.appointment_type === "tour" ? "Tour" : "Call"} -{" "}
                {apt.confirmed_time
                  ? new Date(apt.confirmed_time).toLocaleString()
                  : `Proposed: ${new Date(apt.proposed_time).toLocaleString()}`}
              </Text>
              <View className="bg-amber-100 rounded-full px-2 py-0.5">
                <Text className="text-amber-700 text-xs font-medium capitalize">
                  {apt.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={messages ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={
          (!messages || messages.length === 0)
            ? { flex: 1, justifyContent: "center", alignItems: "center" }
            : { paddingVertical: 12 }
        }
        ListEmptyComponent={
          <View className="items-center px-8">
            <Feather name="message-circle" size={40} color="#cbd5e1" />
            <Text className="text-slate-400 mt-3 text-sm text-center">
              No messages yet. Say hello!
            </Text>
          </View>
        }
      />

      {/* Input bar */}
      <View className="flex-row items-end px-3 py-2 border-t border-slate-100 bg-white">
        <TextInput
          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-base text-slate-900 max-h-[100px]"
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          returnKeyType="default"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || sendMessage.isPending}
          className={`ml-2 rounded-full p-2.5 ${
            inputText.trim() ? "bg-primary-500" : "bg-slate-200"
          }`}
        >
          {sendMessage.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather
              name="send"
              size={18}
              color={inputText.trim() ? "#fff" : "#94a3b8"}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Schedule Appointment Modal */}
      <Modal
        visible={scheduleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          {/* Modal header */}
          <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-slate-100">
            <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
              <Text className="text-primary-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="font-bold text-slate-900 text-lg">
              Schedule
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <View className="p-4">
            {/* Type selector */}
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Type
            </Text>
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => setAppointmentType("tour")}
                className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 ${
                  appointmentType === "tour"
                    ? "border-primary-500 bg-primary-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <Feather
                  name="map-pin"
                  size={18}
                  color={appointmentType === "tour" ? "#0ea5e9" : "#94a3b8"}
                />
                <Text
                  className={`font-semibold ${
                    appointmentType === "tour"
                      ? "text-primary-600"
                      : "text-slate-500"
                  }`}
                >
                  Tour
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAppointmentType("call")}
                className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 ${
                  appointmentType === "call"
                    ? "border-primary-500 bg-primary-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <Feather
                  name="phone"
                  size={18}
                  color={appointmentType === "call" ? "#0ea5e9" : "#94a3b8"}
                />
                <Text
                  className={`font-semibold ${
                    appointmentType === "call"
                      ? "text-primary-600"
                      : "text-slate-500"
                  }`}
                >
                  Call
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date/time input */}
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Proposed Date & Time
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 mb-1"
              placeholder="e.g. 2026-04-20T14:00:00Z"
              placeholderTextColor="#94a3b8"
              value={proposedTime}
              onChangeText={setProposedTime}
              autoCapitalize="none"
            />
            <Text className="text-xs text-slate-400 mb-6">
              Enter an ISO 8601 date string
            </Text>

            {/* Notes */}
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Notes (optional)
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 min-h-[80px]"
              placeholder="Anything the other person should know..."
              placeholderTextColor="#94a3b8"
              value={appointmentNotes}
              onChangeText={setAppointmentNotes}
              multiline
              textAlignVertical="top"
            />

            {/* Submit */}
            <View className="mt-8">
              <Button
                title={
                  proposeAppointment.isPending
                    ? "Sending..."
                    : `Propose ${appointmentType === "tour" ? "Tour" : "Call"}`
                }
                onPress={handleProposeAppointment}
                loading={proposeAppointment.isPending}
                disabled={!proposedTime.trim()}
                size="lg"
                icon={
                  <Feather
                    name={appointmentType === "tour" ? "map-pin" : "phone"}
                    size={18}
                    color="#fff"
                  />
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
