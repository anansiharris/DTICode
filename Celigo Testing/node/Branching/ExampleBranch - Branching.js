/* eslint-disable */
/* Auto-generated from celigo/Branching/ExampleBranch - Branching.js */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
  function branch(options) {
    return true;
  }

  const __impl =
    (typeof branch === "function" && branch) ||
    (typeof branch === "function" && branch) ||
    null;

  if (!__impl) {
    throw new Error(
      "No callable function found. Expected one of: branch, branch"
    );
  }

  return __impl(options);
}

module.exports = { branch: __celigoInvoke };
