// ==UserScript==
// @name         Stock Import Tool (Remote Loader)
// @namespace    stock-import-tool
// @version      3.1
// @description  Stock import tool
// @match        https://scsm-djifx.lingyingdms.com/*
// @exclude      https://scsm-djifx.lingyingdms.com/imeiprint*
// @exclude      https://scsm-djifx.lingyingdms.com/print*
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/stock-import-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/stock-import-loader.user.js
// ==/UserScript==

(function() {
    'use strict';

    const coreScriptUrl = "https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/stock-import-core.js?t=" + Date.now();

    GM_xmlhttpRequest({
        method: "GET",
        url: coreScriptUrl,
        onload: function(response) {
            if (response.status === 200) {
                try {
                    new Function(response.responseText)();
                } catch (err) {
                    console.error("Error executing Stock Import Tool core script:", err);
                }
            } else {
                console.error("Failed to fetch Stock Import Tool core script. Status:", response.status);
            }
        },
        onerror: function(err) {
            console.error("Network error loading Stock Import Tool core script:", err);
        }
    });
})();
