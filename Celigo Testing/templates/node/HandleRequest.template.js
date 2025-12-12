function handleRequest(options) {
  // Celigo Handle Request script
  return { statusCode: 200, body: options.request || options };
}

module.exports = { handleRequest };
