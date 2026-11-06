// ==UserScript==
// @name         Hamster King Helper Universal
// @namespace    hamster-king-helper-universal
// @version      3.16.21
// @description  Слухи, пазл, купоны, красные/зелёные клетки, Enter и автораскопки
// @match        https://app.hamsterking.games/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        unsafeWindow
// @connect      crypto-witch.ru
// @connect      t.me
// @updateURL    https://raw.githubusercontent.com/KapunovKA/Hamster-King-Helper/main/Hamster-King-Helper.user.js
// @downloadURL  https://raw.githubusercontent.com/KapunovKA/Hamster-King-Helper/main/Hamster-King-Helper.user.js
// ==/UserScript==

(() => {
  'use strict';

  const SCRIPT_VERSION =
    (typeof GM_info !== 'undefined' && GM_info.script?.version) || '?';

  const HOST = 'hk-unified-helper';
  if (document.getElementById(HOST)) return;

  const CITIES = [
    'Москва', 'Санкт-Петербург', 'Минск',
    'Дубай', 'Токио', 'Лагос',
    'Берлин', 'Лондон', 'Париж',
    'Сингапур', 'Нью-Йорк', 'Лос-Анджелес',
    'Бостон', 'Вашингтон', 'Рио-де-Жанейро',
    'Сидней', 'Окленд'
  ];

  const RUMOR_URL =
    'https://crypto-witch.ru/daily-combo/hamster-king-daily-combo';
  const TELEGRAM_URL =
    'https://t.me/s/official_crypto_witch';
  const CHANNEL_URL =
    'https://t.me/official_crypto_witch';
  const PUZZLE_URL =
    'https://tk-clan.ru/scripts/hk-puzzle-bookmark.js';

  const LAYER = 'hk-unified-rumors';

  let rumors = new Map();
  let city = null;
  let preview = null;
  let pending = null;
  let appliedMap = null;
  let signature = '';
  let completionInfo = 'Ожидаю данные карты';

  let loadState = 'Загрузка слухов...';
  let mapInfo = 'Нет карты';
  let lastAction = 'Ожидание';
  let couponState = 'Не проверены';
  let couponItems = [];

  let loadingRumors = false;
  let loadingCoupons = false;
  let puzzleLoading = false;

  // ===== ИНТЕРФЕЙС =====

  const isIPhone = /iPhone|iPod/i.test(navigator.userAgent);
  const host = document.createElement('div');
  host.id = HOST;
  if (isIPhone) host.classList.add('hk-iphone');

  Object.assign(host.style, {
    position: 'fixed',
    top: 'max(8px, env(safe-area-inset-top))',
    right: '8px',
    zIndex: '2147483647',
    touchAction: 'manipulation'
  });
  if (isIPhone) {
    Object.assign(host.style, {
      top: 'auto',
      right: '0',
      bottom: '0',
      left: '0',
      width: '100%',
      height: '0',
      pointerEvents: 'none'
    });
  }

  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
  <style>
    * { box-sizing: border-box; }

    button, select, textarea {
      font: 13px -apple-system, Arial, sans-serif;
    }

    button {
      border: 0;
      color: white;
      cursor: pointer;
      touch-action: manipulation;
    }

    .mini {
      background: #202538;
      border: 1px solid #67738a;
      border-radius: 22px;
      padding: 10px 13px;
      box-shadow: 0 3px 14px #0008;
    }

    .panel {
      width: min(320px, calc(100vw - 16px));
      max-height: 70dvh;
      overflow: auto;
      background: #181c29;
      border: 1px solid #566079;
      border-radius: 12px;
      color: #fff;
      padding: 12px;
      box-shadow: 0 5px 24px #0009;
      font: 13px/1.5 -apple-system, Arial, sans-serif;
    }

    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .close {
      background: #434c60;
      border-radius: 6px;
      padding: 4px 10px;
    }

    .block {
      background: #272d3d;
      padding: 9px;
      border-radius: 7px;
      white-space: pre-wrap;
      margin: 8px 0;
      overflow-wrap: anywhere;
    }

    .small {
      font-size: 11px;
      color: #c8d1df;
    }

    .good { color: #b5efc5; }

    .btn {
      width: 100%;
      padding: 10px;
      margin-top: 7px;
      border-radius: 7px;
      background: #356ca9;
    }

    .purple { background: #65539b; }

    select, textarea {
      width: 100%;
      padding: 8px;
      background: #272d3d;
      color: #fff;
      border: 1px solid #5c667b;
      border-radius: 7px;
      margin-top: 5px;
    }

    details { margin-top: 10px; }
    summary { cursor: pointer; }
    .hidden { display: none !important; }

    .head-actions { display: flex; gap: 6px; }
    .settings-btn { background: #434c60; border-radius: 6px; padding: 4px 9px; }
    .settings-box { border: 1px solid #59667c; border-radius: 9px; padding: 10px; margin: 9px 0; background: #232a3b; }
    .settings-title { font-weight: 700; margin-bottom: 7px; }
    .setting-row { display: flex; gap: 9px; align-items: center; padding: 7px 0; cursor: pointer; }
    .setting-row input { width: 17px; height: 17px; accent-color: #39d98a; flex: none; }


    #section-coupons-card { grid-column:1 / -1; }
    .coupon-bar { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .coupon-bar .dash-title { margin:0; }
    .coupon-refresh { background:#434c60; border-radius:6px; padding:3px 9px; font-size:17px; }
    .coupon-codes { margin-top:4px; line-height:1.8; overflow-wrap:anywhere; }
    .coupon-codes:empty { display:none; }
    .coupon-code { background:none; padding:0 2px; color:#b6eac1; font-weight:700; user-select:all; -webkit-user-select:all; overflow-wrap:anywhere; }
    .coupon-code:hover { text-decoration:underline; }
    .coupon-code:focus-visible, .coupon-refresh:focus-visible { outline:2px solid #a8d8ff; outline-offset:2px; }
    #couponStatus { min-height:0; max-height:none; margin-top:4px; }

    .panel { width:min(370px,calc(100vw - 16px)); max-height:78dvh; padding:12px; border-radius:18px; background:#171d2b; border-color:#52617c; box-shadow:0 12px 35px #000b; }
    .head { margin-bottom:12px; font-size:13px; gap:7px; }
    .head span { flex:1; }
    .head-actions button { min-width:30px; min-height:29px; }
    .dashboard-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .dash-card { min-width:0; margin:0; border:1px solid #38465f; border-radius:12px; padding:10px; background:#252e40; }
    .dash-title { display:block; font-size:12px; font-weight:700; margin-bottom:5px; }
    .dash-card .small { font-size:10px; line-height:1.4; min-height:28px; max-height:56px; overflow:auto; }
    .dash-card .btn { margin-top:7px; padding:6px 9px; width:auto; display:inline-block; font-size:11px; }
    .dash-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; }
    .dash-actions .btn { margin:0; font-size:12px; padding:10px 5px; }
    .dash-actions > .btn:only-child { grid-column:1 / -1; }
    .dash-status { margin:10px 0 0; padding:9px 11px; border:1px solid #38465f; border-radius:11px; background:#202a3b; font-size:11px; }
    .auto-ack-control { display:flex; align-items:center; gap:8px; margin-top:8px; padding:6px 10px; border:1px solid #38465f; border-radius:10px; background:#202a3b; }
    .auto-ack-toggle { display:flex; align-items:center; gap:8px; min-height:32px; cursor:pointer; font-size:12px; font-weight:600; flex-shrink:0; }
    .auto-ack-toggle input { appearance:none; -webkit-appearance:none; position:relative; width:30px; height:18px; margin:0; border:1px solid #67738a; border-radius:12px; background:#434c60; cursor:pointer; flex:none; }
    .auto-ack-toggle input::after { content:''; position:absolute; top:2px; left:2px; width:12px; height:12px; border-radius:50%; background:#fff; transition:transform .15s; }
    .auto-ack-toggle input:checked { background:#258557; border-color:#39d98a; }
    .auto-ack-toggle input:checked::after { transform:translateX(12px); }
    .auto-ack-toggle input:focus-visible { outline:2px solid #a8d8ff; outline-offset:3px; }
    .auto-ack-state { flex:1; min-width:0; font-size:10px; color:#c8d1df; text-align:right; overflow-wrap:anywhere; }
    .dash-details { margin-top:9px; border:1px solid #38465f; border-radius:10px; background:#202a3b; padding:8px 10px; }
    .dash-details summary { font-size:12px; font-weight:600; }
    .dash-details .block { margin:6px 0; }
    .dash-details .btn { font-size:11px; padding:7px; }
    .dash-city { margin-top:10px; font-size:11px; color:#cbd5e6; }
    .dash-city select { padding:6px; margin-top:3px; font-size:12px; }
    .settings-box { max-height:45vh; overflow:auto; }
    .settings-box .setting-row { font-size:12px; padding:5px 0; }
    .dash-secondary { margin-top:8px; }
    .dash-secondary .dash-details { margin-top:6px; }
    @media (max-width:340px) { .dashboard-grid { grid-template-columns:1fr; } }

    .mobile-backdrop { display:none; }
    :host(.hk-iphone) .mobile-backdrop:not(.hidden) {
      display:block;
      position:fixed;
      inset:0;
      background:rgba(8,12,22,.55);
      z-index:1;
      pointer-events:auto;
    }
    :host(.hk-iphone) .mini {
      position:fixed;
      top:calc(8px + env(safe-area-inset-top, 0px));
      right:calc(8px + env(safe-area-inset-right, 0px));
      bottom:auto;
      left:auto;
      z-index:3;
      width:44px;
      height:44px;
      min-width:44px;
      min-height:44px;
      border-radius:14px;
      font-size:20px;
      line-height:1;
      padding:5px;
      display:flex;
      align-items:center;
      justify-content:center;
      pointer-events:auto;
    }
    :host(.hk-iphone) .panel {
      position:fixed;
      left:50%;
      right:auto;
      bottom:0;
      top:auto;
      transform:translateX(-50%);
      z-index:2;
      width:100%;
      max-width:540px;
      max-height:82vh;
      max-height:82dvh;
      overflow-y:auto;
      overscroll-behavior:contain;
      -webkit-overflow-scrolling:touch;
      border-radius:22px 22px 0 0;
      padding:17px 15px max(20px, env(safe-area-inset-bottom, 0px));
      box-shadow:0 -12px 45px #000b;
      pointer-events:auto;
    }
    :host(.hk-iphone) .panel::before {
      content:'';
      display:block;
      width:40px;
      height:4px;
      margin:0 auto 12px;
      border-radius:8px;
      background:#77849a;
    }
    :host(.hk-iphone) .head {
      position:sticky;
      top:-17px;
      z-index:1;
      margin:-4px -3px 12px;
      padding:8px 3px 11px;
      background:#171d2b;
      font-size:14px;
    }
    :host(.hk-iphone) .head-actions button {
      min-height:44px;
      min-width:44px;
      font-size:17px;
    }
    :host(.hk-iphone) .dashboard-grid {
      grid-template-columns:minmax(0,1fr);
      gap:10px;
    }
    :host(.hk-iphone) .dash-card { padding:13px; }
    :host(.hk-iphone) .dash-title { font-size:15px; }
    :host(.hk-iphone) .dash-card .small {
      min-height:0;
      max-height:none;
      font-size:12px;
    }
    :host(.hk-iphone) .btn,
    :host(.hk-iphone) .dash-card .btn,
    :host(.hk-iphone) .dash-details .btn {
      display:block;
      width:100%;
      min-height:44px;
      padding:11px 12px;
      font-size:14px;
      text-align:center;
    }
    :host(.hk-iphone) .dash-actions {
      grid-template-columns:minmax(0,1fr);
      gap:8px;
    }
    :host(.hk-iphone) .dash-actions .btn { min-height:46px; }
    :host(.hk-iphone) .dash-city select,
    :host(.hk-iphone) textarea { font-size:16px; min-height:44px; }
    :host(.hk-iphone) .setting-row { min-height:44px; font-size:14px; }
    :host(.hk-iphone) .setting-row input { width:21px; height:21px; }
    :host(.hk-iphone) .auto-ack-toggle { min-height:44px; font-size:14px; }
    :host(.hk-iphone) .coupon-refresh { min-width:44px; min-height:44px; }
    :host(.hk-iphone) .coupon-code { min-height:36px; font-size:15px; }
  </style>

  <button id="mini" class="mini" aria-label="Открыть Hamster King Helper">🐹</button>
  <div id="mobileBackdrop" class="mobile-backdrop hidden" aria-hidden="true"></div>

  <div id="panel" class="panel hidden">
    <div class="head">
      <span>🐹 Hamster King Helper v${SCRIPT_VERSION}</span>
      <div class="head-actions">
        <button id="settingsToggle" class="settings-btn" title="Настройки" aria-label="Настройки">⚙️</button>
        <button id="close" class="close">−</button>
      </div>
    </div>

    <div id="settingsBox" class="settings-box hidden">
      <div class="settings-title">⚙️ Что показывать в панели</div>
      <label class="setting-row"><input type="checkbox" data-setting="showGifts"> 🎁 Подарки</label>
      <label class="setting-row"><input type="checkbox" data-setting="showRumors"> 🗺️ Кнопка обновления слухов</label>
      <label class="setting-row"><input type="checkbox" data-setting="showRumorStatus"> 🗺️ Статус слухов</label>
      <label class="setting-row"><input type="checkbox" data-setting="coupons"> 🎟️ Купоны Telegram</label>
      <label class="setting-row"><input type="checkbox" data-setting="puzzle"> 🧩 Кнопка пазла</label>
      <label class="setting-row"><input type="checkbox" data-setting="city"> Ручной выбор города</label>
      <label class="setting-row"><input type="checkbox" data-setting="manual"> Ручной ввод слухов</label>
      <label class="setting-row"><input type="checkbox" data-setting="diagnostics"> Диагностика и служебные кнопки</label>
      <div class="settings-title" style="margin-top:12px">⚡ Автоматизация</div>
      <label class="setting-row"><input type="checkbox" data-setting="autoGifts"> Автоматически собирать бесплатные подарки</label>
      <label class="setting-row"><input type="checkbox" data-setting="autoPuzzleAction"> 🧩 Пазл: нажимать кнопки действий в карточках (расходует ресурсы)</label>
      <label class="setting-row"><input type="checkbox" data-setting="autoDigSite"> ⛏️ Автонажатие в окне «Место раскопок» (расходует ресурсы)</label>
      <div class="small">Галочки «Что показывать» скрывают элементы. Галочки «Автоматизация» управляют сбором, не скрывая кнопки. Настройки сохраняются автоматически.</div>
    </div>

    <div class="dashboard-grid">
      <div id="section-gifts" class="dash-card">
        <span class="dash-title">🎁 Подарки</span>
        <div id="giftStatus" class="small">Ожидание магазина</div>
        <button id="giftRun" class="btn">🎁 Собрать</button>
      </div>
      <div id="section-rumors-card" class="dash-card">
        <span class="dash-title">🗺️ Слухи</span>
        <div class="small">Подсветка на карте</div>
        <div id="iphoneRumorStatus" class="small hidden" aria-live="polite"></div>
        <button id="refresh" class="btn">↻ Обновить</button>
      </div>
      <div id="section-coupons-card" class="dash-card">
        <div class="coupon-bar">
          <span class="dash-title">🎟️ Купоны</span>
          <button id="couponRefresh" class="coupon-refresh" title="Проверить купоны" aria-label="Проверить купоны">↻</button>
        </div>
        <div id="coupons" class="coupon-codes" aria-label="Купоны — нажми на код, чтобы скопировать"></div>
        <div id="couponStatus" class="small" role="status" aria-live="polite">Проверяю купоны…</div>
      </div>
    </div>
    <div class="auto-ack-control">
      <label class="auto-ack-toggle" title="Автоматически нажимать «Понятно» во всей игре">
        <input type="checkbox" data-setting="autoAck" aria-label="Автоматически нажимать «Понятно» во всей игре">
        <span>Авто «Понятно»</span>
      </label>
      <span id="autoAckStatus" class="auto-ack-state" role="status" aria-live="polite">Ожидание…</span>
    </div>
    <div class="auto-ack-control">
      <label class="auto-ack-toggle" title="Автоматически открывать сундуки в инвентаре после первого нажатия">
        <input type="checkbox" data-setting="autoInventoryCases" aria-label="Автоматически открывать сундуки в инвентаре">
        <span>📦 Автооткрытие</span>
      </label>
      <span id="inventoryAutoStatus" class="auto-ack-state" role="status" aria-live="polite">Нажми на сундук</span>
    </div>
    <div id="status" class="dash-status good hidden">Запуск...</div>
    <label id="section-city" class="dash-city" style="display:block">
      🏙️ Город (резервный выбор)
      <select id="city"><option value="">Автоматически</option></select>
    </label>
    <div id="dashActions" class="dash-actions">
      <button id="puzzle" class="btn purple">🧩 Запустить пазл</button>
    </div>
    <div id="puzzleAckStatus" class="small hidden" aria-live="polite" style="margin-top:6px"></div>
    <div class="dash-secondary">
      <details id="section-diagnostics" class="dash-details">
        <summary>🛠️ Диагностика и служебные кнопки</summary>
        <div id="diag" class="block small"></div>
        <button id="giftScanCopy" class="btn" title="Проверка кнопок подарков без данных аккаунта">🎁 Отчёт подарков</button>
        <button id="inventoryAutoReport" class="btn" type="button">📦 Отчёт инвентаря</button>
      </details>
      <details id="section-manual" class="dash-details">
        <summary>✏️ Ручной ввод слухов</summary>
        <textarea id="manual" rows="3" placeholder="Москва: [16:06] [23:19] [24:07]"></textarea>
        <button id="apply" class="btn">Применить</button>
      </details>
    </div>
  </div>
  `;

  const $ = id => root.getElementById(id);


  for (const name of CITIES) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    $('city').appendChild(option);
  }

  function openHelperPanel() {
    $('mini').classList.add('hidden');
    $('panel').classList.remove('hidden');
    if (isIPhone) $('mobileBackdrop').classList.remove('hidden');
  }

  function closeHelperPanel() {
    $('panel').classList.add('hidden');
    $('mini').classList.remove('hidden');
    $('mobileBackdrop').classList.add('hidden');
  }

  $('mini').onclick = openHelperPanel;
  $('close').onclick = closeHelperPanel;
  $('mobileBackdrop').onclick = closeHelperPanel;

  // ===== НАСТРОЙКИ ИНТЕРФЕЙСА =====

  const SETTINGS_KEY = 'hk-helper-universal-settings-v3';
  const DEFAULT_SETTINGS = {
    diagnostics: false,
    manual: false,
    city: true,
    coupons: true,
    puzzle: true,
    showGifts: true,
    showRumors: true,
    showRumorStatus: false,
    autoGifts: false,
    autoAck: true,
    autoPuzzleAction: true,
    autoDigSite: true,
    autoInventoryCases: true
  };

  let uiSettings = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (typeof saved.autoAck !== 'boolean' && typeof saved.autoPuzzleAck === 'boolean') {
      saved.autoAck = saved.autoPuzzleAck;
    }
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof saved[key] === 'boolean') uiSettings[key] = saved[key];
    }
  } catch {}

  const visibleSections = {
    diagnostics: [$('section-diagnostics')],
    manual: [$('section-manual')],
    city: [$('section-city')],
    coupons: [$('section-coupons-card')],
    puzzle: [$('puzzle')],
    showGifts: [$('section-gifts')],
    showRumors: [$('section-rumors-card')],
    showRumorStatus: [$('status')]
  };

  function applyUiSettings() {
    for (const [key, elements] of Object.entries(visibleSections)) {
      for (const element of elements) {
        element.classList.toggle('hidden', !uiSettings[key]);
      }
    }
    $('dashActions').classList.toggle(
      'hidden', !uiSettings.puzzle
    );
    root.querySelectorAll('[data-setting]').forEach(input => {
      input.checked = uiSettings[input.dataset.setting];
    });
  }

  $('settingsToggle').onclick = () => {
    const box = $('settingsBox');
    box.classList.toggle('hidden');
    $('settingsToggle').setAttribute('aria-expanded', String(!box.classList.contains('hidden')));
  };

  root.querySelectorAll('[data-setting]').forEach(input => {
    input.addEventListener('change', () => {
      uiSettings[input.dataset.setting] = input.checked;
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(uiSettings)); } catch {}
      applyUiSettings();
      if (input.dataset.setting === 'autoAck') {
        autoAckLastButton = null;
        autoAckLastContext = '';
        updateAutoAckStatus();
      }
      if (input.dataset.setting === 'autoInventoryCases')
        inventoryAutoStop(uiSettings.autoInventoryCases?'Нажми на сундук':'Выключено');
      if (input.dataset.setting === 'autoPuzzleAction' && !uiSettings.autoPuzzleAction) {
        puzzleAckStop();
      }
      if (input.dataset.setting === 'puzzle' && !uiSettings.puzzle) {
        puzzleAckStop();
      }
    });
  });

  applyUiSettings();

  // ===== ОПРЕДЕЛЕНИЕ ГОРОДА =====

  function clean(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function exactElements(value) {
    return [...document.querySelectorAll(
      'button,div,span,a,h1,h2,h3,h4,strong,p'
    )].filter(element => {
      const r = element.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.width < 600 &&
        r.height < 150 &&
        clean(element.textContent) === value
      );
    });
  }

  function selectButton() {
    return exactElements('Выбрать').sort((a, b) => {
      const x = a.getBoundingClientRect();
      const y = b.getBoundingClientRect();
      return x.width * x.height - y.width * y.height;
    })[0] || null;
  }

  function detectPreview() {
    const button = selectButton();
    if (!button) return null;

    const b = button.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const candidates = [];

    for (const name of CITIES) {
      for (const element of exactElements(name)) {
        const r = element.getBoundingClientRect();
        if (r.top >= b.top) continue;

        candidates.push({
          name,
          score:
            Math.abs(r.left + r.width / 2 - bx) +
            Math.abs(r.bottom - b.top)
        });
      }
    }

    candidates.sort((a, b) => a.score - b.score);
    return candidates[0]?.name || null;
  }

  function onSelect(event) {
    const button = selectButton();

    if (
      !button ||
      !(event.target instanceof Element)
    ) return;

    let hit =
      button === event.target ||
      button.contains(event.target);

    for (
      let element = event.target, i = 0;
      !hit && element && i < 7;
      element = element.parentElement, i++
    ) {
      hit = clean(element.textContent) === 'Выбрать';
    }

    if (!hit) return;

    const name = detectPreview() || preview;

    if (name) {
      pending = name;
      lastAction = 'Нажата «Выбрать»: ' + name;
    }
  }

  document.addEventListener('pointerdown', onSelect, true);
  document.addEventListener('click', onSelect, true);

  // ===== ПОИСК MAPLIBRE =====

  function isMap(value) {
    return (
      value &&
      typeof value.addLayer === 'function' &&
      typeof value.getSource === 'function' &&
      typeof value.getStyle === 'function'
    );
  }

  function inspect(rootValue) {
    const seen = new Set();
    const queue = [{ v: rootValue, d: 0 }];
    let steps = 0;

    while (queue.length && steps++ < 1100) {
      const { v, d } = queue.shift();

      if (
        !v ||
        (
          typeof v !== 'object' &&
          typeof v !== 'function'
        ) ||
        seen.has(v) ||
        d > 9
      ) continue;

      seen.add(v);
      if (isMap(v)) return v;

      for (const key of [
        '_map', 'map', 'current',
        'memoizedState', 'memoizedProps',
        'stateNode', 'child', 'return',
        'sibling', 'ref', 'value',
        'element', 'instance',
        '_reactInternals'
      ]) {
        try {
          const next = v[key];

          if (
            next &&
            (
              typeof next === 'object' ||
              typeof next === 'function'
            )
          ) {
            queue.push({ v: next, d: d + 1 });
          }
        } catch {}
      }

      if (d < 3) {
        try {
          for (const key of Object.keys(v)) {
            if (
              key.startsWith('__reactFiber$') ||
              key.startsWith('__reactProps$')
            ) {
              queue.push({
                v: v[key],
                d: d + 1
              });
            }
          }
        } catch {}
      }
    }

    return null;
  }

  function getMap() {
    const candidates = [
      document.querySelector('#areas-map'),
      document.querySelector('#main-map'),
      ...document.querySelectorAll('.maplibregl-map')
    ].filter(Boolean);

    mapInfo = `Элементы карты: ${candidates.length}`;

    for (const element of candidates) {
      let node = element;

      for (
        let level = 0;
        node && level < 8;
        level++, node = node.parentElement
      ) {
        for (const key of Object.keys(node)) {
          if (
            key.startsWith('__reactFiber$') ||
            key.startsWith('__reactProps$') ||
            key.startsWith('__reactContainer$')
          ) {
            const found = inspect(node[key]);

            if (found) {
              mapInfo = 'MapLibre найден';
              return found;
            }
          }
        }
      }
    }

    return null;
  }

  function readyMap() {
    const map = getMap();
    if (!map) return null;

    try {
      if (!map.isStyleLoaded()) {
        mapInfo = 'Карта найдена, стиль загружается';
        return null;
      }

      if (!map.getSource('areas-data')) {
        mapInfo = 'Карта найдена, нет areas-data';
        return null;
      }

      return map;
    } catch (error) {
      mapInfo = 'Ошибка карты: ' + error.message;
      return null;
    }
  }


  // ===== ПОДСВЕТКА СЛУХОВ: МОСТ ДЛЯ iPHONE / SAFARI =====
  function iphonePageMapWorker(channel) {
    'use strict';
    const layerId = 'hk-unified-rumors';
    let mapCache = null, oldSignature = '';
    const respond = data => document.dispatchEvent(new CustomEvent(
      channel + ':response', {detail:JSON.stringify(data)}
    ));
    function isMap(v) {
      return v && typeof v.addLayer === 'function' &&
        typeof v.getSource === 'function' && typeof v.getStyle === 'function';
    }
    function inspect(rootValue) {
      const queue = [{v:rootValue,d:0}], seen = new Set();
      const fields = ['_map','map','mapRef','current','memoizedState',
        'memoizedProps','stateNode','child','return','sibling','ref',
        'value','element','instance','_reactInternals','alternate',
        'baseState','next','props','children'];
      for (let count = 0; queue.length && count < 3000; count++) {
        const {v,d} = queue.shift();
        if (!v || (typeof v !== 'object' && typeof v !== 'function') ||
            seen.has(v) || d > 12) continue;
        seen.add(v);
        if (isMap(v)) return v;
        for (const key of fields) {
          try {
            const next = v[key];
            if (next && (typeof next === 'object' || typeof next === 'function'))
              queue.push({v:next,d:d+1});
          } catch {}
        }
        if (d < 4) {
          try {
            for (const key of Object.keys(v)) {
              if (/^__react(Fiber|Props|Container)\$/.test(key))
                queue.push({v:v[key],d:d+1});
            }
          } catch {}
        }
      }
      return null;
    }
    function locate() {
      if (mapCache) {
        try {
          if (mapCache.getContainer()?.isConnected) return mapCache;
        } catch {}
        mapCache = null;
        oldSignature = '';
      }
      const nodes = [
        document.querySelector('#areas-map'),
        document.querySelector('#main-map'),
        ...document.querySelectorAll('.maplibregl-map')
      ].filter(Boolean);
      const seen = new Set();
      for (const element of nodes) {
        for (let node = element, depth = 0;
             node && depth < 9; node = node.parentElement,depth++) {
          if (seen.has(node)) continue;
          seen.add(node);
          for (const key of Object.keys(node)) {
            if (!/^__react(Fiber|Props|Container)\$/.test(key)) continue;
            const found = inspect(node[key]);
            if (found) {
              mapCache = found;
              return found;
            }
          }
        }
      }
      return null;
    }
    document.addEventListener(channel + ':request', event => {
      try {
        const req = JSON.parse(event.detail);
        if (req?.cmd === 'ping') {
          respond({state:'ready'});
          return;
        }
        if (req?.cmd !== 'apply' && req?.cmd !== 'remove') return;
        const map = locate();
        if (!map) {
          respond({state:'waiting',reason:'MapLibre пока не доступен в странице'});
          return;
        }
        if (!map.isStyleLoaded() || !map.getSource('areas-data')) {
          respond({state:'waiting',reason:'Жду загрузки карты и areas-data'});
          return;
        }
        if (req.cmd === 'remove') {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          oldSignature = '';
          respond({state:'removed'});
          return;
        }
        const points = req.points;
        if (!Array.isArray(points) || points.length < 1 || points.length > 3 ||
            !points.every(p => Number.isInteger(p.x) &&
              Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 &&
              p.x < 500 && p.y < 500)) {
          respond({state:'error',reason:'Недопустимые координаты слухов'});
          return;
        }
        if (oldSignature === req.signature && map.getLayer(layerId)) {
          respond({state:'applied',count:points.length,city:req.city});
          return;
        }
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        map.addLayer({
          id:layerId,type:'fill',source:'areas-data',
          filter:['any',...points.map(p => ['all',
            ['==',['get','x'],p.y],['==',['get','y'],p.x]
          ])],
          paint:{
            'fill-color':['case',['has','rumorId'],'#20d765','#ff3030'],
            'fill-opacity':0.72,'fill-outline-color':'#ffffff'
          }
        },map.getLayer('areas-grid-layer') ? 'areas-grid-layer' : undefined);
        oldSignature = req.signature;
        respond({state:'applied',count:points.length,city:req.city});
      } catch (error) {
        mapCache = null;
        oldSignature = '';
        respond({state:'error',reason:String(error.message || error).slice(0,200)});
      }
    });
    respond({state:'ready'});
  }

  let iphoneBridgeReady = false;
  let iphoneBridgeInstalled = false;
  let iphoneBridgeState = 'Подключение к карте…';
  let iphoneLastSentKey = '';
  let iphoneLastSentAt = 0;
  const iphoneChannel = 'hk-rumors-ios-' + Math.random().toString(36).slice(2);
  function iphoneBridgeNote(text) {
    iphoneBridgeState = text;
    if (!isIPhone) return;
    const status = $('iphoneRumorStatus');
    status.classList.remove('hidden');
    status.textContent = text;
  }
  function iphoneBridgeSend(data) {
    if (!iphoneBridgeReady) return;
    try {
      document.dispatchEvent(new CustomEvent(iphoneChannel + ':request', {
        detail:JSON.stringify(data)
      }));
    } catch (error) {
      iphoneBridgeNote('iPhone: ошибка передачи — ' + error.message);
    }
  }
  function iphoneInitBridge() {
    if (!isIPhone || iphoneBridgeInstalled) return;
    iphoneBridgeInstalled = true;
    iphoneBridgeNote('iPhone: подключаю подсветку к игре…');
    document.addEventListener(iphoneChannel + ':response', event => {
      let response;
      try { response = JSON.parse(event.detail); } catch { return; }
      if (response.state === 'ready') {
        iphoneBridgeReady = true;
        iphoneBridgeNote('iPhone: подключено к странице игры');
        if (city && rumors.size) setTimeout(() => iphoneApplyHighlight(true),0);
      } else if (response.state === 'applied') {
        signature = city + '|' + (rumors.get(city) || [])
          .map(p => p.key).join(',');
        mapInfo = 'iPhone: слой MapLibre установлен';
        completionInfo = '✓ rumorId: зелёный; без ✓: красный';
        iphoneBridgeNote('iPhone: подсвечено ' + response.count +
          ' клеток (' + response.city + ')');
      } else if (response.state === 'waiting') {
        iphoneBridgeNote('iPhone: ' + response.reason);
      } else if (response.state === 'error') {
        iphoneBridgeNote('iPhone: ошибка подсветки — ' + response.reason);
      } else if (response.state === 'removed') {
        iphoneBridgeNote('iPhone: подсветка сброшена');
      }
      renderStatus();
    });
    try {
      const node = document.createElement('script');
      const nonce = document.querySelector('script[nonce]')?.nonce;
      if (nonce) node.nonce = nonce;
      node.textContent = '(' + iphonePageMapWorker.toString() +
        ')(' + JSON.stringify(iphoneChannel) + ');';
      (document.head || document.documentElement).appendChild(node);
      node.remove();
    } catch (error) {
      iphoneBridgeNote('iPhone: ошибка подключения — ' + error.message);
    }
    setTimeout(() => {
      if (!iphoneBridgeReady)
        iphoneBridgeNote('iPhone: Safari не разрешил доступ к странице (CSP).');
    },4000);
  }
  function iphoneApplyHighlight(force = false) {
    if (!isIPhone) return;
    iphoneInitBridge();
    if (!iphoneBridgeReady || !city || !rumors.size) return;
    const points = rumors.get(city) || [];
    if (!points.length) return;
    const key = city + '|' + points.map(p => p.key).join(',');
    const now = Date.now();
    if (!force && iphoneLastSentKey === key && now - iphoneLastSentAt < 5000)
      return;
    iphoneLastSentKey = key;
    iphoneLastSentAt = now;
    iphoneBridgeSend({
      cmd:'apply',city,signature:key,
      points:points.map(p => ({x:p.x,y:p.y}))
    });
  }
  function iphoneClearHighlight() {
    if (!isIPhone || !iphoneBridgeReady) return;
    iphoneLastSentKey = '';
    iphoneBridgeSend({cmd:'remove'});
  }

  // ===== ПОДСВЕТКА СЛУХОВ =====

  function removeLayers(map) {
    if (!map) return;

    try {
      if (map.getLayer(LAYER)) {
        map.removeLayer(LAYER);
      }
    } catch {}
  }

  function clearHighlight() {
    if (isIPhone) iphoneClearHighlight();
    removeLayers(readyMap());

    if (appliedMap) {
      removeLayers(appliedMap);
    }
    signature = '';
    appliedMap = null;
  }

  function setCity(name, method) {
    if (!CITIES.includes(name)) return;

    if (city !== name) clearHighlight();

    city = name;
    pending = null;
    preview = name;
    $('city').value = name;

    lastAction = `Выбран ${name} (${method})`;

    highlight();
    renderStatus();
  }

  const RUMOR_COLOR = [
    'case',
    ['has', 'rumorId'],
    '#20d765',
    '#ff3030'
  ];

  function highlight() {
    const map = readyMap();
    if (isIPhone && !map) {
      iphoneApplyHighlight();
      return;
    }
    if (!map || !city || !rumors.size) return;

    const points = rumors.get(city) || [];

    if (!points.length) {
      clearHighlight();
      return;
    }

    completionInfo = '✓ rumorId: зелёный; без ✓: красный';

    const next = city + '|' + points.map(p => p.key).join(',');

    try {
      if (
        map === appliedMap &&
        signature === next &&
        map.getLayer(LAYER)
      ) return;

      removeLayers(map);

      const coordinateFilter = p => [
        'all',
        ['==', ['get', 'x'], p.y],
        ['==', ['get', 'y'], p.x]
      ];

      const filter = [
        'any',
        ...points.map(coordinateFilter)
      ];

      const before = map.getLayer('areas-grid-layer')
        ? 'areas-grid-layer'
        : undefined;

      map.addLayer({
        id: LAYER,
        type: 'fill',
        source: 'areas-data',
        filter,
        paint: {
          'fill-color': RUMOR_COLOR,
          'fill-opacity': 0.72,
          'fill-outline-color': '#ffffff'
        }
      }, before);

      appliedMap = map;
      signature = next;

    } catch (error) {
      mapInfo = 'Ошибка подсветки: ' + error.message;
    }
  }

  // ===== ENTER ДЛЯ ОКНА НАГРАДЫ =====

  document.addEventListener('keydown', event => {
    if (
      event.key !== 'Enter' ||
      event.repeat ||
      event.isComposing
    ) return;

    const target = event.target;

    if (
      target instanceof Element &&
      target.closest(
        'input, textarea, select, button, [contenteditable="true"]'
      )
    ) return;

    const candidates = [
      ...document.querySelectorAll(
        'div,span,p,h1,h2,h3,button'
      )
    ].filter(el => {
      const r = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();

      return (
        r.width > 0 &&
        r.height > 0 &&
        text.length < 180 &&
        /нажми, чтобы продолжить/i.test(text)
      );
    });

    if (!candidates.length) return;

    const prompt = candidates.sort(
      (a, b) =>
        a.textContent.length - b.textContent.length
    )[0];

    const r = prompt.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;

    const clickable =
      document.elementFromPoint(x, y) || prompt;

    event.preventDefault();
    event.stopPropagation();

    clickable.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y
    }));
  }, true);

  // ===== СТАТУС И ДИАГНОСТИКА =====

  function renderStatus() {
    const points = rumors.get(city) || [];

    $('status').textContent = city
      ? (
        `Город: ${city}\n` +
        (
          signature
            ? `Подсвечено: ${points.length}`
            : 'Ожидаю карту / подсветку'
        ) +
        '\n' +
        (
          points.map(p => p.key).join(', ') ||
          'Слухи не найдены'
        ) + '\nИсточник: ' + (rumorLock?.source || 'нет')
      )
      : loadState + '\nОжидаю выбора города';

    const total = [...rumors.values()]
      .reduce((sum, list) => sum + list.length, 0);

    $('diag').textContent =
      `Карта: ${mapInfo}\n` +
      `Кнопка «Выбрать»: ${
        selectButton() ? 'Да' : 'Нет'
      }\n` +
      `Карточка: ${preview || 'Не найдена'}\n` +
      `Город: ${city || 'Не определён'}\n` +
      `Слухов загружено: ${total}\n` +
      `Состояние галочек: ${completionInfo}\n` +
      `Последнее действие: ${lastAction}` +
      '\nИсточник слухов: ' + (rumorLock?.source || 'не выбран') +
      (isIPhone ? "\nСвязь iPhone: " + iphoneBridgeState : "");
  }

  // ===== ЗАГРУЗКА СЛУХОВ =====

  const RUMOR_LOCK_KEY = 'hk-rumors-first-source-v1';
  const RUMOR_POLL_MS = 3 * 60 * 1000;
  let rumorLock = null;
  let rumorLastPoll = 0;
  const RUMOR_MONTHS = {
    января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6,
    июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12
  };
  const rumorDayKey = (timestamp = Date.now()) => {
    const shifted = new Date(timestamp + 3 * 3600000);
    if (shifted.getUTCHours() < 15) shifted.setUTCDate(shifted.getUTCDate() - 1);
    return shifted.toISOString().slice(0,10);
  };
  const emptyRumors = () => new Map(CITIES.map(name => [name,[]]));
  const rumorPoint = pair => ({
    x:Number(pair[1]), y:Number(pair[2]),
    key:Number(pair[1]) + ':' + Number(pair[2])
  });
  function rumorCount(data) {
    return [...data.values()].reduce((total,points) => total + points.length,0);
  }
  function rumorValid(data, minimumCities = 8) {
    let complete = 0;
    for (const points of data.values()) {
      if (points.length === 3 && points.every(p =>
          Number.isInteger(p.x) && Number.isInteger(p.y) &&
          p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100 &&
          new Set(points.map(q => q.key)).size === 3)) complete++;
    }
    return complete >= minimumCities;
  }
  function parseRumors(text) {
    const result = emptyRumors();
    const normalized = String(text || '').replace(/\u00a0/g,' ')
      .replace(/[：﹕]/g,':');
    const lines = normalized.split(/\r?\n/);
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line || line.length > 450) continue;
      const pairs = [...line.matchAll(/(\d{1,3})\s*:\s*(\d{1,3})/g)]
        .map(rumorPoint);
      if (pairs.length !== 3) continue;
      for (const name of CITIES) {
        if (line.startsWith(name + ':') ||
            line.startsWith(name + ' :') ||
            line.endsWith(' ' + name)) {
          result.set(name,pairs);
          break;
        }
      }
    }
    return result;
  }
  function rumorPlainText(html) {
    if (!/<html|<body|<div/i.test(html)) return String(html);
    const doc = new DOMParser().parseFromString(html,'text/html');
    doc.querySelectorAll('script,style,noscript').forEach(el => el.remove());
    doc.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    doc.querySelectorAll('p,li,h1,h2,h3,h4').forEach(el => el.append('\n'));
    return doc.body?.textContent || '';
  }

  function siteRumorDay(html) {
    const text = rumorPlainText(html);
    const match = text.match(/(\d{1,2})\s*(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)?\s*[-–—]\s*(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\s*[-–—:]?\s*(?:координат|слух)/i);
    if (!match) return null;
    const endYear = Number(match[5]);
    const endMonth = RUMOR_MONTHS[match[4].toLowerCase()];
    const startMonth = match[2] ? RUMOR_MONTHS[match[2].toLowerCase()] : endMonth;
    const startYear = startMonth > endMonth ? endYear-1 : endYear;
    const date = new Date(Date.UTC(startYear,startMonth-1,Number(match[1])));
    if (date.getUTCDate() !== Number(match[1]) ||
        date.getUTCMonth() !== startMonth-1) return null;
    return date.toISOString().slice(0,10);
  }

  function telegramRumorDataset(html, day) {
    const doc = new DOMParser().parseFromString(html,'text/html');
    const posts = [];
    for (const post of doc.querySelectorAll('.tgme_widget_message_wrap')) {
      const body = post.querySelector('.tgme_widget_message_text');
      const time = post.querySelector('time[datetime]');
      if (!body || !time) continue;
      const timestamp = Date.parse(time.getAttribute('datetime') || '');
      if (!Number.isFinite(timestamp) || rumorDayKey(timestamp) !== day) continue;
      const content = body.cloneNode(true);
      content.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      content.querySelectorAll('p,div').forEach(el => el.append('\n'));
      const text = content.textContent || '';
      if (!/hamster\s*king/i.test(text) || !/слух/i.test(text)) continue;
      const parsed = parseRumors(text);
      if (!rumorValid(parsed)) continue;
      posts.push({timestamp,data:parsed});
    }
    posts.sort((a,b) => a.timestamp-b.timestamp);
    return posts[0]?.data || null;
  }

  function serializeRumors(data) {
    return Object.fromEntries([...data].map(([name,points]) => [
      name,points.map(p => ({x:p.x,y:p.y,key:p.key}))
    ]));
  }
  function restoreRumorLock() {
    if (rumorLock) return;
    try {
      const stored = JSON.parse(localStorage.getItem(RUMOR_LOCK_KEY) || 'null');
      if (stored?.day !== rumorDayKey() || !stored?.data ||
          !['Сайт','Telegram','Ручной ввод'].includes(stored?.source)) return;
      const data = emptyRumors();
      for (const name of CITIES) {
        const points = stored.data[name];
        if (!Array.isArray(points)) continue;
        data.set(name,points.slice(0,3).map(p => ({
          x:Number(p.x),y:Number(p.y),key:Number(p.x)+':'+Number(p.y)
        })));
      }
      if (!rumorValid(data, stored.source === 'Ручной ввод' ? 1 : 8)) return;
      rumorLock = {day:stored.day,source:stored.source};
      rumors = data;
      loadState = 'Слухи: ' + stored.source + ' (сохранённый выбор)';
      highlight();
    } catch {}
  }
  function acceptRumorSource(data,source,day,manual = false) {
    if (day !== rumorDayKey() || (!manual && rumorLock?.day === day)) return false;
    if (!rumorValid(data,manual ? 1 : 8)) return false;
    rumorLock = {day,source};
    clearHighlight();
    rumors = data;
    loadState = 'Слухи: ' + source + ', выбраны первыми (до 15:00 МСК)';
    try {
      localStorage.setItem(RUMOR_LOCK_KEY,JSON.stringify({
        day,source,data:serializeRumors(data)
      }));
    } catch {}
    highlight();
    renderStatus();
    return true;
  }
  function expireRumorLock() {
    const day = rumorDayKey();
    if (rumorLock && rumorLock.day !== day) {
      rumorLock = null;
      rumors = emptyRumors();
      clearHighlight();
      loadState = 'Новый игровой день: ожидаю свежие слухи';
      try { localStorage.removeItem(RUMOR_LOCK_KEY); } catch {}
    }
  }
  function useRumors(text) {
    const data = parseRumors(rumorPlainText(text));
    if (!acceptRumorSource(data,'Ручной ввод',rumorDayKey(),true))
      throw Error('В ручном вводе нет трёх координат одного города');
  }

  // ===== СЕТЕВЫЕ ЗАПРОСЫ =====

  function request(url) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest === 'function') {
        try {
          GM_xmlhttpRequest({
            method: 'GET',
            url,
            timeout: 20000,

            onload(response) {
              if (response.status >= 200 &&
                response.status < 300
              ) {
                resolve(response.responseText);
              } else {
                reject(Error('HTTP ' + response.status));
              }
            },

            onerror() {
              reject(Error('Запрос заблокирован'));
            },

            ontimeout() {
              reject(Error('Тайм-аут'));
            }
          });
        } catch (error) {
          reject(error);
        }
      } else {
        fetch(url, { credentials: 'omit' })
          .then(response => {
            if (!response.ok) {
              throw Error('HTTP ' + response.status);
            }
            return response.text();
          })
          .then(resolve, reject);
      }
    });
  }

  async function loadRumors() {
    expireRumorLock();
    restoreRumorLock();
    if (loadingRumors) return;
    if (rumorLock?.day === rumorDayKey()) {
      loadState = 'Слухи закреплены: ' + rumorLock.source + ' (до 15:00 МСК)';
      renderStatus();
      return;
    }

    loadingRumors = true;
    rumorLastPoll = Date.now();
    const day = rumorDayKey();
    const errors = [];
    loadState = 'Ищу свежие слухи: сайт и Telegram…';
    renderStatus();

    const tasks = [
      request(RUMOR_URL + '?t=' + Date.now()).then(html => {
        if (siteRumorDay(html) !== day) {
          errors.push('Сайт: дата слухов не сегодняшняя');
          return;
        }
        const data = parseRumors(rumorPlainText(html));
        if (!acceptRumorSource(data,'Сайт',day))
          errors.push('Сайт: координаты отсутствуют или уже выбран источник');
      }).catch(error => errors.push('Сайт: ' + error.message)),
      request(TELEGRAM_URL + '?t=' + Date.now()).then(html => {
        const data = telegramRumorDataset(html,day);
        if (!data) {
          errors.push('Telegram: свежий пост пока не найден');
          return;
        }
        acceptRumorSource(data,'Telegram',day);
      }).catch(error => errors.push('Telegram: ' + error.message))
    ];
    try {
      await Promise.all(tasks);
      if (!rumorLock && day === rumorDayKey()) {
        loadState = 'Свежих слухов пока нет. ' +
          errors.filter(x => !x.includes('уже выбран')).join('; ');
        renderStatus();
      }
    } finally {
      loadingRumors = false;
    }
  }

  $('refresh').onclick = () => loadRumors();

  $('apply').onclick = () => {
    try {
      useRumors($('manual').value);
    } catch (error) {
      loadState = error.message;
      renderStatus();
    }
  };

  $('city').onchange = () => {
    const value = $('city').value;

    if (value) {
      setCity(value, 'вручную');
    } else {
      clearHighlight();

      city = null;
      pending = null;
      lastAction = 'Автоматический режим';

      renderStatus();
    }
  };

  // ===== «ПОНЯТНО» ВО ВСЕЙ ИГРЕ И СЕАНС ДЕЙСТВИЙ ПАЗЛА =====
  const PUZZLE_ACK_SESSION_MS = 45 * 60 * 1000;
  let puzzleAckUntil = 0;
  let autoAckLastButton = null;
  let autoAckLastContext = '';
  let autoAckCount = 0;
  let puzzleActionLastDialog = null;
  let puzzleActionLastTitle = '';
  let puzzleActionUsed = false;
  let puzzleActionMissingTicks = 0;
  let puzzleActionCount = 0;

  function puzzleAckStop() {
    puzzleAckUntil = 0;
    puzzleActionLastDialog = null;
    puzzleActionLastTitle = '';
    puzzleActionUsed = false;
    puzzleActionMissingTicks = 0;
    $('puzzleAckStatus').classList.add('hidden');
  }
  function puzzleAckArm() {
    if (!uiSettings.puzzle ||
        (!uiSettings.autoAck && !uiSettings.autoPuzzleAction)) return;
    puzzleAckUntil = Date.now() + PUZZLE_ACK_SESSION_MS;
    puzzleActionLastDialog = null;
    puzzleActionLastTitle = '';
    puzzleActionUsed = false;
    puzzleActionMissingTicks = 0;
    puzzleActionCount = 0;
    $('puzzleAckStatus').textContent =
      '🧩 Пазл: ' +
      [
        uiSettings.autoAck ? 'авто «Понятно»' : '',
        uiSettings.autoPuzzleAction ? 'авто действия (расход ресурсов)' : ''
      ].filter(Boolean).join(' + ');
    $('puzzleAckStatus').classList.remove('hidden');
  }
  const puzzleAckText = node => String(
    node?.innerText || node?.textContent || node?.value || ''
  ).replace(/\s+/g,' ').trim().toLowerCase();

  function puzzleAckVisible(node, allowNoninteractiveLabel = false) {
    if (!node || !node.isConnected || node.disabled ||
        node.getAttribute('aria-disabled') === 'true' ||
        node.hasAttribute('disabled')) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 5 && rect.height > 5 &&
      rect.top < innerHeight && rect.bottom > 0 &&
      rect.left < innerWidth && rect.right > 0 &&
      style.display !== 'none' && style.visibility !== 'hidden' &&
      (allowNoninteractiveLabel || style.pointerEvents !== 'none') &&
      style.opacity !== '0';
  }
  function puzzleAckFindButton() {
    const nodes = document.querySelectorAll(
      'button,[role="button"],div,span,p,a,input[type="button"],input[type="submit"]'
    );
    const matched = [];
    for (const node of nodes) {
      if (puzzleAckText(node) !== 'понятно' ||
          [...node.children].some(child => puzzleAckText(child) === 'понятно') ||
          !puzzleAckVisible(node, true)) continue;
      const rect = node.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2, rect.top + rect.height / 2
      );
      if (!hit || !(node === hit || node.contains(hit) ||
          (hit !== document.body && hit !== document.documentElement &&
           hit.contains(node)))) continue;
      const target = hit.closest('button,[role="button"],a,[onclick]') || hit;
      if (!puzzleAckVisible(target)) continue;
      if (!matched.some(item => item.node === target)) {
        matched.push({node:target,label:node});
      }
    }
    return matched.length === 1 ? matched[0] : null;
  }
  function puzzleAckContext(label) {
    let parent = label.parentElement;
    for (let depth = 0; parent && depth < 7; depth++, parent = parent.parentElement) {
      const rect = parent.getBoundingClientRect();
      if (rect.width >= innerWidth * .95 && rect.height >= innerHeight * .85) break;
      const text = puzzleAckText(parent);
      if (text.length >= 14 && text.length <= 280 &&
          text.includes('понятно')) return text;
    }
    return 'понятно';
  }
  function puzzleAckDispatchClick(target) {
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const common = {bubbles:true,cancelable:true,clientX:x,clientY:y,button:0};
    if (typeof PointerEvent === 'function') {
      target.dispatchEvent(new PointerEvent('pointerdown',{
        ...common,pointerId:1,pointerType:'mouse',isPrimary:true,buttons:1
      }));
    }
    target.dispatchEvent(new MouseEvent('mousedown',{...common,buttons:1}));
    if (typeof PointerEvent === 'function') {
      target.dispatchEvent(new PointerEvent('pointerup',{
        ...common,pointerId:1,pointerType:'mouse',isPrimary:true,buttons:0
      }));
    }
    target.dispatchEvent(new MouseEvent('mouseup',{...common,buttons:0}));
    if (typeof target.click === 'function') target.click();
    else target.dispatchEvent(new MouseEvent('click',{...common,buttons:0}));
  }
  function updateAutoAckStatus() {
    $('autoAckStatus').textContent = !uiSettings.autoAck
      ? 'Выключено'
      : autoAckCount ? 'Нажато: ' + autoAckCount
      : 'Включено';
  }
  function autoAckTick() {
    if (inventoryAutoRunning) return;
    if (!uiSettings.autoAck) return;
    if (document.visibilityState !== 'visible') return;
    if (giftFlowActive && (giftShopOpen() || giftOfferVisible())) return;

    try {
      const match = puzzleAckFindButton();
      if (!match) {
        autoAckLastButton = null;
        autoAckLastContext = '';
        return;
      }
      const button = match.node;
      const context = puzzleAckContext(match.label);
      if (button === autoAckLastButton && context === autoAckLastContext)
        return;
      autoAckLastButton = button;
      autoAckLastContext = context;
      puzzleAckDispatchClick(button);
      autoAckCount++;
      updateAutoAckStatus();
    } catch (error) {
      $('autoAckStatus').textContent =
        'Не удалось нажать «Понятно»: ' + error.message;
    }
  }

  // ===== ПАЗЛ: КНОПКА ДЕЙСТВИЯ В КАРТОЧКАХ ЛОКАЦИЙ =====
  const PUZZLE_ENEMY_MARKER =
    /^(?:можно\s+(?:отыскать|найти|встретить)|содержит|(?:включ[её]нная|выключ[её]нная|горящая)\s+лампочка)$/i;
  const PUZZLE_ACTION_UNSAFE =
    /покинуть\s+локацию|ты\s+покинешь\s+локацию|не\s+сможешь\s+сюда\s+вернуться|продолжить\s*\?|назад|отмена|₽|usdt|visa|mastercard|ежедневный\s+подарок|сделка\s+стратега|доля\s+капо|выбор\s+босса/i;
  const PUZZLE_ACTION_COST = /^(?:⚔\uFE0F?\s*|🗡\uFE0F?\s*)?(\d{1,5})$/u;
  function puzzleActionEligibleCost(node) {
    const text = puzzleAckText(node);
    const match = text.match(PUZZLE_ACTION_COST);
    return match ? Number(match[1]) : 0;
  }
  function puzzleActionButtonInDialog(dialog) {
    const rect = dialog.getBoundingClientRect();
    const actions = new Map();
    const priceLabels = dialog.querySelectorAll(
      'button,[role="button"],[class*="button"],[class*="Button"],div,span,strong'
    );
    for (const label of priceLabels) {
      const cost = puzzleActionEligibleCost(label);
      if (!cost || cost > 9999 || !puzzleAckVisible(label,true)) continue;
      if ([...label.children].some(child =>
        puzzleActionEligibleCost(child) === cost)) continue;
      let candidate = null;
      let node = label;
      for (let depth = 0; node && node !== dialog && depth < 5;
           depth++, node = node.parentElement) {
        const r = node.getBoundingClientRect();
        if (r.width < 70 || r.height < 30 ||
            r.width > rect.width * .85 ||
            r.height > rect.height * .24) continue;
        const cx = r.left + r.width/2;
        const cy = r.top + r.height/2;
        if (cy < rect.top + rect.height*.64 ||
            Math.abs(cx - (rect.left+rect.width/2)) > rect.width*.28) continue;
        if (!puzzleAckVisible(node)) continue;
        const hit = document.elementFromPoint(cx,cy);
        if (!hit || !(node === hit || node.contains(hit))) continue;
        const hasButtonClass = /button|btn|fight|battle|attack|action/i.test(
          String(node.className || '')
        );
        if (node.matches('button,[role="button"]') || hasButtonClass ||
            node.querySelector('img,svg,[class*="icon"],[class*="Icon"]')) {
          candidate = node;
          break;
        }
        if (!candidate) candidate = node;
      }
      if (!candidate) continue;
      if (!actions.has(candidate)) actions.set(candidate,cost);
    }
    return actions.size === 1
      ? {button:[...actions.keys()][0],cost:[...actions.values()][0]}
      : null;
  }
  function puzzleActionFindCard() {
    const headings = document.querySelectorAll('h1,h2,h3,h4,h5,div,span,p,strong');
    for (const heading of headings) {
      if (!PUZZLE_ENEMY_MARKER.test(puzzleAckText(heading)) ||
          !puzzleAckVisible(heading,true) ||
          [...heading.children].some(c =>
            PUZZLE_ENEMY_MARKER.test(puzzleAckText(c)))) continue;
      let dialog = heading.parentElement;
      for (let depth = 0; dialog && depth < 9;
           depth++, dialog = dialog.parentElement) {
        if (dialog === document.body || dialog === document.documentElement)
          break;
        const box = dialog.getBoundingClientRect();
        if (box.width < 185 || box.height < 185 ||
            box.height > innerHeight*1.1 ||
            box.width > innerWidth*1.1) continue;
        if (box.width >= innerWidth*.98 && box.height >= innerHeight*.92)
          break;
        const text = puzzleAckText(dialog);
        if (text.length < 55 || text.length > 2200) continue;
        if (PUZZLE_ACTION_UNSAFE.test(text)) continue;
        if (/лампочка/i.test(puzzleAckText(heading)) &&
            !/лампочка\s+горит|зажги\s+все\s+девять\s+лампочек/i.test(text))
          continue;
        const match = puzzleActionButtonInDialog(dialog);
        if (!match) continue;
        const title = text.split(
          /можно\s+(?:отыскать|найти|встретить)|содержит|лампочка\s+горит/i
        )[0].slice(-100).trim();
        return {...match,dialog,title:title || 'Карточка локации'};
      }
    }
    return null;
  }
  function puzzleActionTick() {
    if (!puzzleAckUntil || !uiSettings.puzzle || !uiSettings.autoPuzzleAction)
      return;
    if (Date.now() >= puzzleAckUntil) return;
    if (document.visibilityState !== 'visible') return;
    if (giftFlowActive && (giftShopOpen() || giftOfferVisible())) return;
    const match = puzzleActionFindCard();
    if (!match) {
      if (++puzzleActionMissingTicks >= 2) {
        puzzleActionUsed = false;
        puzzleActionLastDialog = null;
        puzzleActionLastTitle = '';
      }
      return;
    }
    puzzleActionMissingTicks = 0;
    if (puzzleActionUsed && puzzleActionLastTitle === match.title) return;
    puzzleActionUsed = true;
    puzzleActionLastDialog = match.dialog;
    puzzleActionLastTitle = match.title;
    try {
      puzzleAckDispatchClick(match.button);
      puzzleActionCount++;
      $('puzzleAckStatus').textContent =
        '🧩 Пазл: кнопка действия (' + match.cost +
        ' ресурсов); нажатий: ' + puzzleActionCount;
    } catch (error) {
      $('puzzleAckStatus').textContent =
        '🧩 Пазл: кнопка действия недоступна: ' + error.message;
    }
  }

  // ===== МЕСТО РАСКОПОК: АВТОНАЖАТИЕ =====
  // Ищет окно с заголовком «Место раскопок» и нажимает кнопку
  // с ценой в нижней части диалога. Работает по настройке
  // autoPuzzleAction (расходует ресурсы), независимо от сессии пазла.
  let digLastDialog = null;
  let digLastClickedAt = 0;
  let digLastClickedLabel = '';
  let digClickCount = 0;

  function digSiteFindButton() {
    const headings = document.querySelectorAll(
      'div,span,p,h1,h2,h3,h4,h5,strong'
    );
    for (const heading of headings) {
      if (puzzleAckText(heading) !== 'место раскопок' ||
          !puzzleAckVisible(heading, true)) continue;
      if ([...heading.children].some(c =>
          puzzleAckText(c) === 'место раскопок')) continue;

      let dialog = heading.parentElement;
      for (let depth = 0; dialog && depth < 9;
           depth++, dialog = dialog.parentElement) {
        if (dialog === document.body || dialog === document.documentElement)
          break;
        const box = dialog.getBoundingClientRect();
        if (box.width < 185 || box.height < 185 ||
            box.height > innerHeight * 1.1 ||
            box.width > innerWidth * 1.1) continue;
        if (box.width >= innerWidth * .98 && box.height >= innerHeight * .92)
          break;

        const text = puzzleAckText(dialog);
        if (text.length < 55 || text.length > 2200) continue;
        if (!/копни/i.test(text)) continue;

        if (/покинуть\s+локацию|ты\s+покинешь\s+локацию|не\s+сможешь\s+сюда\s+вернуться|отмена|₽|usdt|visa|mastercard/i.test(text))
          continue;

        const candidates = dialog.querySelectorAll(
          'button,[role="button"],[class*="button"],[class*="Button"],div,span'
        );
        for (const btn of candidates) {
          if (!puzzleAckVisible(btn) || btn.disabled ||
              btn.getAttribute('aria-disabled') === 'true') continue;
          if ([...btn.children].some(child =>
              /\d{1,5}\s*$/.test(puzzleAckText(child)))) continue;

          const btnText = puzzleAckText(btn);
          if (!/\d{1,5}\s*$/.test(btnText) || btnText.length > 40) continue;

          const r = btn.getBoundingClientRect();
          if (r.top < box.top + box.height * 0.55) continue;
          if (Math.abs((r.left + r.width / 2) -
              (box.left + box.width / 2)) > box.width * 0.32) continue;

          const hit = document.elementFromPoint(
            r.left + r.width / 2, r.top + r.height / 2
          );
          if (!hit || !(btn === hit || btn.contains(hit) || hit.contains(btn)))
            continue;

          return { button: btn, dialog, label: btnText };
        }
      }
    }
    return null;
  }

  function digSiteTick() {
    if (!uiSettings.autoDigSite) return;
    if (document.visibilityState !== 'visible') return;
    if (giftFlowActive && (giftShopOpen() || giftOfferVisible())) return;

    const match = digSiteFindButton();
    if (!match) {
      digLastDialog = null;
      digLastClickedLabel = '';
      return;
    }

    const now = Date.now();
    if (digLastDialog === match.dialog &&
        digLastClickedLabel === match.label &&
        now - digLastClickedAt < 4000) return;

    digLastDialog = match.dialog;
    digLastClickedLabel = match.label;
    digLastClickedAt = now;

    try {
      puzzleAckDispatchClick(match.button);
      digClickCount++;
      if (!$('puzzleAckStatus').classList.contains('hidden')) {
        $('puzzleAckStatus').textContent =
          '⛏️ Раскопки: нажато (' + match.label +
          '); всего: ' + digClickCount;
      }
    } catch (error) {
      // silent
    }
  }

  setInterval(() => {
    autoAckTick();
    puzzleActionTick();
    digSiteTick();
  }, 500);
  updateAutoAckStatus();

  function puzzleNote(text) {
    $('puzzleAckStatus').textContent = '🧩 Пазл: ' + text;
    $('puzzleAckStatus').classList.remove('hidden');
  }

  function puzzleSolver() {
    const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    for (const scope of [page, window]) {
      const solver = scope.__HK_PUZZLE_SOLVER__;
      if (solver && typeof solver.check === 'function') return solver;
    }
    return null;
  }

  $('puzzle').onclick = async () => {
    if (puzzleLoading) return;

    try {
      const solver = puzzleSolver();
      if (solver) {
        puzzleAckArm();
        puzzleNote('запускаю проверку игрового поля…');
        await solver.check();
        return;
      }
    } catch (error) {
      puzzleAckStop();
      puzzleNote('ошибка запуска — ' + (error.message || String(error)));
      return;
    }

    puzzleLoading = true;
    $('puzzle').textContent = '⏳ Загрузка...';
    puzzleNote('загружаю модуль с tk-clan.ru…');

    const script = document.createElement('script');
    let settled = false;
    let timer;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      script.remove();
      puzzleLoading = false;
      $('puzzle').textContent = '🧩 Запустить пазл';
      if (error) {
        puzzleAckStop();
        puzzleNote(error);
        return;
      }
      try {
        if (!puzzleSolver()) {
          puzzleAckStop();
          puzzleNote('файл загружен, но модуль не запустился. ' +
            'Возможна ошибка или изменение внешнего скрипта.');
          return;
        }
        puzzleAckArm();
        puzzleNote('модуль загружен. Если поле не решается, ' +
          'нажми «Запустить пазл» ещё раз.');
      } catch (error) {
        puzzleAckStop();
        puzzleNote('ошибка модуля — ' + (error.message || String(error)));
      }
    };

    timer = setTimeout(() => finish('модуль не ответил за 20 секунд. ' +
      'Проверь доступ к tk-clan.ru и попробуй ещё раз.'), 20000);
    script.onload = () => finish();
    script.onerror = () => finish('не удалось загрузить модуль с tk-clan.ru. ' +
      'Возможна блокировка браузером или недоступность сайта.');
    try {
      const nonce = document.querySelector('script[nonce]')?.nonce;
      if (nonce) script.nonce = nonce;
      script.src = PUZZLE_URL + '?' + Date.now();
      document.documentElement.appendChild(script);
    } catch (error) {
      finish('ошибка загрузки — ' + (error.message || String(error)));
    }
  };

  // ===== КУПОНЫ TELEGRAM =====

  function parseCoupons(html) {
    const doc = new DOMParser()
      .parseFromString(html, 'text/html');

    const result = [];

    for (const post of doc.querySelectorAll(
      '.tgme_widget_message_wrap'
    )) {
      const body = post.querySelector(
        '.tgme_widget_message_text'
      );

      if (!body) continue;

      const text = (
        body.innerText ||
        body.textContent ||
        ''
      )
        .replace(/\u00a0/g, ' ')
        .trim();

      if (
        !/hamster\s*king|хамстер\s*кинг|хомяк/i.test(text) ||
        !/купон|coupon|промокод|promo.?code/i.test(text)
      ) continue;

      const time = post.querySelector(
        'time[datetime]'
      );

      const timestamp = Date.parse(
        time?.getAttribute('datetime') || ''
      );

      if (!Number.isFinite(timestamp)) continue;

      let code = null;

      const patterns = [
        /(?:вводим|код\s*[:—–-]|купон\s*[:—–-]|промокод\s*[:—–-]|coupon\s*[:—–-]|promo\s*code\s*[:—–-])\s*[«"'`]?\s*([A-Za-z0-9_-]{4,32})/i,
        /\b(HK[A-Z0-9]{3,30})\b/
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match) continue;

        const value = match[1];

        if (
          !/^(hamster|king|coupon|promo|code|вводим)$/i
            .test(value)
        ) {
          code = value;
          break;
        }
      }

      if (!code) continue;

      const link = post.querySelector(
        '.tgme_widget_message_date'
      )?.getAttribute('href') || CHANNEL_URL;

      result.push({ code, timestamp, link });
    }

    result.sort((a, b) => b.timestamp - a.timestamp);

    return result.filter(
      (item, index, array) =>
        array.findIndex(
          other => other.code === item.code
        ) === index
    );
  }

  function renderCoupons() {
    const container = $('coupons');
    container.replaceChildren();
    $('couponStatus').textContent = couponState.replace(/\s+/g,' ').trim();
    $('couponRefresh').disabled = loadingCoupons;

    for (const [index, item] of couponItems.entries()) {
      if (index) container.appendChild(document.createTextNode(', '));
      const code = document.createElement('button');
      code.type = 'button';
      code.className = 'coupon-code';
      code.textContent = item.code;
      code.title = 'Скопировать ' + item.code;
      code.setAttribute('aria-label', 'Скопировать купон ' + item.code);
      code.onclick = async () => {
        try {
          await navigator.clipboard.writeText(item.code);
          $('couponStatus').textContent = '✓ Скопирован: ' + item.code;
        } catch {
          window.prompt('Скопируй купон:', item.code);
        }
      };
      container.appendChild(code);
    }
  }

  async function loadCoupons() {
    if (loadingCoupons) return;

    loadingCoupons = true;
    couponState = 'Проверяю публикации Telegram...';
    renderCoupons();

    try {
      const html = await request(
        TELEGRAM_URL + '?t=' + Date.now()
      );

      const now = Date.now();
      const cutoff = now - 48 * 60 * 60 * 1000;

      couponItems = parseCoupons(html)
        .filter(item =>
          item.timestamp >= cutoff &&
          item.timestamp <= now + 60000
        )
        .slice(0, 5);

      couponState = couponItems.length
        ? (
          `Найдено: ${couponItems.length}.\n` +
          'Действие купонов не подтверждено.'
        )
        : (
          'За последние 48 часов купоны ' +
          'в доступных сообщениях не найдены.\n' +
          'Проверь канал вручную.'
        );

    } catch (error) {
      couponItems = [];

      couponState =
        'Telegram недоступен: ' +
        error.message +
        '. Открой канал по ссылке.';

    } finally {
      loadingCoupons = false;
      renderCoupons();
    }
  }

  $('couponRefresh').onclick = loadCoupons;

  const COUPON_CHECK_INTERVAL_MS = 30 * 60 * 1000;
  setInterval(() => {
    if (document.visibilityState === 'visible') loadCoupons();
  }, COUPON_CHECK_INTERVAL_MS);

  let lastCouponAutoCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastCouponAutoCheck < COUPON_CHECK_INTERVAL_MS) return;
    lastCouponAutoCheck = Date.now();
    loadCoupons();
  });


  // ===== БЕЗОПАСНЫЙ СБОР БЕСПЛАТНЫХ ПОДАРКОВ =====
  let giftBusy = false;
  let giftClicks = 0;
  const giftClickedLabels = new WeakMap();
  const giftAwaitingChanges = new Set();
  function giftObserveButtonChanges() {
    for (const button of giftAwaitingChanges) {
      if (!button.isConnected ||
          giftText(button) !== giftClickedLabels.get(button)) {
        giftClickedLabels.delete(button);
        giftAwaitingChanges.delete(button);
      }
    }
  }
  function giftActionReady(button) {
    return button && !giftClickedLabels.has(button);
  }
  function giftMarkClicked(button) {
    giftClickedLabels.set(button, giftText(button));
    giftAwaitingChanges.add(button);
  }
  const giftStatus = message => { $('giftStatus').textContent = message; };
  const giftVisible = (element, allowText = false) => {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 3 && rect.height > 3 &&
      rect.bottom > 0 && rect.top < innerHeight &&
      rect.right > 0 && rect.left < innerWidth &&
      style.display !== 'none' && style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      (allowText || style.pointerEvents !== 'none');
  };
  const giftText = element => (element?.innerText || element?.textContent || '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  function giftSection(button) {
    let node = button.parentElement;
    for (let depth = 0; node && depth < 7; depth++, node = node.parentElement) {
      const text = giftText(node);
      if (text.length > 1400) break;
      if (/vip\s*30|купить|стоимость|цена|оплатить|пополнить|₽|\$|usdt/i.test(text)) return null;
      if (/ежедневный подарок|получить\s*\(\s*\d+\s*\/\s*5\s*\)/i.test(text)) return 'daily';
      if (/подарки/i.test(text) && /получить/i.test(text) && text.length < 900) return 'gifts';
    }
    return null;
  }
  function giftShopOpen() {
    return Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,p'))
      .some(el => el.children.length < 4 && giftVisible(el,true) &&
        /ежедневный подарок/i.test(giftText(el)) && giftText(el).length < 90);
  }
  function giftCandidate() {
    if (!giftShopOpen()) return null;
    const buttons = Array.from(document.querySelectorAll(
      'button,[role="button"],[class*="button"],[class*="Button"]'
    )).filter(element => {
      if (element.matches('button,[role="button"]')) return true;
      if (element.closest('button,[role="button"]')) return false;
      return ![...element.querySelectorAll('button,[role="button"]')]
        .some(child => giftText(child) === giftText(element));
    });
    for (const button of buttons) {
      if (!giftVisible(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') continue;
      const label = giftText(button);
      if (!/^получить(?:\s*\(\s*\d+\s*\/\s*5\s*\))?$/.test(label)) continue;
      const kind = giftSection(button);
      if (!kind) continue;
      if (kind === 'daily') return button;
    }
    for (const button of buttons) {
      if (!giftVisible(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') continue;
      if (giftText(button) !== 'получить' || giftSection(button) !== 'gifts') continue;
      return button;
    }
    return null;
  }
  let giftManualUntil = 0;
  let giftFlowActive = false;
  const GIFT_OFFER_TITLE = /сделка стратега|доля капо|выбор босса/i;
  function giftOfferTitleVisible() {
    return Array.from(document.querySelectorAll('div,span,h1,h2,h3'))
      .some(el => el.children.length < 4 && giftVisible(el,true) &&
        GIFT_OFFER_TITLE.test(giftText(el)) && giftText(el).length < 90);
  }
  function giftSkipInOfferContext(node) {
    let parent = node.parentElement;
    for (let depth = 0; parent && depth < 9;
         depth++, parent = parent.parentElement) {
      if (parent === document.body || parent === document.documentElement)
        break;
      const text = giftText(parent);
      if (text.length > 1600) break;
      if (/покинуть локацию|не сможешь сюда вернуться|удалить аккаунт/i.test(text))
        return false;
      if (GIFT_OFFER_TITLE.test(text)) return true;
      if (parent.matches(
        '[role="dialog"],[aria-modal="true"],[class*="modal"],[class*="Modal"],[class*="popup"],[class*="Popup"]'
      )) {
        return !/ежедневный подарок|поздравляем,? получено/i.test(text) &&
          /предложени|скидк|купить|платн|цена|стоимость|vip|₽|usdt/i.test(text);
      }
    }
    return false;
  }
  function giftSafeSkipControl(button, label) {
    if (!button || !giftVisible(button) || button.disabled ||
        button.getAttribute('aria-disabled') === 'true' ||
        button.hasAttribute('disabled') ||
        button.classList?.contains('disabled') ||
        getComputedStyle(button).cursor === 'not-allowed' ||
        giftText(button) !== label) return false;
    const childLabel = [...button.querySelectorAll('span,div')].find(child =>
      giftText(child) === label && giftVisible(child,true) &&
      giftSkipInOfferContext(child));
    return giftSkipInOfferContext(button) || Boolean(childLabel);
  }
  function giftSafeAdvanceTarget() {
    if (!giftFlowActive) return null;
    const buttons = [...document.querySelectorAll('button,[role="button"]')];
    const skip = buttons.filter(button =>
      giftSafeSkipControl(button,'пропустить'));
    if (skip.length === 1) return skip[0];
    if (skip.length > 1) return null;
    const next = buttons.filter(button =>
      giftSafeSkipControl(button,'продолжить'));
    if (next.length === 1) return next[0];
    if (next.length > 1) return null;
    if (buttons.some(button =>
        /^(пропустить|продолжить)$/.test(giftText(button)))) return null;

    const fallback = new Set();
    for (const node of document.querySelectorAll('div,span,a')) {
      const label = giftText(node);
      if (label !== 'пропустить' && label !== 'продолжить') continue;
      if (buttons.some(button => button.contains(node))) continue;
      const control = node.closest('[class*="button"],[class*="Button"],[class*="btn"]');
      if (!control || control.matches('button,[role="button"]') ||
          !/button|btn/i.test(String(control.className||''))) continue;
      if (giftSafeSkipControl(control,label)) fallback.add(control);
    }
    return fallback.size === 1 ? [...fallback][0] : null;
  }
  function giftOfferVisible() {
    if (!giftFlowActive) return false;
    if (giftSafeAdvanceTarget()) return true;
    if (!giftOfferTitleVisible()) return false;
    const candidate = giftCandidate();
    if (candidate) {
      const rect = candidate.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2, rect.top + rect.height / 2
      );
      if (hit && (candidate === hit || candidate.contains(hit))) return false;
    }
    return true;
  }
  function giftDispatchClick(target) {
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (!hit || (!target.contains(hit) && !hit.contains(target))) return false;
    const actual = hit.closest('button,[role="button"],a') || hit;
    const common = {bubbles:true,cancelable:true,clientX:x,clientY:y,button:0};
    if (typeof PointerEvent === 'function') {
      actual.dispatchEvent(new PointerEvent('pointerdown',{
        ...common,pointerId:1,pointerType:'mouse',isPrimary:true,buttons:1
      }));
    }
    actual.dispatchEvent(new MouseEvent('mousedown',{...common,buttons:1}));
    if (typeof PointerEvent === 'function') {
      actual.dispatchEvent(new PointerEvent('pointerup',{
        ...common,pointerId:1,pointerType:'mouse',isPrimary:true,buttons:0
      }));
    }
    actual.dispatchEvent(new MouseEvent('mouseup',{...common,buttons:0}));
    if (typeof actual.click === 'function') actual.click();
    else actual.dispatchEvent(new MouseEvent('click',{...common,buttons:0}));
    return true;
  }
  const giftSkipAttempts = new WeakMap();
  function giftClickSafeSkip(target) {
    if (target.matches('button,[role="button"]') &&
        giftSafeSkipControl(target,giftText(target))) {
      target.click();
      return true;
    }
    return giftDispatchClick(target);
  }
  function advanceGiftOffer() {
    if (!giftOfferVisible()) {
      return false;
    }
    const target = giftSafeAdvanceTarget();
    if (!target) {
      giftStatus('Ожидаю исчезновения таймера на кнопке «Пропустить»…');
      return true;
    }
    const now = Date.now();
    let attempt = giftSkipAttempts.get(target);
    if (attempt && now - attempt.started > 25000) attempt = null;
    if (!giftActionReady(target)) {
      if (!attempt || now - attempt.last < 4000 || attempt.count >= 3) {
        giftStatus(attempt?.count >= 3
          ? '«Пропустить» не реагирует после 3 попыток. См. отчёт подарков.'
          : 'Жду реакции на «Пропустить»…');
        return true;
      }
      giftClickedLabels.delete(target);
      giftAwaitingChanges.delete(target);
    }
    if (giftClickSafeSkip(target)) {
      giftMarkClicked(target);
      giftSkipAttempts.set(target,{
        count:(attempt?.count || 0) + 1,
        started:attempt?.started || now,
        last:now
      });
      giftStatus('Нажал «Пропустить» без покупки. Проверяю следующий подарок…');
    } else {
      giftStatus('Кнопка пропуска перекрыта. Не нажимаю другие элементы.');
    }
    return true;
  }
  function confirmReceivedGift() {
    const heading = Array.from(document.querySelectorAll('div,span,h1,h2,h3,h4'))
      .find(el => el.children.length < 4 && giftVisible(el,true) &&
        /ежедневный подарок/i.test(giftText(el)) && giftText(el).length < 80);
    const received = Array.from(document.querySelectorAll('div,span,p'))
      .find(el => el.children.length < 4 && giftVisible(el,true) &&
        /поздравляем,? получено/i.test(giftText(el)) && giftText(el).length < 100);
    if (!heading || !received) return false;
    const target = Array.from(document.querySelectorAll('button,[role="button"],div,span'))
      .find(el => giftVisible(el) && giftText(el) === 'понятно' &&
        !Array.from(el.children).some(child => giftText(child) === 'понятно') &&
        !el.disabled && el.getAttribute('aria-disabled') !== 'true');
    if (!target) {
      giftStatus('Награда получена. Ожидаю кнопку «Понятно»…');
      return true;
    }
    if (!giftActionReady(target)) {
      giftStatus('Ожидаю закрытия подтверждения награды…');
      return true;
    }
    if (giftDispatchClick(target)) {
      giftMarkClicked(target);
      giftFlowActive = false;
      giftStatus('Награда подтверждена. Проверяю следующий подарок…');
    } else {
      giftStatus('Кнопка «Понятно» перекрыта. Не нажимаю другие элементы.');
    }
    return true;
  }

  async function collectGifts(manual = false) {
    if (giftBusy) return;
    if (manual) giftManualUntil = Date.now() + 15 * 60 * 1000;
    if (!manual && !uiSettings.autoGifts && Date.now() > giftManualUntil && !giftFlowActive) return;
    giftObserveButtonChanges();
    if (confirmReceivedGift()) return;
    if (advanceGiftOffer()) return;
    if (!giftShopOpen()) {
      giftStatus('Ожидаю открытый магазин: «Ежедневный подарок».');
      return;
    }
    if (giftClicks >= 30) {
      giftStatus('Лимит 30 нажатий за сессию. Перезагрузи страницу для повтора.');
      return;
    }
    const button = giftCandidate();
    if (!button) {
      const labels = [...document.querySelectorAll(
        'button,[role="button"],[class*="button"],[class*="Button"]'
      )].filter(x => giftVisible(x,true)).map(giftText).filter(x =>
        /получить|таймер|^\d{1,2}:\d{2}(?::\d{2})?$/.test(x)
      ).slice(0,8);
      giftStatus(labels.length
        ? 'Жду доступную «Получить»: ' + labels.join('; ').slice(0,100)
        : 'Кнопка «Получить» не найдена. См. «Отчёт подарков» в диагностике.');
      return;
    }
    if (!giftActionReady(button)) {
      giftStatus('Жду изменения кнопки после предыдущего получения…');
      return;
    }
    const rect = button.getBoundingClientRect();
    const underPointer = document.elementFromPoint(
      rect.left + rect.width / 2, rect.top + rect.height / 2
    );
    if (!underPointer || !button.contains(underPointer)) {
      giftStatus('Кнопка закрыта другим окном. Ожидаю доступности…');
      return;
    }
    giftBusy = true;
    try {
      giftMarkClicked(button);
      giftFlowActive = true;
      if (button.matches('button,[role="button"]')) {
        button.click();
      } else if (!giftDispatchClick(button)) {
        giftFlowActive = false;
        giftClickedLabels.delete(button);
        giftAwaitingChanges.delete(button);
        giftStatus('Кнопка «Получить» недоступна для нажатия.');
        return;
      }
      giftClicks++;
      giftStatus('Попыток получения: ' + giftClicks + '. Проверяю следующую награду…');
    } catch (error) {
      giftFlowActive = false;
      giftClickedLabels.delete(button);
      giftAwaitingChanges.delete(button);
      giftStatus('Не удалось нажать: ' + error.message);
    } finally {
      giftBusy = false;
    }
  }
  $('giftRun').onclick = () => collectGifts(true);
  function giftAutoTick() {
    if (uiSettings.autoGifts || Date.now() < giftManualUntil) collectGifts();
  }
  setInterval(giftAutoTick,600);
  function giftAutoResume() {
    if (uiSettings.autoGifts || Date.now() < giftManualUntil)
      setTimeout(giftAutoTick,100);
  }
  document.addEventListener('visibilitychange',giftAutoResume);
  document.addEventListener('resume',giftAutoResume);
  window.addEventListener('focus',giftAutoResume);
  window.addEventListener('pageshow',giftAutoResume);

  function giftDiagnosticReport() {
    const buttons = [...document.querySelectorAll(
      'button,[role="button"],[class*="button"],[class*="Button"]'
    )].filter(x => /получить|пропустить|продолжить|понятно|\d+:\d+/.test(
      giftText(x)
    )).slice(0,25).map(element => ({
      text:giftText(element).slice(0,90),
      tag:element.tagName,
      cls:String(element.className || '').slice(0,100),
      visible:giftVisible(element),
      disabled:Boolean(element.disabled) ||
        element.getAttribute('aria-disabled') === 'true',
      section:giftSection(element)
    }));
    return JSON.stringify({
      version:SCRIPT_VERSION,
      browser:navigator.userAgent.slice(0,180),
      pageVisibility:document.visibilityState,
      autoGifts:uiSettings.autoGifts,
      manualActive:Date.now()<giftManualUntil,
      flowActive:giftFlowActive,
      offerDetected:giftOfferVisible(),
      offerTitleDetected:giftOfferTitleVisible(),
      skipCandidateFound:Boolean(giftSafeAdvanceTarget()),
      actualSkipButtons:[...document.querySelectorAll(
        'button,[role="button"]'
      )].filter(el => /^(пропустить|продолжить)$/.test(giftText(el)))
        .slice(0,8).map(el => ({
          text:giftText(el),
          cls:String(el.className||'').slice(0,110),
          visible:giftVisible(el),
          context:giftSkipInOfferContext(el),
          safe:giftSafeSkipControl(el,giftText(el)),
          childContexts:[...el.querySelectorAll('span,div')].slice(0,5)
            .map(c => ({
              text:giftText(c).slice(0,40),
              context:giftSkipInOfferContext(c)
            }))
        })),
      visibleSkipLabels:[...document.querySelectorAll(
        'button,[role="button"],div,span,a'
      )].filter(el => {
        const label = giftText(el);
        return (label === 'пропустить' || label === 'продолжить') &&
          giftVisible(el,true) &&
          ![...el.children].some(child => giftText(child) === label);
      }).slice(0,8).map(el => ({
        text:giftText(el),
        tag:el.tagName,
        cls:String(el.className || '').slice(0,110),
        inOfferContext:giftSkipInOfferContext(el)
      })),
      clicks:giftClicks,
      shopDetected:giftShopOpen(),
      candidateFound:Boolean(giftCandidate()),
      currentStatus:$('giftStatus').textContent,
      buttons
    },null,2);
  }
  $('giftScanCopy').onclick = () => {
    const report = giftDiagnosticReport();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(report).then(() =>
        giftStatus('Отчёт подарков скопирован. Пришли его в чат.')
      ).catch(() => window.prompt('Скопируй отчёт подарков:',report));
    } else {
      window.prompt('Скопируй отчёт подарков:',report);
    }
  };


  // ===== ИНВЕНТАРЬ: АВТООТКРЫТИЕ СЛЕДУЮЩИХ СУНДУКОВ =====
  // Проверяем тип предмета до нажатия кнопок открытия.
  let inventoryAutoRunning=false;
  let inventoryAutoSession=null;
  const inventoryText=el=>String(el?.innerText||el?.textContent||'')
    .replace(/\s+/g,' ').trim().toLowerCase();
  function inventoryVisible(el){
    if(!el?.isConnected)return false;
    const r=el.getBoundingClientRect(),css=getComputedStyle(el);
    return r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&
      r.left<innerWidth&&r.top<innerHeight&&css.display!=='none'&&
      css.visibility!=='hidden'&&css.opacity!=='0';
  }
  function inventoryShown(){
    return [...document.querySelectorAll('div,span,button,h1,h2,h3')]
      .some(el=>el.children.length<3&&inventoryVisible(el)&&
        /(?:^|\s)инвентарь(?:\s|$)/i.test(inventoryText(el)) && inventoryText(el).length<80);
  }
  function inventoryCount(card){
    if(!card||!inventoryVisible(card))return null;
    const labels=[inventoryText(card),...[...card.querySelectorAll('span,div,strong')]
      .filter(el=>el.children.length<2&&inventoryVisible(el)).map(inventoryText)];
    const raw=labels.find(t=>/^\d{1,7}(?:[.,]\d{1,2})?\s*[kкmм]?$/i.test(t));
    const m=raw?.replace(/\s/g,'').match(/^(\d+(?:[.,]\d+)?)([kкmм]?)$/i);
    if(!m)return null;
    return Math.round(Number(m[1].replace(',','.'))*
      (/[kк]/i.test(m[2])?1000:/[mм]/i.test(m[2])?1000000:1));
  }
  function inventoryFingerprint(card){
    const img=card.querySelector('img[src],image[href]');
    if(img)return img.currentSrc||img.src||img.getAttribute('href')||'';
    for(const el of [card,...card.querySelectorAll('*')].slice(0,20)){
      const bg=getComputedStyle(el).backgroundImage;
      if(bg&&bg!=='none')return bg;
    }
    return '';
  }
  function inventoryGridFromClick(target){
    // В том числе последний сундук и короткие подписи количества.
    const item=target?.closest?.('.inventory-item');
    if(item){
      const cards=inventoryAllCards();
      if(cards.includes(item))return {clicked:item,first:cards[0]};
    }
    // В адаптивной мобильной сетке карточки могут лежать в разных
    // контейнерах. Не требуем общего parentElement у всех пяти.
    const square=el=>{
      if(!inventoryVisible(el))return false;
      const r=el.getBoundingClientRect();
      return r.width>=48&&r.width<=240&&r.height>=52&&r.height<=250;
    };
    const clickedCandidates=[];
    for(let n=target,i=0;n&&n!==document.body&&i<12;n=n.parentElement,i++){
      if(square(n)&&inventoryCount(n)!==null)clickedCandidates.push(n);
    }
    if(!clickedCandidates.length)return null;
    for(const clicked of clickedCandidates){
      const base=clicked.getBoundingClientRect();
      for(let parent=clicked.parentElement,depth=0;parent&&depth<8;
          parent=parent.parentElement,depth++){
        if(parent===document.body)break;
        const box=parent.getBoundingClientRect();
        if(box.width<base.width*3.1)continue;
        const matches=[];
        for(const el of parent.querySelectorAll('div,button,[role="button"],li')){
          if(!square(el)||inventoryCount(el)===null)continue;
          const r=el.getBoundingClientRect();
          if(Math.abs(r.width-base.width)>Math.max(15,base.width*.28)||
             Math.abs(r.height-base.height)>Math.max(16,base.height*.35))continue;
          if(matches.some(item=>item.el.contains(el)))continue;
          const index=matches.findIndex(item=>el.contains(item.el));
          if(index>=0)matches.splice(index,1);
          matches.push({el,x:r.left,y:r.top});
        }
        if(matches.length<4)continue;
        const inClicked=matches.find(item=>item.el===clicked||item.el.contains(clicked));
        if(!inClicked)continue;
        const top=Math.min(...matches.map(item=>item.y));
        const row=matches.filter(item=>Math.abs(item.y-top)<Math.max(14,base.height*.2))
          .sort((a,b)=>a.x-b.x);
        if(row.length<4)continue;
        const first=row[0].el;
        if(!first.isConnected||inventoryCount(first)===null)continue;
        return {clicked:inClicked.el,first};
      }
    }
    return null;
  }
  // Игровая панель использует DIV-кнопки, а «Открыть» является
  // заголовком, а не HTML button. Ищем минимальный видимый контейнер,
  // где одновременно есть «Открыть», «x1» и «Все»/числовая партия.
  const INVENTORY_AMOUNT_LABEL=/^(?:все|x\s*\d{1,5}|\d{1,5})$/i;
  function inventoryAmountLabels(scope){
    const nodes=[scope,...scope.querySelectorAll('button,[role="button"],div,span,a')];
    return nodes.filter(el=>inventoryVisible(el) &&
      INVENTORY_AMOUNT_LABEL.test(inventoryText(el)) &&
      ![...el.children].some(child =>
        INVENTORY_AMOUNT_LABEL.test(inventoryText(child))));
  }
  function inventoryDialog(){
    const labels=[...document.querySelectorAll(
      'div,span,h2,h3,h4,strong,p'
    )].filter(el=>inventoryVisible(el)&&el.children.length<4&&
      inventoryText(el)==='открыть');
    for(const title of labels){
      for(let box=title.parentElement,d=0;box&&d<11;
          box=box.parentElement,d++){
        if(box===document.body||box===document.documentElement)break;
        const r=box.getBoundingClientRect();
        if(r.width<180||r.height<90||r.width>innerWidth*1.1||
           r.height>innerHeight*1.1)continue;
        const choices=inventoryAmountLabels(box);
        const values=choices.map(inventoryText);
        // Должна присутствовать минимум пара команд количества.
        if(choices.length<2||!values.some(v=>/^x?\s*1$/i.test(v)) ||
           !values.some(v=>v==='все'||/^x?\s*(?:100|1000|\d{2,5})$/i.test(v)))
          continue;
        // Не взаимодействуем с магазином и платными предложениями.
        const text=inventoryText(box);
        if(/оплатить|купить за|₽|usdt|visa|mastercard|пополнить баланс/i.test(text))
          continue;
        return box;
      }
    }
    return null;
  }
  function inventoryAmountControl(label,dialog){
    if(!label||!dialog)return null;
    const caption=inventoryText(label);
    let candidate=null;
    for(let el=label,d=0;el&&el!==dialog&&d<6;
        el=el.parentElement,d++){
      if(!inventoryVisible(el)||el.disabled||
         el.getAttribute('aria-disabled')==='true'||
         el.hasAttribute('disabled')||
         /(?:^|[\s_-])disabled(?:$|[\s_-])/i.test(String(el.className||''))||
         getComputedStyle(el).pointerEvents==='none')return null;
      if(!candidate&&inventoryText(el)===caption&&(
         el.matches('button,[role="button"],[onclick],a') ||
         /(?:button|btn|quantity|amount|action)/i.test(String(el.className||'')) ||
         getComputedStyle(el).cursor==='pointer'))candidate=el;
    }
    // Без уверенно определённой кликабельной обёртки не нажимаем.
    return candidate;
  }
  function inventoryBatchButton(dialog,availableCount=Infinity){
    if(!dialog)return null;
    const choices=inventoryAmountLabels(dialog).map(el=>{
      const label=inventoryText(el);
      const btn=inventoryAmountControl(el,dialog);
      const m=label.match(/^x?\s*(\d{1,5})$/i);
      return btn?{btn,label,quantity:label==='все'?Infinity:m?Number(m[1]):0}:null;
    }).filter(Boolean).filter(c=>c.quantity>0&&
      (c.label==='все'||c.quantity<=availableCount));
    const unique=[...new Map(choices.map(c=>[c.btn,c])).values()]
      .sort((a,b)=>b.quantity-a.quantity||
        a.btn.getBoundingClientRect().left-b.btn.getBoundingClientRect().left);
    return unique[0]?.btn||null;
  }
  function inventoryClose(dialog){
    if(!dialog)return false;
    // Игровой крестик в правой верхней части внешнего окна.
    // Сначала ищем короткую явную метку закрытия и выбираем
    // её самый близкий интерактивный предок внутри карточки.
    const ancestors=[];
    for(let node=dialog,d=0;node&&d<7;node=node.parentElement,d++){
      if(node===document.body||node===document.documentElement)break;
      const r=node.getBoundingClientRect();
      if(d>0&&r.height>innerHeight*.96)break;
      ancestors.push(node);
    }
    for(const scope of ancestors){
      const box=scope.getBoundingClientRect();
      const options=[...scope.querySelectorAll(
        'button,[role="button"],div,span,a,[class*="close"],[class*="Close"],[aria-label]'
      )].filter(el=>{
        if(!inventoryVisible(el))return false;
        const r=el.getBoundingClientRect();
        const t=inventoryText(el);
        const c=String(el.className||'')+' '+String(el.getAttribute('aria-label')||'');
        const explicit=/^(?:×|✕|✖|x)$/i.test(t) ||
          /(?:^|[\s_-])close(?:$|[\s_-])|закрыть/i.test(c);
        return explicit && r.width>=10&&r.width<=95&&
          r.height>=10&&r.height<=95 &&
          r.left>box.left+box.width*.55 &&
          r.top>=box.top-15 &&
          r.top<box.top+Math.min(190,box.height*.4);
      });
      if(!options.length)continue;
      const clickables=new Set();
      for(const el of options){
        const rect=el.getBoundingClientRect();
        const hit=document.elementFromPoint(
          rect.left+rect.width/2,rect.top+rect.height/2);
        if(!hit || !(el===hit||el.contains(hit)||hit.contains(el)))continue;
        const control=hit.closest('button,[role="button"],[class*="close"],[class*="Close"],[onclick]') ||
          el.closest('button,[role="button"],[class*="close"],[class*="Close"],[onclick]') ||
          hit;
        if(scope.contains(control)&&inventoryVisible(control))clickables.add(control);
      }
      if(clickables.size!==1)continue;
      const target=[...clickables][0];
      // В React обработчик может быть на родителе SVG/span.
      target.click();
      return true;
    }
    return false;
  }
  function inventoryAllCards(){
    // Количество в реальной разметке: span.inventory-item__quantity.
    const seen=new Set(),result=[];
    for(const q of document.querySelectorAll('[class*="inventory-item__quantity"]')){
      if(!inventoryVisible(q))continue;
      let card=q.parentElement;
      for(let i=0;card&&i<7;i++,card=card.parentElement){
        if(String(card.className||'').split(/\s+/).includes('inventory-item'))
          break;
      }
      if(!card||card===document.body||seen.has(card)||
         !inventoryVisible(card)||inventoryCount(card)===null)continue;
      const r=card.getBoundingClientRect();
      if(r.width<45||r.height<45||r.width>250||r.height>270)continue;
      seen.add(card);result.push({card,x:r.left,y:r.top});
    }
    result.sort((a,b)=>Math.abs(a.y-b.y)<15?a.x-b.x:a.y-b.y);
    return result.map(x=>x.card);
  }
  function inventoryChestTitleVisible(dialog){
    if(!dialog)return false;
    // Название должно быть коротким заголовком, а не частью описания.
    for(let root=dialog,depth=0;root&&depth<4;root=root.parentElement,depth++){
      if(root===document.body||root===document.documentElement)break;
      if([...root.querySelectorAll('h1,h2,h3,h4,p,div,span,strong')]
         .some(el=>inventoryVisible(el)&&el.children.length<3&&
           inventoryText(el).length<70&&
           /^(?:набор|сундук|кейс|ящик|контейнер)(?:\s|$)/i.test(inventoryText(el))))
        return true;
    }
    return false;
  }
  let inventoryLastDiagnostic='Нажми на сундук в инвентаре';
  let inventoryLastSession=null;
  function inventoryAutoStatus(msg){
    $('inventoryAutoStatus').textContent=msg;
  }
  inventoryAutoStatus(uiSettings.autoInventoryCases?'Нажми на сундук':'Выключено');
  function inventoryDiagnostic(){
    return JSON.stringify({
      version:SCRIPT_VERSION,
      inventoryDetected:inventoryShown(),
      running:inventoryAutoRunning,
      phase:inventoryAutoSession?.phase||'idle',
      previousPhase:inventoryLastSession?.phase||null,
      previousStopReason:inventoryLastSession?.reason||null,
      closeAttempts:inventoryAutoSession?.closeAttempts||0,
      previousCloseAttempts:inventoryLastSession?.closeAttempts||0,
      currentDialogOpen:Boolean(inventoryDialog()),
      firstCount:inventoryCount(inventoryAutoSession?.first),
      typesDone:inventoryAutoSession?.typesDone||0,
      typeIndex:inventoryAutoSession?.typeIndex||0,
      inventoryCards:inventoryAllCards().slice(0,10).map(inventoryCount),
      isChestDialog:inventoryChestTitleVisible(inventoryDialog()),
      dialogDetected:Boolean(inventoryDialog()),
      openingLabels:[...document.querySelectorAll('div,span,h2,h3,h4,strong,p')]
        .filter(el=>inventoryVisible(el)&&inventoryText(el)==='открыть')
        .slice(0,6).map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,80)})),
      amountLabels:[...document.querySelectorAll('button,[role="button"],div,span')]
        .filter(el=>inventoryVisible(el)&&INVENTORY_AMOUNT_LABEL.test(inventoryText(el))&&
          ![...el.children].some(c=>INVENTORY_AMOUNT_LABEL.test(inventoryText(c))))
        .slice(0,12).map(el=>({text:inventoryText(el),tag:el.tagName,
          cls:String(el.className||'').slice(0,90),cursor:getComputedStyle(el).cursor})),
      lastAction:inventoryLastDiagnostic,
      status:$('inventoryAutoStatus').textContent
    },null,2);
  }
  $('inventoryAutoReport').onclick=()=>{
    const report=inventoryDiagnostic();
    if(navigator.clipboard?.writeText)
      navigator.clipboard.writeText(report).then(()=>
        inventoryAutoStatus('Отчёт скопирован — пришли его в чат')
      ).catch(()=>window.prompt('Отчёт инвентаря:',report));
    else window.prompt('Отчёт инвентаря:',report);
  };
  function inventoryAutoStop(msg='Остановлено'){
    if(inventoryAutoSession){
      inventoryLastSession={
        phase:inventoryAutoSession.phase,
        closeAttempts:inventoryAutoSession.closeAttempts||0,
        typesDone:inventoryAutoSession.typesDone||0,
        typeIndex:inventoryAutoSession.typeIndex||0,
        reason:msg
      };
    }
    inventoryAutoRunning=false;
    inventoryAutoSession=null;
    inventoryLastDiagnostic=msg;
    inventoryAutoStatus(msg);
  }
  function inventorySameFirst(a){
    return a.first?.isConnected&&inventoryVisible(a.first)&&
      (!a.fingerprint||inventoryFingerprint(a.first)===a.fingerprint);
  }
  function inventoryNextType(a,reason){
    a.typesDone++;
    a.first=null;
    a.fingerprint='';
    a.phase='nextClose';
    a.changedAt=Date.now();
    a.closeAttempts=0;
    a.nextCloseClickedAt=0;
    a.ackClicked=false;
    inventoryLastDiagnostic='Тип '+a.typesDone+' завершён: '+reason;
    inventoryAutoStatus('Кейс закончился, ищу следующий');
  }
  function inventoryAutoTick(){
    const a=inventoryAutoSession;
    if(!inventoryAutoRunning||!a)return;
    if(!uiSettings.autoInventoryCases||!inventoryShown()||
       document.visibilityState!=='visible'){
      inventoryAutoStop('Остановлено: инвентарь закрыт или вкладка скрыта');
      return;
    }
    const now=Date.now();
    if(now-a.changedAt>14000){
      inventoryAutoStop('Остановлено: нет ответа игры на текущем этапе');
      return;
    }
    const modal=inventoryDialog();
    const switching=['nextClose','nextSelect','nextVerify'].includes(a.phase);
    if(!switching){
      // После «Все» старая DOM-карточка исчезает, следующая
      // передвигается на её место. Это НЕ конец всей автоматизации.
      if(!inventorySameFirst(a)){
        inventoryNextType(a,'предмет исчез из сетки');return;
      }
      const count=inventoryCount(a.first);
      if(count===0){inventoryNextType(a,'осталось 0');return;}
      if(count===null){
        inventoryAutoStop('Остановлено: не удалось прочитать количество');
        return;
      }
    }
    if(a.phase==='nextClose'||a.phase==='nextSelect'){
      // «Открыть» исчезает только после закрытия панели: прежний
      // вариант делал click один раз и застревал в nextSelect.
      if(modal){
        if(now-(a.nextCloseClickedAt||0)<1100)return;
        if((a.closeAttempts||0)>=4){
          inventoryAutoStop('Остановлено: окно кейса не закрылось после 4 попыток');
          return;
        }
        a.closeAttempts=(a.closeAttempts||0)+1;
        a.nextCloseClickedAt=now;
        if(!inventoryClose(modal)){
          inventoryAutoStop('Остановлено: крестик окна не найден');
          return;
        }
        a.phase='nextClose';
        a.changedAt=now;
        inventoryAutoStatus('Закрываю пустой кейс ('+a.closeAttempts+'/4)');
        return;
      }
      // Не переходим к следующему предмету, пока старая панель видна.
      a.phase='nextSelect';
      a.closeAttempts=0;
      a.nextCloseClickedAt=0;
      a.changedAt=now;
      const cards=inventoryAllCards();
      const next=cards[0];
      if(!next){
        inventoryAutoStop('Готово: больше подходящих сундуков не найдено');
        return;
      }
      if(a.typeIndex>=40){
        inventoryAutoStop('Остановлено: проверено слишком много предметов');
        return;
      }
      a.first=next;
      a.fingerprint=inventoryFingerprint(next);
      a.typeIndex++;
      a.phase='nextVerify';a.changedAt=now;
      next.click();
      inventoryAutoStatus('Проверяю следующий предмет №'+a.typeIndex);
      return;
    }
    if(a.phase==='nextVerify'){
      if(!modal){
        if(now-a.changedAt>3500){
          inventoryAutoStop('Готово: следующий предмет без кнопок открытия');
        }
        return;
      }
      if(!inventoryChestTitleVisible(modal)){
        inventoryAutoStop('Готово: следующий предмет не сундук');
        return;
      }
      a.phase='batch';a.batches=0;a.changedAt=now;
      inventoryAutoStatus('Следующий сундук найден — открываю');
      return;
    }
    const count=inventoryCount(a.first);
    if(a.phase==='initial'){
      if(!modal){inventoryAutoStatus('Ищу окно «Открыть» и кнопки количества…');return;}
      if(!inventoryChestTitleVisible(modal)){
        inventoryAutoStop('Остановлено: выбранный предмет не распознан как сундук');
        return;
      }
      a.phase=a.clicked===a.first?'batch':'closeOther';
      a.changedAt=now;
    }
    if(a.phase==='closeOther'){
      if(modal&&!inventoryClose(modal)){
        inventoryAutoStop('Остановлено: не закрывается выбранный сундук');
        return;
      }
      a.phase='openFirst';a.changedAt=now;return;
    }
    if(a.phase==='openFirst'){
      if(modal)return;
      a.first.click();a.phase='waitFirst';a.changedAt=now;return;
    }
    if(a.phase==='waitFirst'){
      if(!modal)return;
      a.phase='batch';a.changedAt=now;
    }
    if(a.phase==='batch'){
      if(!modal){a.phase='openFirst';a.changedAt=now;return;}
      if(a.batches>=100){
        inventoryAutoStop('Остановлено: лимит 100 партий');return;
      }
      const btn=inventoryBatchButton(modal,count);
      if(!btn){
        inventoryAutoStop('Остановлено: нет доступной кнопки открытия');
        return;
      }
      a.before=count;a.ackClicked=false;a.batches++;
      btn.click();a.phase='waitResult';a.changedAt=now;
      inventoryAutoStatus('Кейс '+a.typeIndex+', партия '+a.batches);
      return;
    }
    if(a.phase==='waitResult'){
      if(count<a.before){
        if(count<=0){inventoryNextType(a,'количество стало 0');return;}
        a.phase='finishResult';a.changedAt=now;return;
      }
      if(!a.ackClicked){
        const awarded=[...document.querySelectorAll('div,span,h2,h3')]
          .some(el=>el.children.length<3&&inventoryVisible(el)&&
            /^(награды|награда получена|поздравляем|получено)$/i.test(inventoryText(el)));
        const ok=[...document.querySelectorAll('button,[role="button"]')]
          .filter(inventoryVisible).filter(el=>
            /^(понятно|хорошо|забрать|ок|ok)$/i.test(inventoryText(el)));
        if(awarded&&ok.length===1){
          a.ackClicked=true;ok[0].click();
        }
      }
      return;
    }
    if(a.phase==='finishResult'){
      a.ackClicked=false;
      if(modal&&!inventoryClose(modal)){
        inventoryAutoStop('Остановлено: не закрывается окно кейса');
        return;
      }
      a.phase='openFirst';a.changedAt=now;
    }
  }
  // Старт от реального нажатия; при ошибке показываем причину.
  document.addEventListener('click',e=>{
    if(!e.isTrusted||inventoryAutoRunning||!uiSettings.autoInventoryCases||
       document.visibilityState!=='visible'||e.composedPath().includes(host))
      return;
    if(!inventoryShown())return;
    const grid=inventoryGridFromClick(e.target);
    if(!grid){
      inventoryLastDiagnostic='Не удалось найти верхнюю левую ячейку сетки';
      inventoryAutoStatus('Сетка не распознана — нажми «Отчёт»');
      return;
    }
    const count=inventoryCount(grid.clicked);
    if(!count||count<=0){
      inventoryLastDiagnostic='Нет количества на первой карточке: '+String(count);
      inventoryAutoStatus('Не вижу количество сундуков — нажми «Отчёт»');
      return;
    }
    inventoryAutoSession={
      first:grid.clicked,clicked:grid.clicked,
      fingerprint:inventoryFingerprint(grid.clicked),
      phase:'initial',before:count,batches:0,ackClicked:false,
      typeIndex:1,typesDone:0,closeAttempts:0,
      nextCloseClickedAt:0,changedAt:Date.now()
    };
    inventoryAutoRunning=true;
    inventoryLastDiagnostic='Старт: первый тип, '+count+' шт.';
    inventoryAutoStatus('Нашёл первый сундук ('+count+'), ожидаю окно');
  },true);
  setInterval(inventoryAutoTick,450);

  // ===== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ =====

  let lastCouponDay = new Date().toDateString();

  setInterval(() => {
    const button = selectButton();
    const found = detectPreview();
    const map = readyMap();

    if (button && found) {
      preview = found;
    }

    if (pending && !button) {
      setCity(pending, 'автоматически');
    }

    if ((map || isIPhone) && city) {
      highlight();
    }

    expireRumorLock();
    if (!rumorLock && !loadingRumors &&
        Date.now() - rumorLastPoll > RUMOR_POLL_MS &&
        document.visibilityState === 'visible') loadRumors();

    const currentDay = new Date().toDateString();

    if (currentDay !== lastCouponDay) {
      lastCouponDay = currentDay;
      renderCoupons();
      loadCoupons();
    }

    renderStatus();
  }, 1000);

  if (isIPhone) iphoneInitBridge();
  restoreRumorLock();
  renderStatus();
  loadRumors();
  loadCoupons();
document.addEventListener('keydown', event => {
 if (event.key !== 'Enter' || event.repeat) return;

 const active = document.activeElement;
 if (active?.matches('input, textarea, select')) return;

 const x = Math.round(window.innerWidth / 2);
 const y = Math.round(window.innerHeight / 2);
 const target = document.elementFromPoint(x, y);

 if (!target) return;

 event.preventDefault();

 const options = {
   bubbles: true,
   cancelable: true,
   composed: true,
   clientX: x,
   clientY: y,
   button: 0,
   buttons: 1,
   pointerId: 1,
   pointerType: 'mouse',
   isPrimary: true,
   view: window
 };

 target.dispatchEvent(
   new PointerEvent('pointerdown', options)
 );

 target.dispatchEvent(
   new MouseEvent('mousedown', options)
 );

 target.dispatchEvent(
   new PointerEvent('pointerup', {
     ...options,
     buttons: 0
   })
 );

 target.dispatchEvent(
   new MouseEvent('mouseup', {
     ...options,
     buttons: 0
   })
 );

 target.dispatchEvent(
   new MouseEvent('click', {
     ...options,
     buttons: 0
   })
 );
}, true);
})();
