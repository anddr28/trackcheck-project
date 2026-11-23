import { describe, expect, it } from 'vitest';
import { detectAll } from '../src';

const numbers = (text: string) => detectAll(text).results.map((r) => r.candidates[0]?.number ?? r.query);

describe('detectAll — несколько номеров в тексте', () => {
  it('кусок переписки', () => {
    const text = `Привет! Отправила тебе две посылки:
      первая — трек RA260500636FI,
      вторая СДЭК: 1150362728.
      И ещё Ozon 30587846-0001-1 пришёл вчера.`;
    expect(numbers(text)).toEqual(['RA260500636FI', '1150362728', '30587846-0001-1']);
  });

  it('номера, напечатанные с пробелами', () => {
    const text = 'Квитанция: 450051 45 00974 9; международный RA 260500636 FI';
    expect(numbers(text)).toEqual(['45005145009749', 'RA260500636FI']);
  });

  it('не принимает телефоны и даты за трек-номера', () => {
    const text = 'Звоните +7 916 123-45-67 до 22.11.2026, посылка LO-835645864';
    expect(numbers(text)).toEqual(['LO-835645864']);
  });

  it('повторы убираются', () => {
    expect(numbers('LO-835645864, LO835645864')).toEqual(['LO-835645864']);
  });

  it('один номер с низкой уверенностью всё равно показывается', () => {
    const r = detectAll('12345678');
    expect(r.results).toHaveLength(1);
    expect(r.results[0]!.candidates[0]!.rank).toBe('possible');
  });

  it('подсказка Авито — общая для всего текста', () => {
    const r = detectAll('с Авито пришли треки 45005145009749 и 1150362728');
    expect(r.hints.map((h) => h.code)).toEqual(['avito']);
    expect(r.results).toHaveLength(2);
    expect(r.results.every((x) => x.hints.every((h) => h.code !== 'avito'))).toBe(true);
  });

  it('S10 с опечаткой в тексте не теряется', () => {
    const r = detectAll('трек RA26050063FI, проверь');
    expect(r.results[0]!.hints[0]!.code).toBe('s10-length');
  });

  it('номера из кабинета Авито в одном сообщении', () => {
    const text = 'Авито: СДЭК 102 748 30162, 5Post P08 124 37876, доставка Авито 511 184 2155, заказ 70000000459918575';
    const r = detectAll(text);
    expect(r.results.map((x) => x.query)).toEqual(['10274830162', 'P0812437876', '5111842155', '70000000459918575']);
    expect(r.results[3]!.hints[0]!.code).toBe('avito-order');
  });

  it('пустой текст', () => {
    expect(detectAll('').results).toEqual([]);
  });
});
