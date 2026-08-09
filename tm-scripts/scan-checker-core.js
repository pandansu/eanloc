
(function () {
  'use strict';

  // Skip initialization specifically inside the small serial-number scan iframe
  if (/\/assets\/imei\.html(?:$|[?#])/.test(location.pathname + location.search + location.hash)) {
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  GM_addStyle(`
    #scanCheckerContainer {
      position: fixed;
      bottom: 20px;
      right: 76px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      user-select: none;
      width: 44px;
      height: 44px;
    }

    #scanCheckerBadge {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #198754;
      color: white;
      font-weight: bold;
      font-size: 13px;
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
    #scanCheckerBadge:hover { background: #157347; transform: scale(1.05); }

    #scanCheckerPanel {
      position: absolute;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,.2);
      width: 300px;
      max-height: 80vh;
      overflow-y: auto;
      box-sizing: border-box;
      z-index: 1;
      perspective: 1000px;
    }

    #scanCheckerPanel.panel-above { bottom: 50px; top: auto; }
    #scanCheckerPanel.panel-below { top: 50px; bottom: auto; }
    #scanCheckerPanel.panel-align-left { left: 0; right: auto; }
    #scanCheckerPanel.panel-align-right { right: 0; left: auto; }

    .sc-card-inner {
      position: relative;
      width: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }
    .sc-card-inner.is-flipped { transform: rotateY(180deg); }
    .sc-card-front, .sc-card-back {
      width: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .sc-card-front { position: relative; }
    .sc-card-back {
      position: absolute;
      top: 0;
      left: 0;
      transform: rotateY(180deg);
      visibility: hidden;
      max-height: 0;
      overflow: hidden;
    }
    .sc-card-inner.is-flipped .sc-card-front {
      position: absolute;
      top: 0;
      left: 0;
      visibility: hidden;
      max-height: 0;
      overflow: hidden;
    }
    .sc-card-inner.is-flipped .sc-card-back {
      position: relative;
      visibility: visible;
      max-height: none;
      overflow: visible;
    }

    .sc-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      cursor: move;
      padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }
    .sc-panel-title { font-weight: bold; font-size: 14px; color: #333; }

    .sc-small-btn {
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      cursor: pointer;
      font-weight: normal;
      color: #333;
    }
    .sc-small-btn:hover { background: #e0e0e0; }

    #scDropZone {
      border: 2px dashed #198754;
      border-radius: 6px;
      background: #f8f9fa;
      padding: 14px 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      margin-top: 6px;
    }
    #scDropZone:hover { background: #e9ecef; border-color: #157347; }
    #scDropZone.is-dragover {
      background: #e7f6ee;
      border-color: #198754;
      box-shadow: 0 0 8px rgba(25, 135, 84, 0.3);
      transform: scale(1.02);
    }
    #scDropZone.has-file {
      border-style: solid;
      border-color: #198754;
      background: #f1f9f5;
    }
    .sc-drop-icon { font-size: 22px; margin-bottom: 4px; line-height: 1; }
    .sc-drop-text { font-size: 12px; color: #495057; font-weight: 500; }
    .sc-drop-subtext { font-size: 10px; color: #6c757d; margin-top: 2px; }

    #scAutoSelectBtn {
      width: 100%;
      padding: 8px 12px;
      border-radius: 4px;
      font-weight: bold;
      margin-top: 8px;
      box-sizing: border-box;
      border: none;
      color: white;
      background: #198754;
      cursor: pointer;
    }
    #scAutoSelectBtn:hover { background: #157347; }
    #scAutoSelectBtn:disabled { background: #adb5bd; cursor: not-allowed; }

    #scTsvArea {
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

    .sc-progress-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      margin-top: 3px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
    }
    .sc-progress-row.status-missing { background: #e9ecef; color: #343a40; }
    .sc-progress-row.status-error { background: #f8d7da; color: #842029; }

    .sc-qty-expected-label {
      display: inline-block;
      margin-left: 4px;
      font-size: 10px;
      color: #6c757d;
      font-style: italic;
    }

    /* Table row highlighting styles */
    tr.sc-row-not-completed, tr.sc-row-not-completed td { background-color: #fff3cd !important; }
    tr.sc-row-completed, tr.sc-row-completed td { background-color: #d1e7dd !important; }
    tr.sc-row-error, tr.sc-row-error td { background-color: #f8d7da !important; }

    @media print {
      #scanCheckerContainer { display: none !important; }
    }
  `);

  const container = document.createElement('div');
  container.id = 'scanCheckerContainer';
  container.innerHTML = `
    <div id="scanCheckerPanel" class="panel-above panel-align-right" style="display:none;">
      <div class="sc-card-inner" id="scCardInner">
        <div class="sc-card-front">
          <div class="sc-panel-header" id="scDragHandle">
            <span class="sc-panel-title">Scan Checker</span>
            <button id="scFlipBtn" class="sc-small-btn" title="View Extracted Data">🔄 Flip</button>
          </div>

          <div id="scDropZone">
            <div class="sc-drop-icon" id="scDropIcon">📁</div>
            <div class="sc-drop-text" id="scDropText"><strong>Click to upload</strong> or drag & drop</div>
            <div class="sc-drop-subtext" id="scDropSubtext">Excel (.xlsx, .xls) or PDF (.pdf) manifest</div>
          </div>
          <input id="scFileInput" type="file" accept=".xlsx,.xls,.pdf" style="display:none" />

          <button id="scAutoSelectBtn" style="display:none;">🎯 Auto-Select &amp; Monitor Scans</button>
          <div id="scStatus" style="margin-top:6px;word-break:break-word;white-space:pre-wrap;user-select:text;">Waiting for file...</div>
          <div id="scProgressContainer"></div>
        </div>

        <div class="sc-card-back">
          <div class="sc-panel-header" id="scDragHandleBack">
            <span class="sc-panel-title">Extracted Data</span>
            <button id="scFlipBackBtn" class="sc-small-btn" title="Back to Control Panel">🔄 Back</button>
          </div>
          <textarea id="scTsvArea" readonly placeholder="No data extracted yet. Upload a manifest file."></textarea>
        </div>
      </div>
    </div>
    <div id="scanCheckerBadge" title="Click to toggle Scan Checker (Drag to move)">SC</div>
  `;
  document.body.appendChild(container);

  const badge = document.getElementById('scanCheckerBadge');
  const panel = document.getElementById('scanCheckerPanel');
  const cardInner = document.getElementById('scCardInner');
  const dragHandle = document.getElementById('scDragHandle');
  const dragHandleBack = document.getElementById('scDragHandleBack');
  const flipBtn = document.getElementById('scFlipBtn');
  const flipBackBtn = document.getElementById('scFlipBackBtn');
  const tsvArea = document.getElementById('scTsvArea');

  const dropZone = document.getElementById('scDropZone');
  const dropIcon = document.getElementById('scDropIcon');
  const dropText = document.getElementById('scDropText');
  const dropSubtext = document.getElementById('scDropSubtext');
  const fileInput = document.getElementById('scFileInput');
  const autoSelectBtn = document.getElementById('scAutoSelectBtn');
  const statusEl = document.getElementById('scStatus');
  const progressContainer = document.getElementById('scProgressContainer');

  let expectedMap = null;
  let extractedItems = [];
  let fileType = 'excel';

  // Global persistent seen sets so switching tabs never un-registers already seen items
  let persistentMainSeen = new Set();
  let persistentAccessorySeen = new Set();

  // Persistent error maps for each table type so errors stay remembered across tab switches
  let mainErrorMap = new Map();
  let accessoryErrorMap = new Map();

  function getGcpApiKey() {
    let apiKey = GM_getValue("gcp_vision_key", "");
    if (!apiKey) {
      apiKey = prompt("Enter your Google Cloud Vision API Key:");
      if (apiKey) GM_setValue("gcp_vision_key", apiKey.trim());
    }
    return apiKey;
  }

  function resetGcpApiKey() {
    GM_setValue("gcp_vision_key", "");
    alert("Vision API key cleared. You'll be prompted for a new one on your next upload.");
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand("Scan Checker: Reset Vision API Key", resetGcpApiKey);
  }

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

  const QTY_REGEX = /^\d+(\.\d{1,2})?$/;

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

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  function updateTsvView() {
    if (!extractedItems || extractedItems.length === 0) {
      tsvArea.value = "No data extracted yet.";
      return;
    }
    const firstHeader = fileType === 'pdf' ? 'No' : 'Row';
    let lines = [`${firstHeader}\tEAN`];
    extractedItems.forEach((item) => {
      lines.push(`${item.row}\t${item.ean}\t${item.qty}`);
    });
    tsvArea.value = lines.join("\n");
  }

  flipBtn.addEventListener('click', () => cardInner.classList.add('is-flipped'));
  flipBackBtn.addEventListener('click', () => cardInner.classList.remove('is-flipped'));

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

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let hasDragged = false;

  function startDrag(e) {
    if ((e.target.tagName === 'BUTTON' || e.target.closest('#scDropZone')) && e.target !== badge) return;

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
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;

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
    if (!hasDragged) togglePanel();
  });

  window.addEventListener('resize', () => {
    updatePanelOrientation();
    clampToWindowBounds();
  });

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
                  minX, maxX, minY, maxY
                });
              });
            });
          });
        });

        let qtyHeader = allWords.find(w => w.text.toLowerCase().replace(/[^a-z]/g, '') === "qty");
        let qtyColumnX = qtyHeader ? qtyHeader.x : null;
        if (!qtyColumnX) {
          let decimalWords = allWords.filter(w => /^\d+\.\d{2}$/.test(w.text.trim()));
          if (decimalWords.length > 0) {
            let xVals = decimalWords.map(w => w.x).sort((a, b) => a - b);
            qtyColumnX = xVals[Math.floor(xVals.length / 2)];
          }
        }

        let uomHeader = allWords.find(w => w.text.toLowerCase().replace(/[^a-z]/g, '') === "uom");
        let uomColumnX = uomHeader ? uomHeader.x : null;
        if (!uomColumnX) {
          let uomCounts = new Map();
          allWords.forEach(w => {
            const t = w.text.trim();
            if (/^[A-Za-z]{2,6}$/.test(t)) uomCounts.set(t, (uomCounts.get(t) || 0) + 1);
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

        let eanCandidates = allWords.filter(w => /^\d{13}$/.test(w.text.trim()));
        let eanWords = eanCandidates.filter(w => isValidEanChecksum(w.text.trim()));
        skippedInvalid += (eanCandidates.length - eanWords.length);
        eanWords.sort((a, b) => a.y - b.y);

        eanWords.forEach(ean => {
          let cleanEan = normalizeEAN(ean.text.trim());
          if (!cleanEan) return;

          let lineNoCandidates = allWords.filter(w => {
            let val = parseInt(w.text.trim(), 10);
            return !isNaN(val) && val > 0 && val < 9999 &&
                   w.maxX < ean.minX && Math.abs(w.y - ean.y) < 16;
          });
          lineNoCandidates.sort((a, b) => Math.abs(a.y - ean.y) - Math.abs(b.y - ean.y));
          let lineNoWord = lineNoCandidates.length > 0 ? lineNoCandidates[0] : null;
          let lineNo = lineNoWord ? lineNoWord.text.trim() : '';

          let qtyWord = null;
          if (uomColumnX) {
            let candidateQtys = allWords.filter(w => {
              return w.x < uomColumnX && (uomColumnX - w.x) < 150 &&
                     Math.abs(w.y - ean.y) < 16 && QTY_REGEX.test(w.text.trim());
            });
            candidateQtys.sort((a, b) => b.x - a.x);
            if (candidateQtys.length > 0) qtyWord = candidateQtys[0];
          }
          if (!qtyWord && qtyColumnX) {
            let candidateQtys = allWords.filter(w => {
              return Math.abs(w.x - qtyColumnX) < 75 && Math.abs(w.y - ean.y) < 16 && QTY_REGEX.test(w.text.trim());
            });
            candidateQtys.sort((a, b) => Math.abs(a.y - ean.y) - Math.abs(b.y - ean.y));
            if (candidateQtys.length > 0) qtyWord = candidateQtys[0];
          }
          if (!qtyWord) {
            let rightWords = allWords.filter(w => w.minX > (ean.maxX + 150) && Math.abs(w.y - ean.y) < 16);
            qtyWord = rightWords.find(w => QTY_REGEX.test(w.text.trim()));
          }

          let qtyRaw = qtyWord ? qtyWord.text.trim() : "##";
          let qty = qtyWord ? normalizeQty(qtyRaw) : 0;
          list.push({ row: lineNo || "##", ean: cleanEan, qty: qtyWord ? qty : "##" });
          if (qtyWord) map.set(cleanEan, (map.get(cleanEan) || 0) + qty);
        });
      }
    }

    if (skippedInvalid > 0) {
      statusEl.textContent = `Checksum filter skipped ${skippedInvalid} invalid code(s)...`;
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
          } else if (response.status === 400 || response.status === 401 || response.status === 403) {
            GM_setValue("gcp_vision_key", "");
            reject(`API key rejected (HTTP ${response.status}) — it's been cleared, so you'll be prompted for a new one on your next upload.`);
          } else {
            reject(`API Error: ${response.status} - ${response.responseText}`);
          }
        },
        onerror: (err) => reject(err)
      });
    });
  }

  async function processFile(file) {
    if (!file) return;
    const fileName = file.name.toLowerCase();

    try {
      persistentMainSeen.clear();
      persistentAccessorySeen.clear();
      mainErrorMap.clear();
      accessoryErrorMap.clear();

      if (fileName.endsWith('.pdf')) {
        fileType = 'pdf';
        statusEl.textContent = 'Reading PDF...';
        const res = await readPdf(file);
        expectedMap = res.map;
        extractedItems = res.list;
        statusEl.textContent = `PDF loaded (${extractedItems.length} items).\nClick "Auto-Select & Monitor Scans".`;
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        fileType = 'excel';
        statusEl.textContent = 'Reading Excel...';
        const res = await readExcel(file);
        expectedMap = res.map;
        extractedItems = res.list;
        statusEl.textContent = `Excel loaded (${extractedItems.length} items).\nClick "Auto-Select & Monitor Scans".`;
      } else {
        statusEl.textContent = '❌ Unsupported file format.\nPlease select an Excel (.xlsx, .xls) or PDF (.pdf) file.';
        return;
      }

      dropZone.classList.add('has-file');
      dropIcon.textContent = fileType === 'pdf' ? '📄' : '📊';
      dropText.innerHTML = `<strong>${file.name}</strong>`;
      dropSubtext.textContent = 'Click or drag new file to replace';

      updateTsvView();
      autoSelectBtn.style.display = 'block';
      progressContainer.innerHTML = '';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error: ' + (err && err.message ? err.message : err);
    }
  }

  let scanMonitorInterval = null;

  function getProductPickerDialog() {
    const dialogs = [...document.querySelectorAll('div.ui-dialog, .ui-dialog, .p-dialog')];
    return dialogs.find(d => {
      const computed = window.getComputedStyle(d);
      if (computed.display === 'none' || computed.visibility === 'hidden') return false;
      const title = d.querySelector('.ui-dialog-title, .p-dialog-title');
      return title && title.textContent.trim() === '选择商品';
    }) || null;
  }

  async function autoSelectAndMonitor() {
    if (!expectedMap) {
      statusEl.textContent = 'Please upload an Excel or PDF file first.';
      return;
    }

    autoSelectBtn.disabled = true;
    statusEl.textContent = 'Opening product picker...';

    const pickerBtn = [...document.querySelectorAll('button .ui-button-text, .ui-button-text')]
      .find(el => el.textContent.trim() === '选择商品');
    if (!pickerBtn) {
      statusEl.textContent = '❌ Could not find "选择商品" button on this page.';
      autoSelectBtn.disabled = false;
      return;
    }
    pickerBtn.closest('button').click();

    let dialog = null;
    for (let i = 0; i < 20; i++) {
      dialog = getProductPickerDialog();
      if (dialog) break;
      await delay(200);
    }
    if (!dialog) {
      statusEl.textContent = '❌ Product picker dialog did not open.';
      autoSelectBtn.disabled = false;
      return;
    }

    statusEl.textContent = 'Matching EANs in picker...';
    await delay(300);

    const rows = [...dialog.querySelectorAll('.ui-table-scrollable-body-table tbody tr')]
      .filter(tr => tr.querySelectorAll('td').length > 0);

    let matchedCount = 0;
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 2) return;
      const ean = normalizeEAN(tds[1].textContent.trim());
      if (!ean || !expectedMap.has(ean)) return;

      const checkboxBox = tr.querySelector('td.table-chkbox .ui-chkbox-box');
      if (checkboxBox) {
        checkboxBox.click();
        matchedCount++;
      }
    });

    if (matchedCount === 0) {
      statusEl.textContent = '⚠️ No matching EANs found in the picker (check the product list/search filters).';
      autoSelectBtn.disabled = false;
      return;
    }

    statusEl.textContent = `Selected ${matchedCount} matching product(s). Confirming...`;
    await delay(200);

    const confirmBtn = [...dialog.querySelectorAll('.ui-dialog-buttonpane button .ui-button-text, .ui-dialog-buttonpane .ui-button-text')]
      .find(el => el.textContent.trim() === '选择');
    if (confirmBtn) {
      confirmBtn.closest('button').click();
    } else {
      statusEl.textContent = '⚠️ Selected rows, but could not find the "选择" confirm button — please click it manually.';
    }

    await delay(500);
    statusEl.textContent = `Total ${extractedItems.length} product(s) in invoice. Monitoring scans...`;

    injectExpectedQtyLabels();
    startScanMonitor();
    autoSelectBtn.disabled = false;
  }

  function injectExpectedQtyLabels() {
    if (!expectedMap) return;
    const tables = document.querySelectorAll('.receipt-table');
    tables.forEach(table => {
      const headers = [...table.querySelectorAll('.ui-table-scrollable-header-table thead th')];
      const headerTexts = headers.map(th => normText(th.textContent));
      const isAccessory = headerTexts.some(t => t.includes('配件编码'));

      const rows = [...table.querySelectorAll('.ui-table-scrollable-body-table tbody tr')]
        .filter(tr => tr.querySelectorAll('td').length > 0);

      if (isAccessory) {
        const eanIdx = headers.findIndex(th => normText(th.textContent) === '配件编码');
        const qtyIdx = headers.findIndex(th => normText(th.textContent) === '发货数');
        if (eanIdx === -1 || qtyIdx === -1) return;

        rows.forEach(tr => {
          const tds = tr.querySelectorAll('td');
          if (tds.length <= Math.max(eanIdx, qtyIdx)) return;
          const eanCellSpan = tds[eanIdx].querySelector('span') || tds[eanIdx];
          const ean = normalizeEAN(eanCellSpan.textContent.trim());
          if (!ean || !expectedMap.has(ean)) return;

          const qtyCell = tds[qtyIdx];
          if (qtyCell.querySelector('.sc-qty-expected-label')) return;

          const label = document.createElement('span');
          label.className = 'sc-qty-expected-label';
          label.textContent = `Expected: ${expectedMap.get(ean)}`;
          qtyCell.appendChild(label);
        });
      } else {
        const eanIdx = headers.findIndex(th => normText(th.textContent) === '商品编码');
        const qtyIdx = headers.findIndex(th => normText(th.textContent) === '发货数');
        if (eanIdx === -1 || qtyIdx === -1) return;

        rows.forEach(tr => {
          const tds = tr.querySelectorAll('td');
          if (tds.length <= Math.max(eanIdx, qtyIdx)) return;

          const ean = normalizeEAN(tds[eanIdx].textContent.trim());
          if (!ean || !expectedMap.has(ean)) return;

          const qtyCell = tds[qtyIdx];
          if (qtyCell.querySelector('.sc-qty-expected-label')) return;

          const label = document.createElement('span');
          label.className = 'sc-qty-expected-label';
          label.textContent = `Expected: ${expectedMap.get(ean)}`;
          qtyCell.appendChild(label);
        });
      }
    });
  }

  function updateScanProgressAndColor() {
    if (!expectedMap) {
      if (progressContainer) progressContainer.innerHTML = '';
      return;
    }

    const tables = document.querySelectorAll('.receipt-table');
    if (tables.length === 0) return;

    let visibleMainErrors = new Map();
    let visibleAccessoryErrors = new Map();

    tables.forEach(table => {
      const headers = [...table.querySelectorAll('.ui-table-scrollable-header-table thead th')];
      const headerTexts = headers.map(th => normText(th.textContent));
      const isAccessory = headerTexts.some(t => t.includes('配件编码'));

      const rows = [...table.querySelectorAll('.ui-table-scrollable-body-table tbody tr')]
        .filter(tr => tr.querySelectorAll('td').length > 0);

      if (isAccessory) {
        const eanIdx = headers.findIndex(th => normText(th.textContent) === '配件编码');
        const qtyInputIdx = headers.findIndex(th => normText(th.textContent) === '发货数');
        if (eanIdx === -1 || qtyInputIdx === -1) return;

        rows.forEach(tr => {
          const tds = tr.querySelectorAll('td');
          if (tds.length <= Math.max(eanIdx, qtyInputIdx)) return;
          const eanCellSpan = tds[eanIdx].querySelector('span') || tds[eanIdx];
          const ean = normalizeEAN(eanCellSpan.textContent.trim());
          if (!ean) return;

          persistentAccessorySeen.add(ean);

          const inputEl = tds[qtyInputIdx].querySelector('input');
          const val = inputEl ? normalizeQty(inputEl.value) : 0;

          tr.classList.remove('sc-row-not-completed', 'sc-row-completed', 'sc-row-error');

          if (!expectedMap.has(ean)) {
            tr.classList.add('sc-row-error');
            visibleAccessoryErrors.set(ean, { ean, detail: 'Unknown EAN' });
          } else {
            const expectedQty = expectedMap.get(ean) || 0;
            if (val === expectedQty && expectedQty > 0) {
              tr.classList.add('sc-row-completed');
            } else if (val > expectedQty) {
              tr.classList.add('sc-row-error');
              visibleAccessoryErrors.set(ean, { ean, detail: `Over-scanned (${val}/${expectedQty})` });
            } else {
              tr.classList.add('sc-row-not-completed');
            }
          }
        });
        accessoryErrorMap = visibleAccessoryErrors;
      } else {
        const eanIdx = headers.findIndex(th => normText(th.textContent) === '商品编码');
        const serialCountIdx = headers.findIndex(th => normText(th.textContent) === '串号数');
        if (eanIdx === -1 || serialCountIdx === -1) return;

        rows.forEach(tr => {
          const tds = tr.querySelectorAll('td');
          if (tds.length <= Math.max(eanIdx, serialCountIdx)) return;
          const ean = normalizeEAN(tds[eanIdx].textContent.trim());
          if (!ean) return;

          persistentMainSeen.add(ean);

          const scanned = parseInt(tds[serialCountIdx].textContent.trim(), 10) || 0;

          tr.classList.remove('sc-row-not-completed', 'sc-row-completed', 'sc-row-error');

          if (!expectedMap.has(ean)) {
            tr.classList.add('sc-row-error');
            visibleMainErrors.set(ean, { ean, detail: 'Unknown EAN' });
          } else {
            const expectedQty = expectedMap.get(ean) || 0;
            if (scanned === expectedQty && expectedQty > 0) {
              tr.classList.add('sc-row-completed');
            } else if (scanned > expectedQty) {
              tr.classList.add('sc-row-error');
              visibleMainErrors.set(ean, { ean, detail: `Over-scanned (${scanned}/${expectedQty})` });
            } else {
              tr.classList.add('sc-row-not-completed');
            }
          }
        });
        mainErrorMap = visibleMainErrors;
      }
    });

    // Compute missing items union across globally persistent seen sets
    const globalSeenUnion = new Set([...persistentMainSeen, ...persistentAccessorySeen]);
    const missingItems = [];
    expectedMap.forEach((expectedQty, ean) => {
      if (!globalSeenUnion.has(ean)) {
        missingItems.push({ ean, expectedQty });
      }
    });

    // Combine error maps from both tables globally
    const combinedErrorMap = new Map([...mainErrorMap, ...accessoryErrorMap]);
    const errorItems = [...combinedErrorMap.values()];

    let html = '';
    if (missingItems.length > 0) {
      html += `<div style="margin-top:8px; color: #343a40;"><strong>📋 Not yet added (${missingItems.length}):</strong></div>`;
      missingItems.forEach(item => {
        html += `<div class="sc-progress-row status-missing">
          <span>${item.ean}</span><span>Expected: ${item.expectedQty}</span>
        </div>`;
      });
    }

    if (errorItems.length > 0) {
      html += `<div style="margin-top:10px; color: #842029;"><strong>⚠️ Over-scanned / Wrong (${errorItems.length}):</strong></div>`;
      errorItems.forEach(item => {
        html += `<div class="sc-progress-row status-error">
          <span>${item.ean}</span><span>${item.detail}</span>
        </div>`;
      });
    }

    progressContainer.innerHTML = html;
  }

  function startScanMonitor() {
    updateScanProgressAndColor();

    document.addEventListener('input', (e) => {
      if (e.target.closest('.receipt-table')) {
        updateScanProgressAndColor();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.table-tap') || e.target.closest('.ui-tabview') || e.target.tagName === 'A' || e.target.tagName === 'LI') {
        setTimeout(updateScanProgressAndColor, 150);
      }
    });

    if (scanMonitorInterval) clearInterval(scanMonitorInterval);
    scanMonitorInterval = setInterval(() => {
      injectExpectedQtyLabels();
      updateScanProgressAndColor();
    }, 1000);
  }

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    processFile(file);
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

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

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, false);

  autoSelectBtn.addEventListener('click', () => autoSelectAndMonitor());
})();
