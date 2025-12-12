function preMap(options) {
  return (options.data || []).map((d) => d);
}

module.exports = { preMap };
