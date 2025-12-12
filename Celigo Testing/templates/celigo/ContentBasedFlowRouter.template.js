function contentBasedFlowRouter(options) {
  // Celigo Content Based Flow Router
  // options.rawMessageBody is often used to route messages
  const body = options.rawMessageBody || "";

  let returnObj = null;

  if (body.includes("ST*940*")) {
    returnObj = { _flowId: "FLOW_ID_HERE", _exportId: "EXPORT_ID_HERE" };
  }

  return returnObj;
}
