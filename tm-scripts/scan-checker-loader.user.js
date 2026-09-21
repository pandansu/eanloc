// ==UserScript==
// @name         Scan Checker (Remote Loader)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Loader for Scan Checker — auto-selects products from a PDF/Excel manifest and monitors live serial scan progress. Fetches the actual logic from GitHub via @require.
// @match        https://scsm-djifx.lingyingdms.com/*
// @match        https://pandansu.github.io/eanloc/list/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
// @updateURL    https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/scan-checker-core.js
// @downloadURL  https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/scan-checker-core.js
// ==/UserScript==

(function() {
    'use strict';

    const CORE_URL = "https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/scan-checker-core.js";

    // Fetch the raw script from GitHub and run it
    GM_xmlhttpRequest({
        method: "GET",
        // Adding ?t= prevents GitHub CDN from caching old versions
        url: CORE_URL + "?t=" + Date.now(),
        onload: function(response) {
            if (response.status === 200) {
                eval(response.responseText);
            } else {
                console.error("[Scan Checker] Failed to load script core:", response.status);
            }
        },
        onerror: function(err) {
            console.error("[Scan Checker] Error fetching remote script:", err);
        }
    });
})();
