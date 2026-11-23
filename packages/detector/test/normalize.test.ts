import { describe, expect, it } from 'vitest';
import { groupDigits, normalize } from '../src';

describe('normalize', () => {
  it('убирает пробелы, переносы, скобки, точки, кавычки и №', () => {
    expect(normalize(' «RA 123\n456 785.CN» (№) ').plain).toBe('RA123456785CN');
  });

  it('убирает слова «трек», «трек-номер», «заказ», «номер», «track»', () => {
    expect(normalize('Трек-номер: LO-835645864').lat).toBe('LO-835645864');
    expect(normalize('трек LO835645864').plain).toBe('LO835645864');
    expect(normalize('Номер заказа 30587846-0001').lat).toBe('30587846-0001');
    expect(normalize('Track number: 1Z662F416878787827').plain).toBe('1Z662F416878787827');
  });

  it('не трогает буквы внутри номера', () => {
    expect(normalize('RA260500636FI').plain).toBe('RA260500636FI');
  });

  it('заменяет кириллицу, похожую на латиницу, и приводит к верхнему регистру', () => {
    // «а» и «с» — кириллица; кириллическая «р» похожа на латинскую P, а не R
    expect(normalize('Rа260500636fi').plain).toBe('RA260500636FI');
    expect(normalize('LP123456789012345678сn').plain).toBe('LP123456789012345678CN');
    expect(normalize('р').plain).toBe('P');
    expect(normalize('LО-835645864').lat).toBe('LO-835645864');
  });

  it('заменяет длинное тире и минус на дефис, дефисы убирает в plain', () => {
    const f = normalize('24319409—0021−1');
    expect(f.lat).toBe('24319409-0021-1');
    expect(f.plain).toBe('2431940900211');
  });

  it('даёт кириллическую форму для КИТ и ПЭК', () => {
    // Латинские E K M C → кириллица; латинская B становится «В» (не «Б» — их не отличить)
    expect(normalize('ekbmck0123456789').cyrPlain).toBe('ЕКВМСК0123456789');
    expect(normalize('екбмск 0123456789').cyrPlain).toBe('ЕКБМСК0123456789');
    expect(normalize('НК(МР)ЧЛАБ-12/0406').cyrKeep).toBe('НК(МР)ЧЛАБ-12/0406');
  });

  it('замечает Авито, WB и слово «заказ»', () => {
    const f = normalize('с авито, заказ на вб');
    expect(f.mentionsAvito).toBe(true);
    expect(f.mentionsWb).toBe(true);
    expect(f.mentionsOrder).toBe(true);
    expect(normalize('RA260500636FI').mentionsWb).toBe(false);
  });
});

describe('groupDigits', () => {
  it.each([
    ['12345678', '1234 5678'],
    ['1150362728', '115 036 2728'],
    ['10274830162', '102 748 30162'],
    ['123456789012', '1234 5678 9012'],
    ['99990034507086', '999 900 3450 7086'],
    ['123456', '123456'],
  ])('%s → %s', (n, out) => {
    expect(groupDigits(n)).toBe(out);
  });
});
