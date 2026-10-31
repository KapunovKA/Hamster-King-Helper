// ==UserScript==
// @name         Hamster King Helper Universal
// @namespace    hamster-king-helper-universal
// @version      3.6.7
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

  const host = document.createElement('div');
  host.id = HOST;

  Object.assign(host.style, {
    position: 'fixed',
    top: 'max(8px, env(safe-area-inset-top))',
    right: '8px',
    zIndex: '2147483647',
    touchAction: 'manipulation'
  });

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
  </style>

  <button id="mini" class="mini">🐹</button>

  <div id="panel" class="panel hidden">
    <div class="head">
      <span>🐹 Hamster King Helper v3.6.7</span>
      <div class="head-actions">
        <button id="settingsToggle" class="settings-btn" title="Настройки" aria-label="Настройки">⚙️</button>
        <button id="close" class="close">−</button>
      </div>
    </div>

    <div id="settingsBox" class="settings-box hidden">
      <div class="settings-title">⚙️ Настройки интерфейса</div>
      <label class="setting-row"><input type="checkbox" data-setting="diagnostics"> Диагностика</label>
      <label class="setting-row"><input type="checkbox" data-setting="manual"> Ручной ввод слухов</label>
      <label class="setting-row"><input type="checkbox" data-setting="city"> Ручной выбор города</label>
      <label class="setting-row"><input type="checkbox" data-setting="coupons"> Купоны Telegram</label>
      <label class="setting-row"><input type="checkbox" data-setting="puzzle"> Кнопка пазла</label>
      <label class="setting-row"><input type="checkbox" data-setting="autoGifts"> Автосбор бесплатных подарков</label>
      <div class="small">Настройки сохраняются автоматически.</div>
    </div>

    <div id="section-gifts" class="block">
      <b>🎁 Бесплатные подарки</b>
      <div id="giftStatus" class="small">Ожидание открытия магазина</div>
      <button id="giftRun" class="btn">🎁 Собрать сейчас</button>
    </div>

    <div id="status" class="block good">
      Запуск...
    </div>

    <details id="section-diagnostics">
      <summary>Диагностика</summary>
      <div id="diag" class="block small"></div>
    </details>

    <label id="section-city" style="display:block">
      Город (резервный выбор)
      <select id="city">
        <option value="">Автоматически</option>
      </select>
    </label>

    <button id="refresh" class="btn">
      ↻ Обновить слухи
    </button>

    <button id="puzzle" class="btn purple">
      🧩 Запустить пазл
    </button>

    <details id="section-coupons" open>
      <summary>🎟 Купоны из Telegram</summary>
      <div id="couponStatus" class="block small">
        Ожидание...
      </div>
      <div id="coupons"></div>
      <button id="couponRefresh" class="btn">
        ↻ Проверить купоны
      </button>
      <a class="link"
         href="https://t.me/official_crypto_witch"
         target="_blank"
         rel="noopener noreferrer">
        Открыть @official_crypto_witch
      </a>
    </details>

    <details id="section-manual">
      <summary>Ручной ввод слухов</summary>
      <textarea id="manual" rows="3"
        placeholder="Москва: [16:06] [23:19] [24:07]"
      ></textarea>
      <button id="apply" class="btn">
        Применить
      </button>
    </details>
  </div>
  `;

  const $ = id => root.getElementById(id);

  for (const name of CITIES) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    $('city').appendChild(option);
  }

  $('mini').onclick = () => {
    $('mini').classList.add('hidden');
    $('panel').classList.remove('hidden');  };

  $('close').onclick = () => {
    $('panel').classList.add('hidden');
    $('mini').classList.remove('hidden');
  };

  // ===== НАСТРОЙКИ ИНТЕРФЕЙСА =====

  const SETTINGS_KEY = 'hk-helper-universal-settings-v3';
  const DEFAULT_SETTINGS = {
    diagnostics: false,
    manual: false,
    city: true,
    coupons: true,
    puzzle: true,
    autoGifts: false
  };

  let uiSettings = { ...DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof saved[key] === 'boolean') uiSettings[key] = saved[key];
    }
  } catch {}

  const sections = {
    diagnostics: $('section-diagnostics'),
    manual: $('section-manual'),
    city: $('section-city'),
    coupons: $('section-coupons'),
    puzzle: $('puzzle')
  };

  function applyUiSettings() {
    for (const [key, element] of Object.entries(sections)) {
      element.classList.toggle('hidden', !uiSettings[key]);
    }
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
        )
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
      `Последнее действие: ${lastAction}`;
  }

  // ===== ЗАГРУЗКА СЛУХОВ =====

  function parseRumors(text) {
    const parsed = new Map(
      CITIES.map(name => [name, []])
    );

    const escaped = CITIES
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(name =>
        name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );

    const pattern = new RegExp(
      '(' + escaped.join('|') + ')\\s*:',
      'gi'
    );

    const matches = [...text.matchAll(pattern)];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      const name = CITIES.find(item =>
        item.toLowerCase() === match[1].toLowerCase()
      );

      if (!name) continue;

      const start = match.index + match[0].length;
      const end = matches[i + 1]?.index ?? text.length;
      const part = text.slice(start, end);

      const points = [
        ...part.matchAll(
          /\[\s*(\d{1,2})\s*:\s*(\d{1,2})\s*\]/g
        )
      ]
        .slice(0, 3)
        .map(value => ({
          x: Number(value[1]),
          y: Number(value[2]),
          key:
            `${Number(value[1])}:` +
            `${Number(value[2])}`
        }));

      if (points.length > parsed.get(name).length) {
        parsed.set(name, points);
      }
    }

    return parsed;
  }

  function useRumors(html) {
    let text = html;

    if (/<html|<body|<div/i.test(html)) {
      const doc = new DOMParser()
        .parseFromString(html, 'text/html');

      doc.querySelectorAll(
        'script,style,noscript'
      ).forEach(element => element.remove());

      doc.querySelectorAll('br')
        .forEach(element => {
          element.replaceWith('\n');
        });

      doc.querySelectorAll(
        'p,li,h1,h2,h3,h4'
      ).forEach(element => {
        element.append('\n');
      });

      text = doc.body.textContent || '';
    }

    text = text
      .replace(/\u00a0/g, ' ')
      .replace(/[：﹕]/g, ':');

    const next = parseRumors(text);

    const count = [...next.values()]
      .reduce((sum, list) => sum + list.length, 0);

    if (!count) {
      throw Error('Координаты не найдены');
    }

    clearHighlight();
    rumors = next;

    loadState = `Загружено координат: ${count}`;

    highlight();
    renderStatus();
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
    if (loadingRumors) return;

    loadingRumors = true;
    loadState = 'Загрузка слухов...';
    renderStatus();

    try {
      const html = await request(
        RUMOR_URL + '?t=' + Date.now()
      );

      useRumors(html);

    } catch (error) {
      loadState =
        'Ошибка загрузки слухов: ' + error.message;
      renderStatus();

    } finally {
      loadingRumors = false;
    }
  }

  $('refresh').onclick = loadRumors;

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

  $('puzzle').onclick = () => {
    const solver = window.__HK_PUZZLE_SOLVER__;

    if (
      solver &&
      typeof solver.check === 'function'
    ) {
      try {
        solver.check();
      } catch (error) {
        loadState =
          'Ошибка пазла: ' + error.message;
        renderStatus();
      }
      return;
    }

    if (puzzleLoading) return;

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

  // ===== БЕЗОПАСНЫЙ СБОР БЕСПЛАТНЫХ ПОДАРКОВ =====
  // Никаких API-вызовов, обхода таймеров или платных покупок.
  // Работает только с видимыми кнопками на открытой странице магазина.
  let giftBusy = false;
  let giftLastAttempt = 0;
  const GIFT_CLICK_DELAY_MS = 3000;
  let giftLastActionAt = 0;
  const giftCanAct = () => Date.now() - giftLastActionAt >= GIFT_CLICK_DELAY_MS;
  const giftMarkAction = () => { giftLastActionAt = Date.now(); };
  let giftClicks = 0;
  let giftLastButton = null;
  let giftLastButtonAt = 0;
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
  let giftOverlayLastClick = 0;
  function giftOfferVisible() {
    return Array.from(document.querySelectorAll('div,span,h1,h2,h3'))
      .some(el => el.children.length < 4 && giftVisible(el) &&
        /сделка стратега/i.test(giftText(el)) && giftText(el).length < 90);
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
    if (Date.now() - giftOverlayLastClick < 4500 || !giftCanAct()) return true;
    const target = giftSafeAdvanceTarget();
    if (!target) {
      giftStatus('Ожидаю доступную кнопку «Пропустить»…');
      return true;
    }
    if (giftDispatchClick(target)) {
      giftMarkAction();
      giftOverlayLastClick = Date.now();
      giftStatus('Нажал «Пропустить» без покупки. Ожидаю следующий подарок…');
    } else {
      giftStatus('Кнопка пропуска перекрыта. Не нажимаю другие элементы.');
    }
    return true;
  }
  // Подтверждение успешно полученного ежедневного подарка.
  // Не закрываем посторонние диалоги и не нажимаем платные предложения.
  let giftConfirmLastClick = 0;
  function confirmReceivedGift() {
    const heading = Array.from(document.querySelectorAll('div,span,h1,h2,h3,h4'))
      .find(el => el.children.length < 4 && giftVisible(el) &&
        /ежедневный подарок/i.test(giftText(el)) && giftText(el).length < 80);
    const received = Array.from(document.querySelectorAll('div,span,p'))
      .find(el => el.children.length < 4 && giftVisible(el) &&
        /поздравляем,? получено/i.test(giftText(el)) && giftText(el).length < 100);
    if (!heading || !received) return false;
    if (Date.now() - giftConfirmLastClick < 3000 || !giftCanAct()) return true;
    const target = Array.from(document.querySelectorAll('button,[role="button"],div,span'))
      .find(el => giftVisible(el) && giftText(el) === 'понятно' &&
        !Array.from(el.children).some(child => giftText(child) === 'понятно') &&
        !el.disabled && el.getAttribute('aria-disabled') !== 'true');
    if (!target) {
      giftStatus('Награда получена. Ожидаю кнопку «Понятно»…');
      return true;
    }
    if (giftDispatchClick(target)) {
      giftMarkAction();
      giftConfirmLastClick = Date.now();
      giftStatus('Награда подтверждена. Проверяю следующий подарок…');
    } else {
      giftStatus('Кнопка «Понятно» перекрыта. Не нажимаю другие элементы.');
    }
    return true;
  }

  async function collectGifts(manual = false) {
    if (giftBusy || Date.now() - giftLastAttempt < 1600) return;
    if (manual) giftManualUntil = Date.now() + 90000;
    if (!manual && !uiSettings.autoGifts && Date.now() > giftManualUntil) return;
    if (confirmReceivedGift()) return;
    if (advanceGiftOffer()) return;
    if (!giftCanAct()) return;
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
      giftStatus('Доступных кнопок бесплатных подарков не найдено.');
      giftManualUntil = 0;
      return;
    }
    // Если интерфейс не изменился, не кликаем по той же кнопке бесконечно.
    if (button === giftLastButton && Date.now() - giftLastButtonAt < 60000) {
      giftStatus('Ожидаю обновления награды (защита от повторов).');
      return;
    }
    giftBusy = true;
    giftLastAttempt = Date.now();
    try {
      giftLastButton = button;
      giftLastButtonAt = Date.now();
      button.click();
      giftMarkAction();
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
  }, 1200);

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

    if (map && city) {
      highlight();
    }

    const currentDay = new Date().toDateString();

    if (currentDay !== lastCouponDay) {
      lastCouponDay = currentDay;
      renderCoupons();
      loadCoupons();
    }

    renderStatus();
  }, 1000);

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