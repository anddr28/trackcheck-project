export type Confidence = 'high' | 'medium' | 'low';

/** «Скорее всего» — первый кандидат с высокой или средней уверенностью, остальные — «возможно». */
export type Rank = 'likely' | 'possible';

export interface Country {
  /** Код ISO 3166-1 alpha-2 (совпадает с кодом страны в номерах UPU S10). */
  code: string;
  name: string;
}

export interface TrackingLink {
  label: string;
  url: string;
  /**
   * direct — страница сразу показывает статус по номеру из адреса;
   * page — страница отслеживания службы, номер нужно вставить вручную;
   * universal — сторонний универсальный трекер.
   */
  kind: 'direct' | 'page' | 'universal';
  /** Проверено ли, что ссылка открывается и принимает номер (см. docs/tracking-links.md). */
  verified: boolean;
}

export interface Hint {
  code: string;
  level: 'info' | 'warning';
  text: string;
}

export interface Candidate {
  carrierId: string;
  carrier: string;
  /** Название в родительном падеже: «сайт Почты России». */
  carrierGen: string;
  country: Country | null;
  /** Тип отправления или документа: «EMS», «накладная», «экспедиторская расписка»… */
  type: string | null;
  confidence: Confidence;
  rank: Rank;
  /** Чистый номер: то, что копирует кнопка «Копировать». */
  number: string;
  /** Номер в формате для показа. */
  display: string;
  /** Подписи рядом с номером: «принято в отделении с индексом 450051», «страна: Китай». */
  labels: string[];
  /** Первая ссылка — основная. */
  links: TrackingLink[];
  hints: Hint[];
  ruleId: string;
}

export interface DetectResult {
  input: string;
  /** Очищенный ввод латиницей без дефисов — ключ для истории и дедупликации. */
  query: string;
  candidates: Candidate[];
  hints: Hint[];
  /**
   * Универсальный трекер на случай, если служба не определилась.
   * null — когда это точно не трек (номер заказа, карта, дата): отправлять в трекер бессмысленно.
   */
  fallback: TrackingLink | null;
  /** Служба, названная в тексте рядом с номером и совпавшая с одним из кандидатов. */
  context: string | null;
  /**
   * Служба, названная в тексте, которой номер не подходит (например, «Почта России», а цифр 13).
   * Интерфейс тогда показывает предупреждение, а кандидатов сворачивает в «Также похоже на…».
   */
  named: string | null;
}

export interface DetectOptions {
  /** Текст вокруг номера (слова до и после него в сообщении) — ищем в нём названия служб. */
  context?: string;
}

export interface BatchResult {
  results: DetectResult[];
  hints: Hint[];
}
