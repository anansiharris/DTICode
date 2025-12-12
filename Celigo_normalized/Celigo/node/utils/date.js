// utils/date.js
function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDate(date) {
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate())
  );
}

module.exports = { formatDate };
