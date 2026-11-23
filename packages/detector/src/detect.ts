import { AVITO_PARTNERS, CARRIERS, UNIVERSAL_TRACKER, fillUrl } from './carriers';
import { COUNTRIES } from './countries';
import { NOT_TRACK_CONTEXT, ORDER_PATTERNS, falsePositive, matchOrder } from './guards';
import { mentionedCarriers, normalize, stripNoise } from './normalize';
import { RULES } from './rules';
import type { BatchResult, Candidate, Confidence, DetectOptions, DetectResult, Hint, TrackingLink } from './types';

const SCORE: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
const MARKETPLACE_WORDS = new Set(['avito', 'ozon', 'cainiao', 'yandex']);

export function universalLink(number: string): TrackingLink {
  return { label: 'Отследить на 17TRACK', url: fillUrl(UNIVERSAL_TRACKER.url, number), kind: 'universal', verified: true };
}

function linksFor(carrierId: string, carrierName: string, number: string, countryCode: string | null): TrackingLink[] {
  const links: TrackingLink[] = [];
  const c = CARRIERS[carrierId];

  if (carrierId.startsWith('post-')) {
    // Иностранная почта: прямые ссылки операторов не проверены — 17TRACK, затем Почта России для входящих.
    links.push(universalLink(number));
    const pochta = CARRIERS.pochta!.tracking!;
    links.push({ label: 'Отследить на сайте Почты России', url: fillUrl(pochta.url, number), kind: 'direct', verified: pochta.verified });
    const site = countryCode ? COUNTRIES[countryCode]?.site : undefined;
    if (site) links.push({ label: `Сайт: ${carrierName}`, url: site, kind: 'page', verified: false });
    return links;
  }

  if (c?.tracking) {
    const direct = c.tracking.url.includes('{n}');
    links.push({
      label: c.linkLabel ?? `Отследить на сайте ${c.nameGen ?? c.name}`,
      url: direct ? fillUrl(c.tracking.url, number) : c.tracking.url,
      kind: direct ? 'direct' : 'page',
      verified: c.tracking.verified,
    });
  }
  // 17TRACK не знает номеров, которые видны только в кабинете (Авито).
  if (!c?.appOnly && !links.some((l) => l.kind === 'direct')) links.push(universalLink(number));
  return links;
}

function avitoHint(): Hint {
  const names = AVITO_PARTNERS.map((id) => CARRIERS[id]!.name).join(', ');
  return {
    code: 'avito', level: 'info',
    text: `Авито возит своей доставкой и через партнёров — ${names}. Вставьте трек из карточки заказа на Авито, и мы покажем, какая служба его везёт.`,
  };
}

function wbHint(): Hint {
  return { code: 'wb-app', level: 'info', text: CARRIERS.wb!.appHint! };
}

