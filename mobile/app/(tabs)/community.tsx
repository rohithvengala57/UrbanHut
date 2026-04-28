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
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/constants/theme";
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

const getPostTypeStyles = (type: string) => {
  return colors.community[type as keyof typeof colors.community] || { text: colors.slate[500], bg: colors.slate[50] };
};


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

function ReplyPanel({ post, onClose }: { post: Post; onClose: () => void }) {
  const [replyText, setReplyText] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const queryClient = useQueryClient();

  const { data: allReplies, isLoading } = useQuery<Reply[]>({
    queryKey: ["community-replies", post.id],
    queryFn: async () => {
      const res = await api.get(`/community/posts/${post.id}/replies`);
      return res.data;
    },
  });

  const replies = (allReplies ?? []).slice(0, displayCount);
  const hasMore = (allReplies ?? []).length > displayCount;

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

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="bg-white rounded-t-3xl max-h-[80%]">
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

            {isLoading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="small" color="#0ea5e9" />
              </View>
            ) : (
              <FlatList
                data={replies}
                keyExtractor={(r) => r.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                keyboardDismissMode="interactive"
                ListEmptyComponent={
                  <View className="items-center py-10">
                    <Feather name="message-square" size={36} color="#cbd5e1" />
                    <Text className="text-slate-400 mt-3">No replies yet. Be the first!</Text>
                  </View>
                }
                ListFooterComponent={
                  hasMore ? (
                    <TouchableOpacity 
                      onPress={() => setDisplayCount(prev => prev + 10)}
                      className="py-4 items-center"
                    >
                      <Text className="text-primary-500 font-semibold">Load more replies</Text>
                    </TouchableOpacity>
                  ) : null
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
                          <View className="bg-primary-50 rounded-full px-2 py-0.5">
                            <Text className="text-xs text-primary-500 font-medium">
                              {Math.round(item.author_trust_score!)} trust
                            </Text>
                          </View>
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
                onPress={() => {
                  const trimmed = replyText.trim();
                  if (!trimmed) return;
                  createReply.mutate(trimmed);
                }}
                disabled={!replyText.trim() || createReply.isPending}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  replyText.trim() ? "bg-primary-500" : "bg-slate-200"
                }`}
              >
                {createReply.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather
                    name="send"
                    size={18}
                    color={replyText.trim() ? "#fff" : "#94a3b8"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function CommunityScreen() {
  const [selectedType, setSelectedType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
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
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    },
    onError: (err: any) =>
      Alert.alert("Error", err.response?.data?.detail || "Failed to create post"),
  });

  const upvotePost = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/community/posts/${postId}/upvote`);
      return response.data;
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["community-posts"] });
      const previousPosts = queryClient.getQueryData<Post[]>(["community-posts", user?.current_city, selectedType]);

      if (previousPosts) {
        queryClient.setQueryData(
          ["community-posts", user?.current_city, selectedType],
          previousPosts.map((p) => {
            if (p.id === postId) {
              const alreadyUpvoted = p.user_upvoted;
              return {
                ...p,
                user_upvoted: !alreadyUpvoted,
                upvotes: alreadyUpvoted ? p.upvotes - 1 : p.upvotes + 1,
              };
            }
            return p;
          })
        );
      }

      return { previousPosts };
    },
    onError: (err: any, postId, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(
          ["community-posts", user?.current_city, selectedType],
          context.previousPosts
        );
      }
      setErrorToast(err.response?.data?.detail || "Failed to upvote");
      setTimeout(() => setErrorToast(null), 3000);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });

  return (
    <View className="flex-1 bg-slate-50">
      {/* Type filter */}
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
              activeOpacity={0.85}
            >
              <Text
                className={`text-sm font-semibold ${
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
        <SkeletonLoader count={3} style={{ padding: 16 }} />
      ) : (
        <FlatList
          data={posts || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => {
            const styles = getPostTypeStyles(item.type);
            const icon = typeIcons[item.type] || "message-circle";
            return (
              <Card className="mb-3">
                <View className="flex-row items-start gap-3">
                  <Avatar name={item.author_name || "User"} size={40} />
                  <View className="flex-1">
                    {/* Author row with trust badge */}
                    <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                      <Text className="font-semibold text-slate-900">{item.author_name}</Text>
                      {(item.author_trust_score ?? 0) > 0 && (
                        <View className="bg-primary-50 rounded-full px-2 py-0.5">
                          <Text className="text-xs text-primary-500 font-bold">
                            {Math.round(item.author_trust_score!)} trust
                          </Text>
                        </View>
                      )}
                      <Text className="text-xs text-slate-400">
                        {formatRelativeDate(item.created_at)}
                      </Text>
                    </View>

                    {/* Type tag */}
                    <View
                      className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1 self-start mb-2"
                      style={{ backgroundColor: styles.bg }}
                    >
                      <Feather name={icon} size={11} color={styles.text} />
                      <Text className="text-xs font-bold uppercase" style={{ color: styles.text }}>
                        {item.type}
                      </Text>
                    </View>


                    <Text className="font-bold text-slate-900 text-base mb-1">{item.title}</Text>
                    <Text className="text-slate-600 text-sm" numberOfLines={4}>
                      {item.body}
                    </Text>

                    {/* Actions */}
                    <View className="flex-row items-center gap-5 mt-3 pt-3 border-t border-slate-50">
                      <TouchableOpacity
                        className="flex-row items-center gap-1.5"
                        onPress={() => upvotePost.mutate(item.id)}
                        activeOpacity={0.7}
                      >
                        <View
                          className={`w-7 h-7 rounded-full items-center justify-center ${
                            item.user_upvoted ? "bg-primary-100" : "bg-slate-100"
                          }`}
                        >
                          <Feather
                            name="arrow-up"
                            size={14}
                            color={item.user_upvoted ? "#0ea5e9" : "#64748b"}
                          />
                        </View>
                        <Text
                          className={`text-sm font-semibold ${
                            item.user_upvoted ? "text-primary-500" : "text-slate-500"
                          }`}
                        >
                          {item.upvotes}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-row items-center gap-1.5"
                        onPress={() => setReplyPost(item)}
                        activeOpacity={0.7}
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
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              title="No posts yet"
              message="Be the first to post in your community"
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setCreateVisible(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center shadow-elevated"
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      {replyPost && (
        <ReplyPanel post={replyPost} onClose={() => setReplyPost(null)} />
      )}

      {showSuccessToast && (
        <View
          className="absolute bottom-24 left-10 right-10 bg-slate-800 rounded-2xl py-3 px-4 flex-row items-center justify-center gap-2 shadow-elevated"
        >          <Feather name="check-circle" size={16} color="#10b981" />
          <Text className="text-white font-bold">Post created!</Text>
        </View>
      )}

      {errorToast && (
        <View
          className="absolute bottom-24 left-10 right-10 bg-red-500 rounded-2xl py-3 px-4 flex-row items-center justify-center gap-2 shadow-elevated"
        >          <Feather name="alert-circle" size={16} color="#fff" />
          <Text className="text-white font-bold">{errorToast}</Text>
        </View>
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

              <Text className="text-sm font-medium text-slate-700 mb-2">Type</Text>
              <View className="flex-row gap-2 mb-5">
                {CREATE_TYPES.map((t) => {
                  const isActive = createForm.type === t.key;
                  const styles = getPostTypeStyles(t.key);
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setCreateForm((p) => ({ ...p, type: t.key }))}
                      className="flex-1 py-3 rounded-2xl items-center border"
                      style={{
                        backgroundColor: isActive ? styles.bg : "#fff",
                        borderColor: isActive ? styles.text : "#e2e8f0",
                      }}
                    >
                      <Feather name={t.icon} size={18} color={isActive ? styles.text : "#94a3b8"} />
                      <Text
                        className="text-xs font-semibold mt-1"
                        style={{ color: isActive ? styles.text : "#94a3b8" }}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>


              <Text className="text-sm font-medium text-slate-700 mb-1">Title *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
                placeholder="What's on your mind?"
                value={createForm.title}
                onChangeText={(v) => setCreateForm((p) => ({ ...p, title: v }))}
                autoCapitalize="sentences"
              />

              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-sm font-medium text-slate-700">Body *</Text>
                <Text className={`text-xs ${createForm.body.length > 450 ? "text-red-500 font-bold" : "text-slate-400"}`}>
                  {createForm.body.length}/500
                </Text>
              </View>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-5 min-h-[120px]"
                placeholder="Share details..."
                value={createForm.body}
                onChangeText={(v) => {
                  if (v.length <= 500) {
                    setCreateForm((p) => ({ ...p, body: v }));
                  }
                }}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
                maxLength={500}
              />

              <Button
                title="Post"
                onPress={() => {
                  if (!createForm.title.trim() || !createForm.body.trim()) {
                    Alert.alert("Error", "Please fill in title and body");
                    return;
                  }
                  createPost.mutate(createForm);
                }}
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
