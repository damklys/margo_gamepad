// ==UserScript==
// @name         Gamepad to Keyboard
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ładuje kontroler pada z GitHub (margo_gamepad)
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
    'use strict';
    fetch('https://raw.githubusercontent.com/damklys/margo_gamepad/refs/heads/develop/margo_controller.js', { cache: 'no-store' })
        .then(r => r.text())
        .then(code => {
            const s = document.createElement('script');
            s.textContent = code;
            (document.head || document.documentElement).appendChild(s);
            s.remove();
        })
        .catch(e => console.error('[GP2KB] Błąd ładowania kontrolera:', e));
})();
