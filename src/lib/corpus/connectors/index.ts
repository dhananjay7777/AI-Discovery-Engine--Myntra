import { hackerNewsConnector } from "./hacker-news";
import { appStoreConnector } from "./app-store";
import { playStoreConnector } from "./play-store";
import { redditConnector } from "./reddit";
import { youtubeConnector } from "./youtube";
import type { CorpusConnector } from "../types";

export const ALL_CONNECTORS: CorpusConnector[] = [
  playStoreConnector,
  appStoreConnector,
  redditConnector,
  youtubeConnector,
  hackerNewsConnector,
];

export function connectorByPlatform(platform: string): CorpusConnector | undefined {
  return ALL_CONNECTORS.find((c) => c.meta.platform === platform);
}

export {
  playStoreConnector,
  appStoreConnector,
  redditConnector,
  youtubeConnector,
  hackerNewsConnector,
};
