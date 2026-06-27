import { _electron as electron } from "playwright";
import { strict as assert } from "node:assert";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const launchedApps = [];
const testUserDataDir = await mkdtemp(join(tmpdir(), "git-neck-e2e-"));

const app = await launchApp({
  args: [".", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
});

const page = await app.firstWindow();
page.setDefaultTimeout(7000);
await page.waitForLoadState("domcontentloaded");

const failures = [];
const notes = [];

async function check(name, fn) {
  console.log(`START ${name}`);
  try {
    await fn();
    notes.push(`PASS ${name}`);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`FAIL ${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
    const bodyText = await visibleText().catch(() => "<body unavailable>");
    console.error(`BODY AFTER ${name}:\n${bodyText}`);
  }
}

async function visibleText() {
  return page.locator("body").innerText();
}

await check("app shell loads", async () => {
  await page.getByText("Git Neck").first().waitFor({ timeout: 5000 });
  await assertVisible("Practice");
  await assertVisible("Progress");
  await assertVisible("Settings / Debug");
});

await check("practice is listen-first", async () => {
  await assertVisible(/Mic on|Mic starting|Turn mic on/);
  const text = await visibleText();
  assert(!text.includes("I said it out loud"));
  assert(!text.includes("Submit simulated note"));
  assert(!text.includes("Start listening"));
  assert(!text.includes("Current streak"));
  assert(!text.includes("Result\n"));
  assert(text.includes("Scoring stays out of the way") || text.includes("Logged in the background."));
});

await check("practice prompt and mode controls exist", async () => {
  await assertVisible("Daily Workout");
  await assertVisible("Free Drill");
  await assertVisible("Test");
  await page.locator(".prompt-lines h2").getByText(/^Play [A-G]/).waitFor({ timeout: 5000 });
  await page.locator(".prompt-lines p").getByText(/string$/).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Free Drill" }).click();
  await page.getByRole("button", { name: "Test" }).click();
  await page.getByRole("button", { name: "Daily Workout" }).click();
});

await check("session controls and pause work", async () => {
  await assertVisible("Session");
  await assertVisible("Segment");
  await assertVisible("Tuning");
  await assertVisible("Focus");
  await assertVisible("C, G, D");
  await page.getByRole("button", { name: "Pause" }).click();
  await assertVisible("Paused. Timer stopped.");
  await page.getByRole("button", { name: "Resume" }).click();
  await assertVisible("Microphone idle.");
});

await check("fretboard reveal toggle works", async () => {
  await page.getByRole("button", { name: "Reveal fretboard" }).click();
  await assertVisible("lowE");
  await page.getByRole("button", { name: "Hide fretboard" }).click();
  await page.getByRole("button", { name: "Reveal fretboard" }).waitFor();
});

await check("keyboard shortcuts for reveal and repeat work", async () => {
  await page.keyboard.press("F");
  await assertVisible("lowE");
  await page.keyboard.press("R");
  await assertVisible("Same prompt.");
});

await check("microphone stays available without per-note click", async () => {
  await page.waitForTimeout(1000);
  const text = await visibleText();
  assert(/git neck/i.test(text));
  assert(text.length > 100);
  const stop = page.getByRole("button", { name: "Mic on" });
  if (await stop.isVisible().catch(() => false)) {
    await stop.click();
    await assertVisible("Turn mic on");
    assert(/git neck/i.test(await visibleText()));
  }
});

await check("settings and debug simulated scoring work", async () => {
  await page.getByRole("button", { name: "Practice" }).click();
  const promptText = await page.locator(".prompt-panel h2").innerText();
  const targetNote = getTargetNoteForPrompt(promptText);
  const wrongNote = getWrongNoteForPrompt(promptText);

  await page.getByRole("button", { name: "Settings / Debug" }).click();
  await assertVisible("Debug simulated input");
  await assertVisible("Audio diagnostics");
  await page.locator('label:has-text("Session structure") select').selectOption("three_5");
  await scoreDebugNoteAndWaitForAttempt(wrongNote);

  await page.getByRole("button", { name: "Practice" }).click();
  await assertPromptVisible("Missed");
  await assertPromptVisible(`Heard ${wrongNote}`);
  await assertVisible("Locked");
  await assertVisible("Tiger Mode is locked on this note until you get it right.");
  await page.getByRole("button", { name: "Repeat" }).click();
  await assertPromptVisible("Locked until clean");

  await page.getByRole("button", { name: "Settings / Debug" }).click();
  await scoreDebugNoteAndWaitForAttempt(targetNote);

  await page.getByRole("button", { name: "Practice" }).click();
  await assertPromptVisible("Correct");
  await assertPromptVisible(`Heard ${targetNote}`);
  await page.getByRole("button", { name: "Next" }).waitFor({ timeout: 5000 });
});

await check("ending a session creates a trend entry", async () => {
  await page.getByRole("button", { name: "Practice" }).click();
  await page.getByRole("button", { name: "Repeat" }).click();
  const promptText = await page.locator(".prompt-panel h2").innerText();
  const targetNote = getTargetNoteForPrompt(promptText);
  await page.getByRole("button", { name: "Settings / Debug" }).click();
  await scoreDebugNoteAndWaitForActiveSessionAttempt(targetNote);
  await page.getByRole("button", { name: "Practice" }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await assertVisible("Paused. Timer stopped.");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await assertVisible("Paused. Timer stopped.");
  await page.getByRole("button", { name: "Resume" }).click();
  const completedSessionCountBeforeEnd = await getPersistedCompletedSessionCount();
  await page.getByRole("button", { name: "End session" }).click();
  await assert.equal(await getPersistedCompletedSessionCount(), completedSessionCountBeforeEnd + 1);
  await assertVisible("Session Complete");
  await assertVisible("Start another session");
  await assertVisible("Review progress");
  await assertVisible("Change session type");
  await assertVisible("Why");
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await assertVisible("Session trends");
  await assertVisible("Why this focus");
  await assertVisible(/Session \d+/);

  await page.getByRole("button", { name: "Practice" }).click();
  await page.getByRole("button", { name: "Start another session" }).click();
  await page.locator(".prompt-panel h2").getByText(/Play/).waitFor({ timeout: 5000 });
});

await check("progress shows recent attempts", async () => {
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await assertVisible("Recent attempts");
  await assertVisible(/pass|wrong_note|too_slow/);
});

await check("settings persist across relaunch", async () => {
  await page.getByRole("button", { name: "Settings / Debug" }).click();
  const workoutLength = page.locator('label:has-text("Workout length") input');
  await workoutLength.fill("22");
  await page.locator('label:has-text("Session structure") select').selectOption("five_3");
  await page.waitForTimeout(500);
  await app.close();

  const relaunched = await launchApp({ args: ["."] });
  const nextPage = await relaunched.firstWindow();
  await nextPage.waitForLoadState("domcontentloaded");
  await nextPage.getByRole("button", { name: "Settings / Debug" }).click();
  await assert.equal(await nextPage.locator('label:has-text("Workout length") input').inputValue(), "22");
  await assert.equal(await nextPage.locator('label:has-text("Session structure") select').inputValue(), "five_3");
  await relaunched.close();
});

await closeLaunchedApps();

if (failures.length > 0) {
  console.error([...notes, ...failures].join("\n"));
  process.exitCode = 1;
} else {
  console.log(notes.join("\n"));
}

async function assertVisible(textOrRegex) {
  await page.getByText(textOrRegex).first().waitFor({ timeout: 5000 });
}

async function assertPromptVisible(textOrRegex) {
  await page.locator(".prompt-panel").getByText(textOrRegex).first().waitFor({ timeout: 5000 });
}

async function scoreDebugNoteAndWaitForAttempt(noteName) {
  const noteButton = page.locator('[aria-label="Debug simulated note input"]').getByRole("button", { name: noteName, exact: true });
  await noteButton.click();
  await expectClass(noteButton, "selected-note");
  const attemptCount = await getPersistedAttemptCount();
  await page.getByRole("button", { name: "Score debug note" }).click();
  await waitForPersistedAttemptCountAbove(attemptCount);
}

async function scoreDebugNoteAndWaitForActiveSessionAttempt(noteName) {
  const activeAttemptCount = await getPersistedActiveSessionAttemptCount();
  await scoreDebugNoteAndWaitForAttempt(noteName);
  await waitForPersistedActiveSessionAttemptCountAbove(activeAttemptCount);
}

async function expectClass(locator, className) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5000) {
    const classes = await locator.getAttribute("class");
    if (classes?.split(/\s+/).includes(className)) {
      return;
    }

    await page.waitForTimeout(50);
  }

  throw new Error(`Expected class ${className}`);
}

async function waitForPersistedAttemptCountAbove(attemptCount) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5000) {
    if ((await getPersistedAttemptCount()) > attemptCount) {
      return;
    }

    await page.waitForTimeout(100);
  }

  throw new Error(`Attempt count did not increase above ${attemptCount}`);
}

async function waitForPersistedActiveSessionAttemptCountAbove(attemptCount) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5000) {
    if ((await getPersistedActiveSessionAttemptCount()) > attemptCount) {
      return;
    }

    await page.waitForTimeout(100);
  }

  throw new Error(`Active session attempt count did not increase above ${attemptCount}`);
}

async function getPersistedAttemptCount() {
  return (await getPersistedState()).attempts.length;
}

async function getPersistedCompletedSessionCount() {
  return (await getPersistedSessions()).filter((session) => session.status === "completed").length;
}

async function getPersistedActiveSessionAttemptCount() {
  return (await getPersistedSessions())
    .filter((session) => session.status === "active")
    .reduce((count, session) => count + session.attemptIds.length, 0);
}

async function getPersistedSessions() {
  return (await getPersistedState()).sessions;
}

async function getPersistedState() {
  await page.waitForTimeout(300);
  try {
    const raw = await readFile(join(testUserDataDir, "git-neck-state.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return { attempts: [], sessions: [] };
  }
}

function getWrongNoteForPrompt(promptText) {
  const noteNames = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];
  const targetNote = getTargetNoteForPrompt(promptText);
  return noteNames.find((noteName) => noteName !== targetNote) ?? "C";
}

function getTargetNoteForPrompt(promptText) {
  const match = promptText.match(/Play ([A-G](?:#\/[A-G]b)?)/);
  assert(match, `Could not parse prompt note from: ${promptText}`);
  return match[1];
}

async function launchApp(options) {
  const launched = await electron.launch({
    ...options,
    env: {
      ...process.env,
      ...(options.env ?? {}),
      GIT_NECK_USER_DATA_DIR: testUserDataDir
    }
  });
  launchedApps.push(launched);
  return launched;
}

async function closeLaunchedApps() {
  await Promise.all(
    launchedApps.map(async (launched) => {
      await withTimeout(launched.close().catch(() => undefined), 3000, "close electron app").catch(() => undefined);
    })
  );
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
