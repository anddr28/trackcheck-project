// Главный экран без фреймворка: распознаём сразу при вводе, номер в адресе после «#»
// (эта часть адреса не уходит на сервер). История — только в этом браузере.
import { detect, detectAll, type BatchResult } from '@trackcheck/detector';
import { icon } from '../lib/icons';
import { buyerText, esc, renderBatch, renderHistory, topOf } from './render';
import { clearHistory, forget, loadHistory, remember, setLabel, type HistoryItem } from './storage';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = $<HTMLTextAreaElement>('track-input');
const results = $('results');
const clearBtn = $<HTMLButtonElement>('track-clear');
const pasteBtn = $<HTMLButtonElement>('track-paste');
const note = $('track-note');
const examples = $('track-examples');
const historyBox = $('history');

let current: BatchResult | null = null;
let confirmClear = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

// «Вставить» показываем, только если браузер умеет читать буфер (иначе кнопка ничего не сделает).
const canPaste = typeof navigator.clipboard?.readText === 'function';

function autosize() {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
}

function hashValue(): string {
  try {
    return decodeURIComponent(location.hash.slice(1)).split(',').join('\n').trim();
  } catch {
    return '';
  }
}

let lastHash = '';
function setHash(value: string) {
  if (value === lastHash) return;
  lastHash = value;
  window.history.replaceState(null, '', value ? `#${encodeURIComponent(value).replace(/%2C/g, ',')}` : location.pathname + location.search);
}

function render() {
  const text = input.value;
  const empty = !text.trim();
  clearBtn.hidden = empty;
  pasteBtn.hidden = !empty || !canPaste;
  examples.hidden = !empty;
  document.body.classList.toggle('has-input', !empty);
  autosize();
  clearTimeout(saveTimer);
  if (empty) {
    current = null;
    results.innerHTML = '';
    setHash('');
    return;
  }
  let b = detectAll(text);
  if (b.results.length === 0) b = { results: [detect(text)], hints: b.hints };
  current = b;
  // В ссылку — номер в том виде, в каком его знает служба (с дефисами у Ozon и ЖДЭ).
  const numbers = b.results.filter((r) => r.candidates.length > 0).map((r) => r.candidates[0]!.number);
  setHash(numbers.join(','));
  results.innerHTML = renderBatch(b, numbers.length > 0);
  // Сохраняем в историю, когда человек перестал печатать.
  saveTimer = setTimeout(save, 1500);
}

function save() {
  clearTimeout(saveTimer);
  if (!current) return;
  const items = current.results
    .filter((r) => r.candidates.length > 0)
    .map((r) => {
      const top = topOf(r) ?? r.candidates[0]!;
      return { n: top.number, d: top.display, c: topOf(r)?.carrierId ?? null, name: topOf(r)?.carrier ?? null };
    });
  if (items.length) drawHistory(remember(items));
}

function drawHistory(list: HistoryItem[] = loadHistory()) {
  historyBox.innerHTML = renderHistory(list, confirmClear);
  document.body.classList.toggle('has-history', list.length > 0);
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function status(near: HTMLElement, text: string) {
  const el = near.closest('.act, .share, .batch')?.querySelector<HTMLElement>('.act__status');
  if (el) {
    el.textContent = text;
    setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 6000);
  }
}

results.addEventListener('click', async (e) => {
  const t = e.target as HTMLElement;

  const open = t.closest<HTMLAnchorElement>('a[data-open]');
  if (open) {
    const number = open.dataset.number ?? '';
    save();
    if (!navigator.onLine) {
      // Без сети не открываем пустую вкладку.
      e.preventDefault();
      const ok = await copy(number);
      status(open, ok ? 'Нет сети. Номер скопирован — откройте ссылку, когда появится интернет.' : 'Нет сети. Откройте ссылку, когда появится интернет.');
      return;
    }
    if (open.dataset.copyOnOpen !== undefined && (await copy(number))) {
      status(open, 'Номер скопирован. Если поле на сайте пустое — вставьте его.');
    }
    return;
  }

  const copyBtn = t.closest<HTMLElement>('[data-copy]');
  if (copyBtn) {
    const ok = await copy(copyBtn.dataset.copy ?? '');
    save();
    copyBtn.innerHTML = icon(ok ? 'check' : 'copy', 20, ok ? 'ok' : '');
    copyBtn.setAttribute('title', ok ? 'Скопировано' : 'Не удалось скопировать');
    setTimeout(() => {
      copyBtn.innerHTML = icon('copy', 20);
      copyBtn.setAttribute('title', 'Скопировать номер');
    }, 2000);
    return;
  }

  if (t.closest('[data-copy-all]') && current) {
    const text = current.results.map((r) => (topOf(r) ?? r.candidates[0])?.number ?? r.query).join('\n');
    status(t, (await copy(text)) ? 'Номера скопированы, каждый с новой строки.' : 'Не удалось скопировать.');
    save();
    return;
  }

  if (t.closest('[data-copy-buyer]') && current) {
    status(t, (await copy(buyerText(current))) ? 'Скопировано: номера и ссылки на официальные сайты служб.' : 'Не удалось скопировать.');
    save();
    return;
  }

  const share = t.closest<HTMLElement>('[data-share]');
  if (share) {
    save();
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ТрекЧек', url });
      } catch {
        /* человек закрыл окно «Поделиться» */
      }
    } else {
      status(share, (await copy(url)) ? 'Ссылка скопирована.' : 'Не удалось скопировать ссылку.');
    }
  }
});

