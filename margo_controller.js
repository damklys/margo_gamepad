(function () {
    'use strict';

    // ─── Left Joy ────────────────────────────────────────────────

    // GameSir Mac Nintendo Layout
    const BTN_A = 0, BTN_B = 1, BTN_X = 2, BTN_Y = 3, BTN_L3 = 10, BTN_R3 = 11, BTN_HOME = 8;

    const AXIS_THRESHOLD = 0.3;
    const SWITCH_THR = 0.2; 
    let moveDir = null;

    function updateMovement(ax, ay) {
        if (Math.sqrt(ax * ax + ay * ay) < AXIS_THRESHOLD) {
            if (moveDir) { release(moveDir); moveDir = null; }
            return;
        }

        let newDir = Math.abs(ax) >= Math.abs(ay)
            ? (ax > 0 ? 'ArrowRight' : 'ArrowLeft')
            : (ay > 0 ? 'ArrowDown'  : 'ArrowUp');

        if (moveDir && newDir !== moveDir) {
            const hori = moveDir === 'ArrowRight' || moveDir === 'ArrowLeft';
            const curStrength = hori ? Math.abs(ax) : Math.abs(ay);
            const newStrength = hori ? Math.abs(ay) : Math.abs(ax);
            if (newStrength < curStrength + SWITCH_THR) newDir = moveDir;
        }
        if (newDir !== moveDir) { if (moveDir) release(moveDir); moveDir = newDir; }
        press(moveDir);
    }
    const pressed = new Set();

    function sendKey(key, type) {
        const el = document.activeElement || document.body;
        el.dispatchEvent(new KeyboardEvent(type, {
            key, code: key, bubbles: true, cancelable: true,
        }));
    }

    function press(key)   { if (!pressed.has(key)) { pressed.add(key);    sendKey(key, 'keydown'); } }
    function release(key) { if (pressed.has(key))  { pressed.delete(key); sendKey(key, 'keyup');   } }

    // ─── INVENTORY OVERLAY ────────────────────────────────────────────────────────

    const GCOLS = 7, GROWS = 6, GBAGS = 4, CELL = 33;
    const R_THR = 0.5, REP_DELAY = 18, REP_STEP = 6;

    let invCurEl = null;
    let invOpen = false;
    let curC = 0, curR = 0, curBag = 0;
    let prevY = false, prevL = false, prevR = false, prevA = false, prevX = false, prevB = false, prevDpadR = false, prevDpadL = false, prevDpadD = false, prevDpadU = false, prevRT = false, prevLT = false, prevL3 = false, prevR3 = false;
    let prevLB = false, prevRB = false, prevHome = false;
    let hintsHidden = false;
    let rxF = 0, ryF = 0;
    let dlgOpen = false, dlgCursor = 0, dlgRyF = 0;
    let relogOpen = false, relogCursor = 0, relogRxF = 0;
    let lootOpen = false, lootCursor = 0, lootOnAccept = false, lootRxF = 0, lootRyF = 0;
    let skillsWinOpen = false, skillsWinCursor = 0, skillsWinLyF = 0, skillsWinLxF = 0;
    let widgetMenuOpen = false, widgetMenuRow = 0, widgetMenuSide = 0, widgetMenuIdx = 0;
    let widgetMenuRxF = 0, widgetMenuRyF = 0;
    const CAPTCHA_COLS = 3, CAPTCHA_ROWS = 2;
    let captchaOpen = false, captchaC = 0, captchaR = 0, captchaLxF = 0, captchaLyF = 0;

    const SHOP_COLS = 8, SHOP_ROWS = 10;
    const BUY_COLS  = 5, BUY_ROWS  = 1;
    const SELL_COLS = 5, SELL_ROWS = 4;

    let alertOpen = false;
    let shopOpen = false, shopPanel = 'items', shopOpenedInv = false;
    let shopC = 0, shopR = 0;
    let buyC  = 0, buyR  = 0;
    let sellC = 0, sellR = 0;
    let shopMerchIdx = 0;
    let shopLxF = 0, shopLyF = 0;
    let shopCurEl = null;
    let shopMenuOpen = false, shopMenuCursor = 0, shopMenuRyF = 0;
    let gwMenuOpen = false, gwSelected = 0, gwItems = [], gwMenuEl = null, gwLtF = 0, gwRtF = 0;
    let battleHintsEl = null, prevBattle = false;
    let exploreHintsEl = null;

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #__gp_inv_cur {
                position: fixed;
                pointer-events: none;
                z-index: 2147483647;
                display: none;
                box-sizing: border-box;
                background: rgba(137,180,250,0.22);
                border: 2px solid rgba(137,180,250,0.9);
                box-shadow: inset 0 0 10px rgba(137,180,250,0.3);
            }
            .interface-element-one-black-tile.__gp_bag_hl {
                outline: 2px solid #89b4fa !important;
                outline-offset: -2px !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.8) !important;
            }
            .relogger__one-character.__gp_relog_sel {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                outline-offset: 1px !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.8) !important;
            }
            .dialogue-window-answer.__gp_dlg_sel {
                background: rgba(137,180,250,0.18) !important;
                outline: 2px solid rgba(137,180,250,0.9) !important;
                outline-offset: -2px !important;
                border-radius: 2px !important;
            }
            #__gp_shop_cur {
                position: fixed;
                pointer-events: none;
                z-index: 2147483647;
                display: none;
                box-sizing: border-box;
                background: rgba(137,180,250,0.22);
                border: 2px solid rgba(137,180,250,0.9);
                box-shadow: inset 0 0 10px rgba(137,180,250,0.3);
            }
            #__gp_battle_hints {
                position: fixed;
                transform: translateX(-50%);
                pointer-events: none;
                z-index: 2147483647;
                display: none;
                flex-direction: row;
                gap: 5px;
                align-items: center;
            }
            .__gp_bh_tile {
                display: flex;
                align-items: center;
                gap: 4px;
                background: rgba(17,17,27,0.82);
                border: 1px solid rgba(137,180,250,0.25);
                border-radius: 5px;
                padding: 3px 7px 3px 5px;
                color: #cdd6f4;
                font-size: 10px;
                font-family: sans-serif;
                white-space: nowrap;
            }
            .__gp_bh_btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 17px; height: 17px;
                border-radius: 50%;
                background: rgba(137,180,250,0.15);
                border: 1.5px solid rgba(137,180,250,0.6);
                color: #89b4fa;
                font-size: 9px; font-weight: bold;
                font-family: sans-serif;
                flex-shrink: 0;
            }
            .skill-usable-slot {
                position: relative !important;
                overflow: visible !important;
            }
            .skill-usable-slot::after {
                content: '';
                position: absolute;
                top: 0; left: 0;
                background: rgba(17,17,27,0.85);
                color: #89b4fa;
                font-size: 7px; font-weight: bold;
                font-family: sans-serif;
                padding: 1px 3px;
                border-radius: 0 0 3px 0;
                border: 1px solid rgba(137,180,250,0.4);
                pointer-events: none;
                z-index: 99;
                line-height: 1.3;
            }
            .skill-usable-slot[slot="0"]::after { content: '←'; }
            .skill-usable-slot[slot="1"]::after { content: '↑'; }
            .skill-usable-slot[slot="2"]::after { content: 'X'; }
            .skill-usable-slot[slot="3"]::after { content: 'Y'; }
            .skill-usable-slot[slot="4"]::after { content: 'A'; }
            .skill-usable-slot[slot="5"]::after { content: 'B'; }
            .skill-usable-slot[slot="6"]::after { content: 'LB'; }
            .skill-usable-slot[slot="7"]::after { content: 'RB'; }
            .__gp_autofight_hl {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.5) !important;
                position: relative !important;
                overflow: visible !important;
            }
            .__gp_autofight_hl::after {
                content: '↓';
                position: absolute;
                top: -8px; right: -8px;
                width: 16px; height: 16px;
                background: rgba(137,180,250,0.9); border-radius: 50%;
                color: #1e1e2e; font-size: 10px; font-weight: bold;
                line-height: 16px; text-align: center; font-family: sans-serif;
                pointer-events: none; z-index: 10;
            }
            .alert-accept-hotkey.__gp_alert_x {
                outline: 2px solid #1a6b1a !important;
                box-shadow: 0 0 10px rgba(26,107,26,0.65) !important;
                position: relative !important;
                overflow: visible !important;
            }
            .alert-accept-hotkey.__gp_alert_x::after {
                content: 'X';
                position: absolute;
                top: -9px; right: -9px;
                width: 18px; height: 18px;
                background: #1a6b1a;
                border-radius: 50%;
                color: #fff;
                font-size: 11px; font-weight: bold;
                line-height: 18px; text-align: center;
                font-family: sans-serif;
                pointer-events: none;
                z-index: 10;
            }
            .alert-cancel-hotkey.__gp_alert_b {
                outline: 2px solid #8b1a1a !important;
                box-shadow: 0 0 10px rgba(139,26,26,0.65) !important;
                position: relative !important;
                overflow: visible !important;
            }
            .alert-cancel-hotkey.__gp_alert_b::after {
                content: 'B';
                position: absolute;
                top: -9px; right: -9px;
                width: 18px; height: 18px;
                background: #8b1a1a;
                border-radius: 50%;
                color: #fff;
                font-size: 11px; font-weight: bold;
                line-height: 18px; text-align: center;
                font-family: sans-serif;
                pointer-events: none;
                z-index: 10;
            }
            .__gp_cap_sel {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                outline-offset: -2px !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.8) !important;
                background: rgba(137,180,250,0.12) !important;
            }
            .menu-item.__gp_shop_menu_sel {
                background: rgba(137,180,250,0.22) !important;
                outline: 2px solid rgba(137,180,250,0.9) !important;
                outline-offset: -2px !important;
            }
            #__gp_gw_menu {
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: 2147483647;
                display: none;
            }
            #__gp_gw_center {
                display: none;
            }
            .__gp_gw_item {
                position: fixed;
                transform: translate(-50%, -50%);
                background: rgba(17,17,27,0.85);
                border: 2px solid rgba(137,180,250,0.35);
                border-radius: 6px;
                color: #cdd6f4;
                font-size: 11px;
                font-family: sans-serif;
                padding: 5px 9px;
                text-align: center;
                white-space: nowrap;
                max-width: 140px;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .loot-item-wrapper.__gp_loot_sel {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 6px rgba(137,180,250,0.5) !important;
            }
            .loot-wnd .accept-button.__gp_loot_accept .button {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.5) !important;
            }
            .loot-wnd .button.__gp_loot_x,
            .loot-wnd .button.__gp_loot_b {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                box-shadow: inset 0 0 6px rgba(137,180,250,0.3) !important;
                position: relative !important;
                overflow: visible !important;
            }
            .loot-wnd .button.__gp_loot_x::after,
            .loot-wnd .button.__gp_loot_b::after {
                position: absolute; top: -8px; right: -8px;
                width: 16px; height: 16px;
                background: rgba(137,180,250,0.9); border-radius: 50%;
                color: #1e1e2e; font-size: 10px; font-weight: bold;
                line-height: 16px; text-align: center; font-family: sans-serif;
                pointer-events: none; z-index: 10;
            }
            .loot-wnd .button.__gp_loot_x::after { content: 'X'; }
            .loot-wnd .button.__gp_loot_b::after { content: 'B'; }
            .loot-wnd .accept-button .button {
                position: relative !important;
                overflow: visible !important;
            }
            .loot-wnd .accept-button .button::after {
                content: 'Y';
                position: absolute; top: -8px; right: -8px;
                width: 16px; height: 16px;
                background: rgba(137,180,250,0.9); border-radius: 50%;
                color: #1e1e2e; font-size: 10px; font-weight: bold;
                line-height: 16px; text-align: center; font-family: sans-serif;
                pointer-events: none; z-index: 10;
            }
            .button.close-battle-ground.__gp_escape_hl {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.5) !important;
                position: relative !important;
                overflow: visible !important;
            }
            .button.close-battle-ground.__gp_escape_hl::after {
                content: 'B';
                position: absolute; top: -8px; right: -8px;
                width: 16px; height: 16px;
                background: rgba(137,180,250,0.9); border-radius: 50%;
                color: #1e1e2e; font-size: 10px; font-weight: bold;
                line-height: 16px; text-align: center; font-family: sans-serif;
                pointer-events: none; z-index: 10;
            }
            .__gp_solve_hl {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.5) !important;
                position: relative !important;
                overflow: visible !important;
            }
            .__gp_solve_hl::after {
                content: 'Y';
                position: absolute;
                top: -8px; right: -8px;
                width: 16px; height: 16px;
                background: rgba(137,180,250,0.9); border-radius: 50%;
                color: #1e1e2e; font-size: 10px; font-weight: bold;
                line-height: 16px; text-align: center; font-family: sans-serif;
                pointer-events: none; z-index: 10;
            }
            .__gp_widget_sel {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                box-shadow: 0 0 8px rgba(137,180,250,0.5) !important;
                overflow: visible !important;
            }
            .__gp_widget_sel::after {
                content: 'X';
                position: absolute;
                top: -8px; right: -8px;
                width: 16px; height: 16px;
                background: rgba(137,180,250,0.9); border-radius: 50%;
                color: #1e1e2e; font-size: 10px; font-weight: bold;
                line-height: 16px; text-align: center; font-family: sans-serif;
                pointer-events: none; z-index: 10;
            }
            .__gp_gw_item.sel {
                border-color: rgba(137,180,250,0.9);
                background: rgba(137,180,250,0.22);
                color: #89b4fa;
                box-shadow: 0 0 10px rgba(137,180,250,0.5);
            }
            .skill.clickable.__gp_skills_sel {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 6px rgba(137,180,250,0.5) !important;
            }
            .skills-window .skill-learn-btn .button {
                outline: 2px solid rgba(137,180,250,0.9) !important;
                box-shadow: 0 0 6px rgba(137,180,250,0.5) !important;
                position: relative !important;
                overflow: visible !important;
            }
            .skills-window .skill-learn-btn .button::after {
                content: 'Y';
                position: absolute;
                top: -8px; right: -8px;
                width: 16px; height: 16px;
                background: rgba(137,180,250,0.9); border-radius: 50%;
                color: #1e1e2e; font-size: 10px; font-weight: bold;
                line-height: 16px; text-align: center; font-family: sans-serif;
                pointer-events: none; z-index: 10;
            }

        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function getInvCursor() {
        if (!invCurEl) {
            invCurEl = document.createElement('div');
            invCurEl.id = '__gp_inv_cur';
            document.documentElement.appendChild(invCurEl);
        }
        return invCurEl;
    }

    function highlightBagTab() {
        document.querySelectorAll('.__gp_bag_hl').forEach(el => el.classList.remove('__gp_bag_hl'));
        document.querySelector(`.interface-element-one-black-tile.bag-${curBag + 1}`)
            ?.classList.add('__gp_bag_hl');
    }

    function showInv() {
        for (let i = 0; i < GBAGS; i++) {
            if (document.querySelector(`.bags-navigation .item.bag-pos-${i}`)?.classList.contains('active')) {
                curBag = i; break;
            }
        }
        invOpen = true;
        highlightBagTab();
        drawCursor();
    }

    function hideInv() {
        invOpen = false;
        getInvCursor().style.display = 'none';
        document.querySelectorAll('.__gp_bag_hl').forEach(el => el.classList.remove('__gp_bag_hl'));
        rxF = 0; ryF = 0;
    }

    function drawCursor() {
        const pane = document.querySelector('.inner-grid .scroll-pane') ||
                     document.querySelector('.inventory-grid .scroll-pane');
        if (!pane) return;

        const paneTop   = parseInt(pane.style.top) || 0;
        const bagOrigin = -paneTop;   // logical top of the current bag's row 0

        // Collect items visible in the current bag
        const bagItems = [...pane.querySelectorAll('.inventory-item')].filter(it => {
            const t = parseInt(it.style.top) || 0;
            return t >= bagOrigin && t < bagOrigin + GROWS * CELL;
        });

        const cur = getInvCursor();
        if (!bagItems.length) { cur.style.display = 'none'; return; }

        // ── Compute scale from two items at different columns (most robust) ──────
        let scale = 0;
        const firstRow = bagItems.filter(
            it => (parseInt(it.style.top) || 0) === (parseInt(bagItems[0].style.top) || 0)
        );
        if (firstRow.length >= 2) {
            firstRow.sort((a, b) => (parseInt(a.style.left)||0) - (parseInt(b.style.left)||0));
            const itA = firstRow[0], itB = firstRow[firstRow.length - 1];
            const rA  = itA.getBoundingClientRect(), rB = itB.getBoundingClientRect();
            const logD = (parseInt(itB.style.left)||0) - (parseInt(itA.style.left)||0);
            if (logD > 0) scale = (rB.left - rA.left) / logD;
        }
        if (!(scale > 0)) {
            const pw = pane.getBoundingClientRect().width;
            scale = pane.offsetWidth > 0 ? pw / pane.offsetWidth : 1;
        }

        // ── Calibrate grid origin from the first reference item ──────────────────
        const ref        = bagItems[0];
        const rRef       = ref.getBoundingClientRect();
        const refLogLeft = parseInt(ref.style.left) || 0;
        const refLogTop  = (parseInt(ref.style.top) || 0) - bagOrigin;
        const originLeft = rRef.left - refLogLeft * scale;
        const originTop  = rRef.top  - refLogTop  * scale;

        // ── Apply visualViewport offset if present (mobile pinch/zoom) ───────────
        const vv = window.visualViewport;
        const vvOL = vv ? vv.offsetLeft : 0;
        const vvOT = vv ? vv.offsetTop  : 0;

        cur.style.display = 'block';
        cur.style.left   = Math.round(originLeft - vvOL + curC * CELL * scale) + 'px';
        cur.style.top    = Math.round(originTop  - vvOT + curR * CELL * scale) + 'px';
        cur.style.width  = Math.round(CELL * scale) + 'px';
        cur.style.height = Math.round(CELL * scale) + 'px';
    }

    function moveCursor(dc, dr) {
        curC = Math.max(0, Math.min(GCOLS - 1, curC + dc));
        curR = Math.max(0, Math.min(GROWS - 1, curR + dr));
        drawCursor();
    }

    function activateItem() {
        const pane = document.querySelector('.inner-grid .scroll-pane') ||
                     document.querySelector('.inventory-grid .scroll-pane');
        if (!pane) return;
        // item CSS coords are always in game-logical px regardless of CSS transform scale
        const paneTop  = parseInt(pane.style.top) || 0;
        const itemTop  = -paneTop + curR * CELL;
        const itemLeft = curC * CELL;
        const item = document.querySelector(
            `.inventory-item[style*="top: ${itemTop}px"][style*="left: ${itemLeft}px"]`
        );
        if (!item) return;
        gpClick(item); // fires touchstart→touchend→...→click→dblclick via __gpTriggerClick
    }

    function switchBag(d) {
        curBag = (curBag + d + GBAGS) % GBAGS;
        curC = 0; curR = 0;
        gpClick(document.querySelector(`.bags-navigation .item.bag-pos-${curBag} canvas.icon`));
        if (invOpen) { highlightBagTab(); drawCursor(); }
    }

    // ─── BUILD SWITCHER ───────────────────────────────────────────────────────────

    let buildBusy = false, maxBuild = null;

    function getBuildIndex() {
        return parseInt(document.querySelector('.builds-interface .choose-build')?.textContent) || 1;
    }

    function pressShiftN(n) {
        const el = document.activeElement || document.body;
        ['keydown', 'keyup'].forEach(type =>
            el.dispatchEvent(new KeyboardEvent(type, {
                key: String(n), code: `Digit${n}`, shiftKey: true,
                bubbles: true, cancelable: true,
            }))
        );
    }

    function cycleBuildFwd() {
        if (buildBusy) return;
        buildBusy = true;
        const before = getBuildIndex();
        pressShiftN(before + 1);
        setTimeout(() => {
            if (getBuildIndex() === before) {
                maxBuild = before;
                pressShiftN(1);
            }
            buildBusy = false;
        }, 400);
    }

    function cycleBuildBwd() {
        if (buildBusy) return;
        buildBusy = true;
        const before = getBuildIndex();
        if (before > 1) {
            pressShiftN(before - 1);
            buildBusy = false;
        } else if (maxBuild !== null) {
            pressShiftN(maxBuild);
            buildBusy = false;
        } else {
            let n = 9;
            function tryPrev() {
                if (n < 2) { buildBusy = false; return; }
                pressShiftN(n);
                setTimeout(() => {
                    if (getBuildIndex() !== before) { maxBuild = n; buildBusy = false; return; }
                    n--;
                    tryPrev();
                }, 400);
            }
            tryPrev();
        }
    }

    // ─── RELOGGER ────────────────────────────────────────────────────────────────

    function getRelogChars() {
        return [...document.querySelectorAll('.relogger__one-character:not(.disabled)')];
    }

    function openRelog() {
        const chars = getRelogChars(); if (!chars.length) return;
        relogOpen = true; relogCursor = 0; relogRxF = 0; drawRelogCursor();
    }

    function closeRelog() {
        relogOpen = false; relogRxF = 0;
        document.querySelectorAll('.__gp_relog_sel').forEach(el => el.classList.remove('__gp_relog_sel'));
    }

    function drawRelogCursor() {
        getRelogChars().forEach((el, i) => el.classList.toggle('__gp_relog_sel', i === relogCursor));
    }

    function moveRelogCursor(d) {
        const chars = getRelogChars(); if (!chars.length) return;
        relogCursor = (relogCursor + d + chars.length) % chars.length; drawRelogCursor();
    }

    function confirmRelog() { gpClick(getRelogChars()[relogCursor]); closeRelog(); }

    // ─── BATTLE TARGET ───────────────────────────────────────────────────────────

    let battleTarget = 0;

    function getBattleWarriors() {
        return [...document.querySelectorAll('.battle-area .one-warrior')]
            .filter(w => !w.classList.contains('die-warrior'));
    }

    function cycleBattleTarget(d) {
        const warriors = getBattleWarriors();
        if (!warriors.length) return;
        battleTarget = (battleTarget + d + warriors.length) % warriors.length;
        const canvas = warriors[battleTarget].querySelector('.canvas-warrior-icon canvas');
        (canvas || warriors[battleTarget]).dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
        );
    }

    // ─── DIALOGUE OVERLAY ────────────────────────────────────────────────────────

    function getDlgAnswers() {
        return [...document.querySelectorAll('.dialogue-window-answer')]
            .filter(el => el.offsetHeight > 0);
    }

    function openDlg() {
        dlgOpen = true; dlgCursor = 0; dlgRyF = 0;
        console.log('[GP2KB] Dialog opened, answers:', getDlgAnswers().length);
        drawDlgCursor();
    }

    function closeDlg() {
        dlgOpen = false; dlgRyF = 0;
        document.querySelectorAll('.__gp_dlg_sel').forEach(el => el.classList.remove('__gp_dlg_sel'));
    }

    function drawDlgCursor() {
        getDlgAnswers().forEach((el, i) => el.classList.toggle('__gp_dlg_sel', i === dlgCursor));
    }

    function moveDlgCursor(d) {
        const a = getDlgAnswers(); if (!a.length) return;
        dlgCursor = (dlgCursor + d + a.length) % a.length; drawDlgCursor();
    }

    function confirmDlg() { gpClick(getDlgAnswers()[dlgCursor]); }

    // ─── SHOP ─────────────────────────────────────────────────────────────────────
    // Fixed grids: Shop(8×10) | Buy(5×1) | Backpack
    //                         | FastSell |
    //                         | Sell(5×4)|
    //                         | Finalize |

    function getShopCurEl() {
        if (!shopCurEl) {
            shopCurEl = document.createElement('div');
            shopCurEl.id = '__gp_shop_cur';
            document.documentElement.appendChild(shopCurEl);
        }
        return shopCurEl;
    }

    function getShopMerchBtns() {
        return [...document.querySelectorAll('.great-merchamp .button')];
    }

    function findItemAt(selector, col, row) {
        return [...document.querySelectorAll(selector)].find(el =>
            (parseInt(el.style.left) || 0) === col * CELL &&
            (parseInt(el.style.top)  || 0) === row * CELL
        );
    }

    function placeCurAt(el) {
        const r = el.getBoundingClientRect();
        const c = getShopCurEl();
        c.style.display = 'block';
        c.style.left    = r.left + 'px';   c.style.top    = r.top + 'px';
        c.style.width   = r.width + 'px';  c.style.height = r.height + 'px';
    }

    function placeCurAtGrid(refSel, col, row) {
        const ref = document.querySelector(refSel);
        if (!ref) return;
        const r = ref.getBoundingClientRect();
        const c = getShopCurEl();
        c.style.display = 'block';
        c.style.left    = (r.left + col * CELL) + 'px';
        c.style.top     = (r.top  + row * CELL) + 'px';
        c.style.width   = CELL + 'px';
        c.style.height  = CELL + 'px';
    }

    function drawShopCursor() {
        getShopCurEl().style.display = 'none';
        switch (shopPanel) {
            case 'items': {
                const it = findItemAt('.shop-items .scroll-pane .shop-item', shopC, shopR);
                if (it) placeCurAt(it); else placeCurAtGrid('.shop-items .scroll-pane', shopC, shopR);
                break;
            }
            case 'buy': {
                const it = findItemAt('.buy-items .item', buyC, buyR);
                if (it) placeCurAt(it); else placeCurAtGrid('.buy-items', buyC, buyR);
                break;
            }
            case 'fastsell': {
                const btn = getShopMerchBtns()[shopMerchIdx];
                if (btn) placeCurAt(btn);
                break;
            }
            case 'sell': {
                const it = findItemAt('.sell-items .item', sellC, sellR);
                if (it) placeCurAt(it); else placeCurAtGrid('.sell-items', sellC, sellR);
                break;
            }
            case 'finalize': {
                const btn = document.querySelector('.finalize-button .button');
                if (btn) placeCurAt(btn);
                break;
            }
            // 'backpack': invOpen overlay handles cursor
        }
    }

    function openShop() {
        shopOpen = true; shopPanel = 'items'; shopOpenedInv = false;
        shopC = 0; shopR = 0; buyC = 0; buyR = 0; sellC = 0; sellR = 0;
        shopMerchIdx = 0; shopLxF = 0; shopLyF = 0;
    }

    function closeShop() {
        shopOpen = false; shopLxF = 0; shopLyF = 0;
        if (shopMenuOpen) closeShopMenu();
        if (shopCurEl) shopCurEl.style.display = 'none';
        if (shopOpenedInv && invOpen) { hideInv(); shopOpenedInv = false; }
    }

    function shopEnterBackpack() {
        shopPanel = 'backpack';
        if (shopCurEl) shopCurEl.style.display = 'none';
        if (!invOpen) { showInv(); shopOpenedInv = true; }
    }

    function shopNavigate(dx, dy) {
        switch (shopPanel) {
            case 'items':
                if      (dx > 0) { if (shopC < SHOP_COLS - 1) shopC++; else { shopPanel = 'buy'; buyC = 0; buyR = Math.min(shopR, BUY_ROWS - 1); } }
                else if (dx < 0) { if (shopC > 0) shopC--; }
                else if (dy > 0) { if (shopR < SHOP_ROWS - 1) shopR++; else { shopPanel = 'fastsell'; shopMerchIdx = 0; } }
                else if (dy < 0) { if (shopR > 0) shopR--; }
                break;
            case 'buy':
                if      (dx > 0) { if (buyC < BUY_COLS - 1) buyC++; else { shopEnterBackpack(); return; } }
                else if (dx < 0) { if (buyC > 0) buyC--; else { shopPanel = 'items'; shopC = SHOP_COLS - 1; shopR = buyR; } }
                else if (dy > 0) { shopPanel = 'fastsell'; shopMerchIdx = 0; }
                // dy < 0: top edge, stay
                break;
            case 'fastsell': {
                const btns = getShopMerchBtns();
                if      (dx > 0) { if (shopMerchIdx < btns.length - 1) shopMerchIdx++; else { shopEnterBackpack(); return; } }
                else if (dx < 0) { if (shopMerchIdx > 0) shopMerchIdx--; else { shopPanel = 'items'; shopC = SHOP_COLS - 1; } }
                else if (dy < 0) { shopPanel = 'buy'; buyC = 0; buyR = 0; }
                else if (dy > 0) { shopPanel = 'sell'; sellC = 0; sellR = 0; }
                break;
            }
            case 'sell':
                if      (dx > 0) { if (sellC < SELL_COLS - 1) sellC++; else { shopEnterBackpack(); return; } }
                else if (dx < 0) { if (sellC > 0) sellC--; else { shopPanel = 'items'; shopC = SHOP_COLS - 1; shopR = Math.min(sellR, SHOP_ROWS - 1); } }
                else if (dy < 0) { if (sellR > 0) sellR--; else { shopPanel = 'fastsell'; shopMerchIdx = getShopMerchBtns().length - 1; } }
                else if (dy > 0) { if (sellR < SELL_ROWS - 1) sellR++; else shopPanel = 'finalize'; }
                break;
            case 'finalize':
                if      (dx > 0) { shopEnterBackpack(); return; }
                else if (dx < 0) { shopPanel = 'items'; shopC = SHOP_COLS - 1; shopR = SHOP_ROWS - 1; }
                else if (dy < 0) { shopPanel = 'sell'; sellR = SELL_ROWS - 1; }
                break;
        }
        drawShopCursor();
    }

    function shopActivate() {
        switch (shopPanel) {
            case 'items':    gpClick(findItemAt('.shop-items .scroll-pane .shop-item', shopC, shopR)); break;
            case 'buy':      gpClick(findItemAt('.buy-items .item', buyC, buyR)); break;
            case 'fastsell': gpClick(getShopMerchBtns()[shopMerchIdx]); break;
            case 'sell':     gpClick(findItemAt('.sell-items .item', sellC, sellR)); break;
            case 'finalize': gpClick(document.querySelector('.finalize-button .button')); break;
            case 'backpack': activateItem(); break;
        }
    }

    function getShopMenuItems() {
        return [...document.querySelectorAll('.popup-menu.show .menu-item')]
            .filter(el => el.offsetHeight > 0);
    }

    function openShopMenu() {
        shopMenuOpen = true; shopMenuCursor = 0; shopMenuRyF = 0;
        drawShopMenuCursor();
    }

    function closeShopMenu() {
        shopMenuOpen = false; shopMenuRyF = 0;
        document.querySelectorAll('.__gp_shop_menu_sel').forEach(el => el.classList.remove('__gp_shop_menu_sel'));
        gpClick(document.querySelector('.popup-menu.show .popup-menu__header'));
    }

    function drawShopMenuCursor() {
        getShopMenuItems().forEach((el, i) => el.classList.toggle('__gp_shop_menu_sel', i === shopMenuCursor));
    }

    function moveShopMenuCursor(d) {
        const a = getShopMenuItems(); if (!a.length) return;
        shopMenuCursor = (shopMenuCursor + d + a.length) % a.length; drawShopMenuCursor();
    }

    function confirmShopMenu() {
        gpClick(getShopMenuItems()[shopMenuCursor]);
        closeShopMenu();
    }

    function shopContextMenu() {
        let el = null;
        switch (shopPanel) {
            case 'items': el = findItemAt('.shop-items .scroll-pane .shop-item', shopC, shopR); break;
            case 'buy':   el = findItemAt('.buy-items .item', buyC, buyR); break;
            case 'sell':  el = findItemAt('.sell-items .item', sellC, sellR); break;
        }
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top  + rect.height / 2,
        }));
        requestAnimationFrame(() => { if (getShopMenuItems().length) openShopMenu(); });
    }

    // ─── CAPTCHA ─────────────────────────────────────────────────────────────────

    function getCaptchaGridBtns() {
        return [...document.querySelectorAll('.captcha__buttons .button')];
    }

    function getCaptchaConfirmBtn() {
        return document.querySelector('.captcha__confirm .button');
    }

    function openCaptcha() {
        captchaOpen = true; captchaC = 0; captchaR = 0; captchaLxF = 0; captchaLyF = 0;
        drawCaptchaCursor();
    }

    function closeCaptcha() {
        captchaOpen = false; captchaLxF = 0; captchaLyF = 0;
        document.querySelectorAll('.__gp_cap_sel').forEach(el => el.classList.remove('__gp_cap_sel'));
    }

    function drawCaptchaCursor() {
        document.querySelectorAll('.__gp_cap_sel').forEach(el => el.classList.remove('__gp_cap_sel'));
        if (captchaR === CAPTCHA_ROWS) {
            getCaptchaConfirmBtn()?.classList.add('__gp_cap_sel');
        } else {
            getCaptchaGridBtns()[captchaR * CAPTCHA_COLS + captchaC]?.classList.add('__gp_cap_sel');
        }
    }

    function moveCaptchaCursor(dc, dr) {
        const newR = captchaR + dr;
        if (newR < 0 || newR > CAPTCHA_ROWS) return;
        captchaR = newR;
        if (captchaR < CAPTCHA_ROWS)
            captchaC = Math.max(0, Math.min(CAPTCHA_COLS - 1, captchaC + dc));
        drawCaptchaCursor();
    }

    function captchaClick(btn) {
        if (!btn) return;
        if (typeof window.__gpTriggerClick === 'function') {
            window.__gpTriggerClick(btn);
        } else {
            btn.click();
        }
    }

    function activateCaptchaBtn() {
        if (captchaR === CAPTCHA_ROWS) {
            captchaClick(getCaptchaConfirmBtn());
        } else {
            captchaClick(getCaptchaGridBtns()[captchaR * CAPTCHA_COLS + captchaC]);
            drawCaptchaCursor();
        }
    }

    // ─── GW RADIAL MENU ──────────────────────────────────────────────────────────

    let gwFetching = false;

    function readTipName(tipEl) {
        if (!tipEl) return null;
        const content = tipEl.querySelector('.content') ?? tipEl;
        const center = content.querySelector('center');
        if (center) {
            for (const node of center.childNodes) {
                if (node.nodeType === 3) {
                    const t = node.textContent.trim();
                    if (t) return t;
                }
            }
        }
        return content.innerText?.split('\n')[0]?.trim() || null;
    }

    function showGwLoading() {
        if (!gwMenuEl) {
            gwMenuEl = document.createElement('div');
            gwMenuEl.id = '__gp_gw_menu';
            document.documentElement.appendChild(gwMenuEl);
        }
        gwMenuEl.style.display = 'block';
        gwMenuEl.innerHTML = '<div id="__gp_gw_center">Szukam...</div>';
    }

    function renderGwMenu() {
        if (!gwMenuEl) {
            gwMenuEl = document.createElement('div');
            gwMenuEl.id = '__gp_gw_menu';
            document.documentElement.appendChild(gwMenuEl);
        }
        gwMenuEl.style.display = 'block';
        gwMenuEl.innerHTML = '';

        const centerEl = document.createElement('div');
        centerEl.id = '__gp_gw_center';
        gwMenuEl.appendChild(centerEl);

        const R = 200;
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        gwItems.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = '__gp_gw_item' + (i === gwSelected ? ' sel' : '');
            div.textContent = item.name;
            div.style.left = Math.round(cx + R * Math.cos(item.angle)) + 'px';
            div.style.top  = Math.round(cy + R * Math.sin(item.angle)) + 'px';
            gwMenuEl.appendChild(div);
        });
    }

    async function openGwMenu() {
        if (gwFetching || gwMenuOpen) return;
        gwFetching = true;
        gwMenuOpen = true;
        gwItems = [];
        gwSelected = 0;
        showGwLoading();

        const elements = [...document.querySelectorAll('.mmpMapObject.mmp-gw')];
        if (!elements.length) { gwFetching = false; closeGwMenu(); return; }

        // CSS map-space coordinates for reliable angle computation
        const mapCoords = elements.map(el => ({
            el,
            x: parseFloat(el.style.left) || 0,
            y: parseFloat(el.style.top)  || 0,
        }));
        // Centroid of all gateways as reference center
        const refX = mapCoords.reduce((s, p) => s + p.x, 0) / mapCoords.length;
        const refY = mapCoords.reduce((s, p) => s + p.y, 0) / mapCoords.length;

        const seen = new Set();
        const items = [];

        for (const { el, x, y } of mapCoords) {
            if (!gwMenuOpen) break;

            const rect = el.getBoundingClientRect();
            const ex = rect.left + rect.width / 2, ey = rect.top + rect.height / 2;
            ['pointerover', 'mouseover', 'mouseenter', 'mousemove'].forEach(type =>
                el.dispatchEvent(new MouseEvent(type, {
                    bubbles: true, cancelable: true, view: window, clientX: ex, clientY: ey,
                }))
            );
            if (window.jQuery) window.jQuery(el).trigger('mouseenter').trigger('mouseover');

            await new Promise(r => setTimeout(r, 200));
            if (!gwMenuOpen) break;

            // tip-wrapper is added to body, not as child of el — always read global visible one
            const tip = [...document.querySelectorAll('.tip-wrapper')].find(t => t.offsetHeight > 0);
            const name = readTipName(tip);

            if (!name || seen.has(name)) continue;
            seen.add(name);
            items.push({ name, el, angle: Math.atan2(y - refY, x - refX) });
        }

        gwFetching = false;
        if (!gwMenuOpen) return;

        items.sort((a, b) => a.angle - b.angle);
        const step = (2 * Math.PI) / items.length;
        items.forEach((item, i) => { item.angle = -Math.PI / 2 + i * step; });
        gwItems = items;

        if (!gwItems.length) { closeGwMenu(); return; }
        renderGwMenu();
    }

    function closeGwMenu() {
        gwMenuOpen = false;
        gwFetching = false;
        gwLtF = 0; gwRtF = 0;
        if (gwMenuEl) gwMenuEl.style.display = 'none';
    }

    function drawGwMenu() {
        if (!gwMenuEl) return;
        gwMenuEl.querySelectorAll('.__gp_gw_item').forEach((el, i) =>
            el.classList.toggle('sel', i === gwSelected)
        );
    }

    function updateGwSelection(lx, ly) {
        if (!gwItems.length || Math.sqrt(lx * lx + ly * ly) < 0.3) return;
        const angle = Math.atan2(ly, lx);
        let minDiff = Infinity, best = gwSelected;
        gwItems.forEach((item, i) => {
            let diff = Math.abs(item.angle - angle);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            if (diff < minDiff) { minDiff = diff; best = i; }
        });
        if (best !== gwSelected) { gwSelected = best; drawGwMenu(); }
    }

    function getBattleHintsEl() {
        if (!battleHintsEl) {
            battleHintsEl = document.createElement('div');
            battleHintsEl.id = '__gp_battle_hints';
            battleHintsEl.innerHTML =
                '<div class="__gp_bh_tile"><span class="__gp_bh_btn">LT</span> ← Zmień cel</div>' +
                '<div class="__gp_bh_tile"><span class="__gp_bh_btn">RT</span> → Zmień cel</div>';
            document.documentElement.appendChild(battleHintsEl);
        }
        return battleHintsEl;
    }

    function createExploreHints() {
        const container = document.querySelector('.game-window-positioner');
        if (!container || exploreHintsEl) return;
        exploreHintsEl = document.createElement('div');
        exploreHintsEl.id = '__gp_explore_hints';
        Object.assign(exploreHintsEl.style, {
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: '99999',
            display: 'none',
            flexDirection: 'row',
            gap: '5px',
            alignItems: 'center',
        });
        exploreHintsEl.innerHTML =
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">LB</span> ← EQ</div>' +
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">LT</span> ← Bag</div>' +
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">X</span> [Q] Mob</div>' +
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">Y</span> NPC</div>' +
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">B</span> [T] Mob</div>' +
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">A</span> PvP</div>' +
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">RT</span> Bag →</div>' +
            '<div class="__gp_bh_tile"><span class="__gp_bh_btn">RB</span> EQ →</div>';
        container.appendChild(exploreHintsEl);
    }

    function updateExploreHintsPos() {
        if (!exploreHintsEl) return;
        const container = exploreHintsEl.parentElement;
        if (!container) return;
        const cr = container.getBoundingClientRect();
        const canvas = document.getElementById('GAME_CANVAS');
        const vr = canvas ? canvas.getBoundingClientRect() : cr;
        exploreHintsEl.style.top = Math.round(vr.top - cr.top + 28) + 'px';
    }

    // ─── WIDGET BAR SELECTOR ──────────────────────────────────────────────────────
    // Wiersze (dynamiczne):
    //   row 0: [top-left          | top-right]
    //   row 1: [bot-left-add      | bot-right-add]  ← tylko gdy któryś istnieje i widoczny
    //   row 2: [bot-left          | bot-right]
    // side 0 = lewa strona, side 1 = prawa strona
    // R-stick X: kafelki w wierszu, przekracza krawędź → przełącza side (wrap kołowy)
    // R-stick Y: zmiana wiersza po tej samej stronie
    // D-pad ← → ↑ ↓ – fallback (te same akcje)
    // D-pad ↑ od wiersza 0 zamyka selektor

    function getWidgetRows() {
        const rows = [
            ['.top-left.main-buttons-container',            '.top-right.main-buttons-container'],
        ];
        const hasAdd =
            (document.querySelector('.bottom-left-additional.main-buttons-container')?.offsetHeight  ?? 0) > 0 ||
            (document.querySelector('.bottom-right-additional.main-buttons-container')?.offsetHeight ?? 0) > 0;
        if (hasAdd) {
            rows.push(['.bottom-left-additional.main-buttons-container', '.bottom-right-additional.main-buttons-container']);
        }
        rows.push(['.bottom-left.main-buttons-container', '.bottom-right.main-buttons-container']);
        return rows;
    }

    function getWidgetSideItems(row, side) {
        const rows = getWidgetRows();
        const sel = rows[row]?.[side];
        if (!sel) return [];
        const bar = document.querySelector(sel);
        if (!bar) return [];
        return [...bar.querySelectorAll('.widget-button.widget-in-interface-bar')]
            .sort((a, b) => parseInt(a.style.left || '0') - parseInt(b.style.left || '0'));
    }

    function drawWidgetMenuCursor() {
        document.querySelectorAll('.__gp_widget_sel')
            .forEach(el => el.classList.remove('__gp_widget_sel'));
        const items = getWidgetSideItems(widgetMenuRow, widgetMenuSide);
        if (items[widgetMenuIdx]) items[widgetMenuIdx].classList.add('__gp_widget_sel');
    }

    function openWidgetMenu() {
        widgetMenuOpen = true;
        widgetMenuRow = 0; widgetMenuSide = 0; widgetMenuIdx = 0;
        drawWidgetMenuCursor();
    }

    function closeWidgetMenu() {
        widgetMenuOpen = false;
        widgetMenuRxF = 0; widgetMenuRyF = 0;
        document.querySelectorAll('.__gp_widget_sel')
            .forEach(el => el.classList.remove('__gp_widget_sel'));
    }

    function confirmWidgetMenu() {
        const items = getWidgetSideItems(widgetMenuRow, widgetMenuSide);
        if (items[widgetMenuIdx]) gpClick(items[widgetMenuIdx]);
        closeWidgetMenu();
    }

    function widgetMoveX(d) {
        const items = getWidgetSideItems(widgetMenuRow, widgetMenuSide);
        const newIdx = widgetMenuIdx + d;
        if (newIdx >= 0 && newIdx < items.length) {
            widgetMenuIdx = newIdx;
        } else {
            const otherSide = 1 - widgetMenuSide;
            const otherItems = getWidgetSideItems(widgetMenuRow, otherSide);
            if (otherItems.length > 0) {
                widgetMenuSide = otherSide;
                widgetMenuIdx = d > 0 ? 0 : otherItems.length - 1;
            } else if (items.length > 0) {
                widgetMenuIdx = d > 0 ? 0 : items.length - 1;
            }
        }
        drawWidgetMenuCursor();
    }

    function widgetMoveY(d) {
        const rows = getWidgetRows();
        const newRow = widgetMenuRow + d;
        if (newRow < 0) { closeWidgetMenu(); return; }
        if (newRow >= rows.length) return;
        let side = widgetMenuSide;
        let items = getWidgetSideItems(newRow, side);
        if (!items.length) {
            side = 1 - side;
            items = getWidgetSideItems(newRow, side);
        }
        if (items.length) {
            widgetMenuRow = newRow;
            widgetMenuSide = side;
            widgetMenuIdx = Math.min(widgetMenuIdx, items.length - 1);
        }
        drawWidgetMenuCursor();
    }

    function clickBattleSkillSlot(slot) {
        const el = document.querySelector(`.skill-usable-slot[slot="${slot}"] .battle-skill`);
        if (el) gpClick(el);
    }

    function showBattleUI() {
        getBattleHintsEl(); // ensure element exists
    }

    function hideBattleUI() {
        if (battleHintsEl) battleHintsEl.style.display = 'none';
        document.querySelectorAll('.__gp_autofight_hl')
            .forEach(el => el.classList.remove('__gp_autofight_hl'));
    }

    function updateBattleHintsPos() {
        const win = document.querySelector('.battle-window');
        if (!win || !battleHintsEl) return;
        const r = win.getBoundingClientRect();
        battleHintsEl.style.left = Math.round(r.left + r.width / 2) + 'px';
        battleHintsEl.style.top  = Math.round(r.top + 8) + 'px';
        const fightBtn = document.querySelector('.button.auto-fight-btn');
        document.querySelectorAll('.__gp_autofight_hl')
            .forEach(el => el.classList.remove('__gp_autofight_hl'));
        if (fightBtn) fightBtn.classList.add('__gp_autofight_hl');
    }

    function showAlertHighlight() {
        document.querySelector('.mAlert .alert-accept-hotkey')?.classList.add('__gp_alert_x');
        document.querySelector('.mAlert .alert-cancel-hotkey')?.classList.add('__gp_alert_b');
    }

    function hideAlertHighlight() {
        document.querySelectorAll('.__gp_alert_x').forEach(el => el.classList.remove('__gp_alert_x'));
        document.querySelectorAll('.__gp_alert_b').forEach(el => el.classList.remove('__gp_alert_b'));
    }

    function isPlayerDead() {
        return !!document.querySelector('.battle-area .one-warrior:not(.one-warrior--npc).die-warrior');
    }

    function leaveBattle() {
        // próbuj kolejnych selektorów — jeden z nich trafi w przycisk "Opuść walkę"
        const candidates = [
            () => document.querySelector('.widget-button.widget-battle-escape'),
            () => document.querySelector('.battle-escape'),
            () => document.querySelector('.battle-interface .button-escape'),
            () => [...document.querySelectorAll('.battle-interface .button')]
                      .find(el => el.textContent.includes('Opu')),
            () => [...document.querySelectorAll('.button')]
                      .find(el => el.textContent.trim().startsWith('Opu') && el.offsetHeight > 0),
        ];
        for (const get of candidates) {
            const el = get();
            if (el) { gpClick(el); return; }
        }
    }

    function confirmGw() {
        const item = gwItems[gwSelected];
        if (!item) return;
        item.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        closeGwMenu();
    }

    // ─── PAGE-CONTEXT INJECTION ──────────────────────────────────────────────────
    // Injected immediately so we capture addEventListener calls before game code runs.
    // We store all registered handlers in a WeakMap, then call them directly with
    // a plain object {isTrusted: true} — bypasses the non-configurable native getter.

    function injectPageContext() {
        const s = document.createElement('script');
        s.textContent = `(function() {
            var origAEL = EventTarget.prototype.addEventListener;
            var origREL = EventTarget.prototype.removeEventListener;
            var reg = new WeakMap();

            EventTarget.prototype.addEventListener = function(type, fn, opts) {
                if (typeof fn === 'function') {
                    if (!reg.has(this)) reg.set(this, Object.create(null));
                    var m = reg.get(this);
                    if (!m[type]) m[type] = [];
                    m[type].push(fn);
                }
                return origAEL.call(this, type, fn, opts);
            };

            EventTarget.prototype.removeEventListener = function(type, fn, opts) {
                if (typeof fn === 'function' && reg.has(this)) {
                    var arr = reg.get(this)[type];
                    if (arr) { var i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }
                }
                return origREL.call(this, type, fn, opts);
            };

            function fireSeq(el, type, cx, cy, tl, tl0) {
                var isTouch = type === 'touchstart' || type === 'touchend';
                var fake = {
                    isTrusted: true, type: type,
                    target: el, relatedTarget: null,
                    clientX: cx, clientY: cy,
                    screenX: cx, screenY: cy,
                    pageX: cx, pageY: cy,
                    offsetX: 0, offsetY: 0,
                    button: 0, buttons: 1, which: 1, detail: 1,
                    bubbles: true, cancelable: true, composed: true,
                    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
                    view: window, timeStamp: Date.now(),
                    touches:        isTouch ? (type === 'touchend' ? tl0 : tl) : null,
                    targetTouches:  isTouch ? (type === 'touchend' ? tl0 : tl) : null,
                    changedTouches: isTouch ? tl : null,
                    preventDefault: function() {},
                    stopPropagation: function() { node = null; },
                    stopImmediatePropagation: function() { node = null; },
                };
                var node = el;
                while (node && node !== document.documentElement) {
                    if (reg.has(node)) {
                        var hh = reg.get(node)[type];
                        if (hh) {
                            fake.currentTarget = node;
                            for (var i = 0, c = hh.slice(); i < c.length; i++) {
                                try { c[i].call(node, fake); } catch(e) {}
                                if (!node) break;
                            }
                        }
                    }
                    if (!node) break;
                    node = node.parentElement || node.parentNode;
                }
                if (reg.has(document)) {
                    var dh = reg.get(document)[type];
                    if (dh) {
                        fake.currentTarget = document;
                        for (var j = 0, dc = dh.slice(); j < dc.length; j++) {
                            try { dc[j].call(document, fake); } catch(e) {}
                        }
                    }
                }
            }

            window.__gpTriggerClick = function(el) {
                if (!el) return;
                var rect = el.getBoundingClientRect();
                var cx = Math.round(rect.left + rect.width  / 2);
                var cy = Math.round(rect.top  + rect.height / 2);
                var tp = { clientX:cx, clientY:cy, screenX:cx, screenY:cy, pageX:cx, pageY:cy,
                           identifier:1, target:el, radiusX:1, radiusY:1, rotationAngle:0, force:1 };
                var tl = [tp]; tl.item = function(i) { return this[i]; };
                var tl0 = []; tl0.item = function(i) { return this[i]; };
                var seq = ['touchstart','touchend','pointerdown','mousedown','pointerup','mouseup','click','dblclick'];
                for (var si = 0; si < seq.length; si++) fireSeq(el, seq[si], cx, cy, tl, tl0);
            };
        })();`;
        (document.head || document.documentElement).appendChild(s);
        s.remove();
    }

    // ─── LOOT ────────────────────────────────────────────────────────────────────

    function getLootItems() {
        return [...document.querySelectorAll('.loot-wnd .loot-item-wrapper')];
    }

    function showLootHighlights() {
        getLootItems().forEach(wrapper => {
            const cantMust = wrapper.classList.contains('cant-must');
            const xBtn = (!cantMust && wrapper.querySelector('.button.must'))
                ? wrapper.querySelector('.button.must')
                : wrapper.querySelector('.button.want');
            xBtn?.classList.add('__gp_loot_x');
            wrapper.querySelector('.button.not')?.classList.add('__gp_loot_b');
        });
    }

    function drawLootCursor() {
        document.querySelectorAll('.__gp_loot_sel').forEach(el => el.classList.remove('__gp_loot_sel'));
        document.querySelectorAll('.__gp_loot_accept').forEach(el => el.classList.remove('__gp_loot_accept'));
        if (lootOnAccept) {
            document.querySelector('.loot-wnd .accept-button')?.classList.add('__gp_loot_accept');
        } else {
            const items = getLootItems();
            lootCursor = Math.min(lootCursor, Math.max(0, items.length - 1));
            items[lootCursor]?.classList.add('__gp_loot_sel');
        }
    }

    function openLoot() {
        lootCursor = 0; lootOnAccept = false; lootRxF = 0; lootRyF = 0;
        showLootHighlights();
        drawLootCursor();
    }

    function closeLoot() {
        lootRxF = 0; lootRyF = 0;
        ['.__gp_loot_sel', '.__gp_loot_accept', '.__gp_loot_x', '.__gp_loot_b']
            .forEach(sel => document.querySelectorAll(sel).forEach(el => el.classList.remove(sel.slice(1))));
    }

    function activateLootX() {
        if (lootOnAccept) {
            gpClick(document.querySelector('.loot-wnd .accept-button .button'));
            return;
        }
        const items = getLootItems();
        const wrapper = items[lootCursor];
        if (!wrapper) return;
        const cantMust = wrapper.classList.contains('cant-must');
        const btn = (!cantMust && wrapper.querySelector('.button.must'))
            ? wrapper.querySelector('.button.must')
            : wrapper.querySelector('.button.want');
        gpClick(btn);
    }

    function activateLootB() {
        if (lootOnAccept) return;
        const items = getLootItems();
        gpClick(items[lootCursor]?.querySelector('.button.not'));
    }

    // ─── SOLVE BUTTON (Rozwiąż teraz) ────────────────────────────────────────────

    function getSolveBtn() {
        return [...document.querySelectorAll('.button.small.green')]
            .find(el => el.querySelector('.label')?.textContent.trim() === 'Rozwiąż teraz'
                     && el.offsetHeight > 0) ?? null;
    }

    function updateSolveHighlight() {
        const btn = getSolveBtn();
        document.querySelectorAll('.__gp_solve_hl')
            .forEach(el => el.classList.remove('__gp_solve_hl'));
        if (btn) btn.classList.add('__gp_solve_hl');
    }

    // ─── SKILLS WINDOW (Umiejętności) ────────────────────────────────────────────

    function getSkillsWinScrollPane() {
        return document.querySelector('.skills-window .skills-wrapper .scroll-pane')
            || document.querySelector('.skills-window .scroll-pane');
    }

    function getSkillsWinItems() {
        const pane = getSkillsWinScrollPane();
        if (!pane) return [];
        return [...pane.querySelectorAll('.skill.clickable')];
    }

    function getSkillsWinCols() {
        const items = getSkillsWinItems();
        if (items.length < 2) return 1;
        const firstTop = items[0].getBoundingClientRect().top;
        let cols = 1;
        for (let i = 1; i < items.length; i++) {
            if (Math.abs(items[i].getBoundingClientRect().top - firstTop) < 5) cols++;
            else break;
        }
        return Math.max(1, cols);
    }

    function getSkillsWinAllNodes() {
        const pane = getSkillsWinScrollPane();
        if (!pane) return [];
        return [...pane.querySelectorAll('.skill.clickable, .info-box.skills-description-wrapper')];
    }

    function countSkillsWinHeaders(fromIdx, toIdx) {
        const items = getSkillsWinItems();
        const allNodes = getSkillsWinAllNodes();
        const fromEl = items[fromIdx], toEl = items[toIdx];
        const fromPos = allNodes.indexOf(fromEl), toPos = allNodes.indexOf(toEl);
        if (fromPos === -1 || toPos === -1) return 0;
        const lo = Math.min(fromPos, toPos), hi = Math.max(fromPos, toPos);
        let count = 0;
        for (let i = lo + 1; i < hi; i++) {
            if (allNodes[i].classList.contains('skills-description-wrapper')) count++;
        }
        return count;
    }

    function getSkillsWinArrow(dir) {
        const win = document.querySelector('.skills-window');
        if (!win) return null;
        const sel = dir > 0 ? '.arrow-down' : '.arrow-up';
        return win.querySelector(sel);
    }

    function drawSkillsWinCursor() {
        document.querySelectorAll('.__gp_skills_sel').forEach(el => el.classList.remove('__gp_skills_sel'));
        const items = getSkillsWinItems();
        if (!items.length) return;
        skillsWinCursor = Math.min(skillsWinCursor, items.length - 1);
        items[skillsWinCursor]?.classList.add('__gp_skills_sel');
    }

    function openSkillsWin() {
        skillsWinOpen = true; skillsWinCursor = 0; skillsWinLyF = 0; skillsWinLxF = 0;
        drawSkillsWinCursor();
        const items = getSkillsWinItems();
        if (items[0]) gpClick(items[0]);
    }

    function closeSkillsWin() {
        skillsWinOpen = false; skillsWinLyF = 0; skillsWinLxF = 0;
        document.querySelectorAll('.__gp_skills_sel').forEach(el => el.classList.remove('__gp_skills_sel'));
    }

    function moveSkillsWinCursor(d) {
        const items = getSkillsWinItems();
        if (!items.length) return;
        const prev = skillsWinCursor;
        const next = Math.max(0, Math.min(items.length - 1, skillsWinCursor + d));
        if (next === prev) return;
        const headers = countSkillsWinHeaders(prev, next);
        skillsWinCursor = next;
        drawSkillsWinCursor();
        if (headers > 0) {
            const arrow = getSkillsWinArrow(d);
            for (let i = 0; i < headers * 4; i++) gpClick(arrow);
        }
        gpClick(items[skillsWinCursor]);
    }

    // Inject immediately — must happen before game registers its event listeners
    injectPageContext();

    function gpClick(el) {
        if (!el) return;
        if (typeof window.__gpTriggerClick === 'function') window.__gpTriggerClick(el);
        else el.click();
    }

    // ─── POLL ─────────────────────────────────────────────────────────────────────

    function poll() {
        const gp = navigator.getGamepads()[0];
        if (gp) {
            const battle = (document.querySelector('.battle-window')?.offsetHeight ?? 0) > 0;

            // btn8 → toggle hints visibility
            const btnHome = !!gp.buttons[BTN_HOME]?.pressed;
            if (btnHome && !prevHome) hintsHidden = !hintsHidden;
            prevHome = btnHome;

            // battle UI hints
            if (!prevBattle && battle) showBattleUI();
            else if (prevBattle && !battle) hideBattleUI();
            if (battle) updateBattleHintsPos();
            if (battleHintsEl) battleHintsEl.style.display = (battle && !hintsHidden) ? 'flex' : 'none';
            prevBattle = battle;

            // explore hints
            if (!exploreHintsEl) createExploreHints();
            if (exploreHintsEl) {
                const exploreActive = !battle && !gwMenuOpen && !shopOpen && !dlgOpen && !captchaOpen && !alertOpen && !lootOpen && !skillsWinOpen;
                exploreHintsEl.style.display = (exploreActive && !hintsHidden) ? 'flex' : 'none';
                if (exploreActive) updateExploreHintsPos();
            }

            // auto-detect loot window
            const nowLootOpen = (document.querySelector('.loot-wnd')?.offsetHeight ?? 0) > 0;
            if (!lootOpen && nowLootOpen) openLoot();
            else if (lootOpen && !nowLootOpen) closeLoot();
            lootOpen = nowLootOpen;

            // auto-detect skills window (Umiejętności)
            const nowSkillsWinOpen = (document.querySelector('.skills-window')?.offsetHeight ?? 0) > 0;
            if (!skillsWinOpen && nowSkillsWinOpen) openSkillsWin();
            else if (skillsWinOpen && !nowSkillsWinOpen) closeSkillsWin();
            skillsWinOpen = nowSkillsWinOpen;

            // podświetl przycisk "Rozwiąż teraz" jeśli widoczny
            updateSolveHighlight();

            // auto-detect shop open/close
            const nowShopOpen = (document.querySelector('.shop-wrapper')?.offsetHeight ?? 0) > 0;
            if (!shopOpen && nowShopOpen) openShop();
            else if (shopOpen && !nowShopOpen) closeShop();

            // auto-detect dialogue open/close
            const dlgAnswers = getDlgAnswers();
            if (!dlgOpen && dlgAnswers.length) openDlg();
            else if (dlgOpen && !dlgAnswers.length) closeDlg();

            // auto-detect alert (zaproszenie do drużyny itp.)
            const nowAlertOpen = (document.querySelector('.mAlert .alert-accept-hotkey')?.offsetHeight ?? 0) > 0;
            if (!alertOpen && nowAlertOpen) showAlertHighlight();
            else if (alertOpen && !nowAlertOpen) hideAlertHighlight();
            alertOpen = nowAlertOpen;

            // auto-detect captcha open/close
            const nowCaptchaOpen = (document.querySelector('.captcha__buttons')?.offsetHeight ?? 0) > 0;
            if (!captchaOpen && nowCaptchaOpen) openCaptcha();
            else if (captchaOpen && !nowCaptchaOpen) closeCaptcha();

            // D-pad right
            const btnDpadR = !!gp.buttons[15]?.pressed;
            if (btnDpadR && !prevDpadR) {
                if (widgetMenuOpen) widgetMoveX(1);
                else if (!shopOpen) { if (invOpen) hideInv(); else showInv(); }
            }
            prevDpadR = btnDpadR;

            // D-pad left
            const btnDpadL = !!gp.buttons[14]?.pressed;
            if (btnDpadL && !prevDpadL) {
                if (widgetMenuOpen) widgetMoveX(-1);
                else if (battle) clickBattleSkillSlot(0);
                else if (relogOpen) closeRelog(); else openRelog();
            }
            prevDpadL = btnDpadL;

            // D-pad down
            const btnDpadD = !!gp.buttons[13]?.pressed;
            if (btnDpadD && !prevDpadD) {
                if (widgetMenuOpen) widgetMoveY(1);
                else if (battle) {
                    const fightEl = document.querySelector('.button.auto-fight-btn');
                    gpClick(fightEl);
                    fightEl?.click();
                } else {
                    const el = document.activeElement || document.body;
                    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
                    el.dispatchEvent(new KeyboardEvent('keyup',   { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
                }
            }
            prevDpadD = btnDpadD;

            // D-pad up → ruch (battle) / nawigacja w górę lub otwórz/zamknij selektor
            const btnDpadU = !!gp.buttons[12]?.pressed;
            if (btnDpadU && !prevDpadU) {
                if (battle) clickBattleSkillSlot(1);
                else if (widgetMenuOpen) widgetMoveY(-1); // row 0 → closeWidgetMenu
                else openWidgetMenu();
            }
            prevDpadU = btnDpadU;

            // LT/RT → switch bag (nie podczas walki, gwMenu, dialogu)
            const btnL = !!gp.buttons[6]?.pressed;
            if (btnL && !prevL && !dlgOpen && !battle && !gwMenuOpen) switchBag(-1);
            prevL = btnL;

            const btnR = !!gp.buttons[7]?.pressed;
            if (btnR && !prevR && !dlgOpen && !battle && !gwMenuOpen) switchBag(1);
            prevR = btnR;

            // LB/RB → zmiana zestawu walki (wszędzie poza walką)
            if (!battle) {
                const btnRB = !!gp.buttons[5]?.pressed;
                if (btnRB && !prevRB) cycleBuildFwd();
                prevRB = btnRB;

                const btnLB = !!gp.buttons[4]?.pressed;
                if (btnLB && !prevLB) cycleBuildBwd();
                prevLB = btnLB;
            }

            if (lootOpen) {
                // ─── LOOT WINDOW ───────────────────────────────────────────────
                const rx = gp.axes[2] ?? 0, ry = gp.axes[3] ?? 0;

                if (Math.abs(rx) > 0.3) {
                    if (lootRxF === 0 || (lootRxF > 4 && lootRxF % 2 === 0)) {
                        if (!lootOnAccept) {
                            const items = getLootItems();
                            lootCursor = Math.max(0, Math.min(items.length - 1, lootCursor + (rx > 0 ? 1 : -1)));
                            drawLootCursor();
                        }
                    }
                    lootRxF++;
                } else { lootRxF = 0; }

                if (Math.abs(ry) > 0.3) {
                    if (lootRyF === 0 || (lootRyF > 4 && lootRyF % 2 === 0)) {
                        if (ry > 0 && !lootOnAccept) { lootOnAccept = true;  drawLootCursor(); }
                        else if (ry < 0 && lootOnAccept) { lootOnAccept = false; drawLootCursor(); }
                    }
                    lootRyF++;
                } else { lootRyF = 0; }

                const btnX = !!gp.buttons[BTN_X]?.pressed;
                if (btnX && !prevX) activateLootX();
                prevX = btnX;

                const btnB = !!gp.buttons[BTN_B]?.pressed;
                if (btnB && !prevB) activateLootB();
                prevB = btnB;

                const btnA = !!gp.buttons[BTN_A]?.pressed; prevA = btnA;

                const btnY = !!gp.buttons[BTN_Y]?.pressed;
                if (btnY && !prevY)
                    gpClick(document.querySelector('.loot-wnd .accept-button .button'));
                prevY = btnY;
            } else {
                // X — shop lub universalny dialog+battle
                const btnX = !!gp.buttons[BTN_X]?.pressed;
                if (btnX && !prevX) {
                    if (alertOpen) {
                        gpClick(document.querySelector('.mAlert .alert-accept-hotkey'));
                    } else if (captchaOpen) {
                        activateCaptchaBtn();
                    } else if (shopOpen) {
                        if (shopMenuOpen) confirmShopMenu();
                        else shopActivate();
                    } else if (gwMenuOpen) {
                        confirmGw();
                    } else if (skillsWinOpen) {
                        gpClick(document.querySelector('.skills-window .skill-learn-btn .button'));
                    } else if (widgetMenuOpen) {
                        confirmWidgetMenu();
                    } else {
                        if (dlgOpen) confirmDlg();
                        if (battle) clickBattleSkillSlot(2);
                        if (!dlgOpen && !battle) {
                            if (relogOpen) confirmRelog();
                            else if (invOpen) activateItem();
                            else {
                                gpClick(document.querySelector('.widget-button.widget-auto-fight-near-mob'));
                                if (moveDir) pressed.delete(moveDir);
                            }
                        }
                    }
                }
                prevX = btnX;

                if (alertOpen) {
                    // ─── ALERT ────────────────────────────────────────────────
                    const btnB = !!gp.buttons[BTN_B]?.pressed;
                    if (btnB && !prevB)
                        gpClick(document.querySelector('.mAlert .alert-cancel-hotkey'));
                    prevB = btnB;
                } else if (captchaOpen) {
                    // ─── CAPTCHA ──────────────────────────────────────────────
                    const lx = gp.axes[0] ?? 0, ly = gp.axes[1] ?? 0;
                    if (Math.abs(lx) > R_THR) {
                        if (captchaLxF === 0 || (captchaLxF > REP_DELAY && captchaLxF % REP_STEP === 0))
                            moveCaptchaCursor(lx > 0 ? 1 : -1, 0);
                        captchaLxF++;
                    } else { captchaLxF = 0; }
                    if (Math.abs(ly) > R_THR) {
                        if (captchaLyF === 0 || (captchaLyF > REP_DELAY && captchaLyF % REP_STEP === 0))
                            moveCaptchaCursor(0, ly > 0 ? 1 : -1);
                        captchaLyF++;
                    } else { captchaLyF = 0; }
                } else if (shopOpen) {
                    // ─── SHOP ─────────────────────────────────────────────────
                    const lx = gp.axes[0] ?? 0, ly = gp.axes[1] ?? 0;
                    const inBP = shopPanel === 'backpack';

                    // lewy joystick: nawigacja po sklepie i plecaku
                    if (Math.abs(lx) > R_THR) {
                        if (shopLxF === 0 || (shopLxF > REP_DELAY && shopLxF % REP_STEP === 0)) {
                            if (!shopMenuOpen) {
                                if (inBP) {
                                    if (lx < 0) {
                                        if (curC > 0) moveCursor(-1, 0);
                                        else { shopPanel = 'sell'; sellC = 0; sellR = SELL_ROWS - 1; drawShopCursor(); }
                                    } else moveCursor(1, 0);
                                } else {
                                    shopNavigate(lx > 0 ? 1 : -1, 0);
                                }
                            }
                        }
                        shopLxF++;
                    } else { shopLxF = 0; }

                    if (Math.abs(ly) > R_THR) {
                        if (shopLyF === 0 || (shopLyF > REP_DELAY && shopLyF % REP_STEP === 0)) {
                            if (shopMenuOpen) moveShopMenuCursor(ly > 0 ? 1 : -1);
                            else if (inBP) moveCursor(0, ly > 0 ? 1 : -1);
                            else shopNavigate(0, ly > 0 ? 1 : -1);
                        }
                        shopLyF++;
                    } else { shopLyF = 0; }

                    const btnY = !!gp.buttons[BTN_Y]?.pressed;
                    if (btnY && !prevY) {
                        if (shopMenuOpen) closeShopMenu();
                        else shopContextMenu();
                    }
                    prevY = btnY;

                    const btnA = !!gp.buttons[BTN_A]?.pressed;
                    prevA = btnA;

                    const btnB = !!gp.buttons[BTN_B]?.pressed;
                    if (btnB && !prevB) {
                        if (shopMenuOpen) closeShopMenu();
                        else document.querySelector('.shop-wrapper')?.closest('.c-window')?.querySelector('.close-button')?.click();
                    }
                    prevB = btnB;

                    // refresh cursor position every frame (handles scroll/window drag)
                    if (!inBP) drawShopCursor();
                } else if (dlgOpen) {
                    const ly = gp.axes[1] ?? 0;
                    if (Math.abs(ly) > R_THR) {
                        if (dlgRyF === 0 || (dlgRyF > REP_DELAY && dlgRyF % REP_STEP === 0))
                            moveDlgCursor(ly > 0 ? 1 : -1);
                        dlgRyF++;
                    } else { dlgRyF = 0; }
                } else if (skillsWinOpen) {
                    // ─── SKILLS WINDOW ────────────────────────────────────────────
                    const cols = getSkillsWinCols();
                    const lx = gp.axes[0] ?? 0, ly = gp.axes[1] ?? 0;

                    if (Math.abs(lx) > R_THR) {
                        if (skillsWinLxF === 0 || (skillsWinLxF > REP_DELAY && skillsWinLxF % REP_STEP === 0))
                            moveSkillsWinCursor(lx > 0 ? 1 : -1);
                        skillsWinLxF++;
                    } else { skillsWinLxF = 0; }

                    if (Math.abs(ly) > R_THR) {
                        if (skillsWinLyF === 0 || (skillsWinLyF > REP_DELAY && skillsWinLyF % REP_STEP === 0))
                            moveSkillsWinCursor(ly > 0 ? cols : -cols);
                        skillsWinLyF++;
                    } else { skillsWinLyF = 0; }

                    const btnY = !!gp.buttons[BTN_Y]?.pressed;
                    if (btnY && !prevY)
                        gpClick(document.querySelector('.skills-window .skill-learn-btn .button'));
                    prevY = btnY;

                    const btnB = !!gp.buttons[BTN_B]?.pressed;
                    if (btnB && !prevB)
                        gpClick(document.querySelector('.skills-window')
                            ?.closest('.c-window')?.querySelector('.close-button'));
                    prevB = btnB;

                    const btnA = !!gp.buttons[BTN_A]?.pressed; prevA = btnA;
                } else if (widgetMenuOpen) {
                    // ─── WIDGET MENU ──────────────────────────────────────────────
                    // R-stick (primary) + D-pad (fallback, obsługiwane na poziomie globalnym)
                    const rx = gp.axes[2] ?? 0, ry = gp.axes[3] ?? 0;
                    if (Math.abs(rx) > R_THR) {
                        if (widgetMenuRxF === 0 || (widgetMenuRxF > REP_DELAY && widgetMenuRxF % REP_STEP === 0))
                            widgetMoveX(rx > 0 ? 1 : -1);
                        widgetMenuRxF++;
                    } else { widgetMenuRxF = 0; }
                    if (Math.abs(ry) > R_THR) {
                        if (widgetMenuRyF === 0 || (widgetMenuRyF > REP_DELAY && widgetMenuRyF % REP_STEP === 0))
                            widgetMoveY(ry > 0 ? 1 : -1);
                        widgetMenuRyF++;
                    } else { widgetMenuRyF = 0; }
                    const btnB_wm = !!gp.buttons[BTN_B]?.pressed;
                    if (btnB_wm && !prevB) closeWidgetMenu();
                    prevB = btnB_wm;
                } else if (invOpen) {
                    const btnA = !!gp.buttons[BTN_A]?.pressed;
                    if (btnA && !prevA) activateItem();
                    prevA = btnA;

                    const rx = gp.axes[2] ?? 0, ry = gp.axes[3] ?? 0;
                    const INV_THR = 0.3, INV_DEL = REP_DELAY, INV_STP = REP_STEP;

                    if (Math.abs(rx) > INV_THR) {
                        if (rxF === 0 || (rxF > INV_DEL && rxF % INV_STP === 0))
                            moveCursor(rx > 0 ? 1 : -1, 0);
                        rxF++;
                    } else { rxF = 0; }

                    if (Math.abs(ry) > INV_THR) {
                        if (ryF === 0 || (ryF > INV_DEL && ryF % INV_STP === 0))
                            moveCursor(0, ry > 0 ? 1 : -1);
                        ryF++;
                    } else { ryF = 0; }

                    // refresh every frame — follows window drag/scroll/resize
                    drawCursor();
                } else if (!battle) {
                    // ─── EXPLORE only ─────────────────────────────────────────────
                    rxF = 0; ryF = 0;

                    if (gwMenuOpen) {
                        const btnLT = !!gp.buttons[6]?.pressed;
                        if (btnLT) {
                            if (gwLtF === 0 || (gwLtF > REP_DELAY && gwLtF % REP_STEP === 0)) {
                                gwSelected = (gwSelected - 1 + gwItems.length) % gwItems.length;
                                drawGwMenu();
                            }
                            gwLtF++;
                        } else { gwLtF = 0; }
                        prevLT = btnLT;

                        const btnRT = !!gp.buttons[7]?.pressed;
                        if (btnRT) {
                            if (gwRtF === 0 || (gwRtF > REP_DELAY && gwRtF % REP_STEP === 0)) {
                                gwSelected = (gwSelected + 1) % gwItems.length;
                                drawGwMenu();
                            }
                            gwRtF++;
                        } else { gwRtF = 0; }
                        prevRT = btnRT;

                        const btnB = !!gp.buttons[BTN_B]?.pressed;
                        if (btnB && !prevB) closeGwMenu();
                        prevB = btnB;

                        const btnL3 = !!gp.buttons[BTN_L3]?.pressed;
                        if (btnL3 && !prevL3) closeGwMenu();
                        prevL3 = btnL3;
                    } else if (relogOpen) {
                        const rx = gp.axes[2] ?? 0;
                        if (Math.abs(rx) > R_THR) {
                            if (relogRxF === 0 || (relogRxF > REP_DELAY && relogRxF % REP_STEP === 0))
                                moveRelogCursor(rx > 0 ? 1 : -1);
                            relogRxF++;
                        } else { relogRxF = 0; }
                    } else {
                        const btnY = !!gp.buttons[BTN_Y]?.pressed;
                        if (btnY && !prevY) {
                            const solveBtn = getSolveBtn();
                            if (solveBtn) gpClick(solveBtn);
                            else gpClick(document.querySelector('.widget-button.widget-npc-talk-icon'));
                        }
                        prevY = btnY;

                        const btnB = !!gp.buttons[BTN_B]?.pressed;
                        if (btnB && !prevB)
                            gpClick(document.querySelector('.widget-button.widget-attack-near-mob'));
                        prevB = btnB;

                        const btnA = !!gp.buttons[BTN_A]?.pressed;
                        if (btnA && !prevA)
                            gpClick(document.querySelector('.widget-button.widget-attack-near-player'));
                        prevA = btnA;

                        const btnL3 = !!gp.buttons[BTN_L3]?.pressed;
                        if (btnL3 && !prevL3) openGwMenu();
                        prevL3 = btnL3;
                    }
                } else {
                    // ─── BATTLE ───────────────────────────────────────────────────
                    const btnRT = !!gp.buttons[7]?.pressed;
                    if (btnRT && !prevRT) cycleBattleTarget(1);
                    prevRT = btnRT;

                    const btnLT = !!gp.buttons[6]?.pressed;
                    if (btnLT && !prevLT) cycleBattleTarget(-1);
                    prevLT = btnLT;

                    // LB → slot 6, RB → slot 7
                    const btnLB_b = !!gp.buttons[4]?.pressed;
                    if (btnLB_b && !prevLB) clickBattleSkillSlot(6);
                    prevLB = btnLB_b;

                    const btnRB_b = !!gp.buttons[5]?.pressed;
                    if (btnRB_b && !prevRB) clickBattleSkillSlot(7);
                    prevRB = btnRB_b;

                    const btnR3 = !!gp.buttons[BTN_R3]?.pressed;
                    prevR3 = btnR3;

                    // Y → slot 3
                    const btnY = !!gp.buttons[BTN_Y]?.pressed;
                    if (btnY && !prevY) clickBattleSkillSlot(3);
                    prevY = btnY;

                    // A → slot 4
                    const btnA = !!gp.buttons[BTN_A]?.pressed;
                    if (btnA && !prevA) clickBattleSkillSlot(4);
                    prevA = btnA;

                    // B → slot 5 (lub opuść walkę gdy gracz martwy)
                    const dead = isPlayerDead();
                    document.querySelector('.button.close-battle-ground')
                        ?.classList.toggle('__gp_escape_hl', dead);
                    const btnB = !!gp.buttons[BTN_B]?.pressed;
                    if (btnB && !prevB) {
                        if (dead) leaveBattle();
                        else clickBattleSkillSlot(5);
                    }
                    prevB = btnB;
                }
            }

            // lewy joystick → ruch kardynalny tylko w explore i poza dialogiem/sklepem
            if (!battle && !dlgOpen && !shopOpen && !captchaOpen && !skillsWinOpen) {
                updateMovement(gp.axes[0], gp.axes[1]);
            } else {
                if (moveDir) { release(moveDir); moveDir = null; }
            }
        }
        requestAnimationFrame(poll);
    }

    window.addEventListener('gamepadconnected', e => {
        console.log(`[GP2KB] Pad podłączony: ${e.gamepad.id}`);
        injectStyles();
        poll();
    });

    window.addEventListener('gamepaddisconnected', () => {
        console.log('[GP2KB] Pad odłączony');
        pressed.forEach(release);
        hideInv();
        closeDlg();
    });

})();
