// Правила распознавания. У каждого правила — источник формата и примеры (они же идут в тесты).
// confidence: high — формат уникален и подтверждён; medium — подтверждён, но пересекается
// или источник сторонний; low — формат подтвердить не удалось или он слишком общий.

import { COUNTRIES } from './countries';
import { formatPochta, formatS10, groupDigits } from './format';
import type { Forms } from './normalize';
import type { Confidence, Country, Hint } from './types';

export interface RuleOutput {
  /** Переопределение службы (для S10 — почта страны). */
  carrierId?: string;
  carrierName?: string;
  country?: Country | null;
  type?: string | null;
  confidence?: Confidence;
  number?: string;
  display?: string;
  /** Номер для подстановки в ссылку, если отличается от чистого. */
  urlNumber?: string;
  labels?: string[];
  hints?: Hint[];
}

export interface Rule {
  id: string;
  carrier: string;
  form: keyof Pick<Forms, 'lat' | 'plain' | 'cyr' | 'cyrPlain' | 'cyrKeep'>;
  re: RegExp;
  confidence: Confidence;
  type: string | null;
  // Источники, примеры и оговорки — в rules-meta.ts (в браузер не попадают).
  /** Номер службы пишут без дефисов: дефис во вводе значит, что это другая служба (Энергия «0101-2157708»). */
  noHyphen?: boolean;
  build?: (m: RegExpMatchArray) => RuleOutput | null;
}

// --- UPU S10 ---------------------------------------------------------------

/** Тип отправления по первой букве S10 (UPU S10, сервисные индикаторы). */
export const S10_TYPES: Record<string, string> = {
  E: 'EMS (экспресс)',
  R: 'Заказное письмо или мелкий пакет',
  C: 'Посылка',
  // С 01.12.2025 Почта России присваивает L мелким пакетам и бандеролям (раньше R):
  // https://info.pochta.ru/support/no-mail-exchange, https://www.akm.ru/news/pochta_rossii_menyaet_prefiks_dlya_mezhdunarodnykh_otpravleniy/
  L: 'Мелкий пакет или бандероль',
  U: 'Мелкий пакет без регистрации',
  V: 'С объявленной ценностью',
};

/** Контрольная цифра S10: веса 8 6 4 2 3 5 9 7, 11 − сумма mod 11; 10 → 0, 11 → 5. */
export function s10CheckDigit(digits8: string): number {
  const w = [8, 6, 4, 2, 3, 5, 9, 7];
  const sum = [...digits8].reduce((s, d, i) => s + Number(d) * (w[i] ?? 0), 0);
  const c = 11 - (sum % 11);
  return c === 10 ? 0 : c === 11 ? 5 : c;
}

export function s10Valid(number: string): boolean {
  const m = /^[A-Z]{2}(\d{8})(\d)[A-Z]{2}$/.exec(number);
  return !!m && s10CheckDigit(m[1]!) === Number(m[2]);
}

/**
 * Контрольная (14-я) цифра внутреннего ШПИ Почты России:
 * цифры на нечётных позициях × 3 + цифры на чётных позициях, контрольная = (10 − сумма mod 10) mod 10.
 * Источник: https://ru.wikipedia.org/wiki/Почтовый_идентификатор (пример 14211716007389).
 * Проверено на реальном номере 80092840658820 (1track.ru). Пример из справки Почты 45005145009749
 * проверку не проходит — это иллюстрация, поэтому несовпадение только снижает уверенность.
 */
