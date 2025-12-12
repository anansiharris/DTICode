/* eslint-disable */
/* Auto-generated from celigo/HandleRequest/ExampleHandleRequest - HandleRequest.js */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
  function handleRequest(options) {
    return { statusCode: 200, body: options.body || options.request || options };
  }

  const __impl =
    (typeof handleRequest === "function" && handleRequest) ||
    (typeof handleRequest === "function" && handleRequest) ||
    null;

  if (!__impl) {
    throw new Error(
      "No callable function found. Expected one of: handleRequest, handleRequest"
    );
  }

  return __impl(options);
}

module.exports = { handleRequest: __celigoInvoke };
