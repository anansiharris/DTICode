function transform({ record }) {
    var data = removeBlankFields(record.data);
    var chars = /^\d{6}$/
    console.log(chars.exec())
    var ST = [];

    for (let rec of data) {
        var trx = {
            "Transaction Set Identifier Code": "945",
            "Transaction Set Control Number": rec.ShipmentID.slice(-5).padStart("0", 4),
            "Reporting Code": "F",
            "Date": formatDate(rec.ShipDate),
            "Depositor Order Number": rec.OrderRefNumber ? rec.OrderRefNumber : rec.PurchOrderNumber,
            "Shipment Identification Number": rec.ShipmentID || "",
            "Purchase Order Number": rec.PurchOrderNumber,
            "0100": [
                {
                    "Entity Identifier Code(N101)": "WH", "Name(N102)": "Distribution Technology", "Identification Code Qualifier": null, "Identification Code": null
                },
                {
                    "Entity Identifier Code(N101)": "ST",
                    "Name(N102)": rec.ShipTo.ShipToName,
                    "Identification Code Qualifier": "91",
                    "Identification Code": rec.ShipTo.ShipToName2,
                    N3: [
                        {
                            "Address Information(N301)": rec.ShipTo.ShipToAddr1,
                            "Address Information(N302)": rec.ShipTo.ShipToAddr2
                        }
                    ],
                    "City Name": rec.ShipTo.ShipToCity,
                    "State or Province Code": rec.ShipTo.ShipToState,
                    "Postal Code": rec.ShipTo.ShipToZip
                },
                {
                    "Entity Identifier Code(N101)": "BT",
                    "Name(N102)": rec.FreightBillTo.FrtBillToName,
                    N3: [
                        {
                            "Address Information(N301)": rec.FreightBillTo.FrtBillToAddr1,
                            "Address Information(N302)": rec.FreightBillTo.FrtBillToAddr2
                        }
                    ],
                    "City Name": rec.FreightBillTo.FrtBillToCity,
                    "State or Province Code": rec.FreightBillTo.FrtBillToState,
                    "Postal Code": rec.FreightBillTo.FrtBillToZip
                }
            ],
            N9: [
                {
                    "Reference Identification Qualifier": "BM",
                    "Reference Identification": rec.OrderRefNumber
                },
                {
                    "Reference Identification Qualifier": typeof rec.PurchOrderNumber !== "undefined" ? "PO" : "",
                    "Reference Identification": rec.PurchOrderNumber
                },
                {
                    "Reference Identification Qualifier": typeof rec.ProNumber !== "undefined" ? "2I" : "",
                    "Reference Identification": rec.ProNumber
                }
            ],
            G62: [
                {
                    "Date Qualifier": typeof rec.ExpDeliveryDate !== "undefined" ? "02" : "",
                    "Date": formatDate(rec.ExpDeliveryDate)
                },
                {
                    "Date Qualifier": typeof rec.ShipDate !== "undefined" ? "10" : "",
                    "Date": formatDate(rec.ExpDeliveryDate)
                },
                {
                    "Date Qualifier": typeof rec.OrderDate !== "undefined" ? "52" : "",
                    "Date": formatDate(rec.OrderDate)
                },
                {
                    "Date Qualifier": typeof rec.OrderDate !== "undefined" ? "11" : " ",
                    "Date": formatDate(rec.ShipDate),
                    "Time Qualifier": "W",
                    "Time": formatTime(rec.ShipTime),
                    "Time Code": "ET"
                }
            ],
            TransportationMethod: "M",
            SCAC: rec.Carrier.CarrierCode,
            Routing: rec.Carrier.CarrierName,
            EquipmentInitial: rec.Container || rec.ProNumber ? "T" : "",
            EquipmentNumber: rec.Container,
            "0300": [],
            "Quantity Received": rec.TotalQtyOrdered,
            "Number of Units Shipped": rec.TotalQtyOrdered,
            "Weight(W0302)": rec.GrsWeight,
            "Unit or Basis for Measurement Code(W0303)": rec.GrsWeight ? "LB" : ""
        };

        const w07 = trx["0300"];
        let quantityReceived = 0;
        let numberOfUnitsShipped = 0;

        const uomMap = {
            BALE: "BA",
            CASE: "CA",
            BAG: "BG",
            CARTON: "CT",
            Each: "EA",
            PLT: "PL"
        };

        // 🔹 Normalize ShipLine so we always have an array
        let input = [];
        if (Array.isArray(rec.ShipLine)) {
            input = rec.ShipLine;
        } else if (rec.ShipLine && typeof rec.ShipLine === "object") {
            input = [rec.ShipLine];
        }

        // Group by ItemNumber + Lot and collect MAN details
        const map = new Map();

        for (const item of input) {
            const key = `${item.ItemNumber}-${item.Lot}`;
            const qty = Number(item.QtyShipped || 0);

            if (!map.has(key)) {
                map.set(key, {
                    base: { ...item }, // representative line
                    mans: []
                });
            }

            const group = map.get(key);

            // One MAN per original row (tag + its quantity)
            if (item.TagID) {
                group.mans.push({
                    "Marks and Numbers Qualifier(MAN01)": "CA",
                    "Marks and Numbers(MAN02)": item.TagID,
                    //"Marks and Numbers Qualifier(MAN04)":"ZZ",
                    //"Marks and Numbers(MAN05)": qty
                });
            }
            if (item.GroupID) {
                group.mans.push({
                    "Marks and Numbers Qualifier(MAN01)": "GM",
                    "Marks and Numbers(MAN02)": item.GroupID,
                    //"Marks and Numbers Qualifier(MAN04)":"ZZ",
                    //"Marks and Numbers(MAN05)": qty
                });
            }
        }

        // Now compute totalQty from MANs so W07 qty == sum(MAN05)
        const result = Array.from(map.values()).map(group => {
            const totalQty = group.mans.reduce(
                (sum, m) => sum + Number(m["Marks and Numbers(MAN05)"] || 0),
                0
            );
            console.log(typeof totalQty)
            return { ...group, totalQty };
        });

        var assigned = 10;

        // Build one W07 per Item+Lot
        for (const group of result) {
            const line = group.base;
            const lineQty = group.totalQty || Number(group.base.QtyShipped);  // sum of MAN05 for this W07
            const uom = uomMap[line.UOM] || "";

            // Header totals equal sum of MAN05 across all lines
            quantityReceived += lineQty;
            numberOfUnitsShipped += lineQty;

            let qtydiff = Number(line.QtyOrdered) - lineQty;
            if (qtydiff === 0) qtydiff = "";

            w07.push({
                "Assigned Number": assigned,
                MAN: group.mans,
                "0310": {
                    "Shipment/Order Status Code": "CL",
                    "Quantity": lineQty,
                    "Number of Units Shipped": lineQty,
                    //"Quantity Difference": qtydiff,
                    "Unit or Basis for Measurement Code": uom,
                    "Lot": chars.exec(line.Lot) ? "Generic" : line.Lot,
                    "Product/Service ID Qualifier": "VN",
                    "Product/Service ID": line.ItemNumber,
                    "Weight(W1210)": line.Grswgt || "",
                    "Weight Qualifier(W1211)": line.Grswgt ? "G" : "",
                    "Weight Unit Code(W1212)": line.Grswgt ? "L" : "",
                    N9: [
                        {
                            "Reference Identification Qualifier": "LI",
                            "Reference Identification": line.LineReference
                        }
                    ],
                    G69: [
                        {
                            "Free-form Description": line.ItemDesc1
                        }
                    ],
                    G62: {
                        "Date Qualifier": line.CodeDate ? "36" : "",
                        "Date": formatDate(line.CodeDate) || ""
                    }
                }
            }
            );

            assigned += 10;
        }

        trx["Quantity Received"] = String(quantityReceived);
        trx["Number of Units Shipped"] = String(numberOfUnitsShipped);

        ST.push(trx);
    }

    record.data = ST;
    return removeBlankFields(record);
}

