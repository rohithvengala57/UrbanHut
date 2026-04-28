// Dev fallback for local runs only. Production should always set EXPO_PUBLIC_API_URL.
import { colors } from "./theme";
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
export const IS_API_URL_FALLBACK = !process.env.EXPO_PUBLIC_API_URL;
export const API_BASE = `${API_URL}/api/v1`;

export const COLORS = {
  primary: colors.primary[500],
  primaryDark: colors.primary[600],
  accent: colors.accent[500],
  accentDark: colors.accent[600],
  background: colors.background,
  surface: colors.surface,
  text: colors.slate[900],
  textSecondary: colors.slate[500],
  border: colors.slate[200],
  error: colors.trust.low,
  success: colors.trust.high,
  warning: colors.trust.medium,
  gradientStart: colors.primary[500],
  gradientEnd: colors.accent[500],
  trust: colors.trust,
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
