// tools/sync-watch.js (CommonJS)
// Watches celigo/ (+ optionally templates/) and runs tools/sync.js on changes.
// Usage:
//   node tools/sync-watch.js --lint-safe-hard
//   npm run sync:watch

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const LINT_SAFE_HARD = hasFlag("--lint-safe-hard");

const WATCH_DIRS = [
  path.join(ROOT, "celigo"),
  path.join(ROOT, "templates"),
  path.join(ROOT, "tools"), // optional: watch sync.js edits too
].filter((p) => fs.existsSync(p));

let running = false;
let queued = false;
let lastRun = 0;

function runSync() {
  if (running) {
    queued = true;
    return;
  }

  running = true;
  queued = false;

  const args = [path.join(ROOT, "tools", "sync.js")];
  if (LINT_SAFE_HARD) args.push("--lint-safe-hard");

  console.log(
    `\n🔁 Running sync: node ${args.slice(1).join(" ") || "tools/sync.js"}`
  );

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code) => {
    running = false;
    lastRun = Date.now();
    if (code === 0) {
      console.log("✅ Sync complete.");
    } else {
      console.log(`❌ Sync failed (exit ${code}).`);
    }
    if (queued) runSync();
  });
}

// Basic debounce so saves don’t trigger 5 runs
function scheduleSync() {
  const now = Date.now();
  if (now - lastRun < 250) return;
  setTimeout(runSync, 150);
}

function watchDirRecursive(dir) {
  // fs.watch is imperfect but good enough for a local dev watcher.
  // If you want bulletproof, we can swap to chokidar (dependency).
  fs.watch(dir, { recursive: true }, (event, filename) => {
    if (!filename) return;

    const f = String(filename).toLowerCase();

    // ignore noise
    if (f.includes("results")) return;
    if (f.includes("node_modules")) return;
    if (!f.endsWith(".js") && !f.endsWith(".json")) return;

    console.log(`👀 Change detected: ${path.join(dir, filename)}`);
    scheduleSync();
  });
}

console.log("👁️ sync:watch starting...");
console.log("Watching:");
WATCH_DIRS.forEach((d) => console.log(" - " + d));
console.log(`Mode: ${LINT_SAFE_HARD ? "hard lint-safe" : "normal"}`);

runSync();
WATCH_DIRS.forEach(watchDirRecursive);
