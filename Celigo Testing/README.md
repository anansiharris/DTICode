# Celigo Script Repo (Celigo + Node, CommonJS)

The framework for this repo was created by ChatGPT and I will mark comments on code that was created by AI

This repo is set up so you can keep **two versions** of each script:

- `celigo/<Type>/...` = paste-ready code for Celigo (no `require`, no `module.exports`)
- `node/<Type>/...` = Node testable code (CommonJS exports) run via `node index.js`

Outputs are written to `Results/`.

## Quick start

```bash
npm install
node index.js --help
node index.js --name "ExampleTransform - Transform" --input data/sample.json
```

## Script types included

- Branching*
- ContentBasedFlowRouter*
- Filter
- FormInit
- HandleRequest
- PostAggregate
- PostMap
- PostResponseMap*
- PostSubmit
- PreMap*
- PreSavePage*
- Transform*

(Asterisk = you said you use it most often.)

## How to add a new script (checklist)

1) **Pick the type folder**
   - Example: `Transform`, `PreMap`, `PostResponseMap`, etc.

2) **Create the Celigo version**
   - Copy the matching template from `templates/celigo/<Type>.template.js`
   - Save it to: `celigo/<Type>/<YourName> - <Type>.js`

3) **Create the Node version**
   - Copy the matching template from `templates/node/<Type>.template.js`
   - Save it to: `node/<Type>/<YourName> - <Type>.js`
   - Keep the function body the same as the Celigo version
   - Ensure it exports the function using `module.exports = { ... }`

4) **Register it**
   - Add an entry to `scripts.manifest.json`:
     ```json
     "YourName - Transform": { "type": "transform", "fn": "transform" }
     ```
   - The key must match the **filename without `.js`**.

5) **Test it**
   ```bash
   node index.js --name "YourName - Transform" --input data/sample.json
   ```
   If needed, override:
   ```bash
   node index.js --type transform --name "YourName - Transform" --fn transform --input data/sample.json
   ```

## Naming convention

Use:
`OriginalFileName - CurrentFolder.js`

Examples:
- `EkaTransform - Transform.js`
- `MAR08FoodLion - PreMap.js`
- `MyRouter - ContentBasedFlowRouter.js`

## Notes on Celigo vs Node

- Celigo files should be **copy/paste safe**: no imports, no exports.
- Node files should be **testable**: export the main function.
- The runner supports `--fn` so you can test scripts that export non-standard names.
