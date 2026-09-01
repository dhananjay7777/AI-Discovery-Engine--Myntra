import { createHash } from "crypto";

const AUTHOR_SALT = "discovery-engine-author-v1";

/** SHA-256 hex digest; never store raw author identifiers (D-011). */
export function hashAuthor(authorId: string | null | undefined): string | null {
  if (!authorId || authorId.trim() === "") return null;
  return createHash("sha256")
    .update(`${AUTHOR_SALT}:${authorId.trim().toLowerCase()}`)
    .digest("hex");
}

/** Content hash for exact dedupe — normalized whitespace, lowercased. */
export function hashContent(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
