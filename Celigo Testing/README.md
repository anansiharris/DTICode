Celigo Script Runner & Sync Framework

This repository provides a local development, testing, and synchronization framework for Celigo JavaScript scripts.

It allows you to:
- Author Celigo scripts in a clean, organized structure
- Automatically sync them into Node-compatible test files
- Run and debug scripts locally
- Keep a single source of truth for Celigo deployments
- Work entirely from VS Code + PowerShell
- Scale into fixtures, snapshot testing, and CI validation

------------------------------------------------------------

REPOSITORY STRUCTURE

DTICode/
├── celigo/                 # SOURCE OF TRUTH (author scripts here)
│   ├── Transform/
│   ├── PreMap/
│   ├── PostResponseMap/
│   ├── Branching/
│   └── utils/
│       └── date.js
│
├── node/                   # AUTO-GENERATED (do not edit)
├── data/
│   └── sample.json
├── tests/
│   ├── fixtures/
│   └── snapshots/
├── tools/
│   ├── sync.js
│   └── sync-watch.js
├── Results/
├── scripts.manifest.json
├── index.js
├── package.json
└── .vscode/

------------------------------------------------------------

HOW TO ADD SCRIPTS

1) Create a file in the appropriate celigo/<Type>/ folder

Example:
celigo/Transform/MyTransform - Transform.js

2) Paste pure Celigo code

function transform(options) {
  const record = options.record;
  record.Processed = true;
  return record;
}

3) Sync the repo

npm run sync:hard
or
npm run sync:watch

------------------------------------------------------------

HOW TO RUN TESTS

Basic test:
node index.js --name "MyTransform - Transform" --input data/sample.json

Example:
node index.js --name "ExampleTransform - Transform" --input data/sample.json

Results are written to the Results/ folder.

------------------------------------------------------------

PER-SCRIPT TEST FIXTURES

tests/fixtures/MyTransform - Transform/
├── input.json
└── expected.json

Run with:
node index.js --name "MyTransform - Transform" --input tests/fixtures/MyTransform - Transform/input.json

------------------------------------------------------------

SNAPSHOT TESTING (OPTIONAL)

tests/snapshots/MyTransform - Transform.snapshot.json

Snapshots store full script output and are compared on future runs
to detect regressions.

------------------------------------------------------------

CI VALIDATION (OPTIONAL)

Typical CI steps:
1) npm install
2) npm run sync:hard
3) Validate manifest and exports
4) Run fixture tests
5) Fail build on mismatches

------------------------------------------------------------

POWERSHELL WORKFLOW

npm install
npm run sync:hard
npm run sync:watch
git status
git commit -m "Update script"
git push

------------------------------------------------------------

MENTAL MODEL

Celigo folder = authoring
Node folder   = testing
Sync          = compiler
index.js      = runtime
