// ==UserScript==
// @name         Hamster King Helper Universal
// @namespace    hamster-king-helper-universal
// @version      3.14.3
// @description  Слухи, пазл, купоны, красные/зелёные клетки и Enter
// @match        https://app.hamsterking.games/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      crypto-witch.ru
// @connect      t.me
// @updateURL    https://raw.githubusercontent.com/KapunovKA/Hamster-King-Helper/main/Hamster-King-Helper.user.js
// @downloadURL  https://raw.githubusercontent.com/KapunovKA/Hamster-King-Helper/main/Hamster-King-Helper.user.js
// ==/UserScript==

(() => {
  'use strict';

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

  // iPhone получает интерфейс нижней панели; Mac и другие устройства
  // сохраняют прежнюю компактную плавающую панель без изменений.
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
    // Дочерние фиксированные элементы сами управляют кликами.
    // Свободная область экрана по-прежнему доступна игре.
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


    .coupon {
      border: 1px solid #47526a;
      border-radius: 8px;
      padding: 9px;
      margin-top: 8px;
      background: #272d3d;
    }

    .coupon.today {
      border: 2px solid #39d98a;
      background: #17382d;
      box-shadow: 0 0 12px rgba(57,217,138,.25);
    }

    .coupon-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .today-badge {
      color: #39d98a;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .code {
      font-size: 17px;
      font-weight: 700;
      color: #b6eac1;
      overflow-wrap: anywhere;
      margin-top: 8px;
    }

    .link {
      display: block;
      color: #a8d8ff;
      margin-top: 7px;
      text-decoration: none;
    }

    /* v3.8 compact dashboard */
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
    .dash-status { margin:10px 0 0; padding:9px 11px; border:1px solid #38465f; border-radius:11px; background:#202a3b; font-size:11px; }
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
    .chest-tools { padding-top:9px; margin-top:9px; border-top:1px solid #38465f; }
    .chest-tool-buttons { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:7px; }
    .chest-tool-buttons .btn { width:100%; margin:0; padding:7px 5px; font-size:11px; }
    .chest-tool-buttons .btn:last-child { grid-column:1/-1; }
    @media (max-width:340px) { .dashboard-grid { grid-template-columns:1fr; } }

    /* Только iPhone: нижняя выдвижная панель, удобная для касаний.
       Desktop-стили выше остаются неизменными. */
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
    :host(.hk-iphone) .chest-tool-buttons { grid-template-columns:minmax(0,1fr); }
    :host(.hk-iphone) .chest-tool-buttons .btn:last-child { grid-column:auto; }
  </style>

  <button id="mini" class="mini" aria-label="Открыть Hamster King Helper">🐹</button>
  <div id="mobileBackdrop" class="mobile-backdrop hidden" aria-hidden="true"></div>

  <div id="panel" class="panel hidden">
    <div class="head">
      <span>🐹 Hamster King Helper v3.14.3</span>
      <div class="head-actions">
        <button id="settingsToggle" class="settings-btn" title="Настройки" aria-label="Настройки">⚙️</button>
        <button id="close" class="close">−</button>
      </div>
    </div>

    <div id="settingsBox" class="settings-box hidden">
      <div class="settings-title">⚙️ Что показывать в панели</div>
      <label class="setting-row"><input type="checkbox" data-setting="showGifts"> 🎁 Подарки</label>
      <label class="setting-row"><input type="checkbox" data-setting="showChests"> 📦 Сундуки на карте</label>
      <label class="setting-row"><input type="checkbox" data-setting="showRumors"> 🗺️ Слухи</label>
      <label class="setting-row"><input type="checkbox" data-setting="coupons"> 🎟️ Купоны Telegram и их кнопки</label>
      <label class="setting-row"><input type="checkbox" data-setting="puzzle"> 🧩 Кнопка пазла</label>
      <label class="setting-row"><input type="checkbox" data-setting="city"> Ручной выбор города</label>
      <label class="setting-row"><input type="checkbox" data-setting="manual"> Ручной ввод слухов</label>
      <label class="setting-row"><input type="checkbox" data-setting="diagnostics"> Диагностика и служебные кнопки</label>
      <div class="settings-title" style="margin-top:12px">⚡ Автоматизация</div>
      <label class="setting-row"><input type="checkbox" data-setting="autoGifts"> Автоматически собирать бесплатные подарки</label>
      <label class="setting-row"><input type="checkbox" data-setting="autoChests"> Автоматически собирать сундуки</label>
      <label class="setting-row"><input type="checkbox" data-setting="autoPuzzleAck"> 🧩 Пазл: автоматически нажимать «Понятно»</label>
      <div class="small">Галочки «Что показывать» скрывают элементы. Галочки «Автоматизация» управляют сбором, не скрывая кнопки. Настройки сохраняются автоматически.</div>
    </div>

    <div class="dashboard-grid">
      <div id="section-gifts" class="dash-card">
        <span class="dash-title">🎁 Подарки</span>
        <div id="giftStatus" class="small">Ожидание магазина</div>
        <button id="giftRun" class="btn">🎁 Собрать</button>
      </div>
      <div id="section-chest-scan" class="dash-card">
        <span class="dash-title">📦 Сундуки на карте</span>
        <div id="chestAutoStatus" class="small">Автосбор выключен</div>
        <button id="chestAutoToggle" class="btn purple" title="Включить или выключить безопасный автосбор дохода">▶ Автосбор: ВЫКЛ</button>
      </div>
      <div id="section-rumors-card" class="dash-card">
        <span class="dash-title">🗺️ Слухи</span>
        <div class="small">Подсветка на карте</div>
        <div id="iphoneRumorStatus" class="small hidden" aria-live="polite"></div>
        <button id="refresh" class="btn">↻ Обновить</button>
      </div>
      <div id="section-coupons-card" class="dash-card">
        <span class="dash-title">🎟️ Купоны Telegram</span>
        <div id="couponSummary" class="small">Автопроверка каждые 30 минут</div>
        <button id="couponOpen" class="btn">Открыть список</button>
      </div>
    </div>
    <div id="status" class="dash-status good">Запуск...</div>
    <label id="section-city" class="dash-city" style="display:block">
      🏙️ Город (резервный выбор)
      <select id="city"><option value="">Автоматически</option></select>
    </label>
    <div id="dashActions" class="dash-actions">
      <button id="puzzle" class="btn purple">🧩 Запустить пазл</button>
      <button id="couponRefresh" class="btn">↻ Проверить купоны</button>
    </div>
    <div id="puzzleAckStatus" class="small hidden" aria-live="polite" style="margin-top:6px"></div>
    <div class="dash-secondary">
      <details id="section-coupons" class="dash-details">
        <summary>🎟️ Найденные купоны</summary>
        <div id="couponStatus" class="block small">Ожидание...</div>
        <div id="coupons"></div>
        <a class="link" href="https://t.me/official_crypto_witch" target="_blank" rel="noopener noreferrer">Открыть @official_crypto_witch</a>
      </details>
      <details id="section-diagnostics" class="dash-details">
        <summary>🛠️ Диагностика и служебные кнопки</summary>
        <div id="diag" class="block small"></div>
        <div class="chest-tools">
          <div class="settings-title">📦 Инструменты сундуков</div>
          <div id="chestScanStatus" class="small">Сканер: только диагностика</div>
          <div class="chest-tool-buttons">
            <button id="chestScanRun" class="btn">🔎 Найти</button>
            <button id="chestScanCopy" class="btn">📋 Отчёт</button>
            <button id="chestOpenTest" class="btn purple" title="Однократно пытается открыть окно дохода, не собирая награду">📦 Открыть (тест)</button>
            <button id="chestCollectTest" class="btn purple" title="Однократно нажимает СОБРАТЬ только в подтверждённом окне дохода">💰 Собрать (тест)</button>
            <button id="chestTapRecord" class="btn" title="Записывает одно ручное нажатие на карту">🎯 Записать нажатие</button>
          </div>
        </div>
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
  $('couponOpen').onclick = () => {
    if (!uiSettings.coupons) return;
    const details = $('section-coupons');
    details.open = !details.open;
    if (details.open) details.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  const couponSummaryObserver = new MutationObserver(() => {
    const value = $('couponStatus').textContent.trim().replace(/\s+/g,' ');
    $('couponSummary').textContent = value.slice(0,75) || 'Автопроверка каждые 30 минут';
  });
  couponSummaryObserver.observe($('couponStatus'), {childList:true,characterData:true,subtree:true});


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
    showChests: true,
    showRumors: true,
    autoGifts: false,
    autoChests: false,
    autoPuzzleAck: true
  };

  let uiSettings = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof saved[key] === 'boolean') uiSettings[key] = saved[key];
    }
  } catch {}

  // Каждая галочка видимости управляет ВСЕМИ относящимися к ней
  // элементами, включая карточки и дополнительные кнопки действий.
  // Настройки автосбора — отдельные функции, не переключатели видимости.
  const visibleSections = {
    diagnostics: [$('section-diagnostics')],
    manual: [$('section-manual')],
    city: [$('section-city')],
    coupons: [
      $('section-coupons-card'),
      $('section-coupons'),
      $('couponRefresh')
    ],
    puzzle: [$('puzzle')],
    showGifts: [$('section-gifts')],
    showChests: [$('section-chest-scan')],
    showRumors: [$('section-rumors-card')]
  };

  function applyUiSettings() {
    for (const [key, elements] of Object.entries(visibleSections)) {
      for (const element of elements) {
        element.classList.toggle('hidden', !uiSettings[key]);
      }
    }
    // Если не осталось ни одной нижней кнопки, убираем и её контейнер.
    $('dashActions').classList.toggle(
      'hidden', !uiSettings.puzzle && !uiSettings.coupons
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
      if (input.dataset.setting === 'autoChests') {
        updateChestAutoToggle();
        if (uiSettings.autoChests) setTimeout(chestAutoTick, 100);
      }
      if ((input.dataset.setting === 'autoPuzzleAck' && !uiSettings.autoPuzzleAck) ||
          (input.dataset.setting === 'puzzle' && !uiSettings.puzzle)) {
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
  // Userscripts на iOS может выполнять код в изолированном JS-мире,
  // где React-ссылки на MapLibre недоступны. Внедрённый скрипт работает
  // в мире самой страницы и только добавляет/удаляет слой карты.
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

  // Игра рисует галочку ✓ в areas-symbol-layer, если есть rumorId.
  // Используем тот же признак непосредственно в стиле MapLibre.
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

  // Слухи меняются каждый игровой день в 15:00 по Москве (UTC+3).
  // Выбор первого свежего источника запоминаем до следующего обновления.
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
    // Поддерживаем "Москва: [1:2] [3:4] [5:6]" (Telegram)
    // и "01:02﹕03:04﹕05:06 Москва" (сайт).
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

  // Проверяем не только координаты, но и дату публикации сайта:
  // без этой проверки можно подсветить вчерашние слухи.
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
      // В DOMParser на iPhone innerText может не сохранять переносы <br>.
      // Создаём текст с явными переносами между строками городов.
      const content = body.cloneNode(true);
      content.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      content.querySelectorAll('p,div').forEach(el => el.append('\n'));
      const text = content.textContent || '';
      if (!/hamster\s*king/i.test(text) || !/слух/i.test(text)) continue;
      const parsed = parseRumors(text);
      if (!rumorValid(parsed)) continue;
      posts.push({timestamp,data:parsed});
    }
    // Первый пост с полным набором слухов за нужный день.
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
    // Зафиксируем до обновления карты: следующий ответ сети не заменит первый.
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
              if (                response.status >= 200 &&
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

  // ===== ПАЗЛ =====
  // Подтверждаем только видимую кнопку с точной надписью «Понятно»,
  // когда пользователь запустил пазл через нашу кнопку.
  // Не трогаем магазин, подарки, платные предложения или другие команды.
  const PUZZLE_ACK_SESSION_MS = 45 * 60 * 1000;
  let puzzleAckUntil = 0;
  let puzzleAckLastButton = null;
  let puzzleAckLastContext = '';
  let puzzleAckCount = 0;

  function puzzleAckStop() {
    puzzleAckUntil = 0;
    puzzleAckLastButton = null;
    puzzleAckLastContext = '';
    $('puzzleAckStatus').classList.add('hidden');
  }
  function puzzleAckArm() {
    if (!uiSettings.puzzle || !uiSettings.autoPuzzleAck) return;
    puzzleAckUntil = Date.now() + PUZZLE_ACK_SESSION_MS;
    puzzleAckLastButton = null;
    puzzleAckLastContext = '';
    puzzleAckCount = 0;
    $('puzzleAckStatus').textContent =
      '🧩 Авто «Понятно» включено на время пазла';
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
  function puzzleAckInUnrelatedWindow(node) {
    // Исключаем чужие окна по близкому окружению кнопки, не по
    // названию игровой локации и не по тексту всей страницы.
    let parent = node.parentElement;
    for (let depth = 0; parent && depth < 7; depth++, parent = parent.parentElement) {
      if (parent === document.body || parent === document.documentElement) break;
      const rect = parent.getBoundingClientRect();
      // Глобальная обёртка игры не является диалогом.
      if (rect.width >= innerWidth * .95 && rect.height >= innerHeight * .85) break;
      const text = puzzleAckText(parent);
      if (text.length > 900) break;
      if (/ежедневный подарок|подарки|покупк|купить|оплатить|пополнить|магазин|vip\s*30|₽|usdt|сделка стратега|доля капо|выбор босса/i.test(text))
        return true;
    }
    return false;
  }
  // Отбираем самый внутренний элемент с точным текстом «Понятно».
  // Настоящая кнопка может быть как button, так и div/span без class=button.
  // Клик по внутренней подписи всплывает в родительский React-обработчик.
  function puzzleAckFindButton() {
    const nodes = document.querySelectorAll(
      'button,[role="button"],div,span,p,a,input[type="button"],input[type="submit"]'
    );
    const matched = [];
    for (const node of nodes) {
      if (puzzleAckText(node) !== 'понятно' ||
          [...node.children].some(child => puzzleAckText(child) === 'понятно') ||
          // Надпись внутри кнопки может иметь pointer-events:none.
          // Саму кнопку отдельно проверяем на возможность нажатия.
          !puzzleAckVisible(node, true) ||
          puzzleAckInUnrelatedWindow(node)) continue;
      const rect = node.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2, rect.top + rect.height / 2
      );
      if (!hit || !(node === hit || node.contains(hit) ||
          (hit !== document.body && hit !== document.documentElement &&
           hit.contains(node)))) continue;
      const target = hit.closest('button,[role="button"],a,[onclick]') || hit;
      if (!puzzleAckVisible(target)) continue;
      // На одной кнопке могут совпасть несколько текстовых обёрток.
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
      // Название награды не задано: любое содержимое окна,
      // где есть ещё хотя бы один текстовый элемент помимо кнопки.
      if (text.length >= 14 && text.length <= 280 &&
          text.includes('понятно')) return text;
    }
    return 'понятно';
  }
  function puzzleAckDispatchClick(target) {
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    // Ранее игра не всегда реагировала на один .click().
    // Отправляем обычную последовательность событий указателя
    // на уже проверенный видимый элемент, не на координаты вслепую.
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
  function puzzleAckTick() {
    if (!puzzleAckUntil || !uiSettings.autoPuzzleAck || !uiSettings.puzzle) return;
    if (Date.now() >= puzzleAckUntil) {
      puzzleAckStop();
      return;
    }
    if (document.visibilityState !== 'visible') return;
    // Флаг giftFlowActive может остаться от предыдущего сбора.
    // Он не должен навсегда блокировать подтверждения в пазле.
    if (giftFlowActive && (giftShopOpen() || giftOfferVisible())) return;

    try {
      const match = puzzleAckFindButton();
      if (!match) return;
      const button = match.node;
      const context = puzzleAckContext(match.label);
      if (button === puzzleAckLastButton && context === puzzleAckLastContext)
        return;
      // Не повторяем клик, пока всё то же окно остаётся видимым.
      puzzleAckLastButton = button;
      puzzleAckLastContext = context;
      puzzleAckDispatchClick(button);
      puzzleAckCount++;
      $('puzzleAckStatus').textContent =
        '🧩 Пазл: «Понятно» нажато ' + puzzleAckCount + ' раз';
    } catch (error) {
      $('puzzleAckStatus').textContent =
        '🧩 Не удалось нажать «Понятно»: ' + error.message;
    }
  }
  setInterval(puzzleAckTick, 500);

  $('puzzle').onclick = () => {
    const solver = window.__HK_PUZZLE_SOLVER__;

    if (
      solver &&
      typeof solver.check === 'function'
    ) {
      puzzleAckArm();
      try {
        solver.check();
      } catch (error) {
        puzzleAckStop();
        loadState =
          'Ошибка пазла: ' + error.message;
        renderStatus();
      }
      return;
    }

    if (puzzleLoading) return;

    puzzleAckArm();
    puzzleLoading = true;
    $('puzzle').textContent = '⏳ Загрузка...';

    const script = document.createElement('script');
    script.src = PUZZLE_URL + '?' + Date.now();

    script.onload = () => {
      puzzleLoading = false;
      $('puzzle').textContent = '🧩 Запустить пазл';
    };

    script.onerror = () => {
      puzzleLoading = false;
      puzzleAckStop();
      $('puzzle').textContent = '🧩 Запустить пазл';

      loadState = 'Не удалось загрузить пазл';
      renderStatus();
    };

    document.documentElement.appendChild(script);
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

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function renderCoupons() {
    const container = $('coupons');
    container.replaceChildren();

    $('couponStatus').textContent = couponState;

    const today = new Date();

    for (const item of couponItems) {
      const dateValue = new Date(item.timestamp);
      const isToday = sameDay(dateValue, today);

      const card = document.createElement('div');
      card.className =
        isToday ? 'coupon today' : 'coupon';

      const heading = document.createElement('div');
      heading.className = 'coupon-head';

      const date = document.createElement('div');
      date.className = 'small';

      date.textContent =
        dateValue.toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

      heading.appendChild(date);

      if (isToday) {
        const badge = document.createElement('span');
        badge.className = 'today-badge';
        badge.textContent = '● СЕГОДНЯ';
        heading.appendChild(badge);
      }

      const code = document.createElement('div');
      code.className = 'code';
      code.textContent = item.code;

      const copy = document.createElement('button');
      copy.className = 'btn';
      copy.textContent = 'Скопировать';

      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(item.code);
          copy.textContent = '✓ Скопировано';
        } catch {
          const textarea =
            document.createElement('textarea');

          textarea.value = item.code;
          root.appendChild(textarea);
          textarea.select();

          try {
            document.execCommand('copy');
            copy.textContent = '✓ Скопировано';
          } catch {
            copy.textContent = 'Выдели код вручную';
          }

          textarea.remove();
        }
      };

      const link = document.createElement('a');
      link.className = 'link';
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Открыть публикацию';

      card.append(heading, code, copy, link);
      container.appendChild(card);
    }
  }

  async function loadCoupons() {    if (loadingCoupons) return;

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

  // Автопроверка купонов каждые 30 минут, пока игра открыта.
  // loadCoupons уже защищён от параллельных запросов.
  const COUPON_CHECK_INTERVAL_MS = 30 * 60 * 1000;
  setInterval(() => {
    if (document.visibilityState === 'visible') loadCoupons();
  }, COUPON_CHECK_INTERVAL_MS);

  // Если вкладка долго была в фоне, обновляем купоны при возвращении.
  let lastCouponAutoCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastCouponAutoCheck < COUPON_CHECK_INTERVAL_MS) return;
    lastCouponAutoCheck = Date.now();
    loadCoupons();
  });

  // ===== СКАНЕР СУНДУКОВ НА КАРТЕ (ТОЛЬКО ЧТЕНИЕ) =====
  // Не нажимает на карту и не вызывает игровые методы сбора.
  let chestScanReport = 'Сканирование ещё не запускалось.';
  const chestScanStatus = message => { $('chestScanStatus').textContent = message; };
  function scanMapChests() {
    const map = getMap();
    if (!map || typeof map.queryRenderedFeatures !== 'function') {
      chestScanStatus('Карта MapLibre не найдена. Открой карту города.');
      return;
    }
    try {
      const canvas = map.getCanvas();
      const width = canvas.clientWidth || canvas.width;
      const height = canvas.clientHeight || canvas.height;
      if (!width || !height) {
        chestScanStatus('Карта пока не готова.');
        return;
      }
      const layers = (map.getStyle()?.layers || [])
        .filter(layer => layer.type === 'symbol')
        .map(layer => layer.id);
      // Считываем видимые символы. Никаких кликов или изменения состояния игры.
      const features = map.queryRenderedFeatures(
        [[0, 0], [width, height]], { layers }
      );
      const relevant = /chest|treasure|loot|reward|income|profit|collect|сундук|сокровищ|доход|награда|сбор/i;
      const matched = features.filter(feature => {
        const layer = feature.layer?.id || '';
        const props = JSON.stringify(feature.properties || {});
        return relevant.test(layer + ' ' + props);
      });
      const unique = new Map();
      for (const feature of matched) {
        const p = feature.properties || {};
        const coordinates = feature.geometry?.coordinates;
        const key = JSON.stringify([feature.layer?.id, feature.id, p, coordinates]);
        if (!unique.has(key)) unique.set(key, {
          layer: feature.layer?.id,
          id: feature.id ?? null,
          properties: p,
          geometryType: feature.geometry?.type,
          coordinates
        });
      }
      const byLayer = {};
      for (const feature of features) {
        const id = feature.layer?.id || 'unknown';
        byLayer[id] = (byLayer[id] || 0) + 1;
      }
      const report = {
        time: new Date().toISOString(),
        url: location.href,
        mapElement: map.getContainer()?.id || '',
        viewport: { width, height },
        symbolLayers: layers,
        renderedFeatures: features.length,
        featureCountByLayer: byLayer,
        potentialChestCount: unique.size,
        candidates: Array.from(unique.values()).slice(0, 60)
      };
      chestScanReport = JSON.stringify(report, null, 2);
      chestScanStatus('Символов: ' + features.length +
        '; возможных сундуков: ' + unique.size +
        '. Нажми «📋 Отчёт» и пришли результат.');
    } catch (error) {
      chestScanStatus('Ошибка сканирования: ' + error.message);
      chestScanReport = 'Ошибка: ' + String(error);
    }
  }


  // Запись одного РЕАЛЬНОГО нажатия пользователя на карту.
  // Не отправляет синтетические клики и не нажимает кнопку сбора.
  let chestTapCapture = null;
  $('chestTapRecord').onclick = () => {
    if (chestTapCapture) {
      chestTapCapture.stop();
      return;
    }
    const map = getMap();
    if (!map || typeof map.queryRenderedFeatures !== 'function') {
      chestScanStatus('Карта не найдена. Открой город.');
      return;
    }
    const canvas = map.getCanvas();
    const container = map.getContainer();
    const events = [];
    let finished = false;
    const types = ['pointerdown','pointerup','mousedown','mouseup','click','touchstart','touchend'];
    const handler = event => {
      if (finished) return;
      const rect = canvas.getBoundingClientRect();
      const touch = event.changedTouches?.[0] || event.touches?.[0];
      const x = (touch?.clientX ?? event.clientX ?? 0) - rect.left;
      const y = (touch?.clientY ?? event.clientY ?? 0) - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      const features = map.queryRenderedFeatures([x,y]).slice(0,20).map(f => ({
        layer:f.layer?.id || null,
        properties:f.properties || {},
        coordinates:f.geometry?.coordinates || null
      }));
      events.push({type:event.type,x:Math.round(x),y:Math.round(y),
        target:event.target?.tagName || '',features});
      if (event.type === 'click' || event.type === 'touchend' ||
          event.type === 'pointerup') {
        setTimeout(() => finish(), 500);
      }
    };
    const cleanup = () => {
      types.forEach(type => container.removeEventListener(type,handler,true));
      chestTapCapture = null;
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup();
      chestScanReport = JSON.stringify({
        mode:'real-chest-tap',time:new Date().toISOString(),
        url:location.href,events
      },null,2);
      chestScanStatus('Записано событий: '+events.length+
        '. Нажми «📋 Отчёт» и пришли результат.');
    };
    const stop = () => { finish(); };
    chestTapCapture = {stop};
    types.forEach(type => container.addEventListener(type,handler,true));
    closeHelperPanel();
    chestScanStatus('Режим записи: нажми один сундук вручную. Затем открой помощник и скопируй отчёт.');
    setTimeout(() => { if (!finished) finish(); },20000);
  };


  // Безопасный однократный тест открытия через события MapLibre.
  // Строго один подтверждённый доходный маркер, никакого сбора наград.
  let chestTestBusy = false;
  let chestTestLog = {};
  const chestTestNote = (step, info = {}) => {
    chestTestLog = {...chestTestLog,mode:'maplibre-open-test',...info,
      version:'3.14.3',time:new Date().toISOString(),url:location.href,step};
    chestScanReport = JSON.stringify(chestTestLog,null,2);
    chestScanStatus(step + ' — отчёт доступен по кнопке 📋.');
  };
  $('chestOpenTest').onclick = () => {
    if (chestTestBusy) return;
    chestTestLog = {};
    chestTestNote('Тест начат');
    const map = getMap();
    if (!map || !map.getCanvas || !map.project || !map.queryRenderedFeatures ||
        typeof map.fire !== 'function') {
      chestTestNote('Карта MapLibre не готова.');
      return;
    }
    try {
      const canvas = map.getCanvas();
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height || !map.getLayer('markers-layer')) {
        chestTestNote('Слой маркеров ещё не готов.');
        return;
      }
      const matches = map.queryRenderedFeatures([[0,0],[width,height]],{
        layers:['markers-layer']
      }).filter(f => f.geometry?.type === 'Point' &&
        f.properties?.hasIncome === true &&
        typeof f.properties?.buildingId === 'string' &&
        f.properties.buildingId.startsWith('city_name_ftue_europe_building_'));
      const unique = new Map(matches.map(f=>[f.properties.buildingId,f]));
      chestTestLog.candidates = [...unique.keys()];
      chestTestLog.viewport = {width,height};
      // Ресурсные здания тоже имеют hasIncome=true. Они не должны
      // блокировать проверку заранее подтверждённого building_1.
      const ordinary = [...unique.keys()].filter(id =>
        /^city_name_ftue_europe_building_[0-9]+$/.test(id));
      chestTestLog.ordinaryCandidates = ordinary;
      if (ordinary.length !== 2) {
        chestTestNote('Обычных доходных зданий: '+ordinary.length+
          ' (ожидалось 2). Тест отменён.');
        return;
      }
      const feature = unique.get('city_name_ftue_europe_building_1');
      if (!feature) {
        chestTestNote('Подтверждённый маркер building_1 не виден.');
        return;
      }
      const point = map.project(feature.geometry.coordinates);
      chestTestLog.selected = feature.properties.buildingId;
      chestTestLog.point = {x:point.x,y:point.y};
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) ||
          point.x < 15 || point.y < 15 ||
          point.x > width-15 || point.y > height-15) {
        chestTestNote('Маркер вне безопасной области карты.');
        return;
      }
      chestTestNote('Проверка видимости маркера',{stage:'hit-test'});
      const hitX = Math.round(point.x), hitY = Math.round(point.y);
      const top = map.queryRenderedFeatures([[hitX-5,hitY-5],[hitX+5,hitY+5]],{
        layers:['markers-layer']
      });
      chestTestLog.hitIds = [...new Set(top.map(f=>f.properties?.buildingId).filter(Boolean))];
      if (!top.some(f=>f.properties?.buildingId === feature.properties.buildingId)) {
        chestTestNote('Маркер перекрыт или не найден в точке клика.');
        return;
      }
      chestTestBusy = true;
      const id = feature.properties.buildingId;
      chestTestNote('Проверяю открытие '+id+'…');
      closeHelperPanel();
      chestTestNote('Подготовка события',{stage:'event-construction'});
      // Safari в контексте Userscripts/Tampermonkey может отвергать
      // view:window при конструировании MouseEvent (TypeError).
      // В MapLibre координаты передаются отдельно через point/lngLat.
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + point.x, clientY = rect.top + point.y;
      let originalEvent, eventConstruction = 'MouseEvent';
      try {
        originalEvent = new MouseEvent('click',{
          bubbles:true,cancelable:true,clientX,clientY
        });
      } catch (eventError) {
        eventConstruction = 'document.createEvent';
        originalEvent = document.createEvent('Event');
        originalEvent.initEvent('click',true,true);
        chestTestLog.mouseEventError = String(eventError.message || eventError);
      }
      chestTestNote('Событие создано',{
        stage:'event-created',eventConstruction,clientX,clientY
      });
      // MapLibre сам направляет click в обработчики слоёв.
      chestTestNote('Отправка события карте',{stage:'map-fire'});
      map.fire('click',{point,lngLat:map.unproject(point),originalEvent});
      chestTestNote('Событие MapLibre отправлено',{eventTrusted:originalEvent.isTrusted});
      setTimeout(()=>{
        const pageText = document.body?.innerText || '';
        const opened = /Время получения дохода/i.test(pageText);
        chestTestNote(opened
          ? '✓ Окно дохода открылось! Сбор не выполнялся.'
          : 'Окно дохода не подтверждено.',{opened,visibility:document.visibilityState});
        chestTestBusy = false;
      },1000);
    } catch(error) {
      chestTestBusy = false;
      chestTestNote('Ошибка теста: '+error.message,{
        errorName:error.name, errorStack:String(error.stack || '').slice(0,1400)
      });
    }
  };


  // ===== ОДНОКРАТНАЯ ПРОВЕРКА СБОРА ДОХОДА =====
  // Не вызывает игровое API, не нажимает магазины или платные предложения.
  // Требует видимый диалог дохода и ровно одну кнопку «СОБРАТЬ».
  let chestCollectAttempted = false;
  function chestElementVisible(element) {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 5 && rect.height > 5 &&
      rect.bottom > 0 && rect.top < innerHeight &&
      rect.right > 0 && rect.left < innerWidth &&
      style.display !== 'none' && style.visibility !== 'hidden' &&
      style.pointerEvents !== 'none';
  }
  const chestClean = text => String(text || '').replace(/\s+/g, ' ').trim();

  $('chestCollectTest').onclick = () => {
    if (chestCollectAttempted) {
      chestTestNote('В этой вкладке тест сбора уже запускался. Повтор заблокирован.',{
        mode:'chest-collect-test',stage:'repeat-blocked'
      });
      return;
    }
    chestTestLog = {};
    try {
      const candidates = [...document.querySelectorAll(
        'button.buildings-income-modal__button'
      )].filter(chestElementVisible).filter(el =>
        /^собрать$/i.test(chestClean(el.innerText || el.value || el.textContent)) &&
        !el.disabled && el.getAttribute('aria-disabled') !== 'true'
      );
      const details = candidates.map(element => {
        let parent = element.parentElement, match = null, depth = 0;
        for (; parent && parent !== document.body && depth < 9;
          parent = parent.parentElement, depth++) {
          const label = chestClean(parent.innerText || parent.textContent);
          const rect = parent.getBoundingClientRect();
          if (/время получения дохода/i.test(label) &&
              rect.width > 80 && rect.height > 50 &&
              rect.width < innerWidth * 0.95 &&
              rect.height < innerHeight * 0.95) {
            match = {depth,ancestorTag:parent.tagName,dialogText:label.slice(0,350)};
            break;
          }
        }
        return {label:chestClean(element.innerText || element.textContent),
          tag:element.tagName,className:String(element.className || '').slice(0,100),
          match};
      });
      chestTestNote('Проверка окна дохода',{
        mode:'chest-collect-test',stage:'find-collect-button',
        collectCandidates:details
      });
      const accepted = details.map((d,i)=>d.match ? candidates[i] : null)
        .filter(Boolean);
      if (accepted.length !== 1) {
        chestTestNote('Безопасный сбор отменён: не подтверждена единственная кнопка дохода.',{
          mode:'chest-collect-test',stage:'no-unique-income-button',
          acceptedCount:accepted.length
        });
        return;
      }
      // Блокировка устанавливается ДО клика, чтобы избежать двойного списания.
      chestCollectAttempted = true;
      const button = accepted[0];
      chestTestNote('Выполняю однократное нажатие СОБРАТЬ',{
        mode:'chest-collect-test',stage:'before-click'
      });
      button.click();
      chestRememberCollectAttempt();
      chestTestNote('Нажатие отправлено. Проверь, получен ли доход.',{
        mode:'chest-collect-test',stage:'clicked',clicked:true
      });
    } catch (error) {
      chestTestNote('Ошибка тестового сбора: ' + error.message,{
        mode:'chest-collect-test',stage:'error',
        errorName:error.name,errorStack:String(error.stack || '').slice(0,1400)
      });
    }
  };


  // ===== АВТОСБОР ДОХОДА НА КАРТЕ =====
  // Выключен по умолчанию. Только подтверждённые 5 income-маркеров
  // и единственная кнопка "Собрать" в модальном окне дохода.
  // Ни платные предложения, ни другие кнопки здесь не нажимаются.
  const CHEST_AUTO_COOLDOWN_MS = 30 * 60 * 1000;
  const CHEST_AUTO_LAST_ATTEMPT_KEY = 'hk-helper-income-auto-last-attempt-v1';
  const CHEST_AUTO_MARKER_IDS = [
    'city_name_ftue_europe_building_1',
    'city_name_ftue_europe_building_2',
    'city_name_ftue_europe_building_resources_1',
    'city_name_ftue_europe_building_resources_2',
    'city_name_ftue_europe_building_resources_3'
  ];
  let chestAutoPhase = 'idle';
  let chestAutoPhaseStarted = 0;
  let chestAutoLastProbe = 0;
  let chestAutoRetryAfter = 0;
  let chestAutoLastMessage = '';

  function updateChestAutoToggle() {
    $('chestAutoToggle').textContent =
      uiSettings.autoChests ? '⏸ Автосбор: ВКЛ' : '▶ Автосбор: ВЫКЛ';
    if (!uiSettings.autoChests) {
      chestAutoPhase = 'idle';
      $('chestAutoStatus').textContent = 'Автосбор выключен';
    } else if (chestAutoLastMessage) {
      $('chestAutoStatus').textContent = chestAutoLastMessage;
    } else {
      $('chestAutoStatus').textContent = 'Ожидаю доход на карте…';
    }
  }

  function chestAutoNote(step, extra = {}) {
    if (step === chestAutoLastMessage && !Object.keys(extra).length) return;
    chestAutoLastMessage = step;
    $('chestAutoStatus').textContent = step;
    chestScanStatus(step);
    chestScanReport = JSON.stringify({
      mode: 'chest-auto-collect',
      version: '3.14.3',
      time: new Date().toISOString(),
      url: location.href,
      step,
      phase: chestAutoPhase,
      ...extra
    }, null, 2);
  }

  function chestAutoCooldownUntil() {
    let last = 0;
    try {
      last = Number(localStorage.getItem(CHEST_AUTO_LAST_ATTEMPT_KEY)) || 0;
    } catch {}
    return last > 0 && last <= Date.now() ? last + CHEST_AUTO_COOLDOWN_MS : 0;
  }

  function chestRememberCollectAttempt() {
    try {
      localStorage.setItem(CHEST_AUTO_LAST_ATTEMPT_KEY, String(Date.now()));
    } catch {}
  }

  function chestIncomeModalVisible() {
    return [...document.querySelectorAll('[class*="buildings-income-modal"]')]
      .some(element => {
        if (!chestElementVisible(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width >= 80 && rect.height >= 50 &&
          /время получения дохода/i.test(chestClean(element.innerText || ''));
      });
  }

  function chestAutoCollectButton() {
    const candidates = [...document.querySelectorAll(
      'button.buildings-income-modal__button'
    )].filter(chestElementVisible).filter(button =>
      !button.disabled &&
      button.getAttribute('aria-disabled') !== 'true' &&
      /^собрать$/i.test(chestClean(
        button.innerText || button.textContent || button.value
      ))
    ).filter(button => {
      let parent = button.parentElement;
      for (let depth = 0; parent && depth < 9; depth++, parent = parent.parentElement) {
        const rect = parent.getBoundingClientRect();
        if (rect.width >= 80 && rect.height >= 50 &&
            rect.width < innerWidth * 0.95 && rect.height < innerHeight * 0.95 &&
            chestElementVisible(parent) &&
            /время получения дохода/i.test(chestClean(parent.innerText || ''))) {
          return true;
        }
      }
      return false;
    });
    return candidates.length === 1 ? candidates[0] : null;
  }

  function chestAutoIncomeMarker() {
    const map = getMap();
    if (!map || !map.project || !map.getCanvas || !map.getLayer ||
        !map.queryRenderedFeatures || typeof map.fire !== 'function' ||
        !map.getLayer('markers-layer')) return null;

    const canvas = map.getCanvas();
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return null;
    const matches = map.queryRenderedFeatures([[0,0],[width,height]],{
      layers:['markers-layer']
    }).filter(feature =>
      feature.geometry?.type === 'Point' &&
      feature.properties?.hasIncome === true &&
      CHEST_AUTO_MARKER_IDS.includes(feature.properties?.buildingId)
    );
    const unique = new Map(matches.map(feature =>
      [feature.properties.buildingId, feature]
    ));
    // Все пять маркеров должны одновременно показывать активный доход.
    if (!CHEST_AUTO_MARKER_IDS.every(id => unique.has(id))) return null;

    const feature = unique.get('city_name_ftue_europe_building_1');
    const point = map.project(feature.geometry.coordinates);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) ||
        point.x < 15 || point.y < 15 ||
        point.x > width - 15 || point.y > height - 15) return null;

    const x = Math.round(point.x), y = Math.round(point.y);
    const hits = map.queryRenderedFeatures([[x-5,y-5],[x+5,y+5]],{
      layers:['markers-layer']
    });
    if (!hits.some(hit =>
      hit.properties?.buildingId === feature.properties.buildingId
    )) return null;
    return {map,canvas,point,id:feature.properties.buildingId};
  }

  function chestAutoTick() {
    if (!uiSettings.autoChests) return;
    if (document.visibilityState !== 'visible') return;

    const now = Date.now();
    const remaining = chestAutoCooldownUntil() - now;
    if (remaining > 0) {
      chestAutoPhase = 'idle';
      const minutes = Math.ceil(remaining / 60000);
      chestAutoNote('Защита от повторов: ещё ' + minutes + ' мин.');
      return;
    }

    if (chestAutoPhase === 'opening') {
      // Собираем только окно, открытое непосредственно этим автосбором.
      const button = chestAutoCollectButton();
      if (button && chestIncomeModalVisible()) {
        chestAutoPhase = 'collecting';
        // Сохраняем блокировку ДО клика, чтобы повтор не случился
        // даже при перезагрузке или медленном ответе сервера.
        chestRememberCollectAttempt();
        try {
          button.click();
          chestAutoNote('Команда «Собрать» отправлена. Проверяю карту.',{
            stage:'clicked',clicked:true
          });
        } catch (error) {
          chestAutoNote('Ошибка нажатия «Собрать»: ' + error.message,{
            stage:'collect-error',errorName:error.name
          });
        } finally {
          chestAutoPhase = 'idle';
        }
        return;
      }
      if (now - chestAutoPhaseStarted < 8000) return;
      chestAutoPhase = 'idle';
      chestAutoRetryAfter = now + 120000;
      chestAutoNote('Окно дохода не появилось. Повторная проверка через 2 мин.',{
        stage:'modal-timeout'
      });
      return;
    }

    if (chestAutoPhase !== 'idle' || now < chestAutoRetryAfter) return;
    if (now - chestAutoLastProbe < 15000) return;
    chestAutoLastProbe = now;

    // Не вмешиваемся в уже открытое пользователем окно дохода.
    if (chestIncomeModalVisible()) {
      chestAutoNote('Уже открыто окно дохода. Закрой его для автосбора.');
      return;
    }

    try {
      const target = chestAutoIncomeMarker();
      if (!target) {
        chestAutoNote('Ожидаю пять доступных маркеров дохода на карте…');
        return;
      }
      const {map,canvas,point,id} = target;
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + point.x, clientY = rect.top + point.y;
      let originalEvent;
      try {
        originalEvent = new MouseEvent('click',{
          bubbles:true,cancelable:true,clientX,clientY
        });
      } catch {
        originalEvent = document.createEvent('Event');
        originalEvent.initEvent('click',true,true);
      }
      chestAutoPhase = 'opening';
      chestAutoPhaseStarted = now;
      chestAutoNote('Открываю доступный доход…',{stage:'opening',buildingId:id});
      map.fire('click',{
        point,lngLat:map.unproject(point),originalEvent
      });
      setTimeout(chestAutoTick,600);
    } catch (error) {
      chestAutoPhase = 'idle';
      chestAutoRetryAfter = now + 120000;
      chestAutoNote('Ошибка автосбора: ' + error.message,{
        stage:'open-error',errorName:error.name
      });
    }
  }

  $('chestAutoToggle').onclick = () => {
    uiSettings.autoChests = !uiSettings.autoChests;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(uiSettings)); } catch {}
    applyUiSettings();
    updateChestAutoToggle();
    if (uiSettings.autoChests) setTimeout(chestAutoTick,100);
  };
  updateChestAutoToggle();
  setInterval(chestAutoTick,2000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && uiSettings.autoChests) {
      setTimeout(chestAutoTick,200);
    }
  });

  $('chestScanRun').onclick = scanMapChests;
  $('chestScanCopy').onclick = () => {
    const text = chestScanReport;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() =>
        chestScanStatus('Отчёт скопирован. Пришли его в чат.')
      ).catch(() => window.prompt('Скопируй отчёт:', text));
    } else {
      window.prompt('Скопируй отчёт:', text);
    }
  };

  // ===== БЕЗОПАСНЫЙ СБОР БЕСПЛАТНЫХ ПОДАРКОВ =====
  // Никаких API-вызовов, обхода таймеров или платных покупок.
  // Работает только с видимыми кнопками на открытой странице магазина.
  let giftBusy = false;
  let giftClicks = 0;
  // Вместо паузы 3 секунды отслеживаем реальное изменение кнопок.
  // Повтор на том же элементе невозможен, пока его подпись не изменится
  // (например, «Получить» -> таймер -> «Получить»).
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
  const giftVisible = element => {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 3 && rect.height > 3 &&
      rect.bottom > 0 && rect.top < innerHeight &&
      style.display !== 'none' && style.visibility !== 'hidden' &&
      style.pointerEvents !== 'none';
  };
  const giftText = element => (element?.innerText || element?.textContent || '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  function giftSection(button) {
    // Находим ближайший ограниченный блок карточки/подарка, не весь документ.
    let node = button.parentElement;
    for (let depth = 0; node && depth < 7; depth++, node = node.parentElement) {
      const text = giftText(node);
      if (text.length > 1400) break;
      if (/vip\s*30|купить|стоимость|цена|оплатить|пополнить|₽|\$|usdt/i.test(text)) return null;
      if (/ежедневный подарок|получить\s*\(\s*\d+\s*\/\s*5\s*\)/i.test(text)) return 'daily';
      // Для трёх карточек под заголовком «Подарки» — только явно бесплатные.
      if (/подарки/i.test(text) && /получить/i.test(text) && text.length < 900) return 'gifts';
    }
    return null;
  }
  function giftShopOpen() {
    // Наличие видимого заголовка магазина и ежедневного подарка.
    return Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,p'))
      .some(el => el.children.length < 4 && giftVisible(el) &&
        /ежедневный подарок/i.test(giftText(el)) && giftText(el).length < 90);
  }
  function giftCandidate() {
    if (!giftShopOpen()) return null;
    const buttons = Array.from(document.querySelectorAll('button,[role="button"]'));
    for (const button of buttons) {
      if (!giftVisible(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') continue;
      const label = giftText(button);
      if (!/^получить(?:\s*\(\s*\d+\s*\/\s*5\s*\))?$/.test(label)) continue;
      const kind = giftSection(button);
      if (!kind) continue;
      // Сначала ежедневная цепочка, затем остальные бесплатные награды.
      if (kind === 'daily') return button;
    }
    for (const button of buttons) {
      if (!giftVisible(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') continue;
      if (giftText(button) !== 'получить' || giftSection(button) !== 'gifts') continue;
      return button;
    }
    return null;
  }
  // Окно предложения после бесплатного подарка.
  // Нажимаем только доступную кнопку «Пропустить»/«Продолжить» без дополнительного ожидания таймера.
  let giftManualUntil = 0;
  let giftFlowActive = false;
  function giftOfferVisible() {
    // После нажатия «Получить» отслеживаем любой вариант платного
    // предложения, а не только известные названия.
    const skip = giftSafeAdvanceTarget();
    if (skip) return true;
    // Таймер ещё может отображаться вместо кнопки «Пропустить».
    // Не нажимаем на награды под открытым платным предложением.
    return Array.from(document.querySelectorAll('div,span,h1,h2,h3'))
      .some(el => el.children.length < 4 && giftVisible(el) &&
        /сделка стратега|доля капо|выбор босса/i.test(giftText(el)) &&
        giftText(el).length < 90);
  }
  function giftSafeAdvanceTarget() {
    const nodes = Array.from(document.querySelectorAll('button,[role="button"],div,span,a'));
    return nodes.find(el => {
      if (!giftVisible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
      if (!/^(пропустить|продолжить)$/.test(giftText(el))) return false;
      if (Array.from(el.children).some(child => /^(пропустить|продолжить)$/.test(giftText(child)))) return false;
      const style = getComputedStyle(el);
      return style.opacity !== '0' && style.cursor !== 'not-allowed' &&
        !el.classList.contains('disabled') && !el.hasAttribute('disabled');
    });
  }
  function giftDispatchClick(target) {
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (!hit || (!target.contains(hit) && !hit.contains(target))) return false;
    const actual = hit.closest('button,[role="button"],a') || hit;
    actual.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true, clientX:x, clientY:y, pointerId:1, pointerType:'mouse', isPrimary:true}));
    actual.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, cancelable:true, clientX:x, clientY:y, button:0}));
    actual.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, cancelable:true, clientX:x, clientY:y, pointerId:1, pointerType:'mouse', isPrimary:true}));
    actual.dispatchEvent(new MouseEvent('mouseup', {bubbles:true, cancelable:true, clientX:x, clientY:y, button:0}));
    actual.click();
    return true;
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
    if (!giftActionReady(target)) {
      giftStatus('Ожидаю изменения кнопки «Пропустить» (защита от дубля).');
      return true;
    }
    if (giftDispatchClick(target)) {
      giftMarkClicked(target);
      giftStatus('Нажал «Пропустить» без покупки. Проверяю следующий подарок…');
    } else {
      giftStatus('Кнопка пропуска перекрыта. Не нажимаю другие элементы.');
    }
    return true;
  }
  // Подтверждение успешно полученного ежедневного подарка.
  // Не закрываем посторонние диалоги и не нажимаем платные предложения.
  function confirmReceivedGift() {
    const heading = Array.from(document.querySelectorAll('div,span,h1,h2,h3,h4'))
      .find(el => el.children.length < 4 && giftVisible(el) &&
        /ежедневный подарок/i.test(giftText(el)) && giftText(el).length < 80);
    const received = Array.from(document.querySelectorAll('div,span,p'))
      .find(el => el.children.length < 4 && giftVisible(el) &&
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
    if (manual) giftManualUntil = Date.now() + 90000;
    if (!manual && !uiSettings.autoGifts && Date.now() > giftManualUntil && !giftFlowActive) return;
    // Освобождаем кнопку только после изменения текста или удаления из DOM.
    giftObserveButtonChanges();
    if (confirmReceivedGift()) return;
    if (advanceGiftOffer()) return;
    if (!giftShopOpen()) {
      if (manual) giftStatus('Открой «Магазин» → «Ежедневный подарок» и повтори.');
      return;
    }
    if (giftClicks >= 30) {
      giftStatus('Лимит 30 нажатий за сессию. Перезагрузи страницу для повтора.');
      return;
    }
    const button = giftCandidate();
    if (!button) {
      // Остаёмся в режиме ожидания, пока не исчезнет таймер.
      giftStatus('Ожидаю кнопку «Получить» без таймера…');
      return;
    }
    // Нет искусственного ожидания: «Получить» доступна после того,
    // как таймер исчез и кнопка вновь показала разрешённую подпись.
    if (!giftActionReady(button)) {
      giftStatus('Жду изменения кнопки после предыдущего получения…');
      return;
    }
    // Виртуальный click() может пройти сквозь перекрывающий диалог.
    // Нажимаем только реально видимую и доступную кнопку.
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
      // Ставим блокировку ДО клика: React может вызвать обработчик
      // повторно синхронно во время обновления игры.
      giftMarkClicked(button);
      giftFlowActive = true;
      button.click();
      giftClicks++;
      giftStatus('Попыток получения: ' + giftClicks + '. Проверяю следующую награду…');
    } catch (error) {
      giftStatus('Не удалось нажать: ' + error.message);
    } finally {
      giftBusy = false;
    }
  }
  $('giftRun').onclick = () => collectGifts(true);
  setInterval(() => {
    if (document.visibilityState === 'visible' && (uiSettings.autoGifts || Date.now() < giftManualUntil)) collectGifts();
  }, 600);

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