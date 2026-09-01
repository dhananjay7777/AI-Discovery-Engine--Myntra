/** Shared types for corpus collection (Phase 1). */

export interface FetchWindow {
  since?: Date;
  until?: Date;
  maxResults?: number;
}

/** A single item returned by a connector before store normalization. */
export interface FetchedItem {
  external_id: string;
  url: string;
  author_id: string | null;
  posted_at: string | null;
  text_raw: string;
  /** Thread or parent id for per-thread caps (Reddit post, YouTube video). */
  thread_id?: string | null;
}

export interface ConnectorMeta {
  platform: string;
  collection_method: string;
  terms_notes: string;
}

export interface CorpusConnector {
  meta: ConnectorMeta;
  fetch(query: string, window: FetchWindow): Promise<FetchedItem[]>;
}
