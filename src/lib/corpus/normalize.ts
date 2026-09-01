/** Text cleanup and language labeling (English + Hinglish retained, D-015). */

import { MIN_WORD_COUNT } from "./config";

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN = /[A-Za-z]/;

const HINGLISH_MARKERS =
  /\b(hai|nahi|nahin|kya|kaise|acha|accha|bhai|yaar|matlab|lekin|par|bhi|mein|mera|tera|lena|kharid|size ka|fit hai)\b/i;

/** Emoji and pictograph ranges — stripped before storage (no semantic value). */
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

export type LanguageLabel = "en" | "hinglish" | "hi" | "other";

export function stripEmojis(text: string): string {
  return text.replace(EMOJI_RE, "");
}

export function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function stripBoilerplate(text: string): string {
  return text
    .replace(/\u200b/g, "")
    .replace(/\[deleted\]/gi, "")
    .replace(/\[removed\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean raw text at ingest: strip emojis and boilerplate. */
export function prepareRawText(text: string): string {
  return stripBoilerplate(stripEmojis(text));
}

/** Corpus quality bar: at least MIN_WORD_COUNT words after cleanup, no emoji-only content. */
export function meetsCorpusQualityBar(text: string): boolean {
  const cleaned = prepareRawText(text);
  return wordCount(cleaned) >= MIN_WORD_COUNT;
}

export function containsEmoji(text: string): boolean {
  EMOJI_RE.lastIndex = 0;
  return EMOJI_RE.test(text);
}

export function detectLanguage(text: string): LanguageLabel {
  const sample = text.slice(0, 500);
  const hasDev = DEVANAGARI.test(sample);
  const hasLatin = LATIN.test(sample);

  if (hasDev && hasLatin) return "hinglish";
  if (hasDev) return "hi";
  if (HINGLISH_MARKERS.test(sample) && hasLatin) return "hinglish";
  if (hasLatin) return "en";
  return "other";
}

export function normalizeText(text: string): { text_clean: string; lang: LanguageLabel } {
  const text_clean = prepareRawText(text);
  const lang = detectLanguage(text_clean);
  return { text_clean, lang };
}

/** Phase 1 keeps English and Hinglish (and Hindi script) documents. */
export function isRetainedLanguage(lang: LanguageLabel): boolean {
  return lang === "en" || lang === "hinglish" || lang === "hi";
}
