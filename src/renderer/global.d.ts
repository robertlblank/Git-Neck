import type { GitNeckStoreApi } from "../preload";

declare global {
  interface Window {
    gitNeckStore?: GitNeckStoreApi;
    webkitAudioContext: typeof AudioContext;
  }
}

export {};
