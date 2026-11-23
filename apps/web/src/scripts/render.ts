// Разметка результата без фреймворка: строки HTML, все данные экранируются.
// Решения суда (docs/court.md): один ответ на номер, альтернативы свёрнуты, одна заметная кнопка,
// номер показан один раз, под кнопкой — честная подпись, что произойдёт.
import type { BatchResult, Candidate, DetectResult, Hint, TrackingLink } from '@trackcheck/detector';
import { icon } from '../lib/icons';
import { explain } from './explain';
import type { HistoryItem } from './storage';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);

// Подсказки, которые уже сказаны подписью под кнопкой, второй раз не показываем.
const COVERED = new Set(['paste-on-site', 'app']);

function hints(list: Hint[]): string {
  const shown = list.filter((h) => !COVERED.has(h.code));
  if (!shown.length) return '';
  return `<ul class="hints">${shown
    .map((h) => `<li class="hint hint--${h.level}">${icon(h.level === 'warning' ? 'warning' : 'info', 18)}<span>${esc(h.text)}</span></li>`)
    .join('')}</ul>`;
}

/** Нужно ли копировать номер при переходе: сайт не подставит его сам или подстановка не проверена. */
const needsCopy = (l: TrackingLink) => l.kind === 'page' || (l.kind === 'direct' && !l.verified);

/** Подпись под кнопкой: куда ведёт и что будет с номером. */
function caption(l: TrackingLink, c: Candidate): string {
  if (c.carrierId === 'avito') return 'Номера Авито Доставки видно только в приложении Авито → Заказы. Номер скопируем.';
  if (l.kind === 'universal') return 'Откроется сторонний трекер 17TRACK, номер уже вписан.';
  if (l.kind === 'page') return `Откроется официальный сайт ${c.carrierGen}. Номер скопируем — вставьте его в поле поиска.`;
  if (!l.verified) return `Откроется официальный сайт ${c.carrierGen}. Номер скопируем: если поле на сайте пустое, вставьте его.`;
  return `Откроется официальный сайт ${c.carrierGen}, номер уже вписан.`;
}

function action(l: TrackingLink, c: Candidate, style: 'primary' | 'quiet'): string {
  const label = l.kind === 'universal' ? 'Проверить на 17TRACK' : l.label;
  return `<div class="act">
    <a class="btn btn--${style}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" data-open data-number="${esc(c.number)}"${needsCopy(l) ? ' data-copy-on-open' : ''}>
      <span>${esc(label)}</span>${icon('external', 18)}</a>
    <p class="act__note">${esc(caption(l, c))}</p>
    <p class="act__status" role="status"></p>
  </div>`;
}

const copyIcon = (value: string) =>
  `<button type="button" class="icon-btn" data-copy="${esc(value)}" aria-label="Скопировать номер ${esc(value)}" title="Скопировать номер">${icon('copy', 20)}</button>`;

function numberLine(c: Candidate): string {
  const long = c.display.length > 16 ? ' number--long' : '';
  return `<div class="answer__number"><span class="number${long}">${esc(c.display)}</span>${copyIcon(c.number)}</div>`;
}

// Страну не повторяем, если она уже есть в типе («…по России»).
const meta = (c: Candidate) =>
  [c.type?.includes('России') ? null : c.country?.name, c.type].filter(Boolean).map((x) => esc(x!)).join(' · ');
const extraLabels = (c: Candidate) => c.labels.filter((l) => !l.startsWith('тип:') && !l.startsWith('страна:'));

function explainBlock(c: Candidate): string {
  const rows = explain(c);
  return `<details class="explain"><summary>Что значит этот номер</summary><ul class="explain__list">${rows
    .map(
      (r) => `<li class="explain__row${r.ok === false ? ' explain__row--bad' : ''}">${r.part ? `<span class="explain__part">${esc(r.part)}</span>` : ''}<span>${
        r.ok === true ? icon('check', 16, 'ok') : r.ok === false ? icon('warning', 16) : ''
      }${esc(r.text)}</span></li>`,
    )
    .join('')}</ul></details>`;
}

