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

/** Bundled sample letters ("Try a sample"). In demo mode the backend returns the matching answer. */
export const SAMPLES = [
  { id: "bussgeldbescheid", label: "Genuine fine notice", file: "/sample/bussgeldbescheid.png" },
  { id: "scam_inkasso", label: "Fake debt collection (scam)", file: "/sample/scam_inkasso.png" },
  { id: "injection_hundesteuer", label: "Letter with hidden AI instructions", file: "/sample/injection_hundesteuer.png" },
] as const;

const FALLBACK_META: Meta = {
  analyzer: "unknown",
  default_profile: "german_letter",
  profiles: [],
  languages: ["English"],
  max_pages: 6,
  max_total_upload_bytes: 4_400_000,
};

export function useAnalysis() {
  const [meta, setMeta] = useState<Meta>(FALLBACK_META);
  const [pages, setPages] = useState<PreparedPage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [verifications, setVerifications] = useState<Record<string, Verification> | null>(null);
  const [ocrState, setOcrState] = useState<OcrState>("running");
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [sample, setSample] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("English");
  const abortRef = useRef<AbortController | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    fetchMeta()
      .then(setMeta)
      .catch(() => setError("Could not reach the server. Is the backend running?"));
    return () => releasePages(pagesRef.current);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      const room = meta.max_pages - pagesRef.current.length;
      if (room <= 0) {
        setError(`At most ${meta.max_pages} pages per document.`);
        return;
      }
      setStatus("preparing");
      setSample(null); // user's own files: no sample hint
      try {
        const added = await preparePages(files, room);
        setPages((prev) => [...prev, ...added]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that file.");
      } finally {
        setStatus("idle");
      }
    },
    [meta.max_pages],
  );

  const trySample = useCallback(
    async (id: string = SAMPLES[0].id) => {
      const s = SAMPLES.find((x) => x.id === id) ?? SAMPLES[0];
      releasePages(pagesRef.current);
      setPages([]);
      pagesRef.current = [];
      const blob = await (await fetch(s.file)).blob();
      await addFiles([new File([blob], `${s.id}.png`, { type: "image/png" })]);
      setSample(s.id);
    },
    [addFiles],
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

  const analyze = useCallback(async () => {
    const current = pagesRef.current;
    if (!current.length) return;
    setError(null);
    setStatus("analyzing");
    setVerifications(null);
    setCoverage(null);
    setOcrState("running");
    abortRef.current = new AbortController();

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
        targetLanguage,
        profile: meta.default_profile,
        sample: sample ?? undefined,
        signal: abortRef.current.signal,
      });
      setResponse(res);
      setStatus("done");
      const words = await ocr;
      if (words) {
        setVerifications(verifyItems(res.result.key_items, words));
        setCoverage(textCoverage(words, res.result.blocks));
        setOcrState("done");
      } else {
        setOcrState("failed");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }, [meta, targetLanguage, sample]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    releasePages(pagesRef.current);
    setPages([]);
    setResponse(null);
    setVerifications(null);
    setCoverage(null);
    setSample(null);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    meta,
    pages,
    status,
    error,
    response,
    verifications,
    ocrState,
    coverage,
    targetLanguage,
    setTargetLanguage,
    addFiles,
    trySample,
    removePage,
    movePage,
    analyze,
    reset,
  };
}
