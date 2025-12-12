# Celigo Repo (Normalized)

This repo has two parallel copies of your scripts:

- `./celigo/` : **Celigo-paste versions** (no `import` / no `module.exports`)
- `./node/`   : **Node-test versions** (CommonJS `module.exports` appended)

## Data
- `data/sample.json` (renamed from `EkaTestLoad.json`)

## Run a transform locally
```bash
npm install
node index.js --type transform --name "EkaTransform - Transforms" --input data/sample.json
```

## Run a preMap locally
```bash
node index.js --type premap --name "MAR08FoodLion - PreMaps" --input data/sample.json
```

## Originals
The original folder layout is preserved under `./_original/` for reference.
