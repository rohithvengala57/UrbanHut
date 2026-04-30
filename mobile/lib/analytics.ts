import * as Linking from "expo-linking";

import { getItem, setItem } from "@/lib/storage";
import api from "@/services/api";

export type Track2EventName =
  | "app_opened"
  | "landing_page_viewed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "profile_completed"
  | "verification_started"
  | "verification_submitted"
  | "listing_created"
  | "listing_published"
  | "listing_viewed"
  | "search_performed"
  | "saved_listing_added"
  | "interest_sent"
  | "mutual_match_created"
  | "chat_room_created"
  | "chat_message_sent"
  | "household_created"
  | "household_member_joined"
  | "expense_created"
  | "chore_completed"
  | "service_provider_viewed"
  | "service_booking_created"
  | "trust_score_viewed";

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  city?: string;
};

const FIRST_TOUCH_KEY = "analytics_first_touch";
const LAST_TOUCH_KEY = "analytics_last_touch";
const SESSION_ID_KEY = "analytics_session_id";

function parseMaybeJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function extractAttribution(input: Record<string, unknown>): Attribution {
  return {
    source: normalizeString(input.utm_source) ?? normalizeString(input.source),
    medium: normalizeString(input.utm_medium) ?? normalizeString(input.medium),
    campaign: normalizeString(input.utm_campaign) ?? normalizeString(input.campaign),
    city: normalizeString(input.city),
  };
}

async function readAttribution(key: string): Promise<Attribution | null> {
  return parseMaybeJSON<Attribution>(await getItem(key));
}

async function writeAttribution(key: string, value: Attribution): Promise<void> {
  await setItem(key, JSON.stringify(value));
}

export async function setAttribution(attribution: Attribution): Promise<void> {
  const hasAnyValue = Object.values(attribution).some(Boolean);
  if (!hasAnyValue) return;

  const firstTouch = await readAttribution(FIRST_TOUCH_KEY);
  if (!firstTouch) {
    await writeAttribution(FIRST_TOUCH_KEY, attribution);
  }
  await writeAttribution(LAST_TOUCH_KEY, attribution);
}

export async function captureAttributionFromUrl(url: string | null): Promise<void> {
  if (!url) return;
  const parsed = Linking.parse(url);
  const queryParams = (parsed.queryParams ?? {}) as Record<string, unknown>;
  const attribution = extractAttribution(queryParams);
  await setAttribution(attribution);
}

export async function getAttributionContext(): Promise<{
  first_touch: Attribution | null;
  last_touch: Attribution | null;
}> {
  const [firstTouch, lastTouch] = await Promise.all([
    readAttribution(FIRST_TOUCH_KEY),
    readAttribution(LAST_TOUCH_KEY),
  ]);
  return {
    first_touch: firstTouch,
    last_touch: lastTouch,
  };
}

async function getSessionId(): Promise<string> {
  const existing = await getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const generated = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await setItem(SESSION_ID_KEY, generated);
  return generated;
}

export async function trackEvent(
  eventName: Track2EventName,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const [sessionId, attribution] = await Promise.all([
    getSessionId(),
    getAttributionContext(),
  ]);

  const payload = {
    events: [
      {
        event_name: eventName,
        properties,
        source: "mobile",
        session_id: sessionId,
        occurred_at: new Date().toISOString(),
        ...attribution,
      },
    ],
  };

  try {
    await api.post("/telemetry/events", payload);
  } catch (error) {
    console.warn("analytics_track_failed", eventName, error);
  }
}
