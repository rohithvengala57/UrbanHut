import { Platform, StyleSheet } from "react-native";

export const colors = {
  primary: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
  },
  accent: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  trust: {
    low: "#ef4444",
    medium: "#f59e0b",
    high: "#22c55e",
    excellent: "#0ea5e9",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  community: {
    tip: { text: "#f59e0b", bg: "#fef3c7" },
    question: { text: "#8b5cf6", bg: "#ede9fe" },
    event: { text: "#0ea5e9", bg: "#e0f2fe" },
    recommendation: { text: "#22c55e", bg: "#dcfce7" },
  },
  white: "#ffffff",
  background: "#f8fafc",
  surface: "#ffffff",
};


export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
    fontFamily: Platform.select({ ios: "SF Pro Display", default: "Inter" }),
    lineHeight: 34,
    color: colors.slate[900],
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
    fontFamily: Platform.select({ ios: "SF Pro Display", default: "Inter" }),
    lineHeight: 28,
    color: colors.slate[900],
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    color: colors.slate[900],
  },
  caption: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
    color: colors.slate[500],
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20,
    color: colors.slate[900],
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
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  subtle: {
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
});

export const gradients = {
  primary: [colors.primary[500], colors.accent[500]] as const,
  primaryDiagonal: [colors.primary[500], colors.accent[500]] as const,
  warmSunset: ["#f59e0b", "#ef4444"] as const,
};

export const opacities = {
  subtle: 0.1,
  soft: 0.2,
  medium: 0.5,
  strong: 0.8,
};

