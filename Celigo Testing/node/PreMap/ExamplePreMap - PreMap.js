/* eslint-disable */
/* Auto-generated from celigo/PreMap/ExamplePreMap - PreMap.js */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
  function preMap(options) {
    return (options.data || []).map((d) => d);
  }

  const __impl =
    (typeof preMap === "function" && preMap) ||
    (typeof preMap === "function" && preMap) ||
    null;

  if (!__impl) {
    throw new Error(
      "No callable function found. Expected one of: preMap, preMap"
    );
  }

  return __impl(options);
}

module.exports = { preMap: __celigoInvoke };
