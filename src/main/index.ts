import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { normalizeAppState } from "../persistence/schema";
import type { AppState } from "../domain/types";

const STATE_FILE_NAME = "git-neck-state.json";

let mainWindow: BrowserWindow | null = null;

if (process.env.GIT_NECK_USER_DATA_DIR) {
  app.setPath("userData", process.env.GIT_NECK_USER_DATA_DIR);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 640,
    title: "Git Neck",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function getStatePath(): string {
  return join(app.getPath("userData"), STATE_FILE_NAME);
}

async function loadState(): Promise<AppState> {
  const statePath = getStatePath();

  if (!existsSync(statePath)) {
    return normalizeAppState(null);
  }

  const raw = await readFile(statePath, "utf8");
  return normalizeAppState(JSON.parse(raw));
}

async function saveState(state: AppState): Promise<void> {
  const statePath = getStatePath();
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(statePath, JSON.stringify(normalizeAppState(state), null, 2), "utf8");
}

ipcMain.handle("git-neck:load-state", async () => loadState());
ipcMain.handle("git-neck:save-state", async (_event, state: AppState) => saveState(state));
ipcMain.handle("git-neck:state-path", async () => getStatePath());

void app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
