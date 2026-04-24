import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatRelativeDate } from "@/lib/format";
import api from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

const POST_TYPES = [
  { key: "all", label: "All" },
  { key: "tip", label: "Tips" },
  { key: "question", label: "Questions" },
  { key: "event", label: "Events" },
  { key: "recommendation", label: "Recs" },
];

const CREATE_TYPES = [
  { key: "tip", label: "Tip", icon: "zap" as const },
  { key: "question", label: "Question", icon: "help-circle" as const },
  { key: "event", label: "Event", icon: "calendar" as const },
  { key: "recommendation", label: "Recommendation", icon: "thumbs-up" as const },
];

const typeIcons: Record<string, keyof typeof Feather.glyphMap> = {
  tip: "zap",
  question: "help-circle",
  event: "calendar",
  recommendation: "thumbs-up",
};

const typeColors: Record<string, string> = {
  tip: "#f59e0b",
  question: "#8b5cf6",
  event: "#0ea5e9",
  recommendation: "#22c55e",
};

// ─── Reply types ─────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  upvotes: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  author_trust_score?: number;
}

interface Post {
  id: string;
  author_id: string;
  city: string;
  type: string;
  title: string;
  body: string;
  upvotes: number;
  reply_count: number;
  created_at: string;
  author_name?: string;
  author_trust_score?: number;
  user_upvoted?: boolean;
}

// ─── Reply Panel ─────────────────────────────────────────────────────────────

