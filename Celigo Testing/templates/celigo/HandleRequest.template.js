function handleRequest(options) {
  return { statusCode: 200, body: options.body || options.request || options };
}
