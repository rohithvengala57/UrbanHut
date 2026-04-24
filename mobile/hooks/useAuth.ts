import { useEffect } from "react";

import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const { user, isAuthenticated, isLoading, loadUser, login, signup, logout, updateProfile } =
    useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
  };
}
