// ==UserScript==
// @name         Price Fill Tool (Remote Loader)
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Google Sheet or Excel price fill using EAN 商品编码
// @match        https://scsm-djifx.lingyingdms.com/*
// @exclude      https://scsm-djifx.lingyingdms.com/imeiprint*
// @exclude      https://scsm-djifx.lingyingdms.com/print*
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @grant        GM_xmlhttpRequest
// @connect      docs.google.com
// @connect      googleusercontent.com
// @connect      docs.googleusercontent.com
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/price-fill-tool-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/price-fill-tool-loader.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Fetch the raw core code with a cache-busting query string
    const coreScriptUrl = "https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/price-fill-tool-core.js?t=" + Date.now();

    GM_xmlhttpRequest({
        method: "GET",
        url: coreScriptUrl,
        onload: function(response) {
            if (response.status === 200) {
                try {
                    // Execute the dynamic remote code safely
                    new Function(response.responseText)();
                } catch (err) {
                    console.error("Error executing Price Fill Tool core script:", err);
                }
            } else {
                console.error("Failed to fetch Price Fill Tool core script. Status:", response.status);
            }
        },
        onerror: function(err) {
            console.error("Network error loading Price Fill Tool core script:", err);
        }
    });
})();
