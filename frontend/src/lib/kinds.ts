import type { KeyItemKind } from "../api/types";

// Display metadata per key-item kind. Colours map to CSS tokens in styles.css.
export const KIND_META: Record<KeyItemKind, { label: string; icon: string; tone: string }> = {
  deadline: { label: "Deadline", icon: "⏰", tone: "danger" },
  payment: { label: "Payment", icon: "€", tone: "warn" },
  consequence: { label: "Consequence", icon: "⚠", tone: "danger" },
  appointment: { label: "Appointment", icon: "📅", tone: "violet" },
  document_required: { label: "Documents", icon: "📎", tone: "violet" },
  reference: { label: "Reference", icon: "#", tone: "info" },
  contact: { label: "Contact", icon: "☎", tone: "teal" },
  medication: { label: "Medicine", icon: "💊", tone: "info" },
  diagnosis: { label: "Diagnosis", icon: "🩺", tone: "violet" },
  warning_sign: { label: "Warning sign", icon: "🚨", tone: "danger" },
  instruction: { label: "What to do", icon: "✅", tone: "teal" },
  other: { label: "Info", icon: "i", tone: "neutral" },
};

const IMPORTANCE_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function byImportance<T extends { importance: keyof typeof IMPORTANCE_ORDER }>(
  a: T,
  b: T,
): number {
  return IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance];
}

export function formatDate(iso: string, locale?: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

/** Whole days from today until `iso` (negative if past). */
export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}