/** Распознать один номер. context — текст вокруг номера, в котором ищем название службы. */
export function detect(input: string, options: DetectOptions = {}): DetectResult {
  const f = normalize(input);
  const best = new Map<string, Candidate & { order: number }>();

  RULES.forEach((rule, order) => {
    if (rule.noHyphen && f.lat.includes('-')) return;
    const m = f[rule.form].match(rule.re);
    if (!m) return;
    const out = rule.build ? rule.build(m) : {};
    if (out === null) return;

    const carrierId = out.carrierId ?? rule.carrier;
    const carrier = CARRIERS[carrierId];
    const carrierName = out.carrierName ?? carrier?.name ?? carrierId;
    const number = out.number ?? m[0];
    const country = out.country !== undefined ? out.country : (carrier?.country ?? null);
    const hints = [...(out.hints ?? [])];
    const links = linksFor(carrierId, carrierName, out.urlNumber ?? number, country?.code ?? null);

    if (!carrier?.appOnly && (links[0]?.kind === 'page' || (carrier?.tracking === null && !carrierId.startsWith('post-')))) {
      hints.push({ code: 'paste-on-site', level: 'info', text: `На сайте ${carrier?.nameGen ?? carrierName} нет ссылки с номером: скопируйте номер и вставьте его в поле отслеживания.` });
    }
    if (carrier?.appHint) hints.push({ code: 'app', level: 'info', text: carrier.appHint });

    const cand: Candidate & { order: number } = {
      carrierId,
      carrier: carrierName,
      carrierGen: carrier?.nameGen ?? carrierName,
      country,
      type: out.type !== undefined ? out.type : rule.type,
      confidence: out.confidence ?? rule.confidence,
      rank: 'possible',
      number,
      display: out.display ?? number,
      labels: out.labels ?? [],
      links,
      hints,
      ruleId: rule.id,
      order,
    };
    const prev = best.get(carrierId);
    if (!prev || SCORE[cand.confidence] > SCORE[prev.confidence]) best.set(carrierId, cand);
  });

  // Телефон, карта, дата: не выдаём за трек с уверенностью.
  const q = f.plain;
  const fp = falsePositive(input, q.replace(/^\+/, ''));
  if (fp?.drop) best.clear();
  else if (fp) for (const c of best.values()) c.confidence = 'low';

  let sorted = [...best.values()].sort(
    (a, b) => SCORE[b.confidence] - SCORE[a.confidence] || a.order - b.order,
  );

  // Служба названа в тексте («СДЭК 1150362728», «(Почта России)») и совпала ровно с одним кандидатом:
  // она идёт первой и становится «Скорее всего», слабые альтернативы (низкая уверенность) убираем.
  const named = new Set([...f.carriers, ...(options.context ? mentionedCarriers(options.context) : [])]);
  const namedCands = sorted.filter((c) => named.has(c.carrierId));
  const context = !fp && namedCands.length === 1 && namedCands[0]!.confidence !== 'low' ? namedCands[0]! : null;
  if (context) {
    sorted = [context, ...sorted.filter((c) => c !== context && c.confidence !== 'low')];
  }

  // «Скорее всего» — только если первый кандидат увереннее второго (или назван в тексте); при ничьей все «возможно».
  const tie = !context && sorted.length > 1 && sorted[0]!.confidence === sorted[1]!.confidence;
  const candidates: Candidate[] = sorted.map(({ order: _order, ...c }, i) => ({
    ...c,
    rank: i === 0 && c.confidence !== 'low' && !tie ? 'likely' : 'possible',
  }));

  const hints: Hint[] = [];
  if (fp) hints.push({ code: fp.code, level: fp.level, text: fp.text });

  // Номер заказа площадки (Авито, Temu): не трек, подсказываем, где искать трек.
  const order = candidates.length === 0 ? matchOrder(f.lat) : null;
  if (order) hints.push({ code: order.id, level: 'warning', text: order.hint });

  // Служба названа в тексте, но среди кандидатов её нет: номер ей не подходит.
  // Площадки (Авито, Ozon, AliExpress, Яндекс) возят и чужими службами — их упоминание несовпадением не считаем.
  const namedMiss = !context
    ? [...named].find((id) => !MARKETPLACE_WORDS.has(id) && !sorted.some((c) => c.carrierId === id)) ?? null
    : null;

  // Почта России: 13 или 15 цифр вместо 14 — пропущена или лишняя цифра.
  // Если Почта названа в тексте — предупреждаем при любой длине, кроме 14.
  const digitsOnly = /^\d+$/.test(q) && !f.lat.includes('-');
  const pochtaLen = digitsOnly && (/^([1-6]|8)\d{12}$|^([1-6]|8)\d{14}$/.test(q) || (namedMiss === 'pochta' && q.length !== 14));
  if (pochtaLen) {
    hints.push({
      code: 'pochta-length', level: 'warning',
      text: `В номере Почты России 14 цифр, а здесь ${q.length}. Проверьте, нет ли ${q.length < 14 ? 'пропущенной' : 'лишней'} цифры.`,
    });
  }
  // СДЭК назван в тексте, а цифр не 10–11.
  if (digitsOnly && namedMiss === 'cdek' && (q.length < 10 || q.length > 11)) {
    hints.push({
      code: 'cdek-length', level: 'warning',
      text: `В номере СДЭК 10 или 11 цифр, а здесь ${q.length}. Проверьте номер в SMS или в приложении СДЭК.`,
    });
  }

  // 16 цифр без дефисов: номер заказа магазина или карты, а не трек (ЖДЭ пишет номер с дефисами).
  const sixteen = !fp && candidates.length === 0 && /^\d{16}$/.test(q);
  if (sixteen) {
    hints.push({
      code: 'sixteen-digits', level: 'warning',
      text: 'Так обычно выглядит номер заказа в магазине или номер карты, а не трек-номер. Трек-номер ищите в карточке заказа или в письме об отправке.',
    });
  }

  // S10 с лишней или пропущенной цифрой.
  const s10ish = /^[A-Z]{2}(\d{7,8}|\d{10,11})[A-Z]{2}$/.exec(q);
  if (s10ish && candidates.length === 0) {
    const n = s10ish[1]!.length;
    hints.push({
      code: 's10-length', level: 'warning',
      text: `Похоже на международный номер, но между буквами ${n} цифр вместо 9. Проверьте, нет ли лишней или пропущенной цифры.`,
    });
  }

  // Номер заказа вместо трека.
  if (!order && !fp && !pochtaLen && !namedMiss && candidates.length === 0 && q.length > 0 && (/^\d{4,9}$/.test(q) || f.mentionsOrder)) {
    hints.push({
      code: 'order-number', level: 'warning',
      text: 'Похоже на номер заказа магазина, а не на трек-номер. Трек-номер приходит в письме или SMS об отправке и виден в карточке заказа.',
    });
  }
  if (f.mentionsAvito) hints.push(avitoHint());
  if (f.mentionsWb && !candidates.some((c) => c.carrierId === 'wb')) hints.push(wbHint());

  // Точно не трек — в универсальный трекер не отправляем.
  const notTrack = order !== null || sixteen || fp?.code === 'looks-like-card' || fp?.code === 'looks-like-date';

  return {
    input,
    query: q,
    candidates,
    hints,
    fallback: notTrack ? null : universalLink(q || input.trim()),
    context: context?.carrierId ?? null,
    named: namedMiss,
  };
}

