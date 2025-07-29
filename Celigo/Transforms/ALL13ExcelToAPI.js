/**
 * Transforms flat item records into a structured shipment object.
 * Filters excluded SKUs, extracts lot numbers from descriptions, 
 * and formats relevant metadata for downstream systems.
 */

function transform(options) {
  const record = options.record;
  const date = record[0].Date;
  const lines = [];
  let totalQty = 0;

  for (let i = 0; i < record.length; i++) {
    const row = record[i];
    const itemId = row["Item ID"];

    // Skip if Item ID is missing or too short
    if (!itemId || itemId.length <= 5) continue;

    // Business-specific exclusions (generalized logic)
    const isExcluded = itemId.startsWith("9") ||
                       itemId.startsWith("XXX") || // placeholder for internal SKUs like DWB, 2SS
                       itemId.startsWith("STACK");

    // Allow "SN"-prefixed exceptions
    if (isExcluded && !itemId.startsWith("SN")) continue;

    const description = row["Item Description"] || "";
    let cleanDesc = description;
    let lotValue = row["Order Number"];

    // Parse "use ####" from description if present
    if (description.toLowerCase().includes("use")) {
      const [mainPart] = description.split(/use/i);
      cleanDesc = mainPart.trim();
      const match = description.match(/use\s+(\d+)/i);
      lotValue = match ? match[1] : lotValue;
    }

    const baseLine = {
      item: itemId,
      desc: cleanDesc,
      quantity: row["Quantity"],
      lot: lotValue,
      subLot: row["Service Unit"]
    };

    // Include extended metadata if not excluded
    if (!isExcluded) {
      const tagNum = row["Number"] != null ? String(row["Number"]).padStart(20, "0") : "";
      baseLine.tagID = tagNum;
      baseLine.weight = row["Total Weight"];
      totalQty += Number(row["Quantity"]);
    }

    lines.push(baseLine);
  }

  return {
    DocDate: date,
    Doc: `${record[0]["Service Unit"]}-${date}`,
    shipToName: record[0]["Ship Name"],
    totalqty: totalQty,
    lines: lines,
    supplies: []  // Placeholder for future use
  };
}

/**
 * Converts Excel serial date to YYYYMMDD format
 */
function ExcelDateToJSDate(date) {
  const jsDate = new Date((date - 25569) * 86400 * 1000);
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, "0");
  const day = String(jsDate.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Reformats MM/DD/YY string to YYYYMMDD
 */
function reformatDate(date) {
  const [mm, dd, yy] = date.split("/");
  return `20${yy}${mm.padStart(2, "0")}${dd.padStart(2, "0")}`;
}
