# Celigo Script Repo (Celigo + Node, CommonJS) v2

You keep **Celigo paste-ready** scripts and get **Node-testable** scripts generated automatically.

- `celigo/<Type>/...` = source of truth (no `require`, no exports)
- `node/<Type>/...` = generated for testing (CommonJS `module.exports`)
- `Results/` = runner outputs
- `scripts.manifest.json` = registry (generated from celigo scripts)

## Install

```bash
npm install
```

## Run a script (uses manifest)

```bash
node index.js --name "ExampleTransform - Transform" --input data/sample.json
```

## Sync (generate node scripts + manifest)

```bash
npm run sync
```

Manifest only:

```bash
npm run manifest
```

## How local testing mimics Celigo

The runner builds **Celigo-ish** `options` objects per type, e.g.:

- Transform: `{ record, data, settings, testMode }`
- PreMap: `{ data: [...], lastExportDateTime, settings, testMode }`
- PostResponseMap: `{ responseData, errors, abort, newErrorsAndRetryData, settings, testMode }`
- ContentBasedFlowRouter: `{ rawMessageBody, settings, testMode }`
- HandleRequest: `{ request, method, headers, query, body, settings, testMode }`

You can tweak defaults in `runner.profile.json`.

## Add a new script (checklist)

1) Create `celigo/<Type>/<YourName> - <Type>.js` using `templates/celigo/<Type>.template.js`
2) Run `npm run sync`
3) Test with `node index.js --name "YourName - <Type>" --input data/sample.json`
