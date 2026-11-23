// История проверенных номеров — только в этом браузере (localStorage), на сервер ничего не уходит.
// Все обращения к хранилищу в try/catch: в приватном режиме или при запрете хранилище недоступно,
// тогда история просто не сохраняется.

export interface HistoryItem {
  /** Чистый номер (как у службы, с дефисами у Ozon и ЖДЭ). */
  n: string;
  /** Номер для показа. */
  d: string;
  /** id службы и её название; null — служба не определилась. */
  c: string | null;
  name: string | null;
  /** Когда проверяли последний раз (мс). */
  t: number;
  /** Подпись человека: «наушники с Али». */
  label?: string;
}

const KEY = 'trackcheck:history:v1';
const MAX = 100;

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is HistoryItem => typeof x?.n === 'string' && typeof x?.t === 'number') : [];
  } catch {
    return [];
  }
}

function save(list: HistoryItem[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}

/** Добавить или поднять наверх; подпись сохраняется. */
export function remember(items: Array<Omit<HistoryItem, 't' | 'label'>>): HistoryItem[] {
  const list = loadHistory();
  const now = Date.now();
  for (const item of [...items].reverse()) {
    const i = list.findIndex((x) => x.n === item.n);
    const label = i >= 0 ? list[i]!.label : undefined;
    if (i >= 0) list.splice(i, 1);
    list.unshift({ ...item, t: now, ...(label ? { label } : {}) });
  }
  save(list);
  return list;
}

export function setLabel(n: string, label: string): HistoryItem[] {
  const list = loadHistory();
  const item = list.find((x) => x.n === n);
  if (item) {
    const clean = label.trim().slice(0, 60);
    if (clean) item.label = clean;
    else delete item.label;
    save(list);
  }
  return list;
}

export function forget(n: string): HistoryItem[] {
  const list = loadHistory().filter((x) => x.n !== n);
  save(list);
  return list;
}

export function clearHistory(): HistoryItem[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* хранилище недоступно */
  }
  return [];
}
