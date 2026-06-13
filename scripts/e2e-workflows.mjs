import { _electron as electron } from "playwright";
import { strict as assert } from "node:assert";
import { mkdtemp } from "node:fs/promises";
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
  await assertVisible("Start listening");
  const text = await visibleText();
  assert(!text.includes("I said it out loud"));
  assert(!text.includes("Submit simulated note"));
  assert(!text.includes("Current streak"));
  assert(!text.includes("Result\n"));
  assert(text.includes("Scoring stays out of the way while you play."));
});

await check("practice prompt and mode controls exist", async () => {
  await assertVisible("Daily Workout");
  await assertVisible("Free Drill");
  await assertVisible("Test");
  await page.getByRole("button", { name: "Free Drill" }).click();
  await page.getByRole("button", { name: "Test" }).click();
  await page.getByRole("button", { name: "Daily Workout" }).click();
});

await check("session controls and pause work", async () => {
  await assertVisible("Session");
  await assertVisible("Segment");
  await assertVisible("Tuning");
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

await check("microphone start can be invoked", async () => {
  await page.getByRole("button", { name: "Start listening" }).click();
  await page.waitForTimeout(1000);
  const text = await visibleText();
  assert(/git neck/i.test(text));
  assert(text.length > 100);
  const stop = page.getByRole("button", { name: "Stop listening" });
  if (await stop.isVisible().catch(() => false)) {
    await stop.click();
    await assertVisible("Microphone idle.");
    assert(/git neck/i.test(await visibleText()));
  }
});

await check("settings and debug simulated scoring work", async () => {
  await page.getByRole("button", { name: "Settings / Debug" }).click();
  await assertVisible("Debug simulated input");
  await page.locator('label:has-text("Session structure") select').selectOption("three_5");
  await page.locator('[aria-label="Debug simulated note input"]').getByRole("button", { name: "C", exact: true }).click();
  await page.getByRole("button", { name: "Score debug note" }).click();
  await assertVisible(/pass|wrong_note|too_slow/);
});

await check("ending a session creates a trend entry", async () => {
  await page.getByRole("button", { name: "Practice" }).click();
  await page.getByRole("button", { name: "End session" }).click();
  await assertVisible("Session saved.");
  await page.getByRole("button", { name: "Progress" }).click();
  await assertVisible("Session trends");
  await assertVisible(/Session \d+/);
});

await check("progress shows recent attempts", async () => {
  await page.getByRole("button", { name: "Progress" }).click();
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