// Deeply remove blank fields so Celigo doesn't emit {} shells
function removeBlankFields(input) {
    const BLANK = Symbol("blank");

    function prune(value) {
        if (value === null || value === undefined) return BLANK;
        if (typeof value === "string") {
            return value === "" ? BLANK : value;
        }
        if (typeof value === "number") {
            return Number.isNaN(value) ? BLANK : value;
        }
        if (Array.isArray(value)) {
            const pruned = value.map(prune).filter(v => v !== BLANK);
            return pruned.length ? pruned : BLANK;
        }
        if (typeof value === "object") {
            const out = {};
            for (const [k, v] of Object.entries(value)) {
                const pv = prune(v);
                if (pv !== BLANK) out[k] = pv;
            }
            return Object.keys(out).length ? out : BLANK;
        }
        return value;
    }

    const result = prune(input);
    return result === BLANK ? {} : result;
}

function formatDate(mdY) {
    if (!mdY) return "";
    const parts = mdY.split("/");
    if (parts.length !== 3) return mdY;
    const [mm, dd, yyyy] = parts;
    return `${yyyy}${mm}${dd}`;
}

function formatTime(hms) {
    if (!hms || typeof hms !== "string" || !hms.includes(":")) return "";
    const [h, m] = hms.split(":");
    return (h.padStart(2, "0") + m);
}

/*
* transformFunction stub:
*
* The name of the function can be changed to anything you like.
*
* The function will be passed one 'options' argument that has the following fields:
*   'record' - object {} or array [] depending on the data source.
*   'settings' - all custom settings in scope for the transform currently running.
*   'testMode' - boolean flag indicating test mode and previews.
*   'job' - the job currently running.
*
* The function needs to return the transformed record.
* Throwing an exception will return an error for the record.
*/