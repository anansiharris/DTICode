function contentBasedFlowRouter(options) {
  const body = options.rawMessageBody || "";
  let returnObj = null;

  if (body.includes("ST*940*")) {
    returnObj = { _flowId: "FLOW_ID_HERE", _exportId: "EXPORT_ID_HERE" };
  }

  return returnObj;
}

module.exports = { contentBasedFlowRouter };
