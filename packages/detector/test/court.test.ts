// Проблемные номера из суда над главным экраном (docs/court.md, изменение 2).
import { describe, expect, it } from 'vitest';
import { detect, detectAll } from '../src';

const codes = (r: ReturnType<typeof detect>) => [...r.hints, ...r.candidates.flatMap((c) => c.hints)].map((h) => h.code);

describe('суд: контекст — служба названа рядом с номером', () => {
  it('«СДЭК 1150362728» → СДЭК «скорее всего», Авито только «возможно»', () => {
    const r = detect('СДЭК 1150362728');
    expect(r.context).toBe('cdek');
    expect(r.candidates.map((c) => [c.carrierId, c.rank])).toEqual([
      ['cdek', 'likely'],
      ['avito', 'possible'],
    ]);
  });

  it('SMS «Ваш заказ СДЭК 1150362728 …» в пакетном разборе — то же', () => {
    const b = detectAll('Ваш заказ СДЭК 1150362728 передан в доставку');
    expect(b.results).toHaveLength(1);
    expect(b.results[0]!.candidates[0]).toMatchObject({ carrierId: 'cdek', rank: 'likely' });
  });

  it('сообщение дочери с «(Почта России)» → Почта, DPD не показываем', () => {
    const b = detectAll('Мама, вот трек: 450051 45 00974 4 (Почта России)');
    expect(b.results).toHaveLength(1);
    expect(b.results[0]!.candidates.map((c) => c.carrierId)).toEqual(['pochta']);
  });

  it('«Авито 5111842155» → Авито Доставка первой', () => {
    expect(detect('Авито 5111842155').candidates[0]).toMatchObject({ carrierId: 'avito', rank: 'likely' });
  });

  it('у каждого номера в тексте — свой контекст', () => {
    const b = detectAll('СДЭК 1150362728, Авито 5111842155');
    expect(b.results.map((r) => r.candidates[0]!.carrierId)).toEqual(['cdek', 'avito']);
  });

  it('названа служба, которой нет среди кандидатов — ничего не меняем', () => {
    const r = detect('Почта 1150362728');
    expect(r.context).toBeNull();
    expect(r.candidates.every((c) => c.rank === 'possible')).toBe(true);
  });

  it('без названия службы 10 цифр — по-прежнему ничья', () => {
    expect(detect('1150362728').candidates.every((c) => c.rank === 'possible')).toBe(true);
  });
});

describe('суд: ошибки ввода', () => {
  it('Почта с пропущенной цифрой «450051 45 0974 4» → подсказка про 14 цифр, Деловые Линии только «возможно»', () => {
    const r = detect('450051 45 0974 4');
    expect(r.hints[0]).toMatchObject({ code: 'pochta-length' });
    expect(r.hints[0]!.text).toContain('14 цифр, а здесь 13');
    expect(r.candidates.every((c) => c.rank === 'possible')).toBe(true);
  });

  it('Почта с лишней цифрой → подсказка про лишнюю', () => {
    expect(detect('450051 45 00974 44').hints[0]!.text).toContain('лишней');
  });

  it('в тексте пропущенная цифра тоже даёт подсказку', () => {
    const b = detectAll('Мама, вот трек: 450051 45 0974 4');
    expect(b.results[0]!.hints.map((h) => h.code)).toContain('pochta-length');
  });

  it('17 цифр на 7000 → предупреждение первым, 17TRACK не предлагаем', () => {
    const r = detect('70000000459918575');
    expect(r.hints[0]!.code).toBe('avito-order');
    expect(r.fallback).toBeNull();
  });
});

describe('суд: ЖелДорЭкспедиция больше не ловит голые 16 цифр и карты', () => {
  it('номер заказа «8187654321098765» → не ЖДЭ, подсказка, без 17TRACK', () => {
    const r = detect('8187654321098765');
    expect(r.candidates.map((c) => c.carrierId)).not.toContain('jde');
    expect(codes(r)).toContain('sixteen-digits');
    expect(r.fallback).toBeNull();
  });

  it.each(['1234567890123456', '1234 5678 9012 3456', '0000111122223333'])('голые 16 цифр «%s» → не ЖДЭ', (n) => {
    expect(detect(n).candidates.map((c) => c.carrierId)).not.toContain('jde');
  });

  it.each(['4111111111111111', '4111 1111 1111 1111', '2200123456789019', '5500000000000004'])(
    'номер карты «%s» → не ЖДЭ, подсказка про карту, без 17TRACK',
    (card) => {
      const r = detect(card);
      expect(r.candidates.map((c) => c.carrierId)).not.toContain('jde');
      expect(codes(r)).toContain('looks-like-card');
      expect(r.fallback).toBeNull();
    },
  );

  it('карта, записанная через дефисы, — ЖДЭ только «возможно» и с подсказкой про карту', () => {
    const r = detect('4111-1111-1111-1111');
    expect(codes(r)).toContain('looks-like-card');
    expect(r.candidates.every((c) => c.confidence === 'low' && c.rank === 'possible')).toBe(true);
  });

  it('номер отправления Ozon с дефисами — только Ozon (без «Деловых Линий» из тех же 13 цифр)', () => {
    expect(detect('30587846-0001-1').candidates.map((c) => c.carrierId)).toEqual(['ozon']);
  });

  it('номер ЖДЭ по маске сайта по-прежнему распознаётся', () => {
    expect(detect('1234-5678-9012-3456').candidates[0]).toMatchObject({ carrierId: 'jde', rank: 'likely' });
  });
});

describe('служба названа в тексте, а номер ей не подходит (замечание к этапу 2)', () => {
  it('«Почта России 450051 45 0974 4» → named = pochta, предупреждение про длину первым', () => {
    const r = detect('Почта России 450051 45 0974 4');
    expect(r.named).toBe('pochta');
    expect(r.hints[0]!.code).toBe('pochta-length');
    expect(r.candidates.every((c) => c.rank === 'possible')).toBe(true);
  });

  it('в сообщении «…(Почта России)» с пропущенной цифрой — то же', () => {
    const b = detectAll('Мама, вот трек: 450051 45 0974 4 (Почта России)');
    expect(b.results[0]!.named).toBe('pochta');
    expect(b.results[0]!.hints[0]!.code).toBe('pochta-length');
  });

  it('«Почта 1150362728» (10 цифр) → предупреждение, что у Почты 14 цифр', () => {
    const r = detect('Почта 1150362728');
    expect(r.named).toBe('pochta');
    expect(r.hints.map((h) => h.code)).toContain('pochta-length');
  });

  it('«СДЭК 115036272811» (12 цифр) → предупреждение про 10–11 цифр СДЭК', () => {
    const r = detect('СДЭК 115036272811');
    expect(r.named).toBe('cdek');
    expect(r.hints.map((h) => h.code)).toContain('cdek-length');
  });

  it('площадка («с Авито») не считается несовпадением: Почта остаётся «скорее всего»', () => {
    const r = detectAll('с Авито пришёл трек 45005145009744').results[0]!;
    expect(r.named).toBeNull();
    expect(r.candidates[0]).toMatchObject({ carrierId: 'pochta', rank: 'likely' });
  });

  it('в кандидате есть название в родительном падеже', () => {
    expect(detect('45005145009744').candidates[0]!.carrierGen).toBe('Почты России');
  });
});
