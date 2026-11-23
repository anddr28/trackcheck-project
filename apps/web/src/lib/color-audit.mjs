// Разбор src/styles/tokens.css и проверка цветов по правилам design-no-slop.
// Используется скриптом scripts/check-colors.mjs и страницей-образцом /palette/.

import { clampChroma, formatHex, inGamut, parse, wcagContrast } from 'culori';

function blocks(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let m;
  while ((m = re.exec(clean))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

/** --name: light-dark(A, B) | oklch(...) | var(--other) → { name: [light, dark] } */
function colorTokens(body) {
  const res = {};
  for (const m of body.matchAll(/--([\w-]+):\s*light-dark\(\s*(oklch\([^)]*\))\s*,\s*(oklch\([^)]*\))\s*\)/g)) {
    res[m[1]] = [m[2], m[3]];
  }
  for (const m of body.matchAll(/--([\w-]+):\s*(oklch\([^)]*\))\s*;/g)) {
    if (!res[m[1]]) res[m[1]] = [m[2], m[2]];
  }
  for (const m of body.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)\s*;/g)) {
    if (res[m[2]]) res[m[1]] = res[m[2]];
  }
  return res;
}

/** Правила design-no-slop для одного цвета OKLCH. Возвращает список нарушений. */
export function colorProblems(str) {
  const c = parse(str);
  const L = c.l;
  const C = c.c ?? 0;
  const h = c.h ?? 0;
  const neutralMax = h >= 200 && h <= 290 ? 0.045 : 0.025;
  const yellow = h >= 80 && h <= 115;
  const problems = [];
  if (C > 0.23) problems.push('неон: C > 0.23');
  if (L > 0.78 && C > 0.14 && !yellow) problems.push('неон: L > 0.78 и C > 0.14');
  const lightBg = L >= 0.92 && C <= 0.04;
  const darkBg = L <= 0.36;
  if (!lightBg && !darkBg && C > neutralMax && C < 0.08) {
    problems.push(`мутная зона: L ${L.toFixed(2)}, C ${C.toFixed(3)}`);
  }
  if (!inGamut('rgb')(c)) problems.push('вне sRGB');
  return problems;
}

export const PAIRS = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5], ['text', 'warn-soft', 4.5],
  ['text-muted', 'bg', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'surface-2', 4.5],
  ['brand', 'bg', 4.5], ['brand', 'surface', 4.5], ['on-brand', 'brand', 4.5], ['brand-ink', 'brand-soft', 4.5],
  ['success', 'surface', 4.5],
  ['border-input', 'bg', 3], ['border-input', 'surface', 3], ['warn-line', 'warn-soft', 3],
];

export const hex = (str) => formatHex(clampChroma(parse(str), 'oklch'));
export const contrast = (a, b) => wcagContrast(parse(a), parse(b));

/**
 * Полный разбор: для каждого варианта бренда и каждой темы — цвета с нарушениями и пары контраста.
 * @returns {{ brands: Record<string, { tokens: Record<string,[string,string]>, themes: Array<{ theme: 'light'|'dark', colors: any[], pairs: any[] }> }>, errors: number }}
 */
export function audit(css) {
  const all = blocks(css);
  const base = Object.assign({}, ...all.filter((b) => b.selector === ':root').map((b) => colorTokens(b.body)));
  const result = { brands: {}, errors: 0 };
  const variants = all
    .map((b) => [/data-brand='(\w+)'/.exec(b.selector)?.[1], b])
    .filter(([id]) => id);
  // Без вариантов бренда — проверяем токены :root как единственную палитру.
  if (variants.length === 0) variants.push(['main', { body: '' }]);
  for (const [id, b] of variants) {
    const tokens = { ...base, ...colorTokens(b.body) };
    const themes = [];
    for (const [i, theme] of [[0, 'light'], [1, 'dark']]) {
      const colors = Object.entries(tokens).map(([name, v]) => ({ name, value: v[i], hex: hex(v[i]), problems: colorProblems(v[i]) }));
      const pairs = PAIRS.filter(([fg, bg]) => tokens[fg] && tokens[bg]).map(([fg, bg, min]) => {
        const ratio = contrast(tokens[fg][i], tokens[bg][i]);
        return { fg, bg, min, ratio: Math.round(ratio * 100) / 100, ok: ratio >= min };
      });
      result.errors += colors.filter((c) => c.problems.length).length + pairs.filter((p) => !p.ok).length;
      themes.push({ theme, colors, pairs });
    }
    result.brands[id] = { tokens, themes };
  }
  return result;
}
