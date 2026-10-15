// All app state and side effects for one document session. UI components
// stay presentational; swap or extend the pipeline here.

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeDocument, fetchMeta } from "../../api/client";
import type { AnalyzeResponse, Meta } from "../../api/types";
import { FALLBACK_META, FALLBACK_SAMPLES, FALLBACK_UI } from "../../config/fallback";
import { highlightItems } from "../../lib/highlights";
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
import { DEFAULT_LANGUAGE, PROFILE, statusAfterCancel, type Status } from "./screen";

export type { Status } from "./screen";
export type OcrState = "running" | "done" | "failed";


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
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_LANGUAGE);
  const [consent, setConsent] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const responseRef = useRef<AnalyzeResponse | null>(null);
  responseRef.current = response;

  // The active domain pack configures wording, samples, languages, privacy and OCR language.
  const activeProfile = PROFILE;
  const domain = meta.profiles.find((p) => p.id === activeProfile);
  const ui = domain?.ui ?? FALLBACK_UI;
  const samples = domain?.samples ?? FALLBACK_SAMPLES;
  const languages = domain?.languages?.length ? domain.languages : meta.languages;
  const needsConsent = domain?.privacy.requires_consent ?? false;

  // Keep the target language valid for the active domain (e.g. "Einfache Sprache" for medical).
  useEffect(() => {
    if (!domain) return; // the fallback meta (before /api/meta answers) would reset the default to English
    if (languages.length && !languages.includes(targetLanguage)) setTargetLanguage(languages[0]);
  }, [domain, languages, targetLanguage]);

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
    async (id: string) => {
      const s = samples.find((x) => x.id === id) ?? samples[0];
      releasePages(pagesRef.current);
      setPages([]);
      pagesRef.current = [];
      const blob = await (await fetch(s.image)).blob();
      await addFiles([new File([blob], `${s.id}.png`, { type: "image/png" })]);
      setSample(s.id);
    },
    [addFiles, samples],
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

  const run = useCallback(
    async (language: string) => {
      const current = pagesRef.current;
      if (!current.length) return;
      if (needsConsent && !consent) {
        setError("Please confirm the privacy consent first.");
        return;
      }
      setError(null);
      setStatus("analyzing");
      setVerifications(null);
      setCoverage(null);
      setOcrState("running");
      abortRef.current = new AbortController();

      // OCR runs in parallel with the AI call; it's only used to verify.
      const ocr: Promise<OcrWord[][] | null> = ocrPages(
        current,
        domain?.ocr_language ?? ocrLanguageFor(domain?.source_language ?? "German"),
      ).catch((e) => {
        console.warn("OCR verification unavailable", e);
        return null;
      });

      try {
        const blobs = await fitToBudget(current, meta.max_total_upload_bytes);
        const res = await analyzeDocument(blobs, {
          targetLanguage: language,
          profile: activeProfile,
          sample: sample ?? undefined,
          consent,
          signal: abortRef.current.signal,
        });
        setResponse(res);
        setStatus("done");
        const words = await ocr;
        if (words) {
          setVerifications(verifyItems(highlightItems(res.result), words));
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
    },
    [meta, domain, activeProfile, sample, consent, needsConsent],
  );

  const analyze = useCallback(() => run(targetLanguage), [run, targetLanguage]);
  const reanalyze = useCallback(
    (language: string) => {
      setTargetLanguage(language);
      return run(language);
    },
    [run],
  );
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus(statusAfterCancel(responseRef.current !== null));
  }, []);
  const backToStart = useCallback(() => {
    setResponse(null);
    setVerifications(null);
    setCoverage(null);
    setError(null);
    setStatus("idle");
  }, []);

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
    domain,
    languages,
    needsConsent,
    consent,
    setConsent,
    ui,
    samples,
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
    reanalyze,
    cancel,
    backToStart,
    reset,
  };
}

export type Analysis = ReturnType<typeof useAnalysis>;
