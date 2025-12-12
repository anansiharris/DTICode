/* eslint-disable */
/* Auto-generated from celigo/ContentBasedFlowRouter/ExampleRouter - ContentBasedFlowRouter.js */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
  function contentBasedFlowRouter(options) {
    const body = options.rawMessageBody || "";
    let returnObj = null;
  
    if (body.includes("ST*940*")) {
      returnObj = { _flowId: "FLOW_ID_HERE", _exportId: "EXPORT_ID_HERE" };
    }
  
    return returnObj;
  }

  const __impl =
    (typeof contentBasedFlowRouter === "function" && contentBasedFlowRouter) ||
    (typeof contentBasedFlowRouter === "function" && contentBasedFlowRouter) ||
    null;

  if (!__impl) {
    throw new Error(
      "No callable function found. Expected one of: contentBasedFlowRouter, contentBasedFlowRouter"
    );
  }

  return __impl(options);
}

module.exports = { contentBasedFlowRouter: __celigoInvoke };
