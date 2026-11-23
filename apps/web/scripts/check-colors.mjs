// Проверка цветов из src/styles/tokens.css по правилам design-no-slop:
// границы OKLCH (нейтральные, мутная зона, акценты, неон), попадание в sRGB и контраст WCAG AA.
// Запуск: npm run check:colors -w @trackcheck/web

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { audit } from '../src/lib/color-audit.mjs';

const css = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8');
const report = audit(css);
const THEME = { light: 'светлая', dark: 'тёмная' };

for (const [brand, { themes }] of Object.entries(report.brands)) {
  console.log(`\n=== ${brand}`);
  for (const t of themes) {
    for (const c of t.colors) {
      if (c.problems.length) console.log(`  ✗ ${THEME[t.theme]} --${c.name} ${c.value}: ${c.problems.join(', ')}`);
    }
    for (const p of t.pairs) {
      console.log(`  ${p.ok ? '✓' : '✗'} ${THEME[t.theme].padEnd(7)} ${p.fg} на ${p.bg}: ${p.ratio.toFixed(2)} (нужно ${p.min})`);
    }
  }
}

console.log(report.errors ? `\nЗамечаний: ${report.errors}` : '\nЗамечаний нет');
process.exit(report.errors ? 1 : 0);
