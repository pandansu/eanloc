
(function () {
    'use strict';

    const GOOGLE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIW6M5LlGnAjkmxLDeZPWonnJWTb0YW4-lw0FRhYst8zfHbTDrQmsNqacBWIcn0BFDRmIIbHBNHqfn/pub?output=csv";

    const TABLE_EAN_COL_INDEX = 5;
    const TABLE_PRICE_COL_INDEX = 8;

    // Options applied to every real (per-sheet) parse. Strips styles/formulas/
    // dates/VBA etc that we never use — this is what was costing ~9s on a
    // heavily formatted 9MB export.
    const FAST_PARSE_OPTS = {
        cellStyles: false,
        cellHTML: false,
        cellFormula: false,
        cellDates: false,
        sheetStubs: false,
        bookVBA: false,
        raw: false // keep values as formatted strings so EAN leading zeros survive
    };

    let workbook = null;
    let excelRows = [];
    let priceMap = {};

    // Raw file bytes/text kept around so we can re-parse a single sheet
    // on demand without re-reading the file from disk.
    let currentFileData = null;
    let currentFileIsCSV = false;

    setTimeout(addUI, 1500);

    function addUI() {
        if (document.getElementById("priceToolsBtn")) return;

        const style = document.createElement("style");
        style.textContent = `
            @media print {
                #priceToolsBtn, #priceToolsPanel {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        const btn = document.createElement("button");
        btn.id = "priceToolsBtn";
        btn.textContent = "$";
        btn.style.position = "fixed";
        btn.style.zIndex = "999999";
        btn.style.padding = "8px 14px";
        btn.style.background = "#1976d2";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "8px";
        btn.style.fontSize = "12px";
        btn.style.cursor = "cursor";

        document.body.appendChild(btn);

        btn.style.left = (window.innerWidth - btn.offsetWidth - 20) + "px";
        btn.style.top = (window.innerHeight - btn.offsetHeight - 20) + "px";

        makeDraggable(btn);

        const panel = document.createElement("div");
        panel.id = "priceToolsPanel";
        panel.style.position = "fixed";
        panel.style.zIndex = "999998";
        panel.style.width = "300px";
        panel.style.padding = "12px";
        panel.style.background = "white";
        panel.style.border = "1px solid #ccc";
        panel.style.borderRadius = "10px";
        panel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
        panel.style.fontSize = "12px";
        panel.style.display = "none";

        panel.innerHTML = `
            <label>Mode</label>
            <select id="modeSelect" style="width:100%; margin-bottom:10px;">
                <option value="google">Channel Price</option>
                <option value="excel">Ecom Price</option>
            </select>

            <div id="googleSection">
                <button id="googleFillBtn" style="width:100%; padding:8px; background:#1976d2; color:white; border:none; border-radius:6px; cursor:pointer;">
                    Fill From Google Sheet
                </button>
            </div>

            <div id="excelSection" style="display:none;">
                <div id="dropZone" style="border:2px dashed #999; border-radius:8px; padding:20px 10px; min-height:70px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#666; cursor:pointer; margin-bottom:8px; transition:background 0.15s, border-color 0.15s;">
                    <div id="dropZoneLabel">Drag file here or click to choose</div>
                    <div id="excelStatus" style="min-height:14px; margin-top:6px; color:#666; font-size:11px;"></div>
                    <input id="priceExcelFile" type="file" accept=".xlsx,.xls,.csv" style="display:none;">
                </div>

                <label>Sheet</label>
                <select id="sheetSelect" style="width:100%; margin-bottom:8px;"></select>

                <label>Platform</label>
                <select id="filterValueSelect" style="width:100%; margin-bottom:8px;"></select>

                <button id="excelFillBtn" style="width:100%; padding:8px; background:#673ab7; color:white; border:none; border-radius:6px; cursor:pointer;">
                    Fill From Excel
                </button>
            </div>
        `;

        document.body.appendChild(panel);

        btn.onclick = () => {
            if (panel.style.display === "none") {
                panel.style.display = "block";
                panel.style.left = (btn.offsetLeft - panel.offsetWidth + btn.offsetWidth) + "px";
                panel.style.top = (btn.offsetTop - panel.offsetHeight - 10) + "px";
            } else {
                panel.style.display = "none";
            }
        };

        document.getElementById("modeSelect").addEventListener("change", switchMode);
        document.getElementById("googleFillBtn").addEventListener("click", fillFromGoogle);
        document.getElementById("priceExcelFile").addEventListener("change", handleExcelFile);
        document.getElementById("sheetSelect").addEventListener("change", loadSelectedSheet);
        document.getElementById("excelFillBtn").addEventListener("click", fillFromExcel);
        setupDropZone();
    }

    function setupDropZone() {
        const dropZone = document.getElementById("dropZone");
        const fileInput = document.getElementById("priceExcelFile");

        dropZone.addEventListener("click", () => fileInput.click());

        ["dragenter", "dragover"].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.background = "#e3f2fd";
                dropZone.style.borderColor = "#1976d2";
            });
        });

        ["dragleave", "dragend"].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.background = "";
                dropZone.style.borderColor = "#999";
            });
        });

        dropZone.addEventListener("drop", e => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.background = "";
            dropZone.style.borderColor = "#999";

            const file = e.dataTransfer?.files?.[0];
            if (!file) return;

            // Keep the native input in sync so handleExcelFile can read
            // from e.target.files the same way it does for click-to-browse.
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;

            handleExcelFile({ target: fileInput });
        });
    }

    function switchMode() {
        const mode = document.getElementById("modeSelect").value;

        document.getElementById("googleSection").style.display =
            mode === "google" ? "block" : "none";

        document.getElementById("excelSection").style.display =
            mode === "excel" ? "block" : "none";

        const btn = document.getElementById("priceToolsBtn");
        const panel = document.getElementById("priceToolsPanel");

        panel.style.top = (btn.offsetTop - panel.offsetHeight - 10) + "px";
    }

    function makeDraggable(btn) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        btn.addEventListener("mousedown", e => {
            isDragging = true;
            offsetX = e.clientX - btn.offsetLeft;
            offsetY = e.clientY - btn.offsetTop;
        });

        document.addEventListener("mousemove", e => {
            if (!isDragging) return;

            btn.style.left = (e.clientX - offsetX) + "px";
            btn.style.top = (e.clientY - offsetY) + "px";
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
        });
    }

    function fetchCSV(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: res => {
                    if (res.status >= 200 && res.status < 300) {
                        resolve(res.responseText);
                    } else {
                        reject(new Error(`HTTP ${res.status} fetching price sheet`));
                    }
                },
                onerror: err => reject(err)
            });
        });
    }

    async function fillFromGoogle() {
        const googleBtn = document.getElementById("googleFillBtn");
        const originalLabel = googleBtn.textContent;

        try {
            googleBtn.disabled = true;
            googleBtn.textContent = "Loading...";

            const text = await fetchCSV(GOOGLE_CSV_URL);
            priceMap = {};

            text.split(/\r?\n/).forEach(line => {
                if (!line.trim()) return;

                const cols = parseCSVLine(line);

                const ean = clean(cols[1]); // Google Sheet Col B
                const price = clean(cols[6]).replace(/[^\d.]/g, ""); // Google Sheet Col G

                if (/^\d{8,14}$/.test(ean) && price) {
                    priceMap[ean] = price;
                }
            });

            fillTablePrices();

        } catch (err) {
            alert("Error loading Google Sheet price list.");
            console.error(err);
        } finally {
            googleBtn.disabled = false;
            googleBtn.textContent = originalLabel;
        }
    }

    function handleExcelFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById("excelStatus");
        const fileInput = document.getElementById("priceExcelFile");
        const dropZoneLabel = document.getElementById("dropZoneLabel");

        currentFileIsCSV = file.name.toLowerCase().endsWith(".csv");

        dropZoneLabel.textContent = file.name;
        statusEl.textContent = "Reading " + file.name + "...";
        fileInput.disabled = true;

        const reader = new FileReader();

        reader.onload = function (evt) {
            currentFileData = evt.target.result;

            try {
                // PHASE 1: cheap peek — sheet names only, no cell parsing at all.
                // This is what makes a multi-sheet 9MB file instant instead of 9s:
                // we no longer parse every sheet just to populate the dropdown.
                const peek = XLSX.read(currentFileData, {
                    type: currentFileIsCSV ? "string" : "array",
                    bookSheets: true
                });

                buildSheetDropdown(peek.SheetNames);
                statusEl.textContent = "Loaded " + file.name;

                // PHASE 2: real parse, but only for the sheet that's selected.
                loadSelectedSheet();
            } catch (err) {
                statusEl.textContent = "Failed to parse file.";
                alert("Error reading Excel/CSV file.");
                console.error(err);
            } finally {
                fileInput.disabled = false;
            }
        };

        reader.onerror = function () {
            statusEl.textContent = "Failed to read file.";
            fileInput.disabled = false;
        };

        if (currentFileIsCSV) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }

    function buildSheetDropdown(sheetNames) {
        const sheetSelect = document.getElementById("sheetSelect");
        sheetSelect.innerHTML = "";

        sheetNames.forEach(name => {
            sheetSelect.add(new Option(name, name));
        });

        // Default to the second sheet when one exists, otherwise fall back to the first.
        sheetSelect.selectedIndex = sheetNames.length > 1 ? 1 : 0;
    }

    function loadSelectedSheet() {
        if (!currentFileData) return;

        const sheetName = document.getElementById("sheetSelect").value;
        if (!sheetName) return;

        const statusEl = document.getElementById("excelStatus");
        statusEl.textContent = "Parsing sheet \"" + sheetName + "\"...";

        // Only this one sheet gets fully parsed (cells, values) — every other
        // sheet in the workbook is left untouched.
        workbook = XLSX.read(currentFileData, {
            type: currentFileIsCSV ? "string" : "array",
            sheets: [sheetName],
            ...FAST_PARSE_OPTS
        });

        const sheet = workbook.Sheets[sheetName];

        excelRows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
            raw: false
        });

        buildFilterValues();
        statusEl.textContent = "Ready (" + (excelRows.length - 1) + " rows)";
    }

    function buildFilterValues() {
        const filterCol = 1; // Excel Col B
        const filterValueSelect = document.getElementById("filterValueSelect");

        filterValueSelect.innerHTML = "";

        const values = new Set();

        excelRows.slice(1).forEach(row => {
            const value = clean(row[filterCol]);
            if (value) values.add(value);
        });

        const priorityOrder = ["shopee", "lazada", "tiktok", "amazon"];

        const sortedValues = [...values].sort((a, b) => {
            const aIndex = priorityOrder.indexOf(a.toLowerCase());
            const bIndex = priorityOrder.indexOf(b.toLowerCase());

            const aRank = aIndex === -1 ? priorityOrder.length : aIndex;
            const bRank = bIndex === -1 ? priorityOrder.length : bIndex;

            if (aRank !== bRank) return aRank - bRank;

            // Both unmatched (or same priority tier) — fall back to alphabetical
            return a.localeCompare(b);
        });

        sortedValues.forEach(value => {
            filterValueSelect.add(new Option(value, value));
        });
    }

    function fillFromExcel() {
        if (!excelRows.length) {
            alert("Upload Excel first.");
            return;
        }

        const filterCol = 1; // Excel Col B
        const eanCol = 4;    // Excel Col E
        const filterValue = document.getElementById("filterValueSelect").value;

        priceMap = {};

        excelRows.slice(1).forEach(row => {
            const rowFilterValue = clean(row[filterCol]);

            if (rowFilterValue !== filterValue) {
                return;
            }

            const ean = clean(row[eanCol]);
            let price = clean(row[8]).replace(/[^\d.]/g, ""); // Col I

            if (!price) {
                price = clean(row[7]).replace(/[^\d.]/g, ""); // Col H
            }

            if (/^\d{8,14}$/.test(ean) && price) {
                priceMap[ean] = price;
            }
        });

        if (Object.keys(priceMap).length === 0) {
            alert("No matching rows found for that filter — check the Platform selection.");
            return;
        }

        fillTablePrices();
    }

    // Sets a value on a native input in a way React (and other frameworks that
    // override the native value setter to track state) will actually notice.
    function setNativeInputValue(input, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, "value"
        ).set;

        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function fillTablePrices() {
        let matched = 0;
        const missing = [];

        document.querySelectorAll("tbody tr").forEach(row => {
            const cells = row.querySelectorAll("td");

            const ean = cells[TABLE_EAN_COL_INDEX]?.innerText.trim();
            const priceInput =
                cells[TABLE_PRICE_COL_INDEX]?.querySelector("input[name='unitprice']");

            if (!ean || !priceInput) return;

            const price = priceMap[ean];

            if (price) {
                priceInput.focus();
                setNativeInputValue(priceInput, price);
                priceInput.blur();
                matched++;
            } else {
                cells[TABLE_EAN_COL_INDEX].style.background = "#ffccc7";
                missing.push(ean);
            }
        });

        document.activeElement?.blur();

        alert(`Filled ${matched} prices.\nMissing ${missing.length} EANs.`);
        console.log("Missing EANs:", missing);
    }

    // RFC4180-aware CSV line parser: handles quoted fields containing commas
    // and escaped double quotes ("" inside a quoted field = literal ").
    function parseCSVLine(line) {
        const result = [];
        let current = "";
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (insideQuotes) {
                if (char === '"') {
                    if (line[i + 1] === '"') {
                        current += '"';
                        i++; // skip the escaped quote's pair
                    } else {
                        insideQuotes = false;
                    }
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    insideQuotes = true;
                } else if (char === ",") {
                    result.push(current);
                    current = "";
                } else {
                    current += char;
                }
            }
        }

        result.push(current);
        return result;
    }

    function clean(value) {
        return String(value || "")
            .trim()
            .replace(/^"|"$/g, "");
    }
})();
