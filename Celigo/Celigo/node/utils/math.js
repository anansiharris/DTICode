// utils/math.js
function sumByField(records, field) {
  return records.reduce((total, r) => {
    const val = Number(r[field]);
    return total + (isNaN(val) ? 0 : val);
  }, 0);
}

module.exports = { sumByField };
