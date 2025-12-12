// index.js (CommonJS)
// Celigo script runner framework + Results output
// Supports the script types in this repo and uses scripts.manifest.json when present.
//
// Examples:
//   node index.js --name "ExampleTransform - Transform" --input data/sample.json
//   node index.js --type transform --name "ExampleTransform - Transform" --fn transform --input data/sample.json
//
// Output is written to ./Results/<name>_<type>_<fn>_<timestamp>.json

const fs = require("fs");
const path = require("path");

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const val = process.argv[idx + 1];
  return val && !val.startsWith("--") ? val : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function loadManifest() {
  const p = path.join(__dirname, "scripts.manifest.json");
  if (!fs.existsSync(p)) return null;
  return readJson(p);
}

function printHelp() {
  console.log(`
Celigo Script Runner (CommonJS)

Required:
  --name "<FileBaseName>"     The JS filename (without .js) under node/<Type>/
Optional:
  --type <typeKey>            Overrides manifest type
  --fn <exportedFnName>       Overrides manifest function name
  --input <path>              Input JSON path (default: data/sample.json)

Type keys:
  branching
  contentbasedflowrouter
  filter
  forminit
  handlerequest
  postaggregate
  postmap
  postresponsemap
  postsubmit
  premap
  presavepage
  transform

Examples:
  node index.js --name "ExampleTransform - Transform"
  node index.js --name "ExamplePostResponse - PostResponseMap" --input data/sample.json
  node index.js --type transform --name "MyScript - Transform" --fn transform --input data/myInput.json
`);
}

const TYPE_MAP = {
  branching: {
    folder: ["node", "Branching"],
    defaultFn: "branch",
    buildOptions: (input) => ({ record: input, data: input })
  },
  contentbasedflowrouter: {
    folder: ["node", "ContentBasedFlowRouter"],
    defaultFn: "contentBasedFlowRouter",
    buildOptions: (input) => ({ rawMessageBody: typeof input === "string" ? input : JSON.stringify(input) })
  },
  filter: {
    folder: ["node", "Filter"],
    defaultFn: "filter",
    buildOptions: (input) => ({ data: Array.isArray(input) ? input : [input] })
  },
  forminit: {
    folder: ["node", "FormInit"],
    defaultFn: "formInit",
    buildOptions: (input) => ({ form: input })
  },
  handlerequest: {
    folder: ["node", "HandleRequest"],
    defaultFn: "handleRequest",
    buildOptions: (input) => ({ request: input })
  },
  postaggregate: {
    folder: ["node", "PostAggregate"],
    defaultFn: "postAggregate",
    buildOptions: (input) => ({ data: Array.isArray(input) ? input : [input] })
  },
  postmap: {
    folder: ["node", "PostMap"],
    defaultFn: "postMap",
    buildOptions: (input) => ({ data: Array.isArray(input) ? input : [input] })
  },
  postresponsemap: {
    folder: ["node", "PostResponseMap"],
    defaultFn: "postResponseMap",
    buildOptions: (input) => ({ responseData: input, data: input })
  },
  postsubmit: {
    folder: ["node", "PostSubmit"],
    defaultFn: "postSubmit",
    buildOptions: (input) => ({ responseData: input, data: input })
  },
  premap: {
    folder: ["node", "PreMap"],
    defaultFn: "preMap",
    buildOptions: (input) => ({ data: Array.isArray(input) ? input : [input] })
  },
  presavepage: {
    folder: ["node", "PreSavePage"],
    defaultFn: "preSavePage",
    buildOptions: (input) => ({ form: input })
  },
  transform: {
    folder: ["node", "Transform"],
    defaultFn: "transform",
    buildOptions: (input) => ({ record: input, data: input })
  }
};

function pickFunction(mod, desiredFn, defaultFn) {
  if (desiredFn) {
    if (typeof mod[desiredFn] !== "function") {
      throw new Error(`--fn "${desiredFn}" not found or not a function export.`);
    }
    return { fn: mod[desiredFn], fnName: desiredFn };
  }

  if (typeof mod[defaultFn] === "function") return { fn: mod[defaultFn], fnName: defaultFn };

  const exportedFns = Object.entries(mod).filter(([, v]) => typeof v === "function");
  if (exportedFns.length === 1) return { fn: exportedFns[0][1], fnName: exportedFns[0][0] };

  throw new Error(
    `No runnable function export found. Try --fn.\nExports: ${Object.keys(mod).join(", ") || "(none)"}`
  );
}

function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    printHelp();
    process.exit(0);
  }

  const manifest = loadManifest();

  let name = getArg("--name", null);
  let type = (getArg("--type", null) || "").toLowerCase();
  let fnName = getArg("--fn", null);
  const inputPath = getArg("--input", path.join(__dirname, "data", "sample.json"));

  if (!name) {
    console.error('❌ Missing --name. Example:\n  node index.js --name "ExampleTransform - Transform" --input data/sample.json');
    process.exit(1);
  }

  if (manifest && manifest[name]) {
    type = type || String(manifest[name].type || "").toLowerCase();
    fnName = fnName || manifest[name].fn || null;
  }

  if (!type || !TYPE_MAP[type]) {
    console.error(
      `❌ Unknown or missing --type.\nAllowed: ${Object.keys(TYPE_MAP).join(", ")}\n` +
      `Tip: add/update scripts.manifest.json to avoid passing --type.`
    );
    process.exit(1);
  }

  if (!require("fs").existsSync(inputPath)) {
    console.error(`❌ Input JSON not found:\n  ${inputPath}`);
    process.exit(1);
  }

  const { folder, defaultFn, buildOptions } = TYPE_MAP[type];
  const baseDir = path.join(__dirname, ...folder);
  const scriptPath = path.join(baseDir, `${name}.js`);

  if (!require("fs").existsSync(scriptPath)) {
    console.error(`❌ Script not found:\n  ${scriptPath}`);
    process.exit(1);
  }

  const input = readJson(inputPath);
  const mod = require(scriptPath);
  const { fn, fnName: chosenFn } = pickFunction(mod, fnName, defaultFn);

  const options = buildOptions(input);
  const result = fn(options);

  const resultsDir = path.join(__dirname, "Results");
  ensureDir(resultsDir);

  const outputFile = path.join(
    resultsDir,
    `${safeName(name)}_${safeName(type)}_${safeName(chosenFn)}_${Date.now()}.json`
  );

  require("fs").writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`✅ Ran ${type}.${chosenFn} and wrote: ${outputFile}`);
}

try {
  main();
} catch (err) {
  console.error("❌ Runner failed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}