// index.js (CommonJS) - runner with Results output + --fn support
const fs = require("fs");
const path = require("path");

// ---------- CLI helpers ----------
function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const val = process.argv[idx + 1];
  return val && !val.startsWith("--") ? val : fallback;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(s) {
  return String(s || "output")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_");
}

function pickFunction(mod, type, fnName) {
  // 1) Explicit --fn wins
  if (fnName) {
    const fn = mod[fnName];
    if (typeof fn !== "function") {
      throw new Error(`--fn "${fnName}" not found or not a function export.`);
    }
    return { fn, fnName };
  }

  // 2) Conventional names
  const candidates =
    type === "premap"
      ? ["preMap", "premap", "default"]
      : ["transform", "Transform", "default"];

  for (const name of candidates) {
    if (typeof mod[name] === "function") return { fn: mod[name], fnName: name };
  }

  // 3) If exactly one exported function exists, use it
  const exportedFns = Object.entries(mod).filter(([, v]) => typeof v === "function");
  if (exportedFns.length === 1) {
    return { fn: exportedFns[0][1], fnName: exportedFns[0][0] };
  }

  // 4) Nothing usable found
  const keys = Object.keys(mod);
  throw new Error(
    `No runnable function export found.\nExports: ${keys.length ? keys.join(", ") : "(none)"}\n` +
      `Try passing --fn "exportedFunctionName".`
  );
}

// ---------- main ----------
function main() {
  const type = (getArg("--type", "transform") || "transform").toLowerCase(); // transform | premap
  const name = getArg("--name", null); // e.g. "EkaTransform - Transforms"
  const fnName = getArg("--fn", null); // e.g. "jsonAPIRequestParseResponse"
  const inputArg = getArg("--input", path.join(__dirname, "data", "sample.json"));

  if (!name) {
    console.error(
      '❌ Missing --name.\nExample:\n  node index.js --type transform --name "EkaTransform - Transforms" --input data/sample.json'
    );
    process.exit(1);
  }

  const baseDir =
    type === "premap"
      ? path.join(__dirname, "node", "PreMaps")
      : path.join(__dirname, "node", "Transforms");

  const scriptPath = path.join(baseDir, `${name}.js`);

  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Script not found:\n  ${scriptPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(inputArg)) {
    console.error(`❌ Input JSON not found:\n  ${inputArg}`);
    process.exit(1);
  }

  const inputData = readJson(inputArg);
  const mod = require(scriptPath);

  const { fn, fnName: chosenFn } = pickFunction(mod, type, fnName);

  let result;
  if (type === "premap") {
    // Celigo-style preMap expects options.data as array
    result = fn({ data: Array.isArray(inputData) ? inputData : [inputData] });
  } else {
    // Celigo-style transform commonly expects { record } (sometimes { data } too)
    result = fn({ record: inputData, data: inputData });
  }

  // Write output
  const resultsDir = path.join(__dirname, "Results");
  ensureDir(resultsDir);

  const outputFile = path.join(
    resultsDir,
    `${safeName(name)}_${safeName(type)}_${safeName(chosenFn)}_${Date.now()}.json`
  );

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`✅ Ran ${chosenFn} and wrote results to: ${outputFile}`);
}

try {
  main();
} catch (err) {
  console.error("❌ Runner failed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
