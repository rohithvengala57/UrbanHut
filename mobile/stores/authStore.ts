import { create } from "zustand";

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

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token } = response.data;

    await setItem("access_token", access_token);
    await setItem("refresh_token", refresh_token);

    const userResponse = await api.get("/users/me");
    set({ user: userResponse.data, isAuthenticated: true });
  },

  signup: async (email, password, fullName) => {
    const response = await api.post("/auth/signup", {
      email,
      password,
      full_name: fullName,
    });
    const { access_token, refresh_token } = response.data;

    await setItem("access_token", access_token);
    await setItem("refresh_token", refresh_token);

    const userResponse = await api.get("/users/me");
    set({ user: userResponse.data, isAuthenticated: true });
  },

  logout: async () => {
    await deleteItem("access_token");
    await deleteItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await getItem("access_token");
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await api.get("/users/me");
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      await deleteItem("access_token");
      await deleteItem("refresh_token");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const response = await api.patch("/users/me", data);
    set({ user: response.data });
  },
}));
