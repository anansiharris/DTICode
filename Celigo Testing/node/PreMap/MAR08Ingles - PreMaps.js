// Main Transformation Function
function preMap(options) {
  return options.data.map((d) => {
    const STsegment = d.ST[0];
    let idCode;
    const HL = STsegment["Hierarchical Level"];

    // Remove DTM entries with qualifier "111"
    STsegment.DTM = STsegment.DTM.filter(d => d["Date/Time Qualifier"] !== "111");

    // Move TD1 from "S" level to "O" level
    let td1ToMove = null;
    HL.forEach(level => {
      if (level["Hierarchical Level Code"] === "S" && level.TD1) {
        level.TD1["Packaging Code"] = "PLT49";
        td1ToMove = level.TD1;
        delete level.TD1;
      }
    });

    if (td1ToMove) {
      const oLevel = HL.find(level => level["Hierarchical Level Code"] === "O");
      if (oLevel) {
        oLevel.TD1 = td1ToMove;
        oLevel.TD1["Packaging Code"] = "PLT49";
      }
    }

    HL.forEach(level => {
      // Clean invalid REF records
      if (Array.isArray(level.REF)) {
        level.REF = level.REF.filter(ref =>
          ref["Reference Identification Qualifier"] &&
          ref["Reference Identification"]
        );

        if (level["Hierarchical Level Code"] === "S") {
          level.REF = level.REF.filter(ref => ref["Reference Identification Qualifier"] === "BM");
          level.DTM = STsegment.DTM.filter(d => d["Date/Time Qualifier"] !== "111");
        }
      }

      // Normalize N1 segments
      if (Array.isArray(level.N1)) {
        level.N1 = level.N1.filter(code => code["Entity Identifier Code"] === "ST");

        if (level["Hierarchical Level Code"] === "S") {
          idCode = level.N1[0].Name.slice(-4);
          level.N1[0]["Identification Code"] = "XXXXXXXXXXXX"; // Redacted ID
        }

        level.N1.push({
          "Entity Identifier Code": "WH",
          "Name": "Warehouse Placeholder"
        });
        level.N1.push({
          "Entity Identifier Code": "DE",
          "Name": "Consignee Placeholder"
        });
      }

      // Patch packaging codes
      if (level["Hierarchical Level Code"] === "O" && Array.isArray(level.TD1)) {
        level.TD1[0]["Packaging Code"] = "PLT49";
      }

      // Strip unnecessary fields in Product-level hierarchy
      if (level["Hierarchical Level Code"] === "P") {
        const propsToRemove = [
          "Assigned Identification(LIN01)", "Product/Service ID Qualifier(LIN02)", "Product/Service ID(LIN03)",
          "Product/Service ID Qualifier(LIN04)", "Product/Service ID(LIN05)", "Product/Service ID Qualifier(LIN10)",
          "Product/Service ID(LIN11)", "Assigned Identification(SN101)", "Number of Units Shipped",
          "Unit or Basis for Measurement Code(SN103)", "DTM"
        ];
        propsToRemove.forEach(prop => delete level[prop]);
      }

      // Update item-level structure
      if (level["Hierarchical Level Code"] === "I") {
        delete level.MAN;
        delete level["Pack(PO401)"];
        delete level.REF;

        level["Product/Service ID Qualifier(LIN02)"] = "CB";
        level["Product/Service ID Qualifier(LIN04)"] = "UA";

        const upcParts = level["Product/Service ID(LIN05)"]?.split("/") || [];
        level["Product/Service ID(LIN05)"] = upcParts[1] || "";

        delete level["Entity Identifier Code(CUR01)"];
        delete level["Currency Code(CUR02)"];

        if (Array.isArray(level.PID) && level.PID[0]) {
          level.PID[0]["Product/Process Characteristic Code"] = "08";
        }
      }

      // Filter out DTM entries missing required Date field
      if (Array.isArray(level.DTM)) {
        level.DTM = level.DTM.filter(dtm => dtm["Date/Time Qualifier"] && dtm["Date"]);
      }
    });

    // Rebuild sanitized result structure
    const result = {
      "Interchange Control Number": d["Interchange Control Number"],
      "Group Control Number": d["Group Control Number"],
      ST: [{
        "Transaction Set Control Number": STsegment["Transaction Set Control Number"],
        "Shipment Identification": STsegment["Shipment Identification"],
        "Date(BSN03)": STsegment["Date(BSN03)"],
        "Time(BSN04)": STsegment["Time(BSN04)"],
        "Hierarchical Structure Code": STsegment["Hierarchical Structure Code"],
        "Hierarchical Level": HL,
        "Number of Line Items": STsegment["Number of Line Items"],
        "Number of Included Segments": "0",
        "Transaction Set Control Number(SE02)": STsegment["Transaction Set Control Number(SE02)"]
      }],
      "Number of Transaction Sets Included": d["Number of Transaction Sets Included"],
      "Group Control Number(GE02)": d["Group Control Number(GE02)"],
      "Number of Included Functional Groups": d["Number of Included Functional Groups"],
      "Interchange Control Number(IEA02)": d["Interchange Control Number(IEA02)"]
    };

    return { data: result };
  });
}

module.exports = { preMap };
