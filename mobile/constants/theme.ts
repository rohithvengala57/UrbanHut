import { Platform, StyleSheet } from "react-native";

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: Platform.select({ ios: "SF Pro Display", default: "Inter" }),
    lineHeight: 34,
    color: "#0f172a",
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
    fontFamily: Platform.select({ ios: "SF Pro Display", default: "Inter" }),
    lineHeight: 28,
    color: "#0f172a",
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    color: "#0f172a",
  },
  caption: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
    color: "#64748b",
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20,
    color: "#0f172a",
  },
};

export const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xs: 4,
  "2xl": 48,
};

export const radii = {
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = StyleSheet.create({
  elevated: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  subtle: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
});

export const gradients = {
  primary: ["#0ea5e9", "#10b981"] as const,
  primaryDiagonal: ["#0ea5e9", "#10b981"] as const,
  warmSunset: ["#f59e0b", "#ef4444"] as const,
};
