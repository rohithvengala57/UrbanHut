// Dev fallback for local runs only. Production should always set EXPO_PUBLIC_API_URL.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
export const IS_API_URL_FALLBACK = !process.env.EXPO_PUBLIC_API_URL;
export const API_BASE = `${API_URL}/api/v1`;

export const COLORS = {
  primary: "#0ea5e9",
  primaryDark: "#0284c7",
  accent: "#10b981",
  accentDark: "#059669",
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  error: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
  gradientStart: "#0ea5e9",
  gradientEnd: "#10b981",
  trust: {
    low: "#ef4444",
    medium: "#f59e0b",
    high: "#22c55e",
    excellent: "#0ea5e9",
  },
};

export const TRUST_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "New", color: COLORS.trust.low },
  medium: { label: "Building", color: COLORS.trust.medium },
  high: { label: "Trusted", color: COLORS.trust.high },
  excellent: { label: "Highly Trusted", color: COLORS.trust.excellent },
};

export function getTrustLevel(score: number): string {
  if (score >= 75) return "excellent";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}
