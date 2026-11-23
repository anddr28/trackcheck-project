import { describe, expect, it } from 'vitest';
import { detect, s10CheckDigit, s10Valid } from '../src';

const top = (input: string) => detect(input).candidates[0]!;
const carriers = (input: string) => detect(input).candidates.map((c) => c.carrierId);
const hintCodes = (input: string) => {
  const r = detect(input);
  return [...r.hints, ...r.candidates.flatMap((c) => c.hints)].map((h) => h.code);
};

/** Номер S10 с правильной контрольной цифрой. */
const s10 = (prefix: string, d8: string, cc: string) => `${prefix}${d8}${s10CheckDigit(d8)}${cc}`;

describe('UPU S10', () => {
  it('контрольная цифра сходится на реальных номерах', () => {
    expect(s10Valid('LO190039005CN')).toBe(true);
    expect(s10Valid('RA260500636FI')).toBe(true);
    expect(s10Valid('LA204383204US')).toBe(true);
  });

  it('страна, тип и формат для показа', () => {
    const c = top('RA260500636FI');
    expect(c.carrier).toBe('Posti');
    expect(c.country).toEqual({ code: 'FI', name: 'Финляндия' });
    expect(c.type).toBe('Заказное письмо или мелкий пакет');
    expect(c.display).toBe('RA 260500636 FI');
    expect(c.labels).toEqual(['тип: Заказное письмо или мелкий пакет', 'страна: Финляндия']);
    expect(c.confidence).toBe('high');
    expect(c.rank).toBe('likely');
  });

  it('российский S10 ведёт на Почту России', () => {
    const n = s10('EE', '12345678', 'RU');
    const c = top(n);
    expect(c.carrierId).toBe('pochta');
    expect(c.type).toBe('EMS (экспресс)');
    expect(c.links[0]!.url).toBe(`https://www.pochta.ru/tracking?barcode=${n}`);
  });

  it('иностранный S10: 17TRACK и ссылка на Почту России для входящих', () => {
    const c = top('LO190039005CN');
    expect(c.links[0]!.kind).toBe('universal');
    expect(c.links[1]!.url).toContain('pochta.ru/tracking?barcode=LO190039005CN');
  });

  it('отмечает Казпочту, Белпочту и Почту Узбекистана со ссылкой на сайт', () => {
    expect(top(s10('RR', '12345678', 'KZ')).carrier).toBe('Казпочта');
    expect(top(s10('RR', '12345678', 'BY')).carrier).toBe('Белпочта');
    const uz = top(s10('CP', '12345678', 'UZ'));
    expect(uz.carrier).toBe('Почта Узбекистана');
    expect(uz.links.some((l) => l.url === 'https://www.pochta.uz/')).toBe(true);
  });

  it('контрольная цифра не сходится — низкая уверенность и подсказка', () => {
    const c = top('RA260500637FI');
    expect(c.confidence).toBe('low');
    expect(c.rank).toBe('possible');
    expect(c.hints.map((h) => h.code)).toContain('s10-check');
  });

  it('лишняя или пропущенная цифра', () => {
    const r = detect('RA26050063FI');
    expect(r.candidates).toHaveLength(0);
    expect(r.hints[0]!.code).toBe('s10-length');
    expect(r.hints[0]!.text).toContain('8 цифр');
    expect(detect('RA2605006361FI').hints[0]!.text).toContain('10 цифр');
  });

  it('кириллические буквы в номере и пробелы', () => {
    expect(top('Rа 260500636 fi').number).toBe('RA260500636FI');
  });

  it('Yanwen (…YP) не путается с S10', () => {
    expect(carriers('VP493827589YP')).toEqual(['yanwen']);
  });
});

describe('Почта России, 14 цифр', () => {
  it('формат как на квитанции и индекс отделения', () => {
    const c = top('45005145009749');
    expect(c.carrierId).toBe('pochta');
    expect(c.display).toBe('450051 45 00974 9');
    expect(c.labels).toEqual(['принято в отделении с индексом 450051']);
    expect(c.links[0]).toMatchObject({ kind: 'direct', verified: true });
  });

  it('пересечение с DPD: Почта «скорее всего», DPD «возможно»', () => {
    const r = detect('45005145009749');
    expect(r.candidates.map((c) => [c.carrierId, c.rank])).toEqual([
      ['pochta', 'likely'],
      ['dpd', 'possible'],
    ]);
  });

  it('индексов на 0, 7, 8, 9 не бывает — это не Почта', () => {
    expect(carriers('05212345678901')).not.toContain('pochta');
    expect(carriers('99990034507086')).not.toContain('pochta');
  });
});

