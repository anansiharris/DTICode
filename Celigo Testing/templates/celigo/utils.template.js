/**
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      d = new Date(value + "T00:00:00");
    }
    // MM/DD/YY or MM/DD/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
      let [mm, dd, yy] = value.split("/");
      if (yy.length === 2) yy = "20" + yy;
      d = new Date(
        `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`
      );
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

  return `${year}${month}${day}`;
}
