import { describe, expect, it } from 'vitest';
import { CARRIERS, RULES, detect } from '../src';
import { RULE_META } from '../src/rules-meta';

describe('каждое правило', () => {
  it('у каждого правила есть запись в rules-meta.ts, лишних записей нет', () => {
    expect(Object.keys(RULE_META).sort()).toEqual(RULES.map((r) => r.id).sort());
  });

  for (const rule of RULES) {
    const meta = RULE_META[rule.id] ?? { sources: [], examples: [] };
    describe(rule.id, () => {
      it('имеет источник и примеры', () => {
        expect(meta.sources.length).toBeGreaterThan(0);
        expect(meta.examples.length).toBeGreaterThan(0);
        for (const s of meta.sources) expect(s).toMatch(/^https:\/\//);
      });

      it('ссылается на существующую службу', () => {
        if (rule.carrier !== 'post') expect(CARRIERS[rule.carrier]).toBeDefined();
      });

      for (const ex of meta.examples) {
        it(`распознаёт пример ${ex}`, () => {
          const r = detect(ex);
          expect(r.candidates.map((c) => c.ruleId)).toContain(rule.id);
        });
      }
    });
  }
});

describe('каталог служб', () => {
  it('у каждой службы есть slug и сайт', () => {
    for (const c of Object.values(CARRIERS)) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      expect(c.site).toMatch(/^https:\/\//);
    }
  });

  it('slug уникальны', () => {
    const slugs = Object.values(CARRIERS).map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
