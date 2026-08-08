(function () {
  'use strict';

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  GM_addStyle(`
    /* Main wrapper fixed at badge location */
    #eanQtyCheckContainer {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      user-select: none;
      width: 44px;
      height: 44px;
    }

    /* Floating QC Badge (Permanent Anchor) */
    #eanQtyBadge {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #0d6efd;
      color: white;
      font-weight: bold;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
      cursor: move;
      transition: background-color 0.2s, transform 0.15s ease;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
    }
    #eanQtyBadge:hover { background: #0b5ed7; transform: scale(1.05); }

    /* Floating Panel Base with 3D Perspective */
    #eanQtyCheckPanel {
      position: absolute;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,.2);
      width: 290px;
      max-height: 80vh;
      overflow-y: auto;
      box-sizing: border-box;
      z-index: 1;
      perspective: 1000px;
    }

    /* Vertical Placement */
    #eanQtyCheckPanel.panel-above { bottom: 50px; top: auto; }
    #eanQtyCheckPanel.panel-below { top: 50px; bottom: auto; }

    /* Horizontal Placement */
    #eanQtyCheckPanel.panel-align-left { left: 0; right: auto; }
    #eanQtyCheckPanel.panel-align-right { right: 0; left: auto; }

    /* 3D Card Flip Animation */
    .ean-card-inner {
      position: relative;
      width: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }
    .ean-card-inner.is-flipped { transform: rotateY(180deg); }
    .ean-card-front, .ean-card-back {
      width: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .ean-card-front { position: relative; }
    .ean-card-back {
      position: absolute;
      top: 0;
      left: 0;
      transform: rotateY(180deg);
      visibility: hidden;
      /* Force zero height on the hidden face. In some browsers, an
         absolutely-positioned child with a 3D transform inside a
         preserve-3d ancestor still gets counted toward the ancestor's
         scrollable content height, which produces an unwanted scrollbar
         on the panel even though the back face is invisible. */
      max-height: 0;
      overflow: hidden;
    }

    .ean-card-inner.is-flipped .ean-card-front {
      position: absolute;
      top: 0;
      left: 0;
      visibility: hidden;
      max-height: 0;
      overflow: hidden;
    }
    .ean-card-inner.is-flipped .ean-card-back {
      position: relative;
      visibility: visible;
      max-height: none;
      overflow: visible;
    }

    .ean-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      cursor: move;
      padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }
    .ean-panel-title { font-weight: bold; font-size: 14px; color: #333; }

    .ean-small-btn {
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      cursor: pointer;
      font-weight: normal;
      color: #333;
    }
    .ean-small-btn:hover { background: #e0e0e0; }

    /* Drag and Drop Zone Styles */
    #eanDropZone {
      border: 2px dashed #0d6efd;
      border-radius: 6px;
      background: #f8f9fa;
      padding: 14px 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      margin-top: 6px;
    }
    #eanDropZone:hover {
      background: #e9ecef;
      border-color: #0b5ed7;
    }
    #eanDropZone.is-dragover {
      background: #e7f1ff;
      border-color: #0d6efd;
      box-shadow: 0 0 8px rgba(13, 110, 253, 0.3);
      transform: scale(1.02);
    }
    #eanDropZone.has-file {
      border-style: solid;
      border-color: #198754;
      background: #f1f9f5;
    }
    .ean-drop-icon { font-size: 22px; margin-bottom: 4px; line-height: 1; }
    .ean-drop-text { font-size: 12px; color: #495057; font-weight: 500; }
    .ean-drop-subtext { font-size: 10px; color: #6c757d; margin-top: 2px; }

    /* Start Check Button (Blue) */
    #eanQtyRunBtn {
      width: 100%;
      padding: 8px 12px;
      border-radius: 4px;
      font-weight: bold;
      margin-top: 8px;
      box-sizing: border-box;
      border: none;
      color: white;
      background: #0d6efd;
      cursor: pointer;
    }
    #eanQtyRunBtn:hover { background: #0b5ed7; }

    /* TSV View Output */
    #eanTsvArea {
      width: 100%;
      height: 200px;
      font-family: monospace;
      font-size: 11px;
      white-space: pre;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 6px;
      box-sizing: border-box;
      resize: vertical;
      margin-top: 4px;
      user-select: text;
    }

    /* Table Row Highlights */
    tr.ean-match, tr.ean-match > td { background-color: #d9f7d9 !important; }
    tr.ean-less,  tr.ean-less > td  { background-color: #ffe5b4 !important; }
    tr.ean-more,  tr.ean-more > td  { background-color: #f8d7da !important; }
    tr.ean-miss,  tr.ean-miss > td  { background-color: #f8d7da !important; }

    .injected-header-qty { text-align: center !important; font-weight: bold; }
    .injected-excel-qty { text-align: left !important; font-weight: bold; padding-left: 8px; }

    .ean-missing-box {
      margin-top: 8px;
      padding: 8px;
      background: #fff3f3;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #721c24;
      user-select: text;
    }
    .ean-missing-box ul { margin: 4px 0 0 16px; padding: 0; font-family: monospace; }
  `);

  const container = document.createElement('div');
  container.id = 'eanQtyCheckContainer';
  container.innerHTML = `
    <div id="eanQtyCheckPanel" class="panel-above panel-align-right" style="display:none;">
      <div class="ean-card-inner" id="eanCardInner">
        <!-- FRONT FACE -->
        <div class="ean-card-front">
          <div class="ean-panel-header" id="eanDragHandle">
            <span class="ean-panel-title">Quantity Checker</span>
            <button id="eanFlipBtn" class="ean-small-btn" title="View Extracted TSV Data">🔄 Flip</button>
          </div>

          <!-- Drop Zone Area -->
          <div id="eanDropZone">
            <div class="ean-drop-icon" id="eanDropIcon">📁</div>
            <div class="ean-drop-text" id="eanDropText"><strong>Click to upload</strong> or drag & drop</div>
            <div class="ean-drop-subtext" id="eanDropSubtext">Excel (.xlsx, .xls) or PDF (.pdf)</div>
          </div>
          <input id="eanQtyFileInput" type="file" accept=".xlsx,.xls,.pdf" style="display:none" />

          <button id="eanQtyRunBtn" style="display:none;">▶ Start Check</button>
          <div id="eanQtyStatus" style="margin-top:6px;word-break:break-word;white-space:pre-wrap;user-select:text;">Waiting for file...</div>
          <div id="eanQtyMissingContainer"></div>
        </div>

        <!-- BACK FACE (Extracted TSV View) -->
        <div class="ean-card-back">
          <div class="ean-panel-header" id="eanDragHandleBack">
            <span class="ean-panel-title">Extracted Data</span>
            <button id="eanFlipBackBtn" class="ean-small-btn" title="Back to Control Panel">🔄 Back</button>
          </div>
          <textarea id="eanTsvArea" readonly placeholder="No data extracted yet. Upload an Excel or PDF file."></textarea>
        </div>
      </div>
    </div>
    <div id="eanQtyBadge" title="Click to toggle EAN Checker (Drag to move)">QC</div>
  `;
  document.body.appendChild(container);

  const badge = document.getElementById('eanQtyBadge');
  const panel = document.getElementById('eanQtyCheckPanel');
  const cardInner = document.getElementById('eanCardInner');
  const dragHandle = document.getElementById('eanDragHandle');
  const dragHandleBack = document.getElementById('eanDragHandleBack');

  const flipBtn = document.getElementById('eanFlipBtn');
  const flipBackBtn = document.getElementById('eanFlipBackBtn');
  const tsvArea = document.getElementById('eanTsvArea');

  const dropZone = document.getElementById('eanDropZone');
  const dropIcon = document.getElementById('eanDropIcon');
  const dropText = document.getElementById('eanDropText');
  const dropSubtext = document.getElementById('eanDropSubtext');
  const fileInput = document.getElementById('eanQtyFileInput');
  const runBtn = document.getElementById('eanQtyRunBtn');
  const statusEl = document.getElementById('eanQtyStatus');
  const missingContainer = document.getElementById('eanQtyMissingContainer');

  let expectedMap = null;
  let extractedItems = [];
  let fileType = 'excel';
  let matchedEanSet = new Set();
  let observer = null;

  /* ------------------- GCP VISION KEY MANAGEMENT ------------------- */
  function getGcpApiKey(forcePrompt) {
    let apiKey = forcePrompt ? "" : GM_getValue("gcp_vision_key", "");
    if (!apiKey) {
      apiKey = prompt("Enter your Google Cloud Vision API Key:");
      if (apiKey) GM_setValue("gcp_vision_key", apiKey.trim());
    }
    return apiKey;
  }

  function resetGcpApiKey() {
    GM_setValue("gcp_vision_key", "");
    alert("Vision API key cleared. You'll be prompted for a new one on your next PDF upload.");
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand("Reset Vision API Key", resetGcpApiKey);
  }

  /* ------------------- EAN / UPC CHECKSUM VALIDATION -------------------
     Standard GS1 mod-10 check digit, supports EAN-8, EAN-13/UPC-A (12-13
     digits), and GTIN-14. Filters out PO numbers, invoice numbers, etc.
     that happen to land in the 12-14 digit range but aren't real codes. */
  function isValidEanChecksum(code) {
    if (!/^\d+$/.test(code)) return false;
    const len = code.length;
    if (![8, 12, 13, 14].includes(len)) return false;

    const digits = code.split('').map(Number);
    const checkDigit = digits[len - 1];
    const payload = digits.slice(0, len - 1).reverse();

    let sum = 0;
    for (let i = 0; i < payload.length; i++) {
      sum += payload[i] * (i % 2 === 0 ? 3 : 1);
    }
    const calculated = (10 - (sum % 10)) % 10;
    return calculated === checkDigit;
  }

  // Unified quantity matcher used everywhere qty is parsed from the PDF:
  // whole numbers or up to 2 decimal places. (Previously the fallback
  // path only accepted strict X.XX and would miss plain integer quantities.)
  const QTY_REGEX = /^\d+(\.\d{1,2})?$/;

  /* ------------------- TSV GENERATION ------------------- */
  function updateTsvView() {
    if (!extractedItems || extractedItems.length === 0) {
      tsvArea.value = "No data extracted yet.";
      return;
    }

    const firstHeader = fileType === 'pdf' ? 'No' : 'Row';
    let lines = [`${firstHeader}\tEAN\tQty`];

    extractedItems.forEach((item) => {
      lines.push(`${item.row}\t${item.ean}\t${item.qty}`);
    });
    tsvArea.value = lines.join("\n");
  }

  /* ------------------- FLIP HANDLER ------------------- */
  flipBtn.addEventListener('click', () => cardInner.classList.add('is-flipped'));
  flipBackBtn.addEventListener('click', () => cardInner.classList.remove('is-flipped'));

  /* ------------------- VERTICAL STACK ORIENTATION ------------------- */
  let isOpen = false;

  function updatePanelOrientation() {
    const badgeRect = badge.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (badgeRect.top > viewportHeight / 2) {
      panel.classList.remove('panel-below');
      panel.classList.add('panel-above');
    } else {
      panel.classList.remove('panel-above');
      panel.classList.add('panel-below');
    }

    if (badgeRect.left < viewportWidth / 2) {
      panel.classList.remove('panel-align-right');
      panel.classList.add('panel-align-left');
    } else {
      panel.classList.remove('panel-align-left');
      panel.classList.add('panel-align-right');
    }
  }

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      updatePanelOrientation();
      panel.style.display = 'block';
      clampToWindowBounds();
    } else {
      panel.style.display = 'none';
    }
  }

  /* ------------------- DRAGGABLE & BOUNDS ENFORCEMENT ------------------- */
  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let hasDragged = false;

  function startDrag(e) {
    if ((e.target.tagName === 'BUTTON' || e.target.closest('#eanDropZone')) && e.target !== badge) return;

    isDragging = true;
    hasDragged = false;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    startX = clientX;
    startY = clientY;

    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    container.style.right = 'auto';
    container.style.bottom = 'auto';
    container.style.left = `${initialLeft}px`;
    container.style.top = `${initialTop}px`;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
  }

  function onDrag(e) {
    if (!isDragging) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true;
    }

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    const badgeSize = 44;
    const maxLeft = window.innerWidth - badgeSize;
    const maxTop = window.innerHeight - badgeSize;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;

    updatePanelOrientation();

    if (e.cancelable) e.preventDefault();
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', stopDrag);
    clampToWindowBounds();
  }

  function clampToWindowBounds() {
    const rect = container.getBoundingClientRect();

    let newLeft = rect.left;
    let newTop = rect.top;

    const maxLeft = window.innerWidth - 44;
    const maxTop = window.innerHeight - 44;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
  }

  dragHandle.addEventListener('mousedown', startDrag);
  dragHandleBack.addEventListener('mousedown', startDrag);
  badge.addEventListener('mousedown', startDrag);

  dragHandle.addEventListener('touchstart', startDrag, { passive: true });
  dragHandleBack.addEventListener('touchstart', startDrag, { passive: true });
  badge.addEventListener('touchstart', startDrag, { passive: true });

  badge.addEventListener('click', () => {
    if (!hasDragged) {
      togglePanel();
    }
  });

  window.addEventListener('resize', () => {
    updatePanelOrientation();
    clampToWindowBounds();
  });

  /* ------------------- PARSERS & HELPERS ------------------- */
  function normText(v) { return (v == null ? '' : String(v)).replace(/\s+/g, '').trim(); }

  function normalizeEAN(v) {
    if (v == null) return '';
    let s = String(v).trim();
    if (!s) return '';
    if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
    if (/^\d+\.\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n) && Number.isInteger(n)) s = String(n);
    }
    return s.replace(/\s+/g, '');
  }

  function normalizeQty(v) {
    if (v == null || v === '') return 0;
    const s = String(v).replace(/,/g, '').trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  async function readExcel(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const ref = sheet['!ref'];
    if (!ref) throw new Error('Empty worksheet');
    const range = XLSX.utils.decode_range(ref);
    const map = new Map();
    const list = [];

    for (let r = 1; r <= range.e.r; r++) {
      const eanCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
      const qtyCell = sheet[XLSX.utils.encode_cell({ r, c: 2 })];

      const rowNum = r + 1;
      const ean = normalizeEAN(eanCell ? eanCell.v : '');
      const qty = normalizeQty(qtyCell ? qtyCell.v : '');
      if (!ean) continue;

      list.push({ row: rowNum, ean, qty });
      map.set(ean, (map.get(ean) || 0) + qty);
    }
    return { map, list };
  }

  async function readPdf(file) {
    const apiKey = getGcpApiKey();
    if (!apiKey) throw new Error("Google Cloud Vision API Key is missing.");

    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
    const map = new Map();
    const list = [];
    let skippedInvalid = 0;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      statusEl.textContent = `Rendering PDF Page ${i}/${pdfDoc.numPages}...`;
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      const base64Image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      statusEl.textContent = `Analyzing Page ${i}/${pdfDoc.numPages}...`;
      const apiResponse = await callGoogleVision(base64Image, apiKey);

      if (apiResponse && apiResponse.responses && apiResponse.responses[0].fullTextAnnotation) {
        const pages = apiResponse.responses[0].fullTextAnnotation.pages;
        let allWords = [];

        pages.forEach(p => {
          p.blocks.forEach(block => {
            block.paragraphs.forEach(paragraph => {
              paragraph.words.forEach(word => {
                const wordStr = word.symbols.map(s => s.text).join('');
                const box = word.boundingBox.vertices;
                const minX = Math.min(box[0].x || 0, box[3].x || 0);
                const maxX = Math.max(box[1].x || 0, box[2].x || 0);
                const minY = Math.min(box[0].y || 0, box[1].y || 0);
                const maxY = Math.max(box[2].y || 0, box[3].y || 0);

                allWords.push({
                  text: wordStr,
                  x: (minX + maxX) / 2,
                  y: (minY + maxY) / 2,
                  minX: minX,
                  maxX: maxX,
                  minY: minY,
                  maxY: maxY
                });
              });
            });
          });
        });

        // Loosened to strip non-letters before comparing, so "Qty:", "QTY" etc. still hit.
        let qtyHeader = allWords.find(w => w.text.toLowerCase().replace(/[^a-z]/g, '') === "qty");
        let qtyColumnX = qtyHeader ? qtyHeader.x : null;

        if (!qtyColumnX) {
          let decimalWords = allWords.filter(w => /^\d+\.\d{2}$/.test(w.text.trim()));
          if (decimalWords.length > 0) {
            let xVals = decimalWords.map(w => w.x).sort((a, b) => a - b);
            qtyColumnX = xVals[Math.floor(xVals.length / 2)];
          }
        }

        // Detect the UOM column, since on stock-transfer-style documents Qty
        // sits immediately to the left of it — the most reliable anchor of all
        // (more reliable than a fixed column x, which can drift slightly across
        // pages or rows). Try the "UOM" header first; if it's not detected,
        // fall back to finding a short alphabetic token (e.g. "UNIT", "PCS",
        // "SET") that repeats across many rows on the right side of the table.
        let uomHeader = allWords.find(w => w.text.toLowerCase().replace(/[^a-z]/g, '') === "uom");
        let uomColumnX = uomHeader ? uomHeader.x : null;

        if (!uomColumnX) {
          let uomCounts = new Map();
          allWords.forEach(w => {
            const t = w.text.trim();
            if (/^[A-Za-z]{2,6}$/.test(t)) {
              uomCounts.set(t, (uomCounts.get(t) || 0) + 1);
            }
          });
          let bestToken = null, bestCount = 0;
          uomCounts.forEach((count, token) => {
            if (count > bestCount) { bestCount = count; bestToken = token; }
          });
          if (bestToken && bestCount >= 3) {
            let xVals = allWords.filter(w => w.text.trim() === bestToken).map(w => w.x).sort((a, b) => a - b);
            uomColumnX = xVals[Math.floor(xVals.length / 2)];
          }
        }

        // Locate EAN candidates. Restricted to exactly 13 digits (standard
        // EAN-13, matching the confirmed Item Code format), then filtered to
        // only those passing the GS1 mod-10 checksum so stray 13-digit numbers
        // don't get treated as real product codes.
        let eanCandidates = allWords.filter(w => /^\d{13}$/.test(w.text.trim()));
        let eanWords = eanCandidates.filter(w => isValidEanChecksum(w.text.trim()));
        skippedInvalid += (eanCandidates.length - eanWords.length);
        eanWords.sort((a, b) => a.y - b.y);

        eanWords.forEach(ean => {
          let cleanEan = normalizeEAN(ean.text.trim());
          if (!cleanEan) return;

          // Find Line Number: strictly left of EAN, must parse as a plausible
          // line number (1-9998), and pick the one vertically closest to the
          // EAN's row (not just the leftmost candidate) — matches the
          // standalone extractor's logic.
          let lineNoCandidates = allWords.filter(w => {
            let val = parseInt(w.text.trim(), 10);
            return !isNaN(val) && val > 0 && val < 9999 &&
                   w.maxX < ean.minX &&
                   Math.abs(w.y - ean.y) < 16;
          });

          lineNoCandidates.sort((a, b) => Math.abs(a.y - ean.y) - Math.abs(b.y - ean.y));
          let lineNoWord = lineNoCandidates.length > 0 ? lineNoCandidates[0] : null;
          let lineNo = lineNoWord ? lineNoWord.text.trim() : '';

          let qtyWord = null;

          // Strategy 1 (most reliable): qty is the number immediately left of
          // the UOM column, on the same row as the EAN.
          if (uomColumnX) {
            let candidateQtys = allWords.filter(w => {
              return w.x < uomColumnX &&
                     (uomColumnX - w.x) < 150 &&
                     Math.abs(w.y - ean.y) < 16 &&
                     QTY_REGEX.test(w.text.trim());
            });

            // Closest to the UOM column (largest x) wins — that's "immediately left of UOM".
            candidateQtys.sort((a, b) => b.x - a.x);
            if (candidateQtys.length > 0) {
              qtyWord = candidateQtys[0];
            }
          }

          // Strategy 2: fixed Qty-column x position (±75px), same row as EAN.
          if (!qtyWord && qtyColumnX) {
            let candidateQtys = allWords.filter(w => {
              return Math.abs(w.x - qtyColumnX) < 75 &&
                     Math.abs(w.y - ean.y) < 16 &&
                     QTY_REGEX.test(w.text.trim());
            });

            candidateQtys.sort((a, b) => Math.abs(a.y - ean.y) - Math.abs(b.y - ean.y));
            if (candidateQtys.length > 0) {
              qtyWord = candidateQtys[0];
            }
          }

          // Strategy 3 (last resort): first numeric-looking word to the right of the EAN.
          // Distance threshold (+150) matches the standalone extractor.
          if (!qtyWord) {
            let rightWords = allWords.filter(w => w.minX > (ean.maxX + 150) && Math.abs(w.y - ean.y) < 16);
            qtyWord = rightWords.find(w => QTY_REGEX.test(w.text.trim()));
          }

          // Always keep the row, matching the standalone extractor's behavior:
          // an unresolved qty is recorded as "?" rather than silently
          // dropping the item from the output. Qty checking against the UI
          // table (highlightActiveTable) already treats unmatched/zero
          // quantities as mismatches, so nothing is lost by keeping them here.
          let qtyRaw = qtyWord ? qtyWord.text.trim() : "?";
          let qty = qtyWord ? normalizeQty(qtyRaw) : 0;

          list.push({ row: lineNo || "?", ean: cleanEan, qty: qtyWord ? qty : "?" });
          if (qtyWord) {
            map.set(cleanEan, (map.get(cleanEan) || 0) + qty);
          }
        });
      }
    }

    if (skippedInvalid > 0) {
      statusEl.textContent = `Checksum filter skipped ${skippedInvalid} invalid code${skippedInvalid === 1 ? '' : 's'}...`;
    }

    return { map, list };
  }

  function callGoogleVision(base64Image, key) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
          }]
        }),
        onload: (response) => {
          if (response.status === 200) {
            resolve(JSON.parse(response.responseText));
          } else {
            // 400/401/403 from Vision usually means an expired, revoked, or
            // malformed key. Clear it so the next PDF upload prompts fresh
            // instead of silently failing with the same bad key every time.
            if (response.status === 400 || response.status === 401 || response.status === 403) {
              GM_setValue("gcp_vision_key", "");
              reject(`API key rejected (HTTP ${response.status}) — it's been cleared, so you'll be prompted for a new one on your next upload. Details: ${response.responseText}`);
            } else {
              reject(`API Error: ${response.status} - ${response.responseText}`);
            }
          }
        },
        onerror: (err) => reject(err)
      });
    });
  }

  /* ------------------- UNIFIED FILE PROCESSOR ------------------- */
  async function processFile(file) {
    if (!file) return;

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.pdf')) {
        fileType = 'pdf';
        statusEl.textContent = 'Reading PDF...';
        const res = await readPdf(file);
        expectedMap = res.map;
        extractedItems = res.list;
        statusEl.textContent = `PDF loaded (${extractedItems.length} items).\nClick "Start Check".`;
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        fileType = 'excel';
        statusEl.textContent = 'Reading Excel...';
        const res = await readExcel(file);
        expectedMap = res.map;
        extractedItems = res.list;
        statusEl.textContent = `Excel loaded (${extractedItems.length} items).\nClick "Start Check".`;
      } else {
        statusEl.textContent = '❌ Unsupported file format.\nPlease select an Excel (.xlsx, .xls) or PDF (.pdf) file.';
        return;
      }

      // Update DropZone UI to show success state
      dropZone.classList.add('has-file');
      dropIcon.textContent = fileType === 'pdf' ? '📄' : '📊';
      dropText.innerHTML = `<strong>${file.name}</strong>`;
      dropSubtext.textContent = 'Click or drag new file to replace';

      updateTsvView();
      runBtn.style.display = 'block';
      missingContainer.innerHTML = '';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error: ' + (err && err.message ? err.message : err);
    }
  }

  /* ------------------- DOM & HIGHLIGHTING CHECKER LOGIC ------------------- */
  function findTab(tabName) {
    const links = [...document.querySelectorAll('a[href="javascript:;"], a[href="#"], a, .p-tabview-nav a')];
    return links.find(a => normText(a.textContent) === tabName);
  }

  function switchTab(tabName) {
    const target = findTab(tabName);
    if (target) {
      target.click();
      return true;
    }
    return false;
  }

  function getOrderDialog() {
    const dialogs = [...document.querySelectorAll('div.ui-dialog, .ui-dialog, .p-dialog')];
    return dialogs.find(d => {
      const title = d.querySelector('.ui-dialog-title, .p-dialog-title');
      return title && title.textContent.trim().includes('发货单详情');
    }) || null;
  }

  function getTableRoot() {
    const dialog = getOrderDialog();
    if (!dialog) return null;
    return dialog.querySelector('p-table, .ly-detailtable, .ui-table, table') || null;
  }

  function getHeaderCells(root) {
    return [...root.querySelectorAll('thead th, .ui-table-thead th, .p-datatable-thead th')];
  }

  function headerIndex(root, possibleLabels) {
    const headers = getHeaderCells(root);
    return headers.findIndex(th => {
      const text = normText(th.textContent);
      return possibleLabels.some(label => text.includes(normText(label)));
    });
  }

  function rowCells(row) {
    return [...row.querySelectorAll('td')];
  }

  function visibleRows(root) {
    return [...root.querySelectorAll('tbody tr, .ui-table-tbody tr, .p-datatable-tbody tr')].filter(tr => rowCells(tr).length > 0);
  }

  function clearHighlights(root) {
    visibleRows(root).forEach(tr => tr.classList.remove('ean-match', 'ean-less', 'ean-more', 'ean-miss'));
  }

  function ensureInjectedHeader(root, qtyIdx, unitPriceIdx) {
    const theadTr = root.querySelector('thead tr, .ui-table-thead tr, .p-datatable-thead tr');
    if (!theadTr || theadTr.querySelector('.injected-header-qty')) return;

    const th = document.createElement('th');
    th.className = 'injected-header-qty';
    th.textContent = 'File Qty';

    const headers = theadTr.querySelectorAll('th');
    const targetTh = unitPriceIdx !== -1 ? headers[unitPriceIdx] : headers[qtyIdx + 1];

    if (targetTh) {
      theadTr.insertBefore(th, targetTh);
    } else {
      theadTr.appendChild(th);
    }
  }

  function extractCellText(td) {
    if (!td) return '';
    const input = td.querySelector('input');
    if (input && input.value != null) return input.value.trim();

    const spans = td.querySelectorAll('.ng-star-inserted, .contentText, span');
    if (spans.length) {
      for (const el of spans) {
        const t = (el.textContent || '').trim();
        if (t) return t;
      }
    }
    return (td.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function highlightActiveTable() {
    if (!expectedMap) return false;
    const root = getTableRoot();
    if (!root) return false;

    const eanIdx = headerIndex(root, ['商品编码', '配件编码']);
    const qtyIdx = headerIndex(root, ['发货数']);
    const unitPriceIdx = headerIndex(root, ['单价']);

    if (eanIdx === -1 || qtyIdx === -1) return false;

    ensureInjectedHeader(root, qtyIdx, unitPriceIdx);
    const rows = visibleRows(root);
    if (!rows.length) return false;

    clearHighlights(root);

    rows.forEach((tr) => {
      const tds = rowCells(tr);
      const ean = normalizeEAN(extractCellText(tds[eanIdx]));
      const qty = normalizeQty(extractCellText(tds[qtyIdx]));
      if (!ean) return;

      const expectedQty = expectedMap.has(ean) ? expectedMap.get(ean) : '-';

      let injectedTd = tr.querySelector('.injected-excel-qty');
      if (!injectedTd) {
        injectedTd = document.createElement('td');
        injectedTd.className = 'injected-excel-qty';

        const targetTd = unitPriceIdx !== -1 ? tds[unitPriceIdx] : tds[qtyIdx + 1];
        if (targetTd) {
          tr.insertBefore(injectedTd, targetTd);
        } else {
          tr.appendChild(injectedTd);
        }
      }
      injectedTd.textContent = expectedQty;

      if (!expectedMap.has(ean)) {
        tr.classList.add('ean-miss');
        return;
      }

      matchedEanSet.add(ean);

      if (qty === expectedQty) {
        tr.classList.add('ean-match');
      } else if (qty < expectedQty) {
        tr.classList.add('ean-less');
      } else {
        tr.classList.add('ean-more');
      }
    });

    updateMissingPanelUI();
    return true;
  }

  function updateMissingPanelUI() {
    if (!expectedMap) return;

    const missingItems = [];
    expectedMap.forEach((qty, ean) => {
      if (!matchedEanSet.has(ean)) {
        missingItems.push({ ean, qty });
      }
    });

    if (missingItems.length > 0) {
      missingContainer.innerHTML = `
        <div class="ean-missing-box">
          <strong>⚠️ Missing in UI (${missingItems.length}):</strong>
          <ul>
            ${missingItems.map(item => `<li>${item.ean} (Qty: ${item.qty})</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      missingContainer.innerHTML = `
        <div style="margin-top:8px;color:#155724;background:#d4edda;padding:6px;border-radius:4px;">
          ✓ All file items accounted for!
        </div>
      `;
    }
  }

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  async function runFullScan() {
    if (!expectedMap) {
      statusEl.textContent = 'Please upload an Excel or PDF file first.';
      return;
    }

    const dialog = getOrderDialog();
    if (!dialog) {
      statusEl.textContent = '❌ Error:\n Order details not found.\n Please open the order details page';
      return;
    }

    matchedEanSet.clear();
    statusEl.textContent = 'Scanning tabs...';

    let successCount = 0;
    const tabsToScan = ['商品', '配件'];

    for (const tabName of tabsToScan) {
      if (findTab(tabName)) {
        switchTab(tabName);
        await delay(500);

        let retries = 0;
        let scanned = false;
        while (retries < 10) {
          if (highlightActiveTable()) {
            scanned = true;
            break;
          }
          await delay(200);
          retries++;
        }
        if (scanned) successCount++;
      }
    }

    if (successCount === 0) {
      statusEl.textContent = '❌ Error: Could not find required headers in tables.';
      return;
    }

    if (findTab('商品')) {
      switchTab('商品');
      await delay(300);
      highlightActiveTable();
    }

    statusEl.textContent = `Scan completed.`;
    setupMutationObserver();
  }

  function setupMutationObserver() {
    if (observer) observer.disconnect();

    const dialog = getOrderDialog();
    if (!dialog) return;

    let debounceTimer = null;
    observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        highlightActiveTable();
      }, 200);
    });

    observer.observe(dialog, { childList: true, subtree: true });
  }

  /* ------------------- EVENT LISTENERS ------------------- */
  // Click drop zone to select file
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    processFile(file);
  });

  // Prevent browser default behavior for drag events globally
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  // Drag visual effects on Drop Zone
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('is-dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('is-dragover');
    }, false);
  });

  // Handle dropped files
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, false);

  runBtn.addEventListener('click', () => runFullScan());
})();