/** Главный ответ: одна служба, одна заметная кнопка. */
function answer(c: Candidate): string {
  const [primary, ...more] = c.links;
  const labels = extraLabels(c);
  return `<article class="answer" aria-label="${esc(`${c.rank === 'likely' ? 'Скорее всего' : 'Возможно'} ${c.carrier}`)}">
    <p class="answer__head"><span class="plaque">${esc(c.carrier)}</span><span class="answer__rank">${c.rank === 'likely' ? 'скорее всего' : 'возможно'}</span></p>
    ${meta(c) ? `<p class="answer__meta">${meta(c)}</p>` : ''}
    ${numberLine(c)}
    ${labels.length ? `<p class="answer__labels">${esc(labels.join(' · '))}</p>` : ''}
    ${primary ? action(primary, c, 'primary') : ''}
    ${more.length ? `<p class="more-links">${more.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" data-open data-number="${esc(c.number)}">${esc(l.label)}</a>`).join('')}</p>` : ''}
    ${explainBlock(c)}
    ${hints(c.hints)}
  </article>`;
}

/** Альтернатива: строка с названием и тихой кнопкой. */
function option(c: Candidate): string {
  const [primary] = c.links;
  return `<li class="option">
    <p class="option__head"><span class="plaque plaque--small">${esc(c.carrier)}</span>${meta(c) ? `<span class="option__meta">${meta(c)}</span>` : ''}</p>
    ${primary ? action(primary, c, 'quiet') : ''}
  </li>`;
}

function also(list: Candidate[], open = false): string {
  if (!list.length) return '';
  return `<details class="also"${open ? ' open' : ''}><summary>Также похоже на: ${esc(list.map((c) => c.carrier).join(', '))}</summary>
    <ul class="options">${list.map(option).join('')}</ul></details>`;
}

/** Один номер. */
export function result(r: DetectResult): string {
  const warnings = r.hints.filter((h) => h.level === 'warning');
  const infos = r.hints.filter((h) => h.level !== 'warning');
  const likely = r.candidates.find((c) => c.rank === 'likely');
  let body = '';

  if (r.named) {
    // Служба названа в тексте, а номер ей не подходит: только предупреждение, остальное свёрнуто.
    body = also(r.candidates);
  } else if (likely) {
    body = answer(likely) + also(r.candidates.filter((c) => c !== likely));
  } else if (r.candidates.length === 1) {
    body = answer(r.candidates[0]!);
  } else if (r.candidates.length > 1) {
    const first = r.candidates[0]!;
    body = `<article class="answer">
      <p class="answer__title">Номер подходит нескольким службам</p>
      ${numberLine(first)}
      <p class="answer__labels">Посмотрите, в каком приложении или письме вы получили номер, — там указана служба.</p>
      <ul class="options">${r.candidates.map(option).join('')}</ul>
    </article>`;
  } else if (warnings.length && !r.fallback) {
    // Точно не трек (номер заказа, карта): достаточно предупреждения, пустой рамки не нужно.
    body = '';
  } else {
    body = `<article class="answer answer--empty">
      <p class="answer__title">${warnings.length ? 'Проверьте номер' : 'Не узнали формат номера'}</p>
      ${warnings.length ? '' : '<p class="answer__labels">Проверьте, что это трек-номер, а не номер заказа. Если номер верный, его найдёт универсальный трекер.</p>'}
      ${r.fallback ? `<div class="act"><a class="btn btn--quiet" href="${esc(r.fallback.url)}" target="_blank" rel="noopener noreferrer" data-open data-number="${esc(r.query)}"><span>Проверить на 17TRACK</span>${icon('external', 18)}</a><p class="act__note">Откроется сторонний трекер 17TRACK, номер уже вписан.</p><p class="act__status" role="status"></p></div>` : ''}
    </article>`;
  }
  return `<section class="result" aria-label="${esc(`Результат для ${r.query}`)}">${hints(warnings)}${body}${hints(infos)}</section>`;
}

/** Главная служба результата (для строки списка, истории и текста покупателю). */
export function topOf(r: DetectResult): Candidate | null {
  return r.candidates.find((c) => c.rank === 'likely') ?? null;
}

function rowCarrier(r: DetectResult): string {
  const top = topOf(r);
  if (top) return top.carrier;
  if (r.candidates.length > 1) return r.candidates.map((c) => c.carrier).slice(0, 2).join(' или ');
  if (r.candidates.length === 1) return `возможно ${r.candidates[0]!.carrier}`;
  return 'проверьте номер';
}

/** Несколько номеров: сводка и строки, подробности по нажатию. */
function batch(b: BatchResult): string {
  const counts = new Map<string, number>();
  for (const r of b.results) {
    const key = topOf(r)?.carrier ?? 'служба не ясна';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const n = b.results.length;
  const word = n % 10 === 1 && n % 100 !== 11 ? 'номер' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'номера' : 'номеров';
  const summary = `${n} ${word}: ${[...counts].map(([k, v]) => `${k} — ${v}`).join(', ')}`;
  const rows = b.results
    .map((r) => {
      const top = topOf(r);
      const display = (top ?? r.candidates[0])?.display ?? r.query;
      const link = top?.links[0];
      return `<li class="row">
        <details class="row__details"><summary><span class="row__num">${esc(display)}</span><span class="row__carrier">${esc(rowCarrier(r))}</span></summary>${result(r)}</details>
        ${link && top ? `<a class="btn btn--quiet btn--small row__open" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" data-open data-number="${esc(top.number)}"${needsCopy(link) ? ' data-copy-on-open' : ''} aria-label="${esc(`Открыть: ${top.carrier}, ${top.number}`)}">Открыть${icon('external', 16)}</a>` : ''}
      </li>`;
    })
    .join('');
  return `<section class="batch" aria-label="Несколько номеров">
    <p class="batch__summary">${esc(summary)}</p>
    <div class="batch__actions">
      <button type="button" class="btn btn--quiet btn--small" data-copy-all>${icon('copy', 16)}<span>Скопировать номера</span></button>
      <button type="button" class="btn btn--quiet btn--small" data-copy-buyer>${icon('copy', 16)}<span>Скопировать для покупателя</span></button>
    </div>
    <p class="act__status batch__status" role="status"></p>
    <ul class="rows">${rows}</ul>
  </section>`;
}

/** Текст для покупателя: номер и официальная ссылка по каждой посылке. */
export function buyerText(b: BatchResult): string {
  return b.results
    .map((r) => {
      const top = topOf(r);
      const link = top?.links[0];
      return top && link && link.kind !== 'universal'
        ? `Трек-номер ${top.carrier}: ${top.number}${link.kind === 'direct' ? ` — отследить: ${link.url}` : ` — отследить на сайте ${top.carrierGen}`}`
        : `Трек-номер: ${(top ?? r.candidates[0])?.number ?? r.query}`;
    })
    .join('\n');
}

export function renderBatch(b: BatchResult, shareable: boolean): string {
  const share = shareable
    ? `<div class="share"><button type="button" class="btn btn--quiet btn--small" data-share>${icon('share', 16)}<span>Поделиться ссылкой</span></button><span class="act__status" role="status"></span></div>`
    : '';
  const body = b.results.length > 1 ? batch(b) : b.results.map(result).join('');
  return hints(b.hints) + body + share;
}

// --- История -----------------------------------------------------------------

const DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

export function renderHistory(list: HistoryItem[], confirmClear: boolean): string {
  if (!list.length) {
    return `<h2 class="history__title" id="history-title">Проверенные номера</h2>
      <p class="history__empty">Здесь появятся номера, которые вы проверили. Они хранятся только в этом браузере.</p>`;
  }
  const items = list
    .map(
      (h) => `<li class="hrow" data-n="${esc(h.n)}">
      <button type="button" class="hrow__main" data-history-open="${esc(h.n)}">
        <span class="row__num">${esc(h.d)}</span>
        <span class="row__carrier">${esc(h.name ?? 'служба не ясна')} · ${esc(DATE.format(h.t))}</span>
        ${h.label ? `<span class="hrow__label">${esc(h.label)}</span>` : ''}
      </button>
      <button type="button" class="icon-btn" data-history-label="${esc(h.n)}" aria-label="${esc(h.label ? `Изменить подпись к ${h.d}` : `Добавить подпись к ${h.d}`)}" title="Подпись">${icon('pencil', 18)}</button>
      <button type="button" class="icon-btn" data-history-forget="${esc(h.n)}" aria-label="${esc(`Удалить ${h.d} из истории`)}" title="Удалить">${icon('close', 18)}</button>
    </li>`,
    )
    .join('');
  const clear = confirmClear
    ? `<span class="history__confirm">Очистить всё? <button type="button" class="link-btn" data-history-clear="yes">Да</button> <button type="button" class="link-btn" data-history-clear="no">Нет</button></span>`
    : `<button type="button" class="link-btn" data-history-clear="ask">Очистить историю</button>`;
  return `<div class="history__head"><h2 class="history__title" id="history-title">Проверенные номера</h2>${clear}</div>
    <p class="history__note">Хранятся только в этом браузере.</p>
    <ul class="rows">${items}</ul>`;
}
