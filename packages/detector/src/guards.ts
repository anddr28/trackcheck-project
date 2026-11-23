// Номера, которые не являются треками: номера заказов площадок и ложные срабатывания
// (телефоны, банковские карты, даты, ИНН). См. docs/formats-research.md.

import type { Hint } from './types';

export interface OrderPattern {
  id: string;
  marketplace: string;
  /** Проверяется на форме lat (латиница, верхний регистр, дефисы сохранены). */
  re: RegExp;
  hint: string;
  sources: string[];
  examples: string[];
}

export const ORDER_PATTERNS: OrderPattern[] = [
  {
    id: 'avito-order', marketplace: 'Авито', re: /^7000\d{13}$/,
    hint: 'Это номер заказа Авито. Трек-номер указан в карточке заказа в разделе Заказы.',
    sources: [
      'https://www.avito.ru/ (реальный номер заказа из кабинета пользователя: 17 цифр, начинается с 7000)',
      'https://e-vito.ru/avito-dostavka-trek-nomer-kak-najti-i-otsledit-posylku/ (номер сделки Авито — 17 цифр на 7000000)',
    ],
    examples: ['70000000459918575'],
  },
  {
    id: 'temu-order', marketplace: 'Temu', re: /^PO-?\d{3}-?\d{13,17}$/,
    hint: 'Это номер заказа Temu, по нему посылку не отследить. Трек-номер — в приложении Temu: Заказы → заказ → Отследить.',
    sources: [
      'https://help.annke.com/hc/en-us/articles/56263588450969-How-to-Find-Your-Temu-Order-Number (формат PO-XXX-XXXXXXXXXXXXXXX)',
      'https://www.justanswer.com/software/owd1v-order-id-po-211-amount.html (номера заказов вида PO-211-…)',
    ],
    examples: ['PO-211-123456789012345'],
  },
];

export function matchOrder(lat: string): OrderPattern | null {
  return ORDER_PATTERNS.find((p) => p.re.test(lat)) ?? null;
}

/** Проверка Луна (номера банковских карт). https://ru.wikipedia.org/wiki/Алгоритм_Луна */
export function luhnValid(n: string): boolean {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * Признаки «это не трек». Возвращает подсказку; кандидаты при этом получают низкую уверенность
 * (дата — убирается совсем).
 */
export function falsePositive(raw: string, plain: string): (Hint & { drop?: boolean }) | null {
  // Дата: 22.11.2026, 22/11/26
  if (/^\s*\d{1,2}[./]\d{1,2}[./](\d{2}|\d{4})\s*$/.test(raw)) {
    return { code: 'looks-like-date', level: 'warning', text: 'Это похоже на дату, а не на трек-номер.', drop: true };
  }
  // Банковская карта: 16 цифр, проходит проверку Луна, начинается как карты Мир (2200–2204), Visa (4) или Mastercard (51–55, 2221–2720)
  if (/^\d{16}$/.test(plain) && luhnValid(plain) && /^(220[0-4]|4|5[1-5]|2[2-7])/.test(plain)) {
    return { code: 'looks-like-card', level: 'warning', text: 'Похоже на номер банковской карты, а не на трек-номер. Не отправляйте номер карты посторонним.' };
  }
  // Мобильный телефон: +7/8 9XX XXX-XX-XX или 9XX XXX-XX-XX
  if (/^[78]9\d{9}$/.test(plain) || /^9\d{9}$/.test(plain)) {
    return { code: 'looks-like-phone', level: 'warning', text: 'Похоже на номер мобильного телефона. Если это всё-таки трек — проверьте варианты ниже.' };
  }
  return null;
}

/** Слова перед числом, после которых число точно не трек (в пакетном вводе). */
export const NOT_TRACK_CONTEXT = /^(инн|кпп|огрн|огрнип|бик|снилс|тел|телефон|моб|т|р\/с|к\/с|счет|счёт|карта|card|phone|артикул|арт|сумма|итого)[.:]*$/i;
