// ==UserScript==
// @name         Stock Import Tool
// @namespace    stock-import-tool
// @version      3.10
// @description  Stock import tool
// @match        https://scsm-djifx.lingyingdms.com/manage/receipt/purchasewarehouseorders*
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let excelItems = [];
    let isOpen = false;

    /* =========================================================
       STYLES
    ========================================================= */
    const style = document.createElement("style");
    style.textContent = `
        #wsiContainer {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            user-select: none;
            width: 44px;
            height: 44px;
        }

        #wsiContainer * {
            box-sizing: border-box;
        }

        #wsiBadge {
            width: 44px;
            height: 44px;
            border-radius: 30%;
            background: #e6cf00;
            color: darkslategrey;
            font-weight: bold;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,.3);
            cursor: pointer;
            transition: background-color .2s, transform .15s ease;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 2;
        }
        #wsiBadge:hover { background: #fce303; transform: scale(1.05); }

        #wsiPanel {
            position: absolute;
            background: #fff;
            border: 1px solid #fce303;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,.2);
            width: 380px;
            max-height: 80vh;
            overflow-y: auto;
            overflow-x: hidden;
            z-index: 1;
            font-size: 13px;
            text-align: left;
        }
        #wsiPanel.panel-above { bottom: 50px; top: auto; }
        #wsiPanel.panel-below { top: 50px; bottom: auto; }
        #wsiPanel.panel-align-left { left: 0; right: auto; }
        #wsiPanel.panel-align-right { right: 0; left: auto; }

        .wsi-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            cursor: move;
            padding-bottom: 4px;
            border-bottom: 1px solid #eee;
        }
        .wsi-panel-title {
            font-weight: bold;
            font-size: 14px;
            color: #333;
            flex-grow: 1;
            text-align: center;
            margin-left: 20px;
        }

        .wsi-small-btn {
            background: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 11px;
            cursor: pointer;
            font-weight: normal;
            color: #333;
        }
        .wsi-small-btn:hover { background: #e0e0e0; }

        #wsiDropZone {
            border: 2px dashed #1976d2;
            border-radius: 6px;
            background: #f8f9fa;
            padding: 14px 10px;
            text-align: center;
            cursor: pointer;
            transition: all .2s ease-in-out;
            margin-top: 6px;
        }
        #wsiDropZone:hover { background: #e9ecef; border-color: #1259a3; }
        #wsiDropZone.is-dragover {
            background: #e7effc;
            border-color: #1976d2;
            box-shadow: 0 0 8px rgba(25,118,210,.3);
            transform: scale(1.02);
        }
        #wsiDropZone.has-file {
            border-style: solid;
            border-color: #1976d2;
            background: #eef4fc;
        }
        .wsi-drop-icon { font-size: 22px; margin-bottom: 4px; line-height: 1; }
        .wsi-drop-text { font-size: 12px; color: #495057; font-weight: 500; }
        .wsi-drop-subtext { font-size: 10px; color: #6c757d; margin-top: 2px; }

        .wsi-action-btn {
            width: 100%;
            padding: 8px 12px;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 8px;
            border: none;
            color: white;
            background: #1976d2;
            cursor: pointer;
            text-align: center;
        }
        .wsi-action-btn:hover { background: #1259a3; }
        .wsi-action-btn:disabled { background: #adb5bd; cursor: not-allowed; }
        .wsi-action-btn.wsi-green { background: #198754; }
        .wsi-action-btn.wsi-green:hover { background: #157347; }

        #wsiStatus {
            margin-top: 10px;
            color: #333;
            max-height: 280px;
            overflow-y: auto;
            overflow-x: hidden;
            word-break: break-word;
            white-space: normal;
            text-align: left;
        }

        .wsi-ean-chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 11px;
            font-family: monospace;
            cursor: default;
            background: #fff;
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: left;
        }
        .wsi-ean-chip.wsi-ean-selected { background: #d9f7be; border-color: #198754; color: #1e5e20; }
        .wsi-ean-chip.wsi-ean-missing { background: #fff1f0; border-color: #ffa39e; color: #cf1322; }

        .wsi-initial-chips {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
            width: 100%;
        }

        .wsi-cat-container { margin-top: 8px; }

        .wsi-cat-row {
            display: flex;
            gap: 6px;
        }

        .wsi-cat-box-main { flex: 2; background: #f6ffed; border: 1px solid #b7eb8f; }
        .wsi-cat-box-acc { flex: 1; background: #f6ffed; border: 1px solid #b7eb8f; }
        .wsi-cat-box-missing { background: #fff2f0; border: 1px solid #ffccc7; margin-top: 6px; }

        .wsi-cat-box {
            border-radius: 6px;
            padding: 6px;
            text-align: left;
        }

        .wsi-cat-title {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 6px;
            text-align: left;
        }
        .wsi-cat-title-main { color: #389e0d; }
        .wsi-cat-title-acc { color: #389e0d; }
        .wsi-cat-title-missing { color: #cf1322; }

        .wsi-chip-group-main {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
        }
        .wsi-chip-group-acc {
            display: grid;
            grid-template-columns: 1fr;
            gap: 4px;
        }
        .wsi-chip-group-missing {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
        }
    `;
    document.head.appendChild(style);

    /* =========================================================
       MARKUP
    ========================================================= */
    const container = document.createElement("div");
    container.id = "wsiContainer";
    container.innerHTML = `
        <div id="wsiPanel" class="panel-above panel-align-right" style="display:none;">
            <div class="wsi-panel-header" id="wsiDragHandle">
                <span class="wsi-panel-title">WMS Purchase Import</span>
                <button id="wsiCloseBtn" class="wsi-small-btn" title="Close panel">✕</button>
            </div>

            <div id="wsiDropZone">
                <div class="wsi-drop-icon" id="wsiDropIcon">📁</div>
                <div class="wsi-drop-text" id="wsiDropText"><strong>Click to upload</strong> or drag & drop</div>
                <div class="wsi-drop-subtext">Excel (.xlsx, .xls)</div>
            </div>
            <input id="wsiExcelFile" type="file" accept=".xlsx,.xls" style="display:none">

            <button id="wsiStartBtn" class="wsi-action-btn">Scroll & Select EANs</button>
            <button id="wsiSerialBtn" class="wsi-action-btn wsi-green" style="display:none;">Fill Serials & Qty</button>

            <div id="wsiEanList" style="margin-top:8px;"></div>
            <div id="wsiStatus">Waiting for file...</div>
        </div>
        <div id="wsiBadge" title="Click to toggle Stock Import Tool (drag to move)">IMP</div>
    `;
    document.body.appendChild(container);

    const badge = document.getElementById("wsiBadge");
    const panel = document.getElementById("wsiPanel");
    const dragHandle = document.getElementById("wsiDragHandle");
    const dropZone = document.getElementById("wsiDropZone");
    const dropText = document.getElementById("wsiDropText");
    const fileInput = document.getElementById("wsiExcelFile");
    const statusBox = document.getElementById("wsiStatus");
    const eanListBox = document.getElementById("wsiEanList");
    const startBtn = document.getElementById("wsiStartBtn");
    const serialBtn = document.getElementById("wsiSerialBtn");

    /* =========================================================
       RESET FUNCTIONALITY
    ========================================================= */
    function resetPanelState() {
        excelItems = [];
        eanListBox.innerHTML = "";
        serialBtn.style.display = "none";
        startBtn.style.display = "block";
        setStatus("Parsing file...", "#333");
    }

    /* =========================================================
       PANEL OPEN/CLOSE + POSITIONING
    ========================================================= */
    function updatePanelOrientation() {
        const badgeRect = badge.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (badgeRect.top > vh / 2) {
            panel.classList.remove("panel-below");
            panel.classList.add("panel-above");
        } else {
            panel.classList.remove("panel-above");
            panel.classList.add("panel-below");
        }

        if (badgeRect.left < vw / 2) {
            panel.classList.remove("panel-align-right");
            panel.classList.add("panel-align-left");
        } else {
            panel.classList.remove("panel-align-left");
            panel.classList.add("panel-align-right");
        }
    }

    function clampToWindowBounds() {
        const margin = 10;
        const rect = container.getBoundingClientRect();
        let left = rect.left;
        let top = rect.top;

        left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));

        container.style.right = "auto";
        container.style.bottom = "auto";
        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
    }

    function togglePanel() {
        isOpen = !isOpen;
        if (isOpen) {
            updatePanelOrientation();
            panel.style.display = "block";
            clampToWindowBounds();
        } else {
            panel.style.display = "none";
        }
    }

    document.getElementById("wsiCloseBtn").onclick = () => {
        isOpen = false;
        panel.style.display = "none";
    };

    let isDragging = false;
    let hasDragged = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    function startDrag(e) {
        if (e.target.tagName === "BUTTON" || e.target.closest("#wsiDropZone")) return;

        isDragging = true;
        hasDragged = false;

        const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        const rect = container.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        container.style.right = "auto";
        container.style.bottom = "auto";
        container.style.left = `${initialLeft}px`;
        container.style.top = `${initialTop}px`;

        document.addEventListener("mousemove", onDrag);
        document.addEventListener("mouseup", stopDrag);
        document.addEventListener("touchmove", onDrag, { passive: false });
        document.addEventListener("touchend", stopDrag);
    }

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;

        const dx = clientX - startX;
        const dy = clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;

        const margin = 10;
        let left = initialLeft + dx;
        let top = initialTop + dy;

        left = Math.max(margin, Math.min(left, window.innerWidth - 44 - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - 44 - margin));

        container.style.left = `${left}px`;
        container.style.top = `${top}px`;

        if (isOpen) updatePanelOrientation();
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("mouseup", stopDrag);
        document.removeEventListener("touchmove", onDrag);
        document.removeEventListener("touchend", stopDrag);

        if (!hasDragged) togglePanel();
        if (isOpen) clampToWindowBounds();
    }

    badge.addEventListener("mousedown", startDrag);
    badge.addEventListener("touchstart", startDrag, { passive: false });
    dragHandle.addEventListener("mousedown", startDrag);
    dragHandle.addEventListener("touchstart", startDrag, { passive: false });

    window.addEventListener("resize", () => {
        if (isOpen) {
            updatePanelOrientation();
            clampToWindowBounds();
        }
    });

    /* =========================================================
       FILE UPLOAD
    ========================================================= */
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        if (file) handleFile(file);
    });

    ["dragenter", "dragover"].forEach(evt =>
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("is-dragover");
        })
    );

    ["dragleave", "drop"].forEach(evt =>
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("is-dragover");
        })
    );

    dropZone.addEventListener("drop", (e) => {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        resetPanelState();
        dropZone.classList.add("has-file");
        dropText.innerHTML = `<strong>${escapeHtml(file.name)}</strong>`;

        const reader = new FileReader();

        reader.onload = async function (evt) {
            const data = new Uint8Array(evt.target.result);

            const workbook = XLSX.read(data, {
                type: "array",
                raw: false
            });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            const rows = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                defval: "",
                raw: false
            });

            await parseExcel(rows);
            fileInput.value = ""; // Reset file input so re-uploading the same file triggers change
        };

        reader.readAsArrayBuffer(file);
    }

    /* =========================================================
       MAIN ACTIONS & DROPDOWN SELECTION
    ========================================================= */
    startBtn.addEventListener("click", async () => {
        if (!excelItems.length) {
            setStatus("❌ Upload Excel first", "red");
            return;
        }

        await runFullImportFlow();
    });

    serialBtn.addEventListener("click", executeDataFilling);

    function setStatus(msg, color = "#333") {
        statusBox.style.color = color;
        statusBox.innerHTML = msg;
    }

    async function parseExcel(rows) {
        excelItems = [];

        const deliveryCodes = new Set();

        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];

            const deliveryCode = cleanText(row[0]);       // Col A
            const ean = normalizeEAN(row[5]);             // Col F
            const serial = cleanText(row[8]);             // Col I
            const qty = Number(cleanText(row[9]) || 0);   // Col J

            if (!ean) continue;

            if (deliveryCode) deliveryCodes.add(deliveryCode);

            excelItems.push({
                rowNumber: r + 1,
                deliveryCode,
                ean,
                serial,
                qty
            });
        }

        if (deliveryCodes.size !== 1) {
            setStatus(
                `❌ Delivery Code not same:<br>${[...deliveryCodes].join("<br>")}`,
                "red"
            );
            eanListBox.innerHTML = "";
            return;
        }

        const serialError = excelItems.find(item => item.serial && item.qty !== 1);

        if (serialError) {
            setStatus(
                `❌ Row ${serialError.rowNumber}: has serial but Qty is not 1`,
                "red"
            );
            eanListBox.innerHTML = "";
            return;
        }

        const uniqueEANs = [...new Set(excelItems.map(x => x.ean))];
        const serialRows = excelItems.filter(x => x.serial);
        const deliveryCode = [...deliveryCodes][0];

        const filled = fillRemarkField(deliveryCode);
        await selectDropdownByFieldLabel("入库类型", "正常入库");
        await sleep(300);
        await selectDropdownByFieldLabel("运输方式", "无");

        setStatus(
            `✅ Excel loaded<br>
             Delivery Code: ${deliveryCode} ${filled ? "" : "(⚠️ Remark field not found)"}<br>
             Rows: ${excelItems.length}<br>
             Unique EAN: ${uniqueEANs.length}<br>
             Serial rows: ${serialRows.length}`,
            "green"
        );

        renderInitialEanChips(uniqueEANs);
    }

    async function selectDropdownByFieldLabel(labelText, optionText) {
        const labels = [...document.querySelectorAll("label")];
        const labelEl = labels.find(l => l.textContent.includes(labelText));

        if (!labelEl) {
            return { ok: false, reason: `Label containing "${labelText}" not found` };
        }

        const container = labelEl.closest("div.ui-g-3, div.ui-g-6, div.ui-g-12, div");
        const pDropdown = container ? container.querySelector("p-dropdown") : null;

        if (!pDropdown) {
            return { ok: false, reason: `p-dropdown element not found for "${labelText}"` };
        }

        const currentLabel = pDropdown.querySelector(".ui-dropdown-label");
        if (currentLabel && currentLabel.textContent.trim() === optionText) {
            return { ok: true, reason: "Already selected" };
        }

        const trigger = pDropdown.querySelector(".ui-dropdown-trigger") || pDropdown.querySelector(".ui-dropdown");
        if (!trigger) {
            return { ok: false, reason: "Dropdown trigger control not found" };
        }

        ["mousedown", "mouseup", "click"].forEach(evtName => {
            trigger.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
        });

        let panel = null;
        for (let i = 0; i < 20; i++) {
            panel = [...document.querySelectorAll(".ui-dropdown-panel")].find(p => {
                const cs = getComputedStyle(p);
                return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
            });
            if (panel) break;
            await sleep(100);
        }

        if (!panel) {
            return { ok: false, reason: "Dropdown overlay panel failed to open" };
        }

        const items = [...panel.querySelectorAll("li.ui-dropdown-item, li")];
        const targetItem = items.find(li => li.textContent.trim() === optionText);

        if (!targetItem) {
            const available = items.map(li => li.textContent.trim()).filter(Boolean).join(", ");
            trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            return { ok: false, reason: `Option "${optionText}" not found (available: ${available || "none"})` };
        }

        ["mousedown", "mouseup", "click"].forEach(evtName => {
            targetItem.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
        });

        await sleep(200);

        return { ok: true, reason: "" };
    }

    function fillRemarkField(value) {
        const input = document.querySelector('input[name="Remark"]');
        if (!input) return false;

        setInputValue(input, value);

        return true;
    }

    /* =========================================================
       EAN CHIPS RENDERING (INITIAL vs CATEGORIZED)
    ========================================================= */
    function renderInitialEanChips(eans) {
        eanListBox.innerHTML = `<div class="wsi-initial-chips">${eans.map(ean =>
            `<span class="wsi-ean-chip" data-ean="${ean}">${ean}</span>`
        ).join("")}</div>`;
    }

    function renderCategorizedEanChips({ mainEANs = [], accEANs = [], missingEANs = [] }) {
        const makeChips = (eans, catClass) => eans.map(ean =>
            `<span class="wsi-ean-chip ${catClass}" data-ean="${ean}">${ean}</span>`
        ).join("");

        const missingBlock = missingEANs.length > 0 ? `
            <div class="wsi-cat-box wsi-cat-box-missing">
                <div class="wsi-cat-title wsi-cat-title-missing">Not found (${missingEANs.length})</div>
                <div class="wsi-chip-group-missing">
                    ${makeChips(missingEANs, "wsi-ean-missing")}
                </div>
            </div>
        ` : "";

        eanListBox.innerHTML = `
            <div class="wsi-cat-container">
                <div class="wsi-cat-row">
                    <div class="wsi-cat-box wsi-cat-box-main">
                        <div class="wsi-cat-title wsi-cat-title-main">商品 (${mainEANs.length})</div>
                        <div class="wsi-chip-group-main">
                            ${makeChips(mainEANs, "wsi-ean-selected")}
                        </div>
                    </div>
                    <div class="wsi-cat-box wsi-cat-box-acc">
                        <div class="wsi-cat-title wsi-cat-title-acc">配件 (${accEANs.length})</div>
                        <div class="wsi-chip-group-acc">
                            ${makeChips(accEANs, "wsi-ean-selected")}
                        </div>
                    </div>
                </div>
                ${missingBlock}
            </div>
        `;
    }

    function getProductPickerDialog() {
        const dialogs = [...document.querySelectorAll("div.ui-dialog, .ui-dialog, .p-dialog")];
        return dialogs.find(d => {
            const cs = getComputedStyle(d);
            if (cs.display === "none" || cs.visibility === "hidden") return false;
            const title = d.querySelector(".ui-dialog-title, .p-dialog-title");
            return title && title.textContent.trim() === "选择商品";
        }) || null;
    }

    function findTabAnchor(label) {
        const anchors = [...document.querySelectorAll("ul.table-tap li a")];
        return anchors.find(a => a.textContent.trim() === label) || null;
    }

    function isTabActive(label) {
        const anchor = findTabAnchor(label);
        if (!anchor) return false;
        const li = anchor.closest("li");
        return !!(li && li.classList.contains("active"));
    }

    async function switchToTab(label) {
        if (isTabActive(label)) return true;

        const anchor = findTabAnchor(label);
        if (!anchor) return false;

        anchor.click();
        await sleep(400);
        return true;
    }

    async function scanAndSelectInOpenDialog(excelEANs, label) {
        const dialog = getProductPickerDialog();

        if (!dialog) {
            setStatus(`❌ [${label}] Could not find the 选择商品 picker dialog`, "red");
            return new Set();
        }

        setStatus(`[${label}] Matching EANs in picker...`);
        await sleep(200);

        const rows = [...dialog.querySelectorAll(".ui-table-scrollable-body-table tbody tr")]
            .filter(tr => tr.querySelectorAll("td").length > 0);

        const foundEANs = new Set();

        for (const row of rows) {
            const cells = [...row.querySelectorAll("td")];
            if (cells.length < 2) continue;

            const tableEAN = normalizeEAN(cells[1].innerText);

            if (excelEANs.has(tableEAN) && !foundEANs.has(tableEAN)) {
                foundEANs.add(tableEAN);

                const checkboxBox =
                    row.querySelector(".ui-chkbox-box") ||
                    row.querySelector(".table-chkbox");

                if (checkboxBox && !checkboxBox.classList.contains("ui-state-active")) {
                    checkboxBox.click();
                }

                row.style.background = "#d9f7be";
            }
        }

        return foundEANs;
    }

    async function waitForProductPickerDialog(maxAttempts = 20) {
        for (let i = 0; i < maxAttempts; i++) {
            const dialog = getProductPickerDialog();
            if (dialog) return dialog;
            await sleep(200);
        }
        return null;
    }

    /* =========================================================
       QUANTITY AUTO-FILL FOR ACCESSORIES (配件)
    ========================================================= */
    function buildEanQtyMap() {
        const map = new Map();
        for (const item of excelItems) {
            if (!item.ean) continue;
            const current = map.get(item.ean) || 0;
            map.set(item.ean, current + (Number(item.qty) || 0));
        }
        return map;
    }

    function findAccItemTable() {
        const tables = [...document.querySelectorAll(".ui-table")];

        for (const uiTable of tables) {
            const headers = [...uiTable.querySelectorAll("thead th")].map(th =>
                th.innerText.replace(/\s+/g, "")
            );

            const eanCol = headers.findIndex(h => h.includes("配件编码") || h.includes("商品编码"));
            const qtyCol = headers.findIndex(h => h.includes("入库数"));

            if (eanCol !== -1 && qtyCol !== -1) {
                const bodyTable =
                    uiTable.querySelector(".ui-table-scrollable-body-table") ||
                    uiTable.querySelector("table");

                if (bodyTable) {
                    return { table: bodyTable, eanCol, qtyCol };
                }
            }
        }
        return null;
    }

    async function fillAccQuantities() {
        await switchToTab("配件");
        await sleep(300);

        const qtyMap = buildEanQtyMap();
        const tableInfo = findAccItemTable();
        if (!tableInfo) return { completed: 0, failed: [] };

        const { table, eanCol, qtyCol } = tableInfo;
        const rows = [...table.querySelectorAll("tbody tr")];
        let completed = 0;
        let failed = [];

        for (const row of rows) {
            const cells = [...row.querySelectorAll("td")];
            if (cells.length <= Math.max(eanCol, qtyCol)) continue;

            const ean = normalizeEAN(cells[eanCol].innerText);
            if (!ean || !qtyMap.has(ean)) continue;

            const targetQty = qtyMap.get(ean);
            const qtyInput = cells[qtyCol].querySelector('input');

            if (qtyInput) {
                setInputValue(qtyInput, targetQty);
                row.style.background = "#d9f7be";
                completed++;
            } else {
                failed.push(ean);
            }
        }
        return { completed, failed };
    }

    function setInputValue(input, val) {
        if (!input) return;
        const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
        ).set;
        nativeSetter.call(input, val);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true }));
    }

    /* =========================================================
       IMPORT FLOW EXECUTION
    ========================================================= */
    async function runFullImportFlow() {
        const allExcelEANs = new Set(excelItems.map(x => x.ean));

        const alreadySelectedMain = new Set(
            [...eanListBox.querySelectorAll(".wsi-chip-group-main .wsi-ean-chip")]
                .map(chip => chip.dataset.ean)
        );
        const alreadySelectedAcc = new Set(
            [...eanListBox.querySelectorAll(".wsi-chip-group-acc .wsi-ean-chip")]
                .map(chip => chip.dataset.ean)
        );

        const alreadySelectedAll = new Set([...alreadySelectedMain, ...alreadySelectedAcc]);

        const eansToSearch = new Set(
            [...allExcelEANs].filter(ean => !alreadySelectedAll.has(ean))
        );

        if (eansToSearch.size === 0) {
            setStatus("✅ All EANs are already selected!", "green");
            serialBtn.style.display = "block";
            return;
        }

        setStatus("Processing 商品 tab...");
        await switchToTab("商品");
        clickChooseProductButton();
        await waitForProductPickerDialog();
        const foundMain = await scanAndSelectInOpenDialog(eansToSearch, "商品");
        clickCloseSelectionButton();
        await sleep(300);

        const eansForAccSearch = new Set(
            [...eansToSearch].filter(ean => !foundMain.has(ean))
        );

        setStatus("Processing 配件 tab...");
        await switchToTab("配件");
        clickChooseProductButton();
        await waitForProductPickerDialog();
        const foundAcc = await scanAndSelectInOpenDialog(eansForAccSearch, "配件");
        clickCloseSelectionButton();
        await sleep(400);

        const allMainEANs = [...new Set([...alreadySelectedMain, ...foundMain])];
        const allAccEANs = [...new Set([...alreadySelectedAcc, ...foundAcc])];
        const selectedSet = new Set([...allMainEANs, ...allAccEANs]);

        const missingEANs = [...allExcelEANs].filter(ean => !selectedSet.has(ean));
        const missingDetails = getMissingDetails(missingEANs);

        setStatus(
            `✅ EAN selection scan done<br>
             商品 found: ${foundMain.size}<br>
             配件 found: ${foundAcc.size}<br>
             Total selected: ${selectedSet.size}<br><br>
             Missing: ${missingEANs.length}<br>
             ${missingDetails}`,
            missingEANs.length ? "red" : "green"
        );

        renderCategorizedEanChips({
            mainEANs: allMainEANs,
            accEANs: allAccEANs,
            missingEANs: missingEANs
        });

        enableMissingEANCopier();

        serialBtn.style.display = missingEANs.length === 0 ? "block" : "none";

        await switchToTab("商品");
    }

    async function executeDataFilling() {
        const previousResult = statusBox.innerHTML;
        const serialMap = buildSerialMap();

        await switchToTab("商品");
        await sleep(300);

        let serialCompleted = 0;
        let serialFailed = [];

        if (serialMap.size > 0) {
            const tableInfo = findPurchaseItemTable();

            if (tableInfo) {
                const { table, eanCol, serialCol } = tableInfo;
                const rows = [...table.querySelectorAll("tbody tr")];

                const matchingRows = rows.filter(row => {
                    const cells = [...row.querySelectorAll("td")];
                    if (cells.length <= Math.max(eanCol, serialCol)) return false;
                    const ean = normalizeEAN(cells[eanCol].innerText);
                    const serials = serialMap.get(ean);
                    return serials && serials.length > 0;
                });

                const totalTargetRows = matchingRows.length;

                for (let index = 0; index < matchingRows.length; index++) {
                    const row = matchingRows[index];
                    const cells = [...row.querySelectorAll("td")];
                    const ean = normalizeEAN(cells[eanCol].innerText);
                    const serials = serialMap.get(ean);

                    const currentStep = index + 1;

                    setStatus(`
                        ${previousResult}
                        <hr>
                        Filling serials...<br>
                        ${currentStep} / ${totalTargetRows}<br><br>
                        Current EAN:<br>${ean}
                    `);

                    row.scrollIntoView({
                        block: "center",
                        behavior: "smooth"
                    });

                    await sleep(300);

                    const clicked = clickSerialIconInRow(row);

                    if (!clicked) {
                        serialFailed.push(ean);
                        continue;
                    }

                    await sleep(800);

                    const ok = await enterSerialsForEAN(serials);

                    if (ok) {
                        serialCompleted++;
                        row.style.background = "#d9f7be";
                    } else {
                        serialFailed.push(ean);
                    }

                    await sleep(500);
                }
            }
        }

        setStatus(`
            ${previousResult}
            <hr>
            Filling 配件 quantities...
        `);

        const accResult = await fillAccQuantities();

        const totalFailed = serialFailed.length + accResult.failed.length;

        setStatus(`
            ${previousResult}
            <hr>
            ✅ <strong>Execution Completed</strong><br><br>
            <strong>Serial Numbers (商品):</strong><br>
            • Success: ${serialCompleted}<br>
            • Failed: ${serialFailed.length} ${serialFailed.length ? `(${serialFailed.join(", ")})` : ""}<br><br>
            <strong>Quantities (配件):</strong><br>
            • Success: ${accResult.completed}<br>
            • Failed: ${accResult.failed.length} ${accResult.failed.length ? `(${accResult.failed.length.join(", ")})` : ""}
        `, totalFailed > 0 ? "red" : "green");
    }

    function buildSerialMap() {
        const map = new Map();

        for (const item of excelItems) {
            if (!item.serial) continue;

            if (!map.has(item.ean)) {
                map.set(item.ean, []);
            }

            map.get(item.ean).push(item.serial);
        }

        return map;
    }

    function findPurchaseItemTable() {
        const tables = [...document.querySelectorAll(".ui-table")];

        for (const uiTable of tables) {
            const headers = [...uiTable.querySelectorAll("thead th")].map(th =>
                th.innerText.replace(/\s+/g, "")
            );

            const eanCol = headers.findIndex(h => h.includes("商品编码"));
            const serialCol = headers.findIndex(h => h.includes("串号"));

            if (eanCol !== -1 && serialCol !== -1) {
                const bodyTable =
                    uiTable.querySelector(".ui-table-scrollable-body-table") ||
                    uiTable.querySelector("table");

                if (bodyTable) {
                    return {
                        table: bodyTable,
                        eanCol,
                        serialCol
                    };
                }
            }
        }

        return null;
    }

    async function enterSerialsForEAN(serials) {
        const input = await waitForSerialInput();

        if (!input) return false;

        input.focus();
        setInputValue(input, serials.join(","));

        await sleep(300);

        const addBtn = [...document.querySelectorAll("span.ui-button-text.ui-clickable")]
            .find(x => x.textContent.trim() === "添加");

        if (!addBtn) return false;

        addBtn.click();

        await sleep(500);

        const okBtn = [...document.querySelectorAll("span.ui-button-text.ui-clickable")]
            .find(x => x.textContent.trim() === "确定");

        if (!okBtn) return false;

        okBtn.click();

        await sleep(600);

        return true;
    }

    async function waitForSerialInput() {
        for (let i = 0; i < 25; i++) {
            const input = document.querySelector('input[name="imeicode"]');

            if (input) return input;

            await sleep(300);
        }

        return null;
    }

    function getMissingDetails(missingEANs) {
        if (!missingEANs.length) return "";

        let html = `
            <table style="width:100%;margin:6px auto 0 auto;table-layout:fixed;border-collapse:collapse;font-size:11px;color:#333;word-break:break-all;text-align:left;">
                <thead>
                    <tr>
                        <th style="border:1px solid #ccc;padding:4px;text-align:left;">EAN</th>
                        <th style="border:1px solid #ccc;padding:4px;text-align:left;">Serial?</th>
                        <th style="border:1px solid #ccc;padding:4px;text-align:left;">Qty</th>
                        <th style="border:1px solid #ccc;padding:4px;text-align:left;">Serial Count</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const ean of missingEANs) {
            const rows = excelItems.filter(item => item.ean === ean);

            const totalQty = rows.reduce((sum, item) => sum + Number(item.qty || 0), 0);
            const serialCount = rows.filter(item => item.serial).length;
            const hasSerial = serialCount > 0 ? "Yes" : "No";

            html += `
                <tr>
                    <td
                        class="copy-missing-ean"
                        data-ean="${ean}"
                        title="Click to copy"
                        style="border:1px solid #ccc;padding:4px;color:red;cursor:pointer;text-decoration:underline;text-align:left;"
                    >
                        ${ean}
                    </td>
                    <td style="border:1px solid #ccc;padding:4px;text-align:left;">${hasSerial}</td>
                    <td style="border:1px solid #ccc;padding:4px;text-align:left;">${totalQty}</td>
                    <td style="border:1px solid #ccc;padding:4px;text-align:left;">${serialCount}</td>
                </tr>
            `;
        }

        html += `
                </tbody>
            </table>
        `;

        return html;
    }

    function clickChooseProductButton() {
        const buttons = [...document.querySelectorAll("span.ui-button-text.ui-clickable")];
        const btn = buttons.find(x => x.textContent.trim() === "选择商品");

        if (btn) {
            btn.click();
        } else {
            setStatus("❌ Cannot find 选择商品 button", "red");
        }
    }

    function clickCloseSelectionButton() {
        const sureBtn = document.querySelector("button.btn_sure_only");

        if (sureBtn) {
            sureBtn.click();
            return true;
        }

        const buttons = [...document.querySelectorAll("span.ui-button-text.ui-clickable")];
        const btn = buttons.find(x => x.textContent.trim() === "选择");

        if (btn) {
            btn.click();
            return true;
        }

        return false;
    }

    function enableMissingEANCopier() {
        document.querySelectorAll(".copy-missing-ean").forEach(cell => {
            cell.onclick = async () => {
                const ean = cell.dataset.ean;

                try {
                    await navigator.clipboard.writeText(ean);

                    if (!cell.dataset.copied) {
                        cell.dataset.copied = "1";
                        cell.innerHTML = `${ean} <span style="color:green;font-weight:bold;">✓</span>`;
                    }

                } catch {
                    alert(`Copy failed: ${ean}`);
                }
            };
        });
    }

    function clickSerialIconInRow(row) {
        const icon =
            row.querySelector("app-search-imei i.fa.fa-search") ||
            row.querySelector("app-search-imei i.fa-search") ||
            row.querySelector("td:nth-child(7) i.fa.fa-search") ||
            row.querySelector("td:nth-child(7) i.fa-search");

        if (!icon) return false;

        icon.click();

        icon.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window
        }));

        return true;
    }

    function normalizeEAN(value) {
        if (value === null || value === undefined) return "";

        let text = String(value).trim();

        if (typeof value === "number") {
            text = Math.trunc(value).toString();
        }

        text = text
            .replace(/\.0$/, "")
            .replace(/\s+/g, "")
            .replace(/[^\d]/g, "");

        return text;
    }

    function cleanText(value) {
        if (value === null || value === undefined) return "";
        return String(value).trim();
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
