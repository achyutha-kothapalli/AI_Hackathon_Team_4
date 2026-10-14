// All app state and side effects for one document session. UI components
// stay presentational; swap or extend the pipeline here.

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeDocument, fetchMeta } from "../../api/client";
import type { AnalyzeResponse, Meta } from "../../api/types";
import {
  ocrLanguageFor,
  ocrPages,
  textCoverage,
  verifyItems,
  type Coverage,
  type OcrWord,
  type Verification,
} from "../ocr/verifyHighlights";
import { fitToBudget, preparePages, releasePages, type PreparedPage } from "../upload/preparePages";

export type Status = "idle" | "preparing" | "analyzing" | "done";
export type OcrState = "running" | "done" | "failed";
export type Outcome = "done" | "error" | "cancelled";

/** Bundled sample letters ("Try a sample"). In demo mode the backend returns the matching answer. */
export const SAMPLES = [
  {
    id: "bussgeldbescheid",
    title: "Speeding fine notice",
    sender: "Stadt Musterstadt, Bußgeldstelle",
    hint: "Genuine",
    icon: "landmark",
    file: "/sample/bussgeldbescheid.png",
  },
  {
    id: "scam_inkasso",
    title: "Debt collection demand",
    sender: "Zentrale Forderungsstelle Nord GmbH",
    hint: "Scam",
    icon: "alert",
    file: "/sample/scam_inkasso.png",
  },
  {
    id: "injection_hundesteuer",
    title: "Dog tax notice",
    sender: "Stadt Musterstadt, Steueramt",
    hint: "Hidden AI instructions",
    icon: "shield",
    file: "/sample/injection_hundesteuer.png",
  },
] as const;

const FALLBACK_META: Meta = {
  analyzer: "unknown",
  default_profile: "german_letter",
  profiles: [],
  languages: ["English"],
  max_pages: 6,
  max_total_upload_bytes: 4_400_000,
};

const LANG_KEY = "bv.lang";

function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

export function useAnalysis() {
  const [meta, setMeta] = useState<Meta>(FALLBACK_META);
  const [pages, setPages] = useState<PreparedPage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [resultLanguage, setResultLanguage] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Record<string, Verification> | null>(null);
  const [ocrState, setOcrState] = useState<OcrState>("running");
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [storedLanguage, setStoredLanguage] = useState(readStoredLanguage);
  const targetLanguage = storedLanguage ?? "English";
  const abortRef = useRef<AbortController | null>(null);
  const sampleRef = useRef<string | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    fetchMeta()
      .then((m) => {
        setMeta(m);
        // A language the server no longer offers falls back to English.
        setStoredLanguage((l) => (l && !m.languages.includes(l) ? "English" : l));
      })
      .catch(() => setError("Could not reach the server. Is the backend running?"));
    return () => releasePages(pagesRef.current);
  }, []);

  const setTargetLanguage = useCallback((name: string) => {
    setStoredLanguage(name);
    try {
      localStorage.setItem(LANG_KEY, name);
    } catch {
      /* private mode: remembered for this visit only */
    }
  }, []);

  /** Adds pages; returns false if nothing could be added. */
  const addFiles = useCallback(
    async (files: File[]): Promise<boolean> => {
      setError(null);
      const room = meta.max_pages - pagesRef.current.length;
      if (room <= 0) {
        setError(`At most ${meta.max_pages} pages per document.`);
        return false;
      }
      setStatus("preparing");
      sampleRef.current = null; // user's own files: no sample hint
      try {
        const added = await preparePages(files, room);
        pagesRef.current = [...pagesRef.current, ...added];
        setPages(pagesRef.current);
        return added.length > 0;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that file.");
        return false;
      } finally {
        setStatus("idle");
      }
    },
    [meta.max_pages],
  );

  const removePage = useCallback((id: string) => {
    setPages((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) releasePages([gone]);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const movePage = useCallback((id: string, delta: -1 | 1) => {
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const analyze = useCallback(async (): Promise<Outcome> => {
    const current = pagesRef.current;
    if (!current.length) return "error";
    setError(null);
    setStatus("analyzing");
    setVerifications(null);
    setCoverage(null);
    setOcrState("running");
    const abort = new AbortController();
    abortRef.current = abort;
    const language = targetLanguage;

    const profile = meta.profiles.find((p) => p.id === meta.default_profile);
    // OCR runs in parallel with the AI call; it's only used to verify.
    const ocr: Promise<OcrWord[][] | null> = ocrPages(
      current,
      ocrLanguageFor(profile?.source_language ?? "German"),
    ).catch((e) => {
      console.warn("OCR verification unavailable", e);
      return null;
    });

    try {
      const blobs = await fitToBudget(current, meta.max_total_upload_bytes);
      const res = await analyzeDocument(blobs, {
        targetLanguage: language,
        profile: meta.default_profile,
        sample: sampleRef.current ?? undefined,
        signal: abort.signal,
      });
      if (abort.signal.aborted) return "cancelled";
      setResponse(res);
      setResultLanguage(language);
      setStatus("done");
      ocr.then((words) => {
        if (abort.signal.aborted) return;
        if (words) {
          setVerifications(verifyItems(res.result.key_items, words));
          setCoverage(textCoverage(words, res.result.blocks));
          setOcrState("done");
        } else {
          setOcrState("failed");
        }
      });
      return "done";
    } catch (e) {
      if (abort.signal.aborted) return "cancelled";
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
      return "error";
    }
  }, [meta, targetLanguage]);

  /** Stops a running analysis and keeps the pages for another try. */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    releasePages(pagesRef.current);
    pagesRef.current = [];
    setPages([]);
    setResponse(null);
    setResultLanguage(null);
    setVerifications(null);
    setCoverage(null);
    sampleRef.current = null;
    setError(null);
    setStatus("idle");
  }, []);

  /** Loads a bundled sample letter as the only page. */
  const loadSample = useCallback(
    async (id: string): Promise<boolean> => {
      const s = SAMPLES.find((x) => x.id === id) ?? SAMPLES[0];
      reset();
      const blob = await (await fetch(s.file)).blob();
      const ok = await addFiles([new File([blob], `${s.id}.png`, { type: "image/png" })]);
      sampleRef.current = s.id;
      return ok;
    },
    [addFiles, reset],
  );

  return {
    meta,
    pages,
    status,
    error,
    clearError: () => setError(null),
    response,
    resultLanguage,
    verifications,
    ocrState,
    coverage,
    targetLanguage,
    languageChosen: storedLanguage !== null,
    setTargetLanguage,
    addFiles,
    loadSample,
    removePage,
    movePage,
    analyze,
    cancel,
    reset,
  };
}

export type Analysis = ReturnType<typeof useAnalysis>;
