
(function () {
    'use strict';

    const GOOGLE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIW6M5LlGnAjkmxLDeZPWonnJWTb0YW4-lw0FRhYst8zfHbTDrQmsNqacBWIcn0BFDRmIIbHBNHqfn/pub?output=csv";

    const TABLE_EAN_COL_INDEX = 5;
    const TABLE_PRICE_COL_INDEX = 8;

    const AUTO_CLOSE_DELAY_MS = 5000;

    const FAST_PARSE_OPTS = {
        cellStyles: false,
        cellHTML: false,
        cellFormula: false,
        cellDates: false,
        sheetStubs: false,
        bookVBA: false,
        raw: false
    };

    let workbook = null;
    let excelRows = [];
    let priceMap = {};

    let currentFileData = null;
    let currentFileIsCSV = false;
    let autoCloseTimer = null;

    if (/(\/assets\/imei\.html|\/imeiprint\/)/.test(location.pathname + location.search + location.hash)) {
        return;
    }

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

        const container = document.createElement("div");
        container.id = "priceToolsContainer";
        container.style.position = "fixed";
        container.style.zIndex = "999999";
        container.style.right = "20px";
        container.style.bottom = "20px";
        document.body.appendChild(container);

        const btn = document.createElement("button");
        btn.id = "priceToolsBtn";
        btn.textContent = "$";
        btn.style.position = "relative";
        btn.style.display = "block";
        btn.style.marginLeft = "auto";
        btn.style.padding = "8px 14px";
        btn.style.background = "#1976d2";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "8px";
        btn.style.fontSize = "12px";
        btn.style.cursor = "pointer";

        container.appendChild(btn);

        makeContainerDraggable(container, btn);

        const panel = document.createElement("div");
        panel.id = "priceToolsPanel";
        panel.style.position = "absolute";
        panel.style.right = "0";
        panel.style.bottom = "100%";
        panel.style.marginBottom = "10px";
        panel.style.width = "300px";
        panel.style.padding = "12px";
        panel.style.background = "white";
        panel.style.border = "1px solid #ccc";
        panel.style.borderRadius = "10px";
        panel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
        panel.style.fontSize = "12px";
        panel.style.display = "none";

        panel.innerHTML = `
            <div id="panelDragHandle" style="cursor:move; font-weight:bold; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid #eee;">
                Price Tools
            </div>
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

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <label style="margin-bottom:0;">Sheet</label>
                    <span id="sheetCountLabel" style="font-size:11px; color:#666;"></span>
                </div>
                <select id="sheetSelect" style="width:100%; margin-bottom:8px;"></select>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <label style="margin-bottom:0;">Platform</label>
                    <span id="platformCountLabel" style="font-size:11px; color:#666;"></span>
                </div>
                <select id="filterValueSelect" style="width:100%; margin-bottom:6px;"></select>

                <div id="redChipsContainer" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; max-height:90px; overflow-y:auto; font-size:11px;"></div>

                <button id="enterItemsBtn" style="width:100%; padding:8px; background:#00897b; color:white; border:none; border-radius:6px; cursor:pointer; margin-bottom:6px;">
                    Populate table
                </button>

                <button id="fillPricesBtn" style="width:100%; padding:8px; background:#673ab7; color:white; border:none; border-radius:6px; cursor:pointer; margin-bottom:6px; display:none;">
                    Fill prices
                </button>
            </div>

            <div id="fillResultStatus" style="margin-top:8px; font-size:11px; color:#333; line-height: 1.4; min-height:14px;"></div>
        `;

        container.appendChild(panel);

        btn.onclick = () => {
            if (panel.style.display === "none") {
                openPanel();
            } else {
                closePanel();
            }
        };

        document.getElementById("modeSelect").addEventListener("change", switchMode);
        document.getElementById("googleFillBtn").addEventListener("click", fillFromGoogle);
        document.getElementById("priceExcelFile").addEventListener("change", handleExcelFile);
        document.getElementById("sheetSelect").addEventListener("change", loadSelectedSheet);
        document.getElementById("filterValueSelect").addEventListener("change", onPlatformChange);
        document.getElementById("enterItemsBtn").addEventListener("click", enterItems);
        document.getElementById("fillPricesBtn").addEventListener("click", fillPricesAccordingly);

        setupDropZone();
        setupAutoClose(btn, panel);
        setupDialogVisibility(btn, panel);
        makePanelHeaderDraggable(container);
    }

    function hideFillPricesButton() {
        const fillBtn = document.getElementById("fillPricesBtn");
        if (fillBtn) fillBtn.style.display = "none";
    }

    function revealFillPricesButton() {
        const fillBtn = document.getElementById("fillPricesBtn");
        if (fillBtn) fillBtn.style.display = "block";
    }

    function onPlatformChange() {
        clearStatusDisplay();
        hideFillPricesButton();
        updateCounts();
        updateRedChips();
    }

    function clearStatusDisplay() {
        const statusEl = document.getElementById("fillResultStatus");
        if (statusEl) {
            statusEl.innerHTML = "";
        }
    }

    function updateCounts() {
        const sheetCountEl = document.getElementById("sheetCountLabel");
        const platformCountEl = document.getElementById("platformCountLabel");
        if (!sheetCountEl || !platformCountEl) return;

        if (!excelRows.length) {
            sheetCountEl.textContent = "";
            platformCountEl.textContent = "";
            return;
        }

        const totalRows = excelRows.slice(1).filter(row => {
            const category = String(row[1] || "").trim();
            const ean = String(row[4] || "").trim();
            const itemCode = String(row[5] || "").trim();
            return category !== "" || ean !== "" || itemCode !== "";
        }).length;

        sheetCountEl.textContent = totalRows + " items";

        const selectedPlatform = document.getElementById("filterValueSelect").value;
        const platformRows = excelRows.slice(1).filter(row => {
            const rowCategory = normalizeCategory(String(row[1] || "").trim());
            const category = String(row[1] || "").trim();
            const ean = String(row[4] || "").trim();
            const itemCode = String(row[5] || "").trim();
            const isValid = category !== "" || ean !== "" || itemCode !== "";
            return isValid && rowCategory === selectedPlatform;
        }).length;

        platformCountEl.textContent = platformRows + " items";
    }

    function makeContainerDraggable(container, dragTrigger) {
        let isDragging = false;
        let hasDragged = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        function startDrag(e) {
            isDragging = true;
            hasDragged = false;
            startX = e.clientX;
            startY = e.clientY;

            const rect = container.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            container.style.right = "auto";
            container.style.bottom = "auto";
            container.style.left = initialLeft + "px";
            container.style.top = initialTop + "px";

            cancelAutoClose();
        }

        function onDrag(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;

            container.style.left = (initialLeft + dx) + "px";
            container.style.top = (initialTop + dy) + "px";
        }

        function stopDrag() {
            if (!isDragging) return;
            isDragging = false;

            const panel = document.getElementById("priceToolsPanel");
            if (!container.matches(":hover")) {
                if (panel.style.display !== "none") scheduleAutoClose();
            }
        }

        dragTrigger.addEventListener("mousedown", e => {
            startDrag(e);
            e.preventDefault();
        });
        document.addEventListener("mousemove", onDrag);
        document.addEventListener("mouseup", stopDrag);

        dragTrigger.addEventListener("click", e => {
            if (hasDragged) {
                e.stopPropagation();
                e.preventDefault();
            }
        }, true);
    }

    function makePanelHeaderDraggable(container) {
        const handle = document.getElementById("panelDragHandle");
        if (!handle) return;
        makeContainerDraggable(container, handle);
    }

    function openPanel() {
        const panel = document.getElementById("priceToolsPanel");
        panel.style.display = "block";
        cancelAutoClose();
    }

    function closePanel() {
        const panel = document.getElementById("priceToolsPanel");
        panel.style.display = "none";
        cancelAutoClose();
    }

    function scheduleAutoClose() {
        cancelAutoClose();
        autoCloseTimer = setTimeout(() => {
            closePanel();
        }, AUTO_CLOSE_DELAY_MS);
    }

    function cancelAutoClose() {
        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
        }
    }

    function setupAutoClose(btn, panel) {
        [btn, panel].forEach(el => {
            el.addEventListener("mouseenter", cancelAutoClose);
            el.addEventListener("mouseleave", () => {
                if (panel.style.display !== "none") {
                    scheduleAutoClose();
                }
            });
        });
    }

    function getForeignDialogs() {
        const dialogs = [...document.querySelectorAll('div.ui-dialog, .ui-dialog, .p-dialog')];
        return dialogs.filter(d => {
            const computed = window.getComputedStyle(d);
            if (computed.display === 'none' || computed.visibility === 'hidden') return false;
            return true;
        });
    }

    function setupDialogVisibility(btn, panel) {
        const container = document.getElementById("priceToolsContainer");

        function updateVisibilityForDialogs() {
            const hasForeignDialog = getForeignDialogs().length > 0;

            if (hasForeignDialog) {
                if (panel.style.display !== "none") {
                    closePanel();
                }
                container.style.display = "none";
            } else {
                container.style.display = "";
            }
        }

        updateVisibilityForDialogs();

        const dialogObserver = new MutationObserver(updateVisibilityForDialogs);
        dialogObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        setInterval(updateVisibilityForDialogs, 400);

        window.addEventListener('beforeprint', () => { container.style.display = 'none'; });
        window.addEventListener('afterprint', updateVisibilityForDialogs);
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

        hideFillPricesButton();
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

                const ean = clean(cols[1]);
                const price = clean(cols[6]).replace(/[^\d.]/g, "");

                if (/^\d{8,14}$/.test(ean) && price) {
                    priceMap[ean] = price;
                }
            });

            const res = fillTablePrices();
            updateStatusDisplay(res.matched, res.missingCount);

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
        hideFillPricesButton();

        const reader = new FileReader();

        reader.onload = function (evt) {
            currentFileData = evt.target.result;

            try {
                const peek = XLSX.read(currentFileData, {
                    type: currentFileIsCSV ? "string" : "array",
                    bookSheets: true
                });

                buildSheetDropdown(peek.SheetNames);
                statusEl.textContent = "Loaded " + file.name;

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

        sheetSelect.selectedIndex = sheetNames.length > 1 ? 1 : 0;
    }

    function loadSelectedSheet() {
        if (!currentFileData) return;

        const sheetName = document.getElementById("sheetSelect").value;
        if (!sheetName) return;

        const statusEl = document.getElementById("excelStatus");
        statusEl.textContent = "Parsing sheet \"" + sheetName + "\"...";
        hideFillPricesButton();

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
        updateCounts();

        const actualRowsCount = excelRows.slice(1).filter(row => {
            const category = String(row[1] || "").trim();
            const ean = String(row[4] || "").trim();
            const itemCode = String(row[5] || "").trim();
            return category !== "" || ean !== "" || itemCode !== "";
        }).length;

        statusEl.textContent = "Ready (" + actualRowsCount + " rows)";
    }

    function normalizeCategory(raw) {
        if (!raw) return null;
        let v = raw.toLowerCase().trim();
        v = v.replace(/[- ]?(ninja van|j&t|jt|singpost|singapore post|dhl|fedex|pos laju)/g, '');
        if (v.includes('shopee')) return 'Shopee';
        if (v.includes('lazada')) return 'Lazada';
        if (v.includes('amazon')) return 'Amazon';
        if (v.includes('tiktok')) return 'TikTok';
        return v.split(' ')
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    function buildFilterValues() {
        const filterCol = 1; // Excel Col B
        const filterValueSelect = document.getElementById("filterValueSelect");

        filterValueSelect.innerHTML = "";

        const values = new Set();

        excelRows.slice(1).forEach(row => {
            const value = normalizeCategory(String(row[filterCol] || "").trim());
            if (value) values.add(value);
        });

        const priorityOrder = ["Shopee", "Lazada", "TikTok", "Amazon"];

        const sortedValues = [...values].sort((a, b) => {
            const aIndex = priorityOrder.indexOf(a);
            const bIndex = priorityOrder.indexOf(b);

            const aRank = aIndex === -1 ? priorityOrder.length : aIndex;
            const bRank = bIndex === -1 ? priorityOrder.length : bIndex;

            if (aRank !== bRank) return aRank - bRank;
            return a.localeCompare(b);
        });

        sortedValues.forEach(value => {
            filterValueSelect.add(new Option(value, value));
        });

        updateCounts();
        updateRedChips();
    }

    function updateRedChips() {
        const container = document.getElementById("redChipsContainer");
        if (!container) return;
        container.innerHTML = "";

        if (!excelRows.length) return;

        const filterValue = document.getElementById("filterValueSelect").value;
        const redItemsCount = {};

        excelRows.slice(1).forEach(row => {
            const rowCategory = normalizeCategory(String(row[1] || "").trim());
            if (rowCategory !== filterValue) return;

            const val = String(row[5] || "").trim(); // Excel Col F (index 5)
            if (/^\d+$/.test(val)) {
                redItemsCount[val] = (redItemsCount[val] || 0) + 1;
            }
        });

        const entries = Object.entries(redItemsCount).sort((a, b) => b[1] - a[1]);

        if (entries.length === 0) {
            container.innerHTML = `<span style="color:#888; font-style:italic;">No accessories</span>`;
            return;
        }

        entries.forEach(([k, v]) => {
            const chip = document.createElement("span");
            chip.style.background = "#ffebee";
            chip.style.border = "1px solid #ef9a9a";
            chip.style.color = "#c62828";
            chip.style.padding = "2px 6px";
            chip.style.borderRadius = "4px";
            chip.style.fontWeight = "bold";
            chip.textContent = `${k} (${v})`;
            container.appendChild(chip);
        });
    }

    // STEP 1: Enter Items (Serials and Accessories population)
    // NOTE: accessories are now aggregated by code -> qty, so duplicate codes
    // produce a single table row with a summed quantity instead of one row per occurrence.
    function enterItems() {
        if (!excelRows.length) {
            alert("Upload Excel first.");
            return;
        }

        const filterValue = document.getElementById("filterValueSelect").value;
        const serials = [];
        const accessoryCounts = new Map(); // code -> qty

        excelRows.slice(1).forEach(row => {
            const rowCategory = normalizeCategory(String(row[1] || "").trim());
            if (rowCategory !== filterValue) return;

            const val = String(row[5] || "").trim();

            if (/[A-Za-z]/.test(val) && /\d/.test(val)) {
                serials.push(val);
            }

            if (/^\d+$/.test(val)) {
                accessoryCounts.set(val, (accessoryCounts.get(val) || 0) + 1);
            }
        });

        const accessoriesList = [...accessoryCounts.entries()].map(([code, qty]) => ({ code, qty }));

        if (serials.length === 0 && accessoriesList.length === 0) {
            alert(`No items or serial numbers found for ${filterValue}.`);
            return;
        }

        if (serials.length > 0) {
            let serialBtn = null;
            document.querySelectorAll("button span.ui-button-text").forEach(span => {
                if (span.textContent.trim() === "串号") {
                    serialBtn = span.closest("button");
                }
            });

            if (serialBtn) {
                serialBtn.click();
                setTimeout(() => {
                    const iframe = document.querySelector("iframe[src*='imei.html']");
                    if (iframe) {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            const inputField = iframeDoc.querySelector("input");
                            if (inputField) {
                                const combinedSerials = serials.join(',');
                                setNativeInputValue(inputField, combinedSerials);
                                inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                                inputField.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                                inputField.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

                                setTimeout(() => {
                                    let confirmBtn = null;
                                    document.querySelectorAll(".ui-dialog-buttonpane button").forEach(b => {
                                        if (b.textContent.includes("确定")) confirmBtn = b;
                                    });
                                    if (confirmBtn) confirmBtn.click();

                                    setTimeout(() => {
                                        processAccessoriesTableOnly(accessoriesList);
                                    }, 600);
                                }, 800);
                            }
                        } catch (e) {
                            console.error("Error accessing iframe content:", e);
                        }
                    }
                }, 700);
            } else {
                processAccessoriesTableOnly(accessoriesList);
            }
        } else {
            processAccessoriesTableOnly(accessoriesList);
        }
    }

    function processAccessoriesTableOnly(items) {
        let peijianTab = null;
        document.querySelectorAll("ul.table-tap li a").forEach(a => {
            if (a.textContent.trim() === "配件") {
                peijianTab = a;
            }
        });

        if (!peijianTab) {
            revealFillPricesButton();
            return;
        }
        peijianTab.click();

        setTimeout(() => {
            if (items.length === 0) {
                revealFillPricesButton();
                return;
            }
            let index = 0;

            function populateNextCode() {
                if (index >= items.length) {
                    setTimeout(() => {
                        fillAccessoryQuantitiesOnly(items);
                    }, 800);
                    return;
                }

                let rows = document.querySelectorAll("div.receipt-table tbody tr, .ui-table-scrollable-body-table tbody tr");
                let row = rows[index];

                if (!row) {
                    let addBtn = null;
                    document.querySelectorAll("button, a").forEach(el => {
                        if (el.textContent.includes("增行") || el.textContent.includes("添加") || el.textContent.includes("Add")) {
                            addBtn = el;
                        }
                    });
                    if (addBtn) {
                        addBtn.click();
                        setTimeout(() => {
                            rows = document.querySelectorAll("div.receipt-table tbody tr, .ui-table-scrollable-body-table tbody tr");
                            row = rows[index];
                            writeCodeToRow(row, items[index]);
                        }, 400);
                        return;
                    }
                }

                writeCodeToRow(row, items[index]);
            }

            function writeCodeToRow(row, item) {
                if (row) {
                    const cells = row.querySelectorAll("td");
                    if (cells.length > 1) {
                        const codeInput = cells[1].querySelector("input");
                        if (codeInput) {
                            setNativeInputValue(codeInput, item.code);
                            codeInput.focus();
                            codeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                            codeInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                            codeInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                            codeInput.blur();
                        }
                    }
                }
                index++;
                setTimeout(populateNextCode, 400);
            }

            populateNextCode();
        }, 500);
    }

    function fillAccessoryQuantitiesOnly(items) {
        setTimeout(() => {
            const rows = document.querySelectorAll("div.receipt-table tbody tr, .ui-table-scrollable-body-table tbody tr");
            items.forEach((item, index) => {
                const row = rows[index];
                if (!row) return;
                const cells = row.querySelectorAll("td");
                const qtyInput = cells[6]?.querySelector("input") || row.querySelector("input[prop='pInt']");
                if (qtyInput && item.qty) {
                    setNativeInputValue(qtyInput, String(item.qty));
                }
            });
            console.log("Accessory items and quantities entered.");
            revealFillPricesButton();
        }, 400);
    }

    // STEP 2: Fill Prices Accordingly
    function fillPricesAccordingly() {
        if (!excelRows.length) {
            alert("Upload Excel first.");
            return;
        }

        const eanCol = 4; // Excel Col E
        const filterValue = document.getElementById("filterValueSelect").value;

        priceMap = {};
        const accessoriesList = [];

        excelRows.slice(1).forEach(row => {
            const rowCategory = normalizeCategory(String(row[1] || "").trim());
            if (rowCategory !== filterValue) return;

            const ean = clean(row[eanCol]);
            let price = clean(row[8]).replace(/[^\d.]/g, ""); // Col I
            if (!price) {
                price = clean(row[7]).replace(/[^\d.]/g, ""); // Col H
            }

            if (/^\d{8,14}$/.test(ean) && price) {
                priceMap[ean] = price;
            }

            const accCode = String(row[5] || "").trim();
            if (/^\d+$/.test(accCode)) {
                priceMap[accCode] = price || "";
                accessoriesList.push({
                    code: accCode,
                    price: price || ""
                });
            }
        });

        let shangpinTab = null;
        document.querySelectorAll("ul.table-tap li a").forEach(a => {
            if (a.textContent.trim() === "商品") {
                shangpinTab = a;
            }
        });

        if (shangpinTab) shangpinTab.click();

        setTimeout(() => {
            const prodRes = fillTablePrices();

            setTimeout(() => {
                let peijianTab = null;
                document.querySelectorAll("ul.table-tap li a").forEach(a => {
                    if (a.textContent.trim() === "配件") {
                        peijianTab = a;
                    }
                });

                if (peijianTab) {
                    peijianTab.click();
                    setTimeout(() => {
                        fillPeijianPricesFromTable(prodRes.matched, prodRes.missingCount);
                    }, 500);
                } else {
                    updateStatusDisplay(prodRes.matched, prodRes.missingCount, 0, 0);
                }
            }, 500);
        }, 300);
    }

    function fillPeijianPricesFromTable(prodMatched, prodMissing) {
        let accMatched = 0;
        let accMissing = 0;

        document.querySelectorAll("div.receipt-table tbody tr, .ui-table-scrollable-body-table tbody tr").forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 8) return;

            const codeCell = cells[1];
            const priceInput = cells[7]?.querySelector("input[name='unitprice']") || row.querySelector("input[name='unitprice']");

            if (codeCell && priceInput) {
                const codeSpan = codeCell.querySelector("span");
                const code = codeSpan ? codeSpan.innerText.trim() : codeCell.innerText.trim();

                if (code) {
                    const price = priceMap[code];
                    if (price) {
                        priceInput.focus();
                        setNativeInputValue(priceInput, price);
                        priceInput.blur();
                        accMatched++;
                    } else {
                        accMissing++;
                    }
                }
            }
        });

        document.activeElement?.blur();
        updateStatusDisplay(prodMatched, prodMissing, accMatched, accMissing);
    }

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

        document.querySelectorAll("div.receipt-table tbody tr, .ui-table-scrollable-body-table tbody tr").forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 9) return;

            const eanCell = cells[TABLE_EAN_COL_INDEX];
            const priceInput = cells[TABLE_PRICE_COL_INDEX]?.querySelector("input[name='unitprice']");

            if (eanCell && priceInput) {
                const ean = eanCell.innerText.trim();
                if (ean) {
                    const price = priceMap[ean];
                    if (price) {
                        priceInput.focus();
                        setNativeInputValue(priceInput, price);
                        priceInput.blur();
                        matched++;
                    } else {
                        eanCell.style.background = "#ffccc7";
                        missing.push(ean);
                    }
                }
            }
        });

        document.activeElement?.blur();
        return { matched, missingCount: missing.length };
    }

    function updateStatusDisplay(prodMatched, prodMissing, accMatched = 0, accMissing = 0) {
        const statusEl = document.getElementById("fillResultStatus");
        if (!statusEl) return;

        let html = `<div>Product price: Filled ${prodMatched}, missing ${prodMissing}</div>`;
        if (accMatched > 0 || accMissing > 0) {
            html += `<div>Accessory price: Filled ${accMatched}, missing ${accMissing}</div>`;
        }

        statusEl.innerHTML = html;
        statusEl.style.color = (prodMissing > 0 || accMissing > 0) ? "#c62828" : "#2e7d32";
    }

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
                        i++;
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
