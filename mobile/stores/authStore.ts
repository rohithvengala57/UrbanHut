import { create } from "zustand";

import { trackEvent } from "@/lib/analytics";
import { deleteItem, getItem, setItem } from "@/lib/storage";
import api from "@/services/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  occupation?: string;
  diet_preference?: string;
  smoking: boolean;
  drinking: string;
  pet_friendly: boolean;
  sleep_schedule: string;
  noise_tolerance: string;
  guest_frequency: string;
  cleanliness_level: number;
  work_schedule?: string;
  current_city?: string;
  current_state?: string;
  looking_in?: string[];
  budget_min?: number;
  budget_max?: number;
  role: string;
  status: string;
  household_id?: string;
  trust_score: number;
  referral_code?: string;
  onboarding_metadata?: {
    steps: {
      profile_completed: boolean;
      email_verified: boolean;
      identity_verified: boolean;
      first_meaningful_action: boolean;
    };
  };
  verifications?: Array<{
    id: string;
    type: string;
    status: string;
    verified_at?: string | null;
    submitted_at?: string | null;
    review_notes?: string | null;
    points_awarded: number;
  }>;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setHasCompletedOnboarding: () => Promise<void>;
}

const PROFILE_COMPLETION_FIELDS: Array<keyof User> = [
  "full_name",
  "bio",
  "occupation",
  "current_city",
  "current_state",
  "budget_min",
  "budget_max",
  "sleep_schedule",
  "noise_tolerance",
  "guest_frequency",
];

function profileCompletionScore(user: User | null): number {
  if (!user) return 0;
  const completed = PROFILE_COMPLETION_FIELDS.filter((key) => {
    const value = user[key];
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    return Boolean(value);
  }).length;
  return completed / PROFILE_COMPLETION_FIELDS.length;
}

function isProfileCompleted(user: User | null): boolean {
  return profileCompletionScore(user) >= 0.7;
}

function checkIsOnboarded(user: User | null): boolean {
  return user?.onboarding_metadata?.steps?.profile_completed ?? false;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOnboarded: false,

  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token } = response.data;

    await setItem("access_token", access_token);
    await setItem("refresh_token", refresh_token);

    const userResponse = await api.get("/users/me");
    const user = userResponse.data;
    set({ user, isAuthenticated: true, isOnboarded: checkIsOnboarded(user) });
  },

  signup: async (email, password, fullName, referralCode) => {
    const response = await api.post("/auth/signup", {
      email,
      password,
      full_name: fullName,
      referral_code: referralCode,
    });
    const { access_token, refresh_token } = response.data;

    await setItem("access_token", access_token);
    await setItem("refresh_token", refresh_token);

    const userResponse = await api.get("/users/me");
    const user = userResponse.data;
    set({ user, isAuthenticated: true, isOnboarded: checkIsOnboarded(user) });
    await trackEvent("signup_completed", {
      method: "email_password",
      user_id: user.id,
      has_referral_code: Boolean(referralCode),
    });
  },

  logout: async () => {
    await deleteItem("access_token");
    await deleteItem("refresh_token");
    set({ user: null, isAuthenticated: false, isOnboarded: false });
  },

  loadUser: async () => {
    try {
      const token = await getItem("access_token");
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await api.get("/users/me");
      const user = response.data;
      set({ user, isAuthenticated: true, isOnboarded: checkIsOnboarded(user), isLoading: false });
    } catch {
      await deleteItem("access_token");
      await deleteItem("refresh_token");
      set({ user: null, isAuthenticated: false, isOnboarded: false, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const previousUser = get().user;
    const response = await api.patch("/users/me", data);
    const user = response.data as User;
    set({ user, isOnboarded: checkIsOnboarded(user) });

    if (!isProfileCompleted(previousUser) && isProfileCompleted(user)) {
      await trackEvent("profile_completed", {
        user_id: user.id,
        completion_score: profileCompletionScore(user),
      });
    }
  },

  setHasCompletedOnboarding: async () => {
    const user = get().user;
    if (!user) return;

    const onboarding_metadata = {
      ...user.onboarding_metadata,
      steps: {
        ...user.onboarding_metadata?.steps,
        profile_completed: true,
      },
    };

    const response = await api.patch("/users/me", { onboarding_metadata });
    const updatedUser = response.data as User;
    set({ user: updatedUser, isOnboarded: true });
    await trackEvent("onboarding_completed", { user_id: updatedUser.id });
  },
}));