// --- Пакетный ввод ---------------------------------------------------------

const SPLIT = /[\s,;!?«»"“”„'`[\]{}<>|]+/;
const ORDER_CODES = new Set(ORDER_PATTERNS.map((p) => p.id));
const MAX_JOIN = 4;

/** В тексте берём только уверенные совпадения, чтобы не принять телефон или дату за трек. */
function isAccepted(r: DetectResult): boolean {
  if (r.candidates.length === 0) return r.hints.some((h) => h.code === 's10-length' || ORDER_CODES.has(h.code));
  const top = r.candidates[0]!;
  return top.confidence !== 'low' || r.candidates.some((c) => c.hints.some((h) => h.code === 's10-check'));
}

/**
 * Найти все номера в произвольном тексте (кусок переписки, письмо).
 * Номера, напечатанные с пробелами («RA 123456789 CN», «450051 45 00974 9»), склеиваются,
 * только если пробелы стоят ровно там, где мы сами их ставим при показе.
 * Контекст номера — слова между ним и соседними номерами: «СДЭК 1150362728, Почта 4500…».
 */
export function detectAll(text: string): BatchResult {
  const hints: Hint[] = [];
  const f = normalize(text);
  if (f.mentionsAvito) hints.push(avitoHint());
  if (f.mentionsWb) hints.push(wbHint());

  const tokens = stripNoise(text)
    .split(SPLIT)
    .map((t) => t.replace(/^[.:]+|[.:]+$/g, ''))
    .filter((t) => /[0-9A-Za-zА-Яа-яЁё]/.test(t));

  // Первый проход: где в тексте номера.
  const spans: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < tokens.length; ) {
    // «ИНН 7707083893», «тел. 9161234567», «артикул 123456789» — число после такого слова не трек.
    if (i > 0 && NOT_TRACK_CONTEXT.test(tokens[i - 1]!)) {
      i += 1;
      continue;
    }
    let taken = 0;
    for (let len = Math.min(MAX_JOIN, tokens.length - i); len >= 1; len--) {
      const parts = tokens.slice(i, i + len);
      const r = detect(parts.join(''));
      if (!isAccepted(r)) continue;
      if (len > 1) {
        const spaced = parts.join(' ').toUpperCase();
        if (!r.candidates.some((c) => c.display.toUpperCase() === spaced)) continue;
      }
      spans.push({ start: i, end: i + len });
      taken = len;
      break;
    }
    i += taken || 1;
  }

  // Второй проход: распознаём каждый номер с учётом слов вокруг него.
  const results: DetectResult[] = [];
  const seen = new Set<string>();
  const strip = (r: DetectResult): DetectResult => ({
    ...r,
    hints: r.hints.filter((h) => h.code !== 'avito' && h.code !== 'wb-app'),
  });
  // Пишут ли службу перед номером («СДЭК 1150…, Почта 4500…») или после («4500… (Почта России)»):
  // определяем один раз по тексту до первого номера, иначе слово между двумя номерами досталось бы обоим.
  const before = (k: number) => tokens.slice(k > 0 ? spans[k - 1]!.end : 0, spans[k]!.start).join(' ');
  const after = (k: number) => tokens.slice(spans[k]!.end, k < spans.length - 1 ? spans[k + 1]!.start : tokens.length).join(' ');
  const prefixStyle = spans.length > 0 && mentionedCarriers(before(0)).length > 0;
  spans.forEach((s, k) => {
    const context = spans.length === 1 ? `${before(k)} ${after(k)}` : prefixStyle ? before(k) : after(k);
    const r = detect(tokens.slice(s.start, s.end).join(''), { context });
    if (!seen.has(r.query)) {
      seen.add(r.query);
      results.push(strip(r));
    }
  });

  // Уверенных номеров нет: берём самую длинную цепочку чисел подряд («трек: 450051 45 0974 4»),
  // чтобы показать подсказку про опечатку, а не «не узнали» из-за слов вокруг.
  if (results.length === 0) {
    let best: [number, number] | null = null;
    for (let i = 0; i < tokens.length; ) {
      if (!/^\d+$/.test(tokens[i]!)) { i++; continue; }
      let j = i;
      while (j < tokens.length && /^\d+$/.test(tokens[j]!)) j++;
      const len = tokens.slice(i, j).join('').length;
      if (!best || len > tokens.slice(best[0], best[1]).join('').length) best = [i, j];
      i = j;
    }
    if (best && tokens.length > best[1] - best[0]) {
      const context = [...tokens.slice(0, best[0]), ...tokens.slice(best[1])].join(' ');
      const r = detect(tokens.slice(best[0], best[1]).join(''), { context });
      if (r.candidates.length > 0 || r.hints.some((h) => h.level === 'warning')) {
        results.push(strip(r));
        return { results, hints };
      }
    }
  }

  // Один номер без окружающего текста — отдаём как есть, даже с низкой уверенностью.
  if (results.length === 0) {
    const r = detect(text);
    if (r.candidates.length > 0 || r.hints.some((h) => h.code !== 'avito' && h.code !== 'wb-app')) {
      results.push(strip(r));
    }
  }
  return { results, hints };
}
