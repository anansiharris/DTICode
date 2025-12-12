// Transform record data into structured format
function transform(options) {
  const record = options.record;

  // Clean and split values from comma-separated fields
  const items = (record.items || "").split(", ").filter(val => val.trim() !== "");
  delete record.items;

  const initialUnits = (record.units || "").split(", ").filter(val => val.trim() !== "");
  delete record.units;

  const lots = (record.lots || "").split(", ").filter(val => /^\d+$/.test(val));
  delete record.lots;

  const tagIDs = (record.tagID || "").split(", ").filter(val => val.trim() !== "");
  delete record.tagID;

  let weights = (record.wgt || "").split(", ").filter(val => val.trim() !== "");
  delete record.wgt;

  // Normalize weight values
  weights = weights.map(val => val.replace(/[a-zA-Z]/g, ''))
                   .map(val => val.trim())
                   .map(val => val.replace(/,000|\.000|,/, ''))
                   .map(val => removeAfterSpace(val));

  // Initialize transformed structure
  const lines = [];
  const units = initialUnits.map(val => val.replace(',', '.'));
  const unit = String(Number(units[0]));

  // Clean up the last two unit entries if necessary
  delete units[units.length - 2];
  delete units[units.length - 1];

  // Initialize record structure
  record.TotalQty = 0;
  record.TotalWgt = 0;
  record.items = [items[0]];
  record.lots = [String(Number(lots[0]))];
  record.tagID = [tagIDs[0]];
  record.wgt = [Number(weights[0])];
  record.units = [];

  let tempWeight = weights[0].replace(",", "");
  let weight, batch, itemPlaceholder;

  for (let i = 0; i < lots.length; i++) {
    record.TotalQty = i;
    record.wgt.push(Number(weights[i]));
    record.TotalWgt += Number(weights[i]);

    batch = String(Number(lots[i]));

    // Normalize item if it has extra spacing
    if (items[i] && items[i].includes(" ")) {
      itemPlaceholder = items[i].split(" ");
      items[i] = itemPlaceholder[0];
    }

    // Replace specific prefixes (sanitized logic)
    for (let b = 0; b <= items.length; b++) {
      if (String(items[b]).startsWith("42")) {
        items[b] = "STANDARDIZED ITEM NAME";
      }
    }

    lines.push({
      item: items[i],
      qty: 1,
      lot: String(Number(lots[i])),
      tagID: tagIDs[i],
      sublot: String(Number(units[i])),
      wgt: weights[i]
    });

    // Extend record arrays after the first iteration
    if (i > 0) {
      record.items.push(items[i]);
      record.lots.push(String(Number(lots[i])));
      record.units.push(String(Number(units[i])));
      record.tagID.push(tagIDs[i]);
    }
  }

  record.TotalQty = Number(record.TotalQty.toFixed(2));
  record.TotalWgt = Number(record.TotalWgt.toFixed(2));
  record.lines = lines;

  return record;
}

// Helper to trim string at the first space
function removeAfterSpace(str) {
  const spaceIndex = str.indexOf(' ');
  return spaceIndex !== -1 ? str.substring(0, spaceIndex) : str;
}
