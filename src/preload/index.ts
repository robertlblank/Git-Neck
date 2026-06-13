import { contextBridge, ipcRenderer } from "electron";
import type { AppState } from "../domain/types";

const api = {
  loadState: (): Promise<AppState> => ipcRenderer.invoke("git-neck:load-state"),
  saveState: (state: AppState): Promise<void> => ipcRenderer.invoke("git-neck:save-state", state),
  getStatePath: (): Promise<string> => ipcRenderer.invoke("git-neck:state-path")
};

contextBridge.exposeInMainWorld("gitNeckStore", api);

export type GitNeckStoreApi = typeof api;
