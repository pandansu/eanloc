// ==UserScript==
// @name         Delivery Order Auto-Remark & Date Picker (Remote Loader)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Remote loader for DJI Delivery Order automation script
// @match        https://scsm-djifx.lingyingdms.com/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // Replace this URL with your hosted core script URL (e.g. GitHub Raw, Gist, or S3)
    const CORE_SCRIPT_URL = 'https://raw.githubusercontent.com/pandansu/eanloc/refs/heads/main/tm-scripts/auto-remark-core.js';

    GM_xmlhttpRequest({
        method: 'GET',
        url: CORE_SCRIPT_URL + '?t=' + Date.now(), // Cache-busting
        onload: function(response) {
            if (response.status === 200) {
                try {
                    const scriptFn = new Function(response.responseText);
                    scriptFn();
                } catch (err) {
                    console.error('[DJI Automation Remote Loader] Execution Error:', err);
                }
            } else {
                console.error('[DJI Automation Remote Loader] Failed to load core script. Status:', response.status);
            }
        },
        onerror: function(err) {
            console.error('[DJI Automation Remote Loader] Network error while fetching core script:', err);
        }
    });
})();
