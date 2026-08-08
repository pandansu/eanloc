// ==UserScript==
// @name         Quantity Checker (Remote Loader)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Loader for Quantity Checker — fetches the actual logic from GitHub via @require.
// @match        https://scsm-djifx.lingyingdms.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
// @require      https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/quanty-checker-x-core.js?v=2.2
// @updateURL    https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/quanty-checker-x-core.js
// @downloadURL  https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/quanty-checker-x-core.js
// ==/UserScript==

// This file intentionally contains no logic — everything lives in
// quanty-checker-x-core.js, fetched via @require above. Edit and push
// the core file to update behavior; bump @version here (and the ?v=
// query string on the @require line) to make Tampermonkey pick up
// changes on the next update check.