describe('российские службы', () => {
  it('5Post: 14 цифр на 9999', () => {
    const r = detect('99990034507086');
    expect(r.candidates[0]!.carrierId).toBe('fivepost');
    expect(r.candidates[0]!.links[0]!.url).toBe('https://fivepost.ru/tracking/?id=99990034507086');
  });

  it('11 цифр: только СДЭК, показ как у Авито 3-3-5', () => {
    const r = detect('10274830162');
    expect(r.candidates.map((c) => c.carrierId)).toEqual(['cdek']);
    expect(r.candidates[0]).toMatchObject({ rank: 'likely', display: '102 748 30162' });
  });

  it('10 цифр: СДЭК и собственная доставка Авито — оба «возможно», показ 3-3-4', () => {
    const r = detect('5111842155');
    expect(r.candidates.map((c) => [c.carrierId, c.rank, c.display])).toEqual([
      ['cdek', 'possible', '511 184 2155'],
      ['avito', 'possible', '511 184 2155'],
    ]);
  });

  it('Авито Доставка: ссылка на «Заказы», подсказка про приложение, без 17TRACK', () => {
    const c = detect('5111842155').candidates.find((x) => x.carrierId === 'avito')!;
    expect(c.links).toHaveLength(1);
    expect(c.links[0]).toMatchObject({ label: 'Открыть заказы на Авито', kind: 'page', verified: false });
    const codes = c.hints.map((h) => h.code);
    expect(codes).toContain('app');
    expect(codes).not.toContain('paste-on-site');
    expect(c.hints.find((h) => h.code === 'app')!.text).toBe('Смотрите в приложении Авито → Заказы');
  });

  it('17 цифр на 7000 — номер заказа Авито', () => {
    const r = detect('70000000459918575');
    expect(r.candidates).toHaveLength(0);
    expect(r.hints.map((h) => h.code)).toEqual(['avito-order']);
    expect(r.hints[0]!.text).toBe('Это номер заказа Авито. Трек-номер указан в карточке заказа в разделе Заказы.');
  });

  it('5Post: буква P (латинская или кириллическая) и 10 цифр', () => {
    for (const n of ['P0812437876', 'Р0812437876', 'p 081 243 7876']) {
      const c = top(n);
      expect(c).toMatchObject({ carrierId: 'fivepost', number: 'P0812437876', display: 'P08 124 37876', rank: 'likely' });
    }
    expect(top('P0812437876').links[0]!.url).toBe('https://fivepost.ru/tracking/?id=P0812437876');
  });

  it('8 цифр: СДЭК только «возможно»', () => {
    const c = top('12345678');
    expect(c.carrierId).toBe('cdek');
    expect(c.rank).toBe('possible');
  });

  it('Яндекс: дефис сохраняется, ссылка на /ndd/tracking/', () => {
    const c = top('lo 835645864');
    expect(c.number).toBe('LO-835645864');
    expect(c.display).toBe('LO-835645864');
    expect(c.links[0]!.url).toBe('https://dostavka.yandex.ru/ndd/tracking/?order_tracking_id=LO-835645864');
  });

  it('Ozon: номер отправления без изменений', () => {
    const c = top('30587846-0001-1');
    expect(c).toMatchObject({ carrierId: 'ozon', display: '30587846-0001-1', type: 'Номер отправления' });
    expect(c.hints.map((h) => h.code)).toContain('app');
  });

  it('Ozon: номер заказа без «-1» — подсказка и ссылка с -1', () => {
    const c = top('30587846-0001');
    expect(c.carrierId).toBe('ozon');
    expect(c.hints.find((h) => h.code === 'ozon-order')!.text).toContain('30587846-0001-1');
    expect(c.links[0]!.url).toContain('30587846-0001-1');
  });

  it('Boxberry показывается в своём виде', () => {
    expect(top('123456789012BR').display).toBe('1234-5678-9012BR');
  });

  it('служба без ссылки с номером — подсказка вставить номер на сайте', () => {
    const c = top('PN50181879');
    expect(c.carrierId).toBe('pony');
    expect(c.links[0]!.kind).toBe('page');
    expect(c.hints.map((h) => h.code)).toContain('paste-on-site');
  });
});

