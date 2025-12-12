// tools/sync.js (CommonJS)
// Celigo is source of truth:
// - Syncs celigo/<Type>/*.js -> node/<Type>/*.js (appends module.exports)
// - Syncs celigo/utils/*.js  -> node/utils/*.js (exports all declared functions, incl arrow/assigned)
// - Regenerates scripts.manifest.json from celigo scripts
// - Seeds celigo/utils/date.js if missing (normalizeDateToYYYYMMDD)
// - OPTIONAL hard lint-safe wrapper mode for node scripts
//
// Usage:
//   npm run sync
//   npm run sync -- --lint-safe-hard
//   npm run manifest   (manifest-only)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const TYPE_MAP = {
  Branching: { typeKey: "branching", defaultFn: "branch" },
  ContentBasedFlowRouter: {
    typeKey: "contentbasedflowrouter",
    defaultFn: "contentBasedFlowRouter",
  },
  Filter: { typeKey: "filter", defaultFn: "filter" },
  FormInit: { typeKey: "forminit", defaultFn: "formInit" },
  HandleRequest: { typeKey: "handlerequest", defaultFn: "handleRequest" },
  PostAggregate: { typeKey: "postaggregate", defaultFn: "postAggregate" },
  PostMap: { typeKey: "postmap", defaultFn: "postMap" },
  PostResponseMap: { typeKey: "postresponsemap", defaultFn: "postResponseMap" },
  PostSubmit: { typeKey: "postsubmit", defaultFn: "postSubmit" },
  PreMap: { typeKey: "premap", defaultFn: "preMap" },
  PreSavePage: { typeKey: "presavepage", defaultFn: "preSavePage" },
  Transform: { typeKey: "transform", defaultFn: "transform" },
};

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function listJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".js"))
    .map((f) => path.join(dir, f));
}

function writeText(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

function stripTrailingExports(jsText) {
  // remove any existing module.exports blocks at end (conservative)
  return jsText
    .replace(/\n\s*module\.exports\s*=\s*\{[\s\S]*?\}\s*;?\s*$/m, "")
    .trimEnd();
}

/**
 * Infer the "primary" callable name in a Celigo script.
 * Supports:
 *   - function foo(...) {}
 *   - const foo = function(...) {}
 *   - const foo = (...) => {}
 *   - const foo = x => {}
 */
function inferPrimaryCallableName(jsText) {
  // 1) function foo(...)
  let m = jsText.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (m) return m[1];

  // 2) const foo = function(...)
  m = jsText.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function\b/);
  if (m) return m[1];

  // 3) const foo = (...) =>  OR  const foo = x =>
  m = jsText.match(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(?[^\)]*\)?\s*=>/
  );
  if (m) return m[1];

  return null;
}

/**
 * For utils: infer ALL function-like exports.
 * Supports:
 *   - function foo(...) {}
 *   - const foo = function(...) {}
 *   - const foo = (...) => {}
 *   - const foo = x => {}
 */
function inferAllFunctionNames(jsText) {
  const names = new Set();

  // function foo(...) {}
  for (const m of jsText.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    names.add(m[1]);
  }

  // const foo = function(...) {}
  for (const m of jsText.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function\b/g
  )) {
    names.add(m[1]);
  }

  // const foo = (...) => {}  OR  const foo = x =>
  for (const m of jsText.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(?[^\)]*\)?\s*=>/g
  )) {
    names.add(m[1]);
  }

  return [...names];
}

