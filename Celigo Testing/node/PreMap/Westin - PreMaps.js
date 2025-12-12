/* eslint-disable */
/* Auto-generated from celigo/PreMap/Westin - PreMaps.js */
/* Hard lint-safe wrapper mode */

"use strict";

function __celigoInvoke(options) {
  /**
   * Transformation function to sanitize and restructure EDI data.
   * This function parses hierarchical shipment data, removes redundant fields,
   * adjusts item-level structure, and standardizes values for integration.
   */
  
  function preMap(options) {
    return options.data.map((d) => {
      const STsegment = d.ST[0];
      let idCode;
      const HL = STsegment["Hierarchical Level"];
      let UPC, Pack, iPack;
  
      // Iterate through each hierarchical level and clean/normalize data
      HL.forEach((level) => {
        // Remove unneeded transportation and packaging info
        delete level.TD1;
        delete level.TD3;
  
        // Clean up invalid REF entries, then remove REF section entirely
        if (Array.isArray(level.REF)) {
          level.REF = level.REF.filter(
            (ref) =>
              ref["Reference Identification Qualifier"] &&
              ref["Reference Identification"]
          );
          delete level.REF;
        }
  
        // Standardize Identification Code Qualifier at Ship-To level
        if (level["Hierarchical Level Code"] === "S") {
          (level.N1 || []).forEach(entry => {
            if ("Identification Code Qualifier" in entry) {
              entry["Identification Code Qualifier"] = "9"; // Placeholder code
            }
          });
        }
  
        // Parse and normalize product-level UPC and pack structure
        if (level["Hierarchical Level Code"] === "P") {
          level["Product/Service ID Qualifier(LIN02)"] = "UA";
          const [packStr, upcStr] = (level["Product/Service ID(LIN03)"] || "").split("/");
          Pack = packStr;
          UPC = upcStr;
          level["Product/Service ID(LIN03)"] = UPC;
  
          // Remove unused product/packaging details
          delete level.MAN;
          delete level["Pack(PO401)"];
          delete level["Weight Qualifier"];
          delete level["Gross Weight per Pack(PO406)"];
        }
  
        // Handle item-level conversion and unit normalization
        if (level["Hierarchical Level Code"] === "I") {
          const [packStr, upcStr] = (level["Product/Service ID(LIN03)"] || "").split("/");
          Pack = packStr;
          UPC = upcStr;
          iPack = Number(Pack) * Number(level["Number of Units Shipped"] || 0);
  
          level["Product/Service ID(LIN03)"] = level["Product/Service ID(LIN07)"];
          level["Product/Service ID Qualifier(LIN02)"] = "CB";
          level["Unit or Basis for Measurement Code(SN103)"] = "EA";
          level["Number of Units Shipped"] = String(iPack);
  
          // Remove redundant or unused item-level fields
          delete level["Product/Service ID(LIN07)"];
          delete level.MAN;
          delete level["Pack(PO401)"];
          delete level.DTM;
          delete level.REF;
          delete level.PID;
          delete level["Entity Identifier Code(CUR01)"];
          delete level["Currency Code(CUR02)"];
          delete level["Product/Service ID Qualifier(LIN06)"];
        }
  
        // Clean up invalid or incomplete DTM entries
        if (Array.isArray(level.DTM)) {
          level.DTM = level.DTM.filter(
            (dtm) => dtm["Date/Time Qualifier"] && dtm["Date"]
          );
        }
      });
  
      // Construct the output structure
      const result = [
        {
          "Interchange Control Number": d["Interchange Control Number"],
          "Group Control Number": d["Group Control Number"],
          ST: [
            {
              "Transaction Set Control Number": STsegment["Transaction Set Control Number"],
              "Shipment Identification": STsegment["Shipment Identification"],
              "Date(BSN03)": STsegment["Date(BSN03)"],
              "Time(BSN04)": STsegment["Time(BSN04)"],
              "Hierarchical Structure Code": STsegment["Hierarchical Structure Code"],
              DTM: [], // Add shared DTM values here if needed
              "Hierarchical Level": HL,
              "Number of Line Items": STsegment["Number of Line Items"],
              "Number of Included Segments": "0",
              "Transaction Set Control Number(SE02)": STsegment["Transaction Set Control Number(SE02)"]
            }
          ],
          "Number of Transaction Sets Included": d["Number of Transaction Sets Included"],
          "Group Control Number(GE02)": d["Group Control Number(GE02)"],
          "Number of Included Functional Groups": d["Number of Included Functional Groups"],
          "Interchange Control Number(IEA02)": d["Interchange Control Number(IEA02)"]
        }
      ];
  
      return { data: result };
    });
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
