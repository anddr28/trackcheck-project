// Очистка ввода. Из одной строки получаем несколько «форм»,
// и каждое правило детектора само выбирает, с какой формой работать.

const CYR_TO_LAT: Record<string, string> = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X',
};
const LAT_TO_CYR: Record<string, string> = Object.fromEntries(
  Object.entries(CYR_TO_LAT).map(([c, l]) => [l, c]),
);

/** Слова, которые люди вставляют вместе с номером: «Трек-номер: …», «Заказ № …», «track: …». */
const NOISE_WORD =
  /(?<!\p{L})(?:трек[-\s]?номер\p{L}*|трек\p{L}*|номер\p{L}*|заказ\p{L}*|отправлени\p{L}*|накладн\p{L}*|track(?:ing)?(?:\s*(?:number|no))?|order)(?!\p{L})/giu;

const DASHES = /[‐-―−]/g; // все виды тире и минус → дефис
const JUNK = /[\s.,:;"'`«»„“”‚‘’№#()[\]{}<>]/g;

/**
 * Названия служб, которые люди пишут рядом с номером («СДЭК 1150362728», «трек (Почта России)»).
 * Слово служит подсказкой, какая служба везёт посылку, и убирается из номера.
 * Только однозначные названия: «кит», «али» и подобные короткие слова не берём — слишком много ложных совпадений.
 */
export const CARRIER_WORDS: ReadonlyArray<readonly [string, string]> = [
  ['pochta', 'почт[аеуыой]{1,2}(?:\\s+росси[иия])?|pochta|russian\\s+post'],
  ['cdek', 'сд[эе]к\\p{L}*|cdek'],
  ['avito', 'авито|avito'],
  ['yandex', 'яндекс\\p{L}*(?:\\s+доставк\\p{L}*)?|yandex'],
  ['ozon', 'озон\\p{L}*|ozon'],
  ['fivepost', '5\\s?post|5\\s?пост|пят[её]рочк\\p{L}*'],
  ['boxberry', 'boxberry|боксберр?и'],
  ['dpd', 'dpd|дпд'],
  ['pek', 'пэк|pecom'],
  ['dellin', 'делов\\p{L}*\\s+лини\\p{L}*|dellin'],
  ['energia', 'энерги\\p{L}*'],
  ['baikal', 'байкал\\p{L}*(?:\\s+сервис\\p{L}*)?'],
  ['jde', 'желдор\\p{L}*|жде'],
  ['cainiao', 'cainiao|aliexpress|алиэкспресс\\p{L}*'],
  ['pony', 'pony\\s*express|пони\\s+экспресс\\p{L}*'],
  ['ups', 'ups'],
];

const CARRIER_RE = CARRIER_WORDS.map(([id, src]) => [id, new RegExp(`(?<![\\p{L}\\d])(?:${src})(?![\\p{L}])`, 'giu')] as const);

/** Какие службы названы в тексте. */
export function mentionedCarriers(text: string): string[] {
  return CARRIER_RE.filter(([, re]) => { re.lastIndex = 0; return re.test(text); }).map(([id]) => id);
}

function stripCarrierWords(text: string): string {
  return CARRIER_RE.reduce((s, [, re]) => s.replace(re, ' '), text);
}

export interface Forms {
  /** Латиница, верхний регистр, дефисы сохранены. */
  lat: string;
  /** Латиница без дефисов. */
  plain: string;
  /** Кириллица вместо похожих латинских букв, дефисы сохранены (для КИТ, Байкал Сервиса). */
  cyr: string;
  /** Кириллица без дефисов. */
  cyrPlain: string;
  /** Кириллица с сохранёнными скобками, дефисами, «/» и «*» (номера ПЭК). */
  cyrKeep: string;
  mentionsOrder: boolean;
  mentionsAvito: boolean;
  mentionsWb: boolean;
  /** Службы, названные в тексте рядом с номером. */
  carriers: string[];
}

export function toLatin(s: string): string {
  return s.replace(/[А-ЯЁ]/g, (ch) => CYR_TO_LAT[ch] ?? ch);
}

export function toCyrillic(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => LAT_TO_CYR[ch] ?? ch);
}

export function stripNoise(raw: string): string {
  // «№» убираем до NFKC: иначе он превращается в «No».
  return raw.replace(/№/g, ' ').normalize('NFKC').replace(NOISE_WORD, ' ').replace(DASHES, '-');
}

export function normalize(raw: string): Forms {
  const base = stripCarrierWords(stripNoise(raw)).toUpperCase();
  const compact = base.replace(JUNK, '');
  const keep = base.replace(/[\s.,:;"'`«»„“”‚‘’№#[\]{}<>]/g, '');
  const lat = toLatin(compact);
  const cyr = toCyrillic(compact);
  return {
    lat,
    plain: lat.replace(/-/g, ''),
    cyr,
    cyrPlain: cyr.replace(/-/g, ''),
    cyrKeep: toCyrillic(keep),
    mentionsOrder: /заказ|order/i.test(raw),
    mentionsAvito: /авито|avito/i.test(raw),
    mentionsWb: /wildberries|вайлдберриз|вайлдбериз|(?<!\p{L})(?:wb|вб)(?!\p{L})/iu.test(raw),
    carriers: mentionedCarriers(raw),
  };
}
