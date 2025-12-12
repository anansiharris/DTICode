function preMap(options) {
  // Celigo PreMap
  // options.data is an array of records
  return (options.data || []).map((d) => d);
}
