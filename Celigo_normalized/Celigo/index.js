/**
 * Node test runner for Celigo-style scripts.
 *
 * Usage:
 *   node index.js --type transform --name "EkaTransform - Transforms" --input data/sample.json
 *   node index.js --type premap --name "MAR08FoodLion - PreMaps" --input data/sample.json
 *
 * Notes:
 * - This runner loads files from ./node/(PreMaps|Transforms).
 * - Celigo-ready versions live under ./celigo/(PreMaps|Transforms) and have no imports/exports.
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

function safeRequire(jsPath) {
  // Always resolve from this repo folder
  const abs = path.resolve(__dirname, jsPath);
  return require(abs);
}

function main() {
  const args = parseArgs(process.argv);

  const type = (args.type || "transform").toLowerCase();
  const name = args.name; // file base name WITHOUT .js
  const input = args.input || path.join("data", "sample.json");

  if (!name) {
    console.error("Missing --name. Example:");
    console.error('  node index.js --type transform --name "EkaTransform - Transforms" --input data/sample.json');
    process.exit(2);
  }

  const folder = type === "premap" ? "PreMaps" : "Transforms";
  const modPath = path.join(__dirname, "node", folder, `${name}.js`);

  if (!fs.existsSync(modPath)) {
    console.error(`Cannot find script: ${modPath}`);
    process.exit(2);
  }

  const raw = fs.readFileSync(path.join(__dirname, input), "utf8");
  const data = JSON.parse(raw);

  const mod = safeRequire(path.join("node", folder, `${name}.js`));

  // Prefer known function names; fall back to "first exported function".
  const fn =
    mod.transform ||
    mod.preMap ||
    mod.postMap ||
    mod.jsonAPIRequestParseResponse ||
    (Object.values(mod).find(v => typeof v === "function"));

  if (typeof fn !== "function") {
    console.error("No runnable function exported from the selected module.");
    console.error("Exported keys:", Object.keys(mod));
    process.exit(2);
  }

  // Celigo-style calling conventions vary. We'll try common shapes:
  // - transform({ record })
  // - preMap({ data: [...] })
  let result;
  if (type === "premap") {
    result = fn({ data });
  } else {
    // If input is an array, pass as data; otherwise treat as record.
    if (Array.isArray(data)) result = fn({ data });
    else result = fn({ record: data });
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
