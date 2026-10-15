// The patient handout as data: built from an analysis result, rendered by the printable sheet and the guide.
import type { AnalysisResult, KeyItem, KeyItemKind, Medication } from "../../api/types";
import { dirFor, htmlLangFor, stringsFor, type HandoutStrings } from "../../i18n/handout";
import { highlightItems } from "../../lib/highlights";
import { KIND_META } from "../../lib/kinds";

export type Slot = "morning" | "noon" | "evening" | "night";
export const SLOTS: readonly Slot[] = ["morning", "noon", "evening", "night"];

export type PrintSize = "normal" | "large";
export interface HandoutSettings {
  size: PrintSize;
  showActions: boolean;
  showCheckup: boolean;
}
export const DEFAULT_SETTINGS: HandoutSettings = { size: "large", showActions: true, showCheckup: true };

/** Link to the numbered highlight on the original page (staff preview only). */
export interface SourceRef {
  ref: number | null;
  tone: string;
}

export interface HandoutItem extends SourceRef {
  id: string;
  title: string;
  value: string;
  text: string;
  lowConfidence: boolean;
}

export interface HandoutMedicine extends SourceRef {
  id: string;
  title: string;
  boxName: string;
  purpose: string | null;
  doses: Record<Slot, string | null>;
  notes: string[];
  tag: "new" | "changed" | null;
  lowConfidence: boolean;
}

export interface HandoutModel {
  t: HandoutStrings;
  language: string;
  dir: "ltr" | "rtl";
  htmlLang: string;
  settings: HandoutSettings;
  hospital: string | null;
  summary: string;
  diagnoses: HandoutItem[];
  actions: string[];
  slots: Slot[];
  medicines: HandoutMedicine[];
  stopped: HandoutMedicine[];
  warningSigns: HandoutItem[];
  checkups: HandoutItem[];
  instructions: HandoutItem[];
  contacts: HandoutItem[];
}

function dose(value: string | null): string | null {
  const v = value?.trim();
  return v && v !== "0" ? v : null;
}

type Refs = Map<string, number>;

function toMedicine(m: Medication, refs: Refs): HandoutMedicine {
  const doses = Object.fromEntries(SLOTS.map((s) => [s, dose(m[s])])) as Record<Slot, string | null>;
  return {
    id: m.id,
    title: m.active_ingredient?.trim() || m.name,
    boxName: [m.name, m.strength].filter(Boolean).join(" "),
    purpose: m.purpose,
    doses,
    notes: [m.instructions, m.schedule_text].map((n) => n?.trim() ?? "").filter((n) => n !== ""),
    tag: m.status === "new" ? "new" : m.status === "changed" ? "changed" : null,
    lowConfidence: m.confidence === "low",
    ref: refs.get(m.id) ?? null,
    tone: KIND_META.medication.tone,
  };
}

function itemsOf(items: KeyItem[], kind: KeyItemKind, refs: Refs): HandoutItem[] {
  return items
    .filter((k) => k.kind === kind)
    .map((k) => ({
      id: k.id,
      title: k.label,
      value: k.value,
      text: k.explanation,
      lowConfidence: k.confidence === "low",
      ref: refs.get(k.id) ?? null,
      tone: KIND_META[kind].tone,
    }));
}

/** Language, direction and strings follow result.target_language, never the language that was requested. */
export function buildHandout(result: AnalysisResult, settings: HandoutSettings = DEFAULT_SETTINGS): HandoutModel {
  const language = result.target_language;
  // Same numbering as the highlights the DocumentViewer draws on the original.
  const refs: Refs = new Map(highlightItems(result).map((h, i) => [h.id, i + 1]));
  const all = result.medications.map((m) => ({ status: m.status, med: toMedicine(m, refs) }));
  const medicines = all.filter((x) => x.status !== "stopped").map((x) => x.med);
  const stopped = all.filter((x) => x.status === "stopped").map((x) => x.med);
  return {
    t: stringsFor(language),
    language,
    dir: dirFor(language),
    htmlLang: htmlLangFor(language),
    settings,
    hospital: result.sender,
    summary: result.summary,
    diagnoses: itemsOf(result.key_items, "diagnosis", refs),
    actions: settings.showActions ? result.action_steps : [],
    slots: SLOTS.filter((s) => medicines.some((m) => m.doses[s] !== null)),
    medicines,
    stopped,
    warningSigns: itemsOf(result.key_items, "warning_sign", refs),
    checkups: settings.showCheckup ? itemsOf(result.key_items, "appointment", refs) : [],
    instructions: itemsOf(result.key_items, "instruction", refs),
    contacts: itemsOf(result.key_items, "contact", refs),
  };
}

export interface DayEntry {
  id: string;
  title: string;
  dose: string;
  lowConfidence: boolean;
}

/** The "my day" infographic: what to take at each used time of day, plus medicines without a daily dose. */
export function dayPlan(model: HandoutModel): { slots: { slot: Slot; entries: DayEntry[] }[]; other: HandoutMedicine[] } {
  return {
    slots: model.slots.map((slot) => ({
      slot,
      entries: model.medicines.flatMap((m) =>
        m.doses[slot] ? [{ id: m.id, title: m.title, dose: m.doses[slot]!, lowConfidence: m.lowConfidence }] : [],
      ),
    })),
    other: model.medicines.filter((m) => SLOTS.every((s) => m.doses[s] === null)),
  };
}

/** The overview strip at the top of the handout. */
export function glance(model: HandoutModel) {
  return {
    medicines: model.medicines.length,
    newOrChanged: model.medicines.filter((m) => m.tag !== null).length,
    stopped: model.stopped.length,
    checkup: model.checkups[0]?.value || null,
  };
}