describe('грузовые', () => {
  // Было: «1234 5678 9012 3456» с пробелами. После суда ЖДЭ распознаётся только по маске сайта с дефисами:
  // 16 цифр без дефисов (и с пробелами, как у карт) — чаще номер заказа или карты (docs/court.md, изм. 2).
  it('ЖелДорЭкспедиция: маска 9999-9999-9999-9999 и в ссылке тоже', () => {
    const c = top('1234-5678-9012-3456');
    expect(c).toMatchObject({ carrierId: 'jde', display: '1234-5678-9012-3456', type: 'Экспедиторская расписка' });
    expect(c.links[0]!.url).toBe('https://i.jde.ru/track/?ttn=1234-5678-9012-3456');
  });

  it('КИТ: кириллица сохраняется, ссылка с track_code', () => {
    const c = top('екбмск0123456789');
    expect(c).toMatchObject({ carrierId: 'kit', number: 'ЕКБМСК0123456789', display: 'ЕКБМСК 0123456789' });
    expect(c.links[0]!.url).toBe(`https://tk-kit.ru/tracking?track_code=${encodeURIComponent('ЕКБМСК0123456789')}`);
  });

  it('ПЭК: скобки и дробь не теряются', () => {
    const c = top('нк(мр)чла б-12/0406');
    expect(c).toMatchObject({ carrierId: 'pek', number: 'НК(МР)ЧЛАБ-12/0406' });
  });

  it('Деловые Линии: с дефисом — средняя уверенность, без дефиса — низкая', () => {
    expect(top('19-00111003643')).toMatchObject({ carrierId: 'dellin', confidence: 'medium' });
    expect(top('1900111003643')).toMatchObject({ carrierId: 'dellin', confidence: 'low', display: '19-00111003643' });
  });

  it('Энергия и Байкал Сервис', () => {
    expect(top('0101-2157708').carrierId).toBe('energia');
    expect(top('MC-2111118')).toMatchObject({ carrierId: 'baikal', number: 'МС-2111118', confidence: 'low' });
  });
});

describe('Китай и международные', () => {
  it('Cainiao: подсказка про задержку LP', () => {
    const c = top('LP894106589032648021');
    expect(c.carrierId).toBe('cainiao');
    expect(c.hints.map((h) => h.code)).toContain('lp-delay');
  });

  it('YunExpress, 4PX, UPS', () => {
    expect(top('YT2311521272006292').carrierId).toBe('yunexpress');
    expect(top('4PX3000551543268CN').carrierId).toBe('4px');
    const ups = top('1z662f416878787827');
    expect(ups).toMatchObject({ carrierId: 'ups', display: '1Z 662F41 68 7878 7827' });
  });
});

describe('ошибки и подсказки', () => {
  it('номер заказа вместо трека', () => {
    expect(hintCodes('123456')).toContain('order-number');
    expect(hintCodes('Заказ ABC-77')).toContain('order-number');
  });

  it('Авито: подсказка про партнёров', () => {
    const r = detect('Авито: 45005145009749');
    expect(r.candidates[0]!.carrierId).toBe('pochta');
    const avito = r.hints.find((h) => h.code === 'avito')!;
    for (const name of ['Почта России', 'СДЭК', 'Boxberry', 'Яндекс Доставка', '5Post', 'DPD']) {
      expect(avito.text).toContain(name);
    }
  });

  it('Wildberries: подсказка про приложение', () => {
    expect(hintCodes('номер заказа wb 123')).toContain('wb-app');
  });

  it('ничего не распознано — универсальный трекер', () => {
    const r = detect('ZZ-ABC');
    expect(r.candidates).toHaveLength(0);
    expect(r.fallback!.url).toBe('https://t.17track.net/ru#nums=ZZABC');
  });

  it('пустой ввод', () => {
    const r = detect('   ');
    expect(r.candidates).toHaveLength(0);
    expect(r.hints).toHaveLength(0);
  });
});
