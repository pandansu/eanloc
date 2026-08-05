// ==UserScript==
// @name         Quanty Checker
// @namespace    http://tampermonkey.net/
// @version      5.5
// @description  Upload Excel, manual start, collapsible via fixed 'QC' button toggle, top/bottom stacked orientation.
// @match        https://scsm-djifx.lingyingdms.com/*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @updateURL    https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-qtychk/qtychk.user.js
// @downloadURL  https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-qtychk/qtychk.user.js
// ==/UserScript==


(function () {
  'use strict';

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

    /* Floating Panel Base */
    #eanQtyCheckPanel {
      position: absolute;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,.2);
      width: 280px;
      max-height: 80vh;
      overflow-y: auto;
      box-sizing: border-box;
      z-index: 1;
    }

    /* Vertical Placement - QC is TOP or BOTTOM of panel */
    #eanQtyCheckPanel.panel-above {
      bottom: 50px; /* Panel sits directly ABOVE QC button */
      top: auto;
    }
    #eanQtyCheckPanel.panel-below {
      top: 50px; /* Panel sits directly BELOW QC button */
      bottom: auto;
    }

    /* Horizontal Placement - Horizontal edge protection */
    #eanQtyCheckPanel.panel-align-left {
      left: 0; /* Align panel left edge with QC button */
      right: auto;
    }
    #eanQtyCheckPanel.panel-align-right {
      right: 0; /* Align panel right edge with QC button */
      left: auto;
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

    #eanQtyCheckPanel button, #eanQtyCheckPanel input {
      margin: 4px 0;
      width: 100%;
      cursor: pointer;
      box-sizing: border-box;
    }
    #eanQtyCheckPanel button { padding: 6px 12px; font-weight: bold; }

    #eanQtyRunBtn { background: #0d6efd; color: white; border: none; border-radius: 4px; padding: 8px 12px; }
    #eanQtyRunBtn:hover { background: #0b5ed7; }

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
      <div class="ean-panel-header" id="eanDragHandle">
        <span class="ean-panel-title">Quantity Checker</span>
      </div>
      <button id="eanQtyUploadBtn">Upload Excel</button>
      <input id="eanQtyFileInput" type="file" accept=".xlsx,.xls" style="display:none" />
      <button id="eanQtyRunBtn" style="display:none;">▶ Start Check</button>
      <div id="eanQtyStatus" style="margin-top:6px;word-break:break-word;white-space:pre-wrap;user-select:text;">Waiting for file...</div>
      <div id="eanQtyMissingContainer"></div>
    </div>
    <div id="eanQtyBadge" title="Click to toggle EAN Checker (Drag to move)">QC</div>
  `;
  document.body.appendChild(container);

  const badge = document.getElementById('eanQtyBadge');
  const panel = document.getElementById('eanQtyCheckPanel');
  const dragHandle = document.getElementById('eanDragHandle');

  const uploadBtn = document.getElementById('eanQtyUploadBtn');
  const fileInput = document.getElementById('eanQtyFileInput');
  const runBtn = document.getElementById('eanQtyRunBtn');
  const statusEl = document.getElementById('eanQtyStatus');
  const missingContainer = document.getElementById('eanQtyMissingContainer');

  let expectedMap = null;
  let matchedEanSet = new Set();
  let observer = null;

  /* ------------------- VERTICAL STACK ORIENTATION ------------------- */
  let isOpen = false;

  function updatePanelOrientation() {
    const badgeRect = badge.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Vertical Positioning (QC is strictly above or below the panel)
    if (badgeRect.top > viewportHeight / 2) {
      panel.classList.remove('panel-below');
      panel.classList.add('panel-above'); // Panel sits ABOVE QC button
    } else {
      panel.classList.remove('panel-above');
      panel.classList.add('panel-below'); // Panel sits BELOW QC button
    }

    // Horizontal Alignment (Align panel edges based on screen half)
    if (badgeRect.left < viewportWidth / 2) {
      // QC is on left half -> panel aligns left edge with QC button
      panel.classList.remove('panel-align-right');
      panel.classList.add('panel-align-left');
    } else {
      // QC is on right half -> panel aligns right edge with QC button
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
    if (e.target.tagName === 'BUTTON' && e.target !== badge) return;

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

    // Clamp QC button within viewport
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
  badge.addEventListener('mousedown', startDrag);
  dragHandle.addEventListener('touchstart', startDrag, { passive: true });
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

  /* ------------------- CHECKER LOGIC ------------------- */
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
    th.textContent = 'Excel Qty';

    const headers = theadTr.querySelectorAll('th');
    const targetTh = unitPriceIdx !== -1 ? headers[unitPriceIdx] : headers[qtyIdx + 1];

    if (targetTh) {
      theadTr.insertBefore(th, targetTh);
    } else {
      theadTr.appendChild(th);
    }
  }

  async function readExcel(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const ref = sheet['!ref'];
    if (!ref) throw new Error('Empty worksheet');
    const range = XLSX.utils.decode_range(ref);
    const map = new Map();

    for (let r = 1; r <= range.e.r; r++) {
      const eanCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
      const qtyCell = sheet[XLSX.utils.encode_cell({ r, c: 2 })];
      const ean = normalizeEAN(eanCell ? eanCell.v : '');
      const qty = normalizeQty(qtyCell ? qtyCell.v : '');
      if (!ean) continue;
      map.set(ean, (map.get(ean) || 0) + qty);
    }
    return map;
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
          ✓ All Excel items accounted for!
        </div>
      `;
    }
  }

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  async function runFullScan() {
    if (!expectedMap) {
      statusEl.textContent = 'Please upload an Excel file first.';
      return;
    }

    const dialog = getOrderDialog();
    if (!dialog) {
      statusEl.textContent = '❌ Error: Order details dialog ("发货单详情") not found.\nPlease open the order details page first!';
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

  uploadBtn.addEventListener('click', () => fileInput.click());
  runBtn.addEventListener('click', () => runFullScan());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    try {
      statusEl.textContent = 'Reading Excel...';
      expectedMap = await readExcel(file);

      runBtn.style.display = 'block';
      statusEl.textContent = `File loaded (${expectedMap.size} EANs).\nClick "Start Check".`;
      missingContainer.innerHTML = '';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error: ' + (err && err.message ? err.message : err);
    }
  });
})();
