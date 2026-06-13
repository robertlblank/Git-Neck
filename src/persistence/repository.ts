import { normalizeAppState } from "./schema";
import type { AppState } from "../domain/types";

export interface GitNeckRepository {
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
}

export class InMemoryGitNeckRepository implements GitNeckRepository {
  private state: AppState;

  constructor(initialState: AppState) {
    this.state = normalizeAppState(initialState);
  }

  async load(): Promise<AppState> {
    return structuredClone(this.state);
  }

  async save(state: AppState): Promise<void> {
    this.state = structuredClone(normalizeAppState(state));
  }
}