function saveManifest(obj) {
  const p = path.join(ROOT, "scripts.manifest.json");
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

/**
 * Build export block for Node scripts (non-lint-safe mode):
 * - export the real inferred function name
 * - ALSO export a type-standard alias pointing at the same function
 */
function buildExports(fnName, defaultFn) {
  if (!fnName) return "module.exports = {};\n";

  if (fnName === defaultFn) {
    return `module.exports = { ${fnName} };\n`;
  }

  return `module.exports = { ${fnName}, ${defaultFn}: ${fnName} };\n`;
}

/**
 * Hard lint-safe wrapper generator:
 * - Pastes Celigo code INSIDE a wrapper function (scoped)
 * - Locates the callable function (fnName or defaultFn)
 * - Invokes it with options
 * - Exports wrapper under BOTH names (real fn + default alias)
 */
function buildHardLintSafeNodeFile({
  cleanedCeligoCode,
  relSourcePath,
  fnName,
  defaultFn,
}) {
  const safeFnName = fnName || defaultFn;

  const exportsBlock =
    safeFnName === defaultFn
      ? `module.exports = { ${defaultFn}: __celigoInvoke };`
      : `module.exports = { ${safeFnName}: __celigoInvoke, ${defaultFn}: __celigoInvoke };`;

  return `/* eslint-disable */
/* Auto-generated from ${relSourcePath} */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
${indent(cleanedCeligoCode, 2)}

  const __impl =
    (typeof ${safeFnName} === "function" && ${safeFnName}) ||
    (typeof ${defaultFn} === "function" && ${defaultFn}) ||
    null;

  if (!__impl) {
    throw new Error(
      "No callable function found. Expected one of: ${safeFnName}, ${defaultFn}"
    );
  }

  return __impl(options);
}

${exportsBlock}
`;
}

function indent(text, spaces) {
  const pad = " ".repeat(spaces);
  return String(text)
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

// --- Utils seeding (Celigo side) ---
const SEEDED_DATE_UTIL = `/**
 * Normalize a date-like value to YYYYMMDD
 *
 * Supports:
 *  - Excel serial numbers (e.g. 45567)
 *  - "MM/DD/YY"
 *  - "MM/DD/YYYY"
 *  - "YYYY-MM-DD"
 *  - Date objects
 *
 * Returns "" if input cannot be parsed.
 */
function normalizeDateToYYYYMMDD(value) {
  if (value === null || value === undefined || value === "") return "";

  let d;

  // Excel serial date
  if (typeof value === "number" && isFinite(value)) {
    d = new Date((value - 25569) * 86400 * 1000);
  }
  // JS Date object
  else if (value instanceof Date && !isNaN(value)) {
    d = value;
  }
  // String formats
  else if (typeof value === "string") {
    // YYYY-MM-DD
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
      d = new Date(value + "T00:00:00");
    }
    // MM/DD/YY or MM/DD/YYYY
    else if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}$/.test(value)) {
      let [mm, dd, yy] = value.split("/");
      if (yy.length === 2) yy = "20" + yy;
      d = new Date(\`\\\${yy}-\\\${mm.padStart(2, "0")}-\\\${dd.padStart(
        2,
        "0"
      )}T00:00:00\`);
    } else {
      return "";
    }
  } else {
    return "";
  }

  if (isNaN(d)) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return \`\\\${year}\\\${month}\\\${day}\`;
}
`;

function seedUtilsIfMissing() {
  const celigoUtilsDir = path.join(ROOT, "celigo", "utils");
  const dateUtilPath = path.join(celigoUtilsDir, "date.js");

  if (!fs.existsSync(celigoUtilsDir)) {
    fs.mkdirSync(celigoUtilsDir, { recursive: true });
  }

  if (!fs.existsSync(dateUtilPath)) {
    writeText(dateUtilPath, SEEDED_DATE_UTIL + "\n");
    console.log("🌱 Seeded celigo/utils/date.js (normalizeDateToYYYYMMDD)");
  }
}

function syncUtils(manifestOnly) {
  const celigoUtilsDir = path.join(ROOT, "celigo", "utils");
  const nodeUtilsDir = path.join(ROOT, "node", "utils");

  if (!fs.existsSync(celigoUtilsDir)) return;

  for (const filePath of listJsFiles(celigoUtilsDir)) {
    const baseName = path.basename(filePath, ".js");
    const celigoBody = fs.readFileSync(filePath, "utf8");
    const cleaned = stripTrailingExports(celigoBody);

    // export ALL top-level function declarations (incl assigned/arrow)
    const fns = inferAllFunctionNames(cleaned);

    const exportLine =
      fns.length > 0
        ? `module.exports = { ${fns.join(", ")} };\n`
        : "module.exports = {};\n";

    if (!manifestOnly) {
      const nodePath = path.join(nodeUtilsDir, `${baseName}.js`);
      const nodeBody = `${cleaned}\n\n${exportLine}`;
      writeText(nodePath, nodeBody);
    }
  }

  if (!manifestOnly) {
    // optional barrel file
    const indexPath = path.join(nodeUtilsDir, "index.js");
    if (!fs.existsSync(indexPath)) {
      writeText(indexPath, `module.exports = {\n  ...require("./date")\n};\n`);
    }
    console.log("✅ Synced node/utils from celigo/utils.");
  }
}

function main() {
  const manifestOnly = hasFlag("--manifest-only");
  const lintSafeHard = hasFlag("--lint-safe-hard");

  // 1) Ensure required utils exist on Celigo side
  seedUtilsIfMissing();

  // 2) Sync scripts (celigo/<Type> -> node/<Type>) and build manifest
  const nextManifest = {};

  for (const folderName of Object.keys(TYPE_MAP)) {
    const celigoDir = path.join(ROOT, "celigo", folderName);
    const nodeDir = path.join(ROOT, "node", folderName);

    for (const filePath of listJsFiles(celigoDir)) {
      const baseName = path.basename(filePath, ".js");
      const celigoBody = fs.readFileSync(filePath, "utf8");

      const inferred = inferPrimaryCallableName(celigoBody);
      const fn = inferred || TYPE_MAP[folderName].defaultFn;

      nextManifest[baseName] = { type: TYPE_MAP[folderName].typeKey, fn };

      if (manifestOnly) continue;

      const cleaned = stripTrailingExports(celigoBody);
      const nodePath = path.join(nodeDir, `${baseName}.js`);

      if (lintSafeHard) {
        const relSourcePath = path.relative(ROOT, filePath).replace(/\\/g, "/");

        const nodeBody = buildHardLintSafeNodeFile({
          cleanedCeligoCode: cleaned,
          relSourcePath,
          fnName: fn,
          defaultFn: TYPE_MAP[folderName].defaultFn,
        });

        writeText(nodePath, nodeBody);
      } else {
        // default simple mode (with alias export)
        const exportsBlock = buildExports(fn, TYPE_MAP[folderName].defaultFn);
        const nodeBody = `${cleaned}\n\n${exportsBlock}`;
        writeText(nodePath, nodeBody);
      }
    }
  }

  // 3) Save manifest based on celigo scripts
  saveManifest(nextManifest);
  console.log(
    `✅ Updated scripts.manifest.json with ${
      Object.keys(nextManifest).length
    } entries.`
  );

  // 4) Sync utils (celigo/utils -> node/utils)
  syncUtils(manifestOnly);

  if (!manifestOnly) {
    console.log("✅ Synced node/ scripts from celigo/ scripts.");
    if (lintSafeHard) console.log("🧼 Hard lint-safe wrapper mode enabled.");
  }
}

try {
  main();
} catch (err) {
  console.error("❌ Sync failed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
// End of tools/sync.js