function ReplyPanel({ post, onClose }: { post: Post; onClose: () => void }) {
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  const { data: replies, isLoading } = useQuery<Reply[]>({
    queryKey: ["community-replies", post.id],
    queryFn: async () => {
      const res = await api.get(`/community/posts/${post.id}/replies`);
      return res.data;
    },
  });

  const createReply = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post(`/community/posts/${post.id}/replies`, { body });
      return res.data;
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["community-replies", post.id] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (err: any) =>
      Alert.alert("Error", err.response?.data?.detail || "Failed to post reply"),
  });

  const handleSubmit = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    createReply.mutate(trimmed);
  };

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <View className="flex-1 pr-3">
                <Text className="font-bold text-slate-900" numberOfLines={1}>
                  {post.title}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {replies?.length ?? 0} {replies?.length === 1 ? "reply" : "replies"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Replies list */}
            {isLoading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="small" color="#0ea5e9" />
              </View>
            ) : (
              <FlatList
                data={replies ?? []}
                keyExtractor={(r) => r.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                ListEmptyComponent={
                  <View className="items-center py-10">
                    <Feather name="message-square" size={36} color="#cbd5e1" />
                    <Text className="text-slate-400 mt-3">No replies yet. Be the first!</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View className="flex-row items-start gap-3 mb-4">
                    <Avatar name={item.author_name || "User"} size={32} uri={item.author_avatar} />
                    <View className="flex-1 bg-slate-50 rounded-2xl px-3 py-2.5">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-sm font-semibold text-slate-900">
                          {item.author_name || "User"}
                        </Text>
                        {(item.author_trust_score ?? 0) > 0 && (
                          <Text className="text-xs text-primary-500">
                            {Math.round(item.author_trust_score!)} trust
                          </Text>
                        )}
                        <Text className="text-xs text-slate-400">
                          {formatRelativeDate(item.created_at)}
                        </Text>
                      </View>
                      <Text className="text-sm text-slate-700">{item.body}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Reply input */}
            <View className="flex-row items-end gap-3 px-4 py-3 border-t border-slate-100">
              <TextInput
                className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 text-slate-900 text-sm max-h-24"
                placeholder="Write a reply..."
                value={replyText}
                onChangeText={setReplyText}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
              />
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!replyText.trim() || createReply.isPending}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  replyText.trim() ? "bg-primary-500" : "bg-slate-200"
                }`}
              >
                {createReply.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="send" size={18} color={replyText.trim() ? "#fff" : "#94a3b8"} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const [selectedType, setSelectedType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ type: "tip", title: "", body: "" });
  const [replyPost, setReplyPost] = useState<Post | null>(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: posts, isLoading, refetch, isRefetching } = useQuery<Post[]>({
    queryKey: ["community-posts", user?.current_city, selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.current_city) params.append("city", user.current_city);
      if (selectedType !== "all") params.append("type", selectedType);
      const response = await api.get(`/community/posts?${params.toString()}`);
      return response.data;
    },
  });

  const createPost = useMutation({
    mutationFn: async (data: { type: string; title: string; body: string }) => {
      const response = await api.post("/community/posts", {
        ...data,
        city: user?.current_city || "Jersey City",
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setShowCreateModal(false);
      setCreateForm({ type: "tip", title: "", body: "" });
    },
    onError: (err: any) =>
      Alert.alert("Error", err.response?.data?.detail || "Failed to create post"),
  });

  const upvotePost = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/community/posts/${postId}/upvote`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });

  const handleCreate = () => {
    if (!createForm.title.trim() || !createForm.body.trim()) {
      Alert.alert("Error", "Please fill in title and body");
      return;
    }
    createPost.mutate(createForm);
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Type Filter */}
      <View className="bg-white border-b border-slate-100 px-4 py-2">
        <FlatList
          horizontal
          data={POST_TYPES}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedType(item.key)}
              className={`rounded-full px-4 py-2 mr-2 ${
                selectedType === item.key ? "bg-primary-500" : "bg-slate-100"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedType === item.key ? "text-white" : "text-slate-600"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={posts || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <Card className="mb-3">
              <View className="flex-row items-start gap-3">
                <Avatar name={item.author_name || "User"} size={40} />
                <View className="flex-1">
                  {/* Author + timestamp */}
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="font-medium text-slate-900">{item.author_name}</Text>
                    {(item.author_trust_score ?? 0) > 0 && (
                      <Text className="text-xs text-primary-500 font-medium">
                        {Math.round(item.author_trust_score!)} trust
                      </Text>
                    )}
                    <Text className="text-xs text-slate-400">
                      {formatRelativeDate(item.created_at)}
                    </Text>
                  </View>

                  {/* Type badge */}
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Feather
                      name={typeIcons[item.type] || "message-circle"}
                      size={12}
                      color={typeColors[item.type] || "#64748b"}
                    />
                    <Text
                      className="text-xs font-medium uppercase"
                      style={{ color: typeColors[item.type] || "#64748b" }}
                    >
                      {item.type}
                    </Text>
                  </View>

                  <Text className="font-bold text-slate-900 mb-1">{item.title}</Text>
                  <Text className="text-slate-600 text-sm" numberOfLines={4}>
                    {item.body}
                  </Text>

                  {/* Actions row */}
                  <View className="flex-row items-center gap-4 mt-3">
                    {/* Upvote */}
                    <TouchableOpacity
                      className="flex-row items-center gap-1"
                      onPress={() => upvotePost.mutate(item.id)}
                    >
                      <Feather
                        name="arrow-up"
                        size={16}
                        color={item.user_upvoted ? "#0ea5e9" : "#64748b"}
                      />
                      <Text
                        className={`text-sm font-medium ${
                          item.user_upvoted ? "text-primary-500" : "text-slate-500"
                        }`}
                      >
                        {item.upvotes}
                      </Text>
                    </TouchableOpacity>

                    {/* Reply */}
                    <TouchableOpacity
                      className="flex-row items-center gap-1"
                      onPress={() => setReplyPost(item)}
                    >
                      <Feather name="message-square" size={16} color="#64748b" />
                      <Text className="text-sm text-slate-500">
                        {item.reply_count > 0
                          ? `${item.reply_count} ${item.reply_count === 1 ? "reply" : "replies"}`
                          : "Reply"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Feather name="message-circle" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 mt-4 text-base">No posts yet</Text>
              <Text className="text-slate-400 text-sm">Be the first to post in your community</Text>
            </View>
          }
        />
      )}

      {/* FAB - Create Post */}
      <TouchableOpacity
        onPress={() => setShowCreateModal(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 8 }}
        activeOpacity={0.8}
      >
        <Feather name="edit-3" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Reply Panel */}
      {replyPost && (
        <ReplyPanel post={replyPost} onClose={() => setReplyPost(null)} />
      )}

      {/* Create Post Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10 max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-xl font-bold text-slate-900">New Post</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Post Type */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Type</Text>
              <View className="flex-row gap-2 mb-4">
                {CREATE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setCreateForm((p) => ({ ...p, type: t.key }))}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      createForm.type === t.key
                        ? "bg-primary-50 border-primary-500"
                        : "border-slate-200"
                    }`}
                  >
                    <Feather
                      name={t.icon}
                      size={16}
                      color={createForm.type === t.key ? "#0ea5e9" : "#94a3b8"}
                    />
                    <Text
                      className={`text-xs font-medium mt-1 ${
                        createForm.type === t.key ? "text-primary-600" : "text-slate-500"
                      }`}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sm font-medium text-slate-700 mb-1">Title *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
                placeholder="What's on your mind?"
                value={createForm.title}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, title: v }))}
                autoCapitalize="sentences"
              />

              <Text className="text-sm font-medium text-slate-700 mb-1">Body *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-4 min-h-[120px]"
                placeholder="Share details..."
                value={createForm.body}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, body: v }))}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
              />

              <Button
                title="Post"
                onPress={handleCreate}
                loading={createPost.isPending}
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
