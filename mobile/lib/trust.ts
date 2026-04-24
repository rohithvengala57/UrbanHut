import { COLORS, getTrustLevel, TRUST_LABELS } from "@/constants/config";

export function getTrustBadge(score: number) {
  const level = getTrustLevel(score);
  return TRUST_LABELS[level] || TRUST_LABELS.low;
}

export function getTrustColor(score: number): string {
  const level = getTrustLevel(score);
  return COLORS.trust[level as keyof typeof COLORS.trust] || COLORS.trust.low;
}

export function formatTrustScore(score: number): string {
  return Math.round(score).toString();
}

export function getTrustTrendIcon(trend: string): string {
  switch (trend) {
    case "rising":
      return "trending-up";
    case "declining":
      return "trending-down";
    default:
      return "minus";
  }
}
