import type { ExtractedUnit } from "./schemas";

export interface VerifiedUnit extends ExtractedUnit {
  char_start: number;
  char_end: number;
}

export interface VerifyResult {
  verified: VerifiedUnit[];
  dropped: number;
}

/**
 * Re-check quote_verbatim against document.text_clean (D-009).
 * Drops units whose quote is not a substring; fixes offsets when quote is found.
 */
export function verifyUnits(textClean: string, units: ExtractedUnit[]): VerifyResult {
  const verified: VerifiedUnit[] = [];
  let dropped = 0;

  for (const unit of units) {
    const quote = unit.quote_verbatim.trim();
    if (!quote) {
      dropped += 1;
      continue;
    }

    const slice = textClean.slice(unit.char_start, unit.char_end);
    if (slice === quote) {
      verified.push(unit);
      continue;
    }

    const idx = textClean.indexOf(quote);
    if (idx < 0) {
      dropped += 1;
      continue;
    }

    verified.push({
      ...unit,
      char_start: idx,
      char_end: idx + quote.length,
    });
  }

  return { verified, dropped };
}

export function isVerbatimSubstring(textClean: string, quote: string): boolean {
  return quote.length > 0 && textClean.includes(quote);
}
