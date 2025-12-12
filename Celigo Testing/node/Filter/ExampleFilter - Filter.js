/* eslint-disable */
/* Auto-generated from celigo/Filter/ExampleFilter - Filter.js */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
  function filter(options) {
    return true;
  }

  const __impl =
    (typeof filter === "function" && filter) ||
    (typeof filter === "function" && filter) ||
    null;

  if (!__impl) {
    throw new Error(
      "No callable function found. Expected one of: filter, filter"
    );
  }

  return __impl(options);
}

module.exports = { filter: __celigoInvoke };
