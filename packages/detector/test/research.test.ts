// Тесты по итогам docs/formats-research.md.
// В реальных номерах изменены цифры; формат и контрольная цифра сохранены.
import { describe, expect, it } from 'vitest';
import { ORDER_PATTERNS, detect, detectAll, luhnValid, pochtaCheckDigit, pochtaValid } from '../src';

const top = (input: string) => detect(input).candidates[0]!;
const codes = (input: string) => {
  const r = detect(input);
  return [...r.hints, ...r.candidates.flatMap((c) => c.hints)].map((h) => h.code);
};

describe('Почта России: контрольная цифра ШПИ', () => {
  it('пример расчёта из Википедии: 1421171600738 → 9', () => {
    expect(pochtaCheckDigit('1421171600738')).toBe(9);
  });

  it('реальный номер на 8 (1track.ru) проходит проверку', () => {
    expect(pochtaValid('80092840658820')).toBe(true);
  });

  it('индекс отделения и верная контрольная цифра — высокая уверенность', () => {
    expect(top('45005145009744')).toMatchObject({ carrierId: 'pochta', confidence: 'high', rank: 'likely' });
  });

  it('индекс отделения, цифра не сходится — средняя уверенность и подсказка', () => {
    // Пример из справки Почты 45005145009749 — иллюстрация, его контрольная цифра не сходится.
    const c = top('45005145009749');
    expect(c).toMatchObject({ carrierId: 'pochta', confidence: 'medium', rank: 'likely' });
    expect(c.hints.map((h) => h.code)).toContain('pochta-check');
  });

  it('номер на 8 с верной цифрой — Почта, заранее оформленное отправление', () => {
    const c = top('80092841278829');
    expect(c).toMatchObject({ carrierId: 'pochta', confidence: 'high', display: '800928 41 27882 9' });
    expect(c.type).toContain('оформленная заранее');
    expect(c.labels).toEqual(['номер из диапазона для заранее оформленных посылок']);
  });

  it('номер на 8 с неверной цифрой — только «возможно»', () => {
    const r = detect('80092841278820');
    expect(r.candidates.every((c) => c.rank === 'possible')).toBe(true);
    expect(r.candidates.find((c) => c.carrierId === 'pochta')!.confidence).toBe('low');
  });

  it('номера на 0, 7, 9 по-прежнему не Почта', () => {
    for (const n of ['05212345678901', '71234567890123', '99990034507086']) {
      expect(detect(n).candidates.map((c) => c.carrierId)).not.toContain('pochta');
    }
  });
});

describe('S10: буква L с декабря 2025', () => {
  it('L — мелкий пакет или бандероль', () => {
    expect(top('LO190039005CN').type).toBe('Мелкий пакет или бандероль');
  });
});

describe('СДЭК: пример из документации API', () => {
  it('1109932346', () => {
    expect(detect('1109932346').candidates.map((c) => c.carrierId)).toEqual(['cdek', 'avito']);
  });
});

describe('номера заказов площадок', () => {
  for (const p of ORDER_PATTERNS) {
    it(`${p.marketplace}: есть источники и примеры распознаются`, () => {
      expect(p.sources.length).toBeGreaterThanOrEqual(2);
      for (const ex of p.examples) {
        const r = detect(ex);
        expect(r.candidates).toHaveLength(0);
        expect(r.hints.map((h) => h.code)).toEqual([p.id]);
      }
    });
  }

  it('Temu: подсказка, где искать трек', () => {
    expect(detect('PO-211-123456789012345').hints[0]!.text).toContain('Temu');
    expect(codes('po211123456789012345')).toEqual(['temu-order']);
  });

  it('номер заказа Ozon — кандидат Ozon с подсказкой добавить -1', () => {
    expect(codes('28829113-0131')).toContain('ozon-order');
  });
});

describe('ложные срабатывания', () => {
  it('проверка Луна', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('2200123456789019')).toBe(true);
    expect(luhnValid('1234567890123456')).toBe(false);
  });

  it('банковская карта (16 цифр, Луна, префикс Мир/Visa/MC) — не трек с уверенностью', () => {
    for (const card of ['4111 1111 1111 1111', '2200123456789019', '5500000000000004']) {
      const r = detect(card);
      expect(r.hints.map((h) => h.code)).toContain('looks-like-card');
      expect(r.candidates.every((c) => c.confidence === 'low' && c.rank === 'possible')).toBe(true);
    }
  });

  // Было: «16 цифр без признаков карты — ЖелДорЭкспедиция, средняя уверенность».
  // После суда голые 16 цифр не отдаём ЖДЭ (свидетель: номер заказа AliExpress → «ЖДЭ»), см. court.test.ts.
  it('16 цифр без признаков карты — не трек, подсказка про номер заказа', () => {
    const r = detect('1234567890123456');
    expect(r.candidates).toHaveLength(0);
    expect(r.hints.map((h) => h.code)).toEqual(['sixteen-digits']);
  });

  it('мобильный телефон — не трек с уверенностью', () => {
    for (const phone of ['89161234567', '79161234567', '9161234567', '8 (916) 123-45-67']) {
      const r = detect(phone);
      expect(r.hints.map((h) => h.code)).toContain('looks-like-phone');
      expect(r.candidates.every((c) => c.confidence === 'low')).toBe(true);
    }
  });

  it('телефон с +7 не даёт кандидатов', () => {
    expect(detect('+7 916 123-45-67').candidates).toHaveLength(0);
  });

  it('11 цифр СДЭК (не на 79/89) не считаются телефоном', () => {
    expect(top('10274830162')).toMatchObject({ carrierId: 'cdek', confidence: 'medium' });
  });

  it('дата — без кандидатов', () => {
    for (const d of ['22.11.2026', '01/12/25']) {
      const r = detect(d);
      expect(r.candidates).toHaveLength(0);
      expect(r.hints.map((h) => h.code)).toEqual(['looks-like-date']);
    }
  });

  it('суммы не распознаются', () => {
    expect(detect('1 250,00 ₽').candidates).toHaveLength(0);
    expect(detect('15000 руб').candidates).toHaveLength(0);
  });

  it('в тексте: ИНН, телефон, артикул, карта, дата, сумма пропускаются', () => {
    const text = `ИНН 7707083893, тел. 9161234567, артикул 123456789,
      карта 4111111111111111, оплачено 22.11.2026 на сумму 15000 руб.
      Трек: 1150362728`;
    expect(detectAll(text).results.map((r) => r.query)).toEqual(['1150362728']);
  });
});
