// Форматирование номера для показа. Кнопка «Копировать» всегда берёт чистый номер.

/**
 * Цифровой номер группами по 3–4 цифры, без одиночных хвостов:
 * 8 → 4 4, 10 → 3 3 4, 11 → 3 3 5, 12 → 4 4 4, 13 → 3 3 3 4, 14 → 3 3 4 4.
 * 10 и 11 цифр — как в кабинете Авито («511 135 9155», «102 746 70102»).
 */
export function groupDigits(n: string): string {
  if (!/^\d+$/.test(n) || n.length <= 6) return n;
  const len = n.length;
  let sizes: number[];
  if (len === 11) {
    sizes = [3, 3, 5];
  } else if (len % 4 === 0) {
    sizes = Array(len / 4).fill(4);
  } else {
    const fours = len % 3 === 0 ? 0 : len % 3 === 1 ? 1 : 2;
    sizes = [...Array((len - fours * 4) / 3).fill(3), ...Array(fours).fill(4)];
  }
  const out: string[] = [];
  let i = 0;
  for (const s of sizes) {
    out.push(n.slice(i, i + s));
    i += s;
  }
  return out.join(' ');
}

/** Почта России, 14 цифр: как на квитанции — «450051 45 00974 9». */
export function formatPochta(n: string): string {
  return `${n.slice(0, 6)} ${n.slice(6, 8)} ${n.slice(8, 13)} ${n.slice(13)}`;
}

/** UPU S10: «RA 123456789 CN». */
export function formatS10(n: string): string {
  return `${n.slice(0, 2)} ${n.slice(2, 11)} ${n.slice(11)}`;
}
