function transform(options) {
  // Celigo Transform
  // options.record is commonly available in Celigo transforms
  const record = options.record || options.data || options;
  return record;
}
