/* eslint-disable */
/* Auto-generated from celigo/Transform/ExampleTransform - Transform.js */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
  function transform(options) {
    const record = options.record || options.data || options;
    return record;
  }

  const __impl =
    (typeof transform === "function" && transform) ||
    (typeof transform === "function" && transform) ||
    null;

  if (!__impl) {
    throw new Error(
      "No callable function found. Expected one of: transform, transform"
    );
  }

  return __impl(options);
}

module.exports = { transform: __celigoInvoke };