// --- История ------------------------------------------------------------------

function editLabel(n: string) {
  const row = historyBox.querySelector<HTMLElement>(`.hrow[data-n="${CSS.escape(n)}"]`);
  const item = loadHistory().find((x) => x.n === n);
  if (!row || !item) return;
  row.innerHTML = `<label class="hrow__edit"><span class="sr-only">Подпись к ${esc(item.d)}</span>
    <input type="text" maxlength="60" value="${esc(item.label ?? '')}" placeholder="Например: наушники с Али"></label>`;
  const field = row.querySelector('input')!;
  field.focus();
  let done = false;
  const finish = (keep: boolean) => {
    if (done) return;
    done = true;
    drawHistory(keep ? setLabel(n, field.value) : loadHistory());
  };
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  field.addEventListener('blur', () => finish(true));
}

historyBox.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const openBtn = t.closest<HTMLElement>('[data-history-open]');
  if (openBtn) {
    input.value = openBtn.dataset.historyOpen ?? '';
    render();
    input.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return;
  }
  const label = t.closest<HTMLElement>('[data-history-label]');
  if (label) return editLabel(label.dataset.historyLabel ?? '');
  const del = t.closest<HTMLElement>('[data-history-forget]');
  if (del) return drawHistory(forget(del.dataset.historyForget ?? ''));
  const clear = t.closest<HTMLElement>('[data-history-clear]');
  if (clear) {
    const v = clear.dataset.historyClear;
    confirmClear = v === 'ask';
    drawHistory(v === 'yes' ? clearHistory() : loadHistory());
    historyBox.querySelector<HTMLElement>(v === 'ask' ? '[data-history-clear="no"]' : '[data-history-clear="ask"]')?.focus();
  }
});

// --- Поле ввода ------------------------------------------------------------------

input.addEventListener('input', render);

// Enter — показать результат (закрыть клавиатуру), Shift+Enter — новая строка для нескольких номеров.
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    render();
    save();
    if (matchMedia('(pointer: coarse)').matches) input.blur();
    results.querySelector<HTMLElement>('a[data-open]')?.focus({ preventScroll: true });
    results.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  render();
  input.focus();
});

pasteBtn.addEventListener('click', async () => {
  note.textContent = '';
  try {
    const value = await navigator.clipboard.readText();
    if (value.trim()) {
      input.value = value.trim();
      render();
      save();
    } else {
      note.textContent = 'Буфер обмена пуст.';
    }
  } catch {
    note.textContent = 'Браузер не дал прочитать буфер. Нажмите на поле и вставьте номер.';
    input.focus();
  }
});

examples.addEventListener('click', (e) => {
  const ex = (e.target as HTMLElement).closest<HTMLElement>('[data-example]');
  if (!ex) return;
  input.value = ex.dataset.example ?? '';
  render();
});

window.addEventListener('hashchange', () => {
  const v = hashValue();
  if (v && v !== input.value.trim()) {
    input.value = v;
    render();
  }
});

// --- Старт ----------------------------------------------------------------------

// Номер из ссылки или то, что человек успел ввести, пока грузился скрипт.
const fromHash = hashValue();
if (fromHash && !input.value.trim()) input.value = fromHash;
document.documentElement.classList.add('app-ready');
render();
drawHistory();
// На телефоне клавиатуру сами не открываем: она закрывает результат.
if (!input.value && matchMedia('(pointer: fine)').matches) input.focus();

// Офлайн-режим: service worker регистрируем после загрузки, чтобы не мешать первому результату.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  // Сайт может жить не в корне домена (GitHub Pages: /trackcheck-project/) — берём базовый путь сборки.
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  addEventListener('load', () => navigator.serviceWorker?.register(`${base}sw.js`, { scope: base }).catch(() => {}));
}
