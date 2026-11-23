// «Что значит этот номер»: тип, страна, индекс отделения у Почты, контрольная цифра.
// Полная интерактивная расшифровка по частям — этап 3, на страницах служб.
import { COUNTRIES, S10_TYPES, pochtaValid, s10Valid, type Candidate } from '@trackcheck/detector';

export interface ExplainRow {
  part?: string;
  text: string;
  /** true — контрольная цифра в порядке, false — не сходится. */
  ok?: boolean;
}

export function explain(c: Candidate): ExplainRow[] {
  const n = c.number;
  const rows: ExplainRow[] = [];

  if (c.ruleId === 's10') {
    const cc = n.slice(11);
    rows.push({ part: n.slice(0, 2), text: `тип отправления: ${S10_TYPES[n[0]!]?.toLowerCase() ?? 'международное отправление'}` });
    rows.push({ part: n.slice(2, 10), text: 'порядковый номер отправления' });
    const ok = s10Valid(n);
    rows.push({ part: n[10], text: ok ? 'контрольная цифра — в порядке' : 'контрольная цифра не сходится — в номере, скорее всего, опечатка', ok });
    rows.push({ part: cc, text: `страна отправки: ${COUNTRIES[cc]?.name ?? cc}` });
    return rows;
  }

  if (c.ruleId === 'pochta-14') {
    const pre = n[0] === '8';
    rows.push(
      pre
        ? { part: n.slice(0, 6), text: 'номер из диапазона для посылок, оформленных заранее (магазин, маркетплейс); это не индекс отделения' }
        : { part: n.slice(0, 6), text: 'почтовый индекс отделения, где приняли посылку' },
    );
    rows.push({ part: n.slice(6, 8), text: 'код месяца, когда напечатан номер' });
    rows.push({ part: n.slice(8, 13), text: 'порядковый номер отправления' });
    const ok = pochtaValid(n);
    rows.push({ part: n[13], text: ok ? 'контрольная цифра — в порядке' : 'контрольная цифра не сходится — проверьте номер по чеку', ok });
    return rows;
  }

  if (c.type) rows.push({ text: `тип: ${c.type.charAt(0).toLowerCase()}${c.type.slice(1)}` });
  if (c.country) rows.push({ text: `страна службы: ${c.country.name}` });
  rows.push({ text: 'контрольную цифру этого формата мы не проверяем — опечатку покажет только сайт службы' });
  return rows;
}
