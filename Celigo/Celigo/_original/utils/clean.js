// utils/clean.js
function removeEmpty(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeEmpty).filter(v => v != null);
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      const cleaned = removeEmpty(v);
      if (
        cleaned !== null &&
        cleaned !== undefined &&
        cleaned !== "" &&
        !(typeof cleaned === "object" && Object.keys(cleaned).length === 0)
      ) {
        acc[k] = cleaned;
      }
      return acc;
    }, {});
  }

  return obj;
}

module.exports = { removeEmpty };