export function pochtaCheckDigit(digits13: string): number {
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(digits13[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

export function pochtaValid(number: string): boolean {
  return /^\d{14}$/.test(number) && pochtaCheckDigit(number.slice(0, 13)) === Number(number[13]);
}



const RAW = (m: RegExpMatchArray): RuleOutput => ({ number: m[0], display: m[0] });

export const RULES: Rule[] = [
  // --- Международные ------------------------------------------------------
  {
    id: 'yanwen', carrier: 'yanwen', form: 'plain', re: /^[A-Z]{2}\d{9}YP$/,
    confidence: 'high', type: 'Международное отправление',
    build: RAW,
  },
  {
    id: 's10', carrier: 'post', form: 'plain', re: /^([A-Z]{2})(\d{8})(\d)([A-Z]{2})$/,
    confidence: 'high', type: null,
    build: (m) => {
      const [, prefix, d8, check, cc] = m as unknown as [string, string, string, string, string];
      if (cc === 'YP') return null; // Yanwen
      const ok = s10CheckDigit(d8) === Number(check);
      const pc = COUNTRIES[cc];
      const country: Country = { code: cc, name: pc?.name ?? cc };
      const type = S10_TYPES[prefix[0]!] ?? 'Международное отправление';
      const hints: Hint[] = [];
      if (!ok) {
        hints.push({
          code: 's10-check', level: 'warning',
          text: 'Контрольная цифра не сходится: в номере, скорее всего, опечатка, лишняя или пропущенная цифра. Сверьте номер с письмом продавца.',
        });
      }
      if (cc !== 'RU') {
        hints.push({
          code: 's10-to-russia', level: 'info',
          text: 'Если посылка едет в Россию, после прибытия её статус покажет и сайт Почты России.',
        });
      }
      return {
        carrierId: cc === 'RU' ? 'pochta' : `post-${cc}`,
        carrierName: pc?.post ?? `Почта страны ${cc}`,
        country,
        type,
        confidence: ok ? 'high' : 'low',
        number: m[0],
        display: formatS10(m[0]),
        labels: [`тип: ${type}`, `страна: ${country.name}`],
        hints,
      };
    },
  },
  {
    id: 'cainiao', carrier: 'cainiao', form: 'plain', re: /^LP\d{12,18}(CN)?$/,
    confidence: 'high', type: 'Посылка AliExpress',
    build: (m) => ({
      number: m[0], display: m[0],
      hints: [{
        code: 'lp-delay', level: 'info',
        text: 'Номера LP начинают отслеживаться не сразу: статусы появляются, когда продавец передаст посылку в доставку, обычно через несколько дней после заказа.',
      }],
    }),
  },
  {
    id: 'yunexpress', carrier: 'yunexpress', form: 'plain', re: /^YT\d{16}$/,
    confidence: 'high', type: 'Международное отправление',
    build: RAW,
  },
  {
    id: '4px', carrier: '4px', form: 'plain', re: /^4PX\d{10,16}(CN)?$/,
    confidence: 'high', type: 'Международное отправление',
    build: RAW,
  },
  {
    id: 'ups', carrier: 'ups', form: 'plain', re: /^1Z[0-9A-Z]{16}$/,
    confidence: 'high', type: 'Экспресс-доставка',
    build: (m) => ({
      number: m[0],
      display: `${m[0].slice(0, 2)} ${m[0].slice(2, 8)} ${m[0].slice(8, 10)} ${m[0].slice(10, 14)} ${m[0].slice(14)}`,
    }),
  },

  // --- Российские посылочные --------------------------------------------
  {
    id: 'pochta-14', carrier: 'pochta', form: 'plain', re: /^([1-6]|8)\d{13}$/,
    confidence: 'high', type: 'Посылка или письмо по России',
    build: (m) => {
      const n = m[0];
      const ok = pochtaValid(n);
      const preRegistered = n[0] === '8';
      const hints: Hint[] = ok ? [] : [{
        code: 'pochta-check', level: 'warning',
        text: 'Контрольная (последняя) цифра не сходится: возможно, в номере опечатка. Сверьте номер с чеком или письмом.',
      }];
      return {
        number: n,
        display: formatPochta(n),
        confidence: ok ? 'high' : preRegistered ? 'low' : 'medium',
        type: preRegistered ? 'Посылка по России, оформленная заранее (интернет-магазин, маркетплейс)' : 'Посылка или письмо по России',
        labels: preRegistered ? ['номер из диапазона для заранее оформленных посылок'] : [`принято в отделении с индексом ${n.slice(0, 6)}`],
        hints,
      };
    },
  },
  {
    id: 'yandex', carrier: 'yandex', form: 'plain', re: /^LO(\d{6,12})$/,
    confidence: 'high', type: 'Посылка',
    build: (m) => ({ number: `LO-${m[1]}`, display: `LO-${m[1]}` }),
  },
  {
    id: 'ozon', carrier: 'ozon', form: 'lat', re: /^(\d{8,10})-(\d{4})-(\d{1,2})$/,
    confidence: 'high', type: 'Номер отправления',
    build: RAW,
  },
  {
    id: 'ozon-order', carrier: 'ozon', form: 'lat', re: /^(\d{8,10})-(\d{4})$/,
    confidence: 'medium', type: 'Номер заказа',
    build: (m) => ({
      number: m[0], display: m[0], urlNumber: `${m[0]}-1`,
      hints: [{
        code: 'ozon-order', level: 'warning',
        text: `Это номер заказа Ozon — добавьте -1 в конце: ${m[0]}-1. Если в заказе несколько посылок, у второй будет -2 и так далее.`,
      }],
    }),
  },
  {
    id: 'boxberry', carrier: 'boxberry', form: 'plain', re: /^(\d{4})(\d{4})(\d{4})BR$/,
    confidence: 'medium', type: 'Посылка',
    build: (m) => ({ number: m[0], display: `${m[1]}-${m[2]}-${m[3]}BR` }),
  },
  {
    id: 'fivepost', carrier: 'fivepost', form: 'plain', re: /^9999\d{10}$/,
    confidence: 'medium', type: 'Посылка в постамат или пункт выдачи',
    build: (m) => ({ number: m[0], display: groupDigits(m[0]) }),
  },
  {
    id: 'fivepost-p', carrier: 'fivepost', form: 'plain', re: /^P\d{10}$/,
    confidence: 'high', type: 'Посылка в постамат или пункт выдачи',
    build: (m) => ({ number: m[0], display: `${m[0].slice(0, 3)} ${m[0].slice(3, 6)} ${m[0].slice(6)}` }),
  },
  {
    id: 'cdek', carrier: 'cdek', form: 'plain', re: /^\d{10,11}$/,
    confidence: 'medium', type: 'Посылка',
    noHyphen: true,
    build: (m) => ({ number: m[0], display: groupDigits(m[0]) }),
  },
  {
    id: 'avito', carrier: 'avito', form: 'plain', re: /^\d{10}$/,
    confidence: 'medium', type: 'Собственная доставка Авито',
    noHyphen: true,
    build: (m) => ({ number: m[0], display: groupDigits(m[0]) }),
  },
  {
    id: 'cdek-short', carrier: 'cdek', form: 'plain', re: /^\d{7,9}$/,
    confidence: 'low', type: 'Посылка',
    noHyphen: true,
    build: (m) => ({ number: m[0], display: groupDigits(m[0]) }),
  },
  {
    id: 'dpd-ru', carrier: 'dpd', form: 'plain', re: /^RU\d{9,12}$/,
    confidence: 'low', type: 'Посылка',
    build: RAW,
  },
  {
    id: 'dpd-14', carrier: 'dpd', form: 'plain', re: /^\d{14}$/,
    confidence: 'low', type: 'Посылка',
    build: (m) => ({ number: m[0], display: groupDigits(m[0]) }),
  },
  {
    id: 'pony', carrier: 'pony', form: 'plain', re: /^PN\d{8}$/,
    confidence: 'low', type: 'Посылка',
    build: RAW,
  },

  // --- Грузовые ---------------------------------------------------------
  {
    // Только с дефисами, как в маске сайта. Голые 16 цифр — это чаще номер заказа магазина или карты
    // (суд над главным экраном, docs/court.md): такие номера ЖДЭ не отдаём.
    id: 'jde', carrier: 'jde', form: 'lat', re: /^(\d{4})-(\d{4})-(\d{4})-(\d{4})$/,
    confidence: 'medium', type: 'Экспедиторская расписка',
    build: (m) => {
      const d = `${m[1]}-${m[2]}-${m[3]}-${m[4]}`;
      return { number: m[0], display: d, urlNumber: d };
    },
  },
  {
    id: 'kit', carrier: 'kit', form: 'cyrPlain', re: /^[А-ЯЁ]{6}\d{10}$/,
    confidence: 'high', type: 'Номер груза',
    build: (m) => ({ number: m[0], display: `${m[0].slice(0, 6)} ${m[0].slice(6)}` }),
  },
  {
    id: 'pek', carrier: 'pek', form: 'cyrKeep',
    re: /^[А-ЯЁ]{2,}(?:\([А-ЯЁ]{1,4}\))?[А-ЯЁ]*-(?:\d{1,3}|\*)\/\d{4}$/,
    confidence: 'medium', type: 'Код груза',
    build: RAW,
  },
  {
    id: 'dellin', carrier: 'dellin', form: 'lat', re: /^(\d{2})-(\d{11})$/,
    confidence: 'medium', type: 'Груз',
    build: RAW,
  },
  {
    id: 'dellin-plain', carrier: 'dellin', form: 'plain', re: /^(\d{2})(\d{11})$/,
    confidence: 'low', type: 'Груз',
    // Правило для записи без дефиса: с дефисами (Ozon «30587846-0001-1») это другой номер.
    noHyphen: true,
    build: (m) => ({ number: `${m[1]}-${m[2]}`, display: `${m[1]}-${m[2]}` }),
  },
  {
    id: 'energia', carrier: 'energia', form: 'lat', re: /^(\d{3,4})-(\d{7})(R?)$/,
    confidence: 'medium', type: 'Экспедиторская расписка',
    build: RAW,
  },
  {
    id: 'baikal', carrier: 'baikal', form: 'cyr', re: /^[А-ЯЁ]{2}-\d{7}$/,
    confidence: 'low', type: 'Экспедиторская расписка',
    build: RAW,
  },
];
