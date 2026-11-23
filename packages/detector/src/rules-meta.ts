// Источники, примеры и оговорки к правилам из rules.ts. В браузер не попадает:
// нужен тестам и документации (каждое правило обязано иметь источник и примеры).

export const S10_SOURCES = [
  'https://www.upu.int/en/postal-solutions/programmes-services/standards (UPU S10)',
  'https://1track.ru/postservice/boxberry (реальные номера LO190039005CN, RA260500636FI, LA204383204US — контрольная цифра сходится)',
];
export const OZON_SOURCES = [
  'https://docs.ozon.ru/api/seller/ (posting_number в примерах API: 24319409-0021-1, 39268230-0002-3)',
  'https://salacoste.github.io/ozon-daytona-seller-api/daytona-ozon-api-docs/categories/16-fbo.html',
  'https://gdeposylka.ru/courier/ocourier (28829113-0131-1: первые две части — номер заказа, последняя цифра — номер упаковки)',
];

export interface RuleMeta {
  sources: string[];
  /** Примеры номеров из источников: тесты проверяют, что они распознаются этим правилом. */
  examples: string[];
  /** Пояснение, если формат подтвердить не удалось. */
  caveat?: string;
}

export const RULE_META: Record<string, RuleMeta> = {
  'yanwen': {
    sources: [
      'https://parceldetect.com/faq/yanwen-logistics-tracking-number-format',
      'https://www.ship24.com/couriers/yanwen-tracking/yanwen-tracking-number',
    ],
    examples: ['VP493827589YP', 'UH183870291YP'],
  },
  's10': {
    sources: S10_SOURCES,
    examples: ['LO190039005CN', 'RA260500636FI', 'LA204383204US'],
  },
  'cainiao': {
    sources: [
      'https://www.trackingmore.com/cainiao-tracking.html (LP894106589032648021, LP9460364935673925CN)',
      'https://ship24.com/couriers/cainiao-tracking',
    ],
    examples: ['LP894106589032648021', 'LP9460364935673925CN', 'LP12345678901234'],
  },
  'yunexpress': {
    sources: [
      'https://www.ship24.com/couriers/yunexpress-tracking/yunexpress-tracking-number',
      'https://carriers.aftership.com/yunexpress',
    ],
    examples: ['YT2311521272006292', 'YT1234567890123456'],
  },
  '4px': {
    sources: ['https://parcelpanel.com/couriers/4px (4PX3000551543268CN)', 'https://www.17track.net/en/carriers/4px'],
    examples: ['4PX3000551543268CN'],
  },
  'ups': {
    sources: ['https://en.wikipedia.org/wiki/Tracking_number', 'https://parceldetect.com/faq/ups-tracking-number-format'],
    examples: ['1Z662F416878787827', '1Z001985YW96579840'],
  },
  'pochta-14': {
    sources: [
      'https://ru.wikipedia.org/wiki/Почтовый_идентификатор (14 цифр: индекс места приёма, месяц, номер, контрольная цифра; для посылок, оформленных на сайте Почты, — «отдельный диапазон индексов»)',
      'https://info.pochta.ru/support/popular-questions/tracking/products-location (внутренние номера — 14 цифр)',
      'https://1track.ru/postservice/boxberry (реальный номер 80092840658820 — контрольная цифра сходится)',
      'https://cdek.blog/otslezhivanie/pochta-rossii/ (пример 80080012345678)',
    ],
    examples: ['45005145009744', '450051 45 00974 4', '14211716007389', '80092840658820'],
    caveat: 'Индексы отделений начинаются с 1–6; номера на 8 — диапазон для заранее оформленных посылок (интернет-магазины, «Посылка онлайн»). Официального описания диапазона на 8 нет, поэтому номер на 8 без верной контрольной цифры — низкая уверенность.',
  },
  'yandex': {
    sources: [
      'https://dostavka.yandex.ru/ndd/tracking/ (подсказка в поле: «Например, LO-835645864»)',
      'https://www.moysklad.ru/integratsii/apps/yandextrack-noviteam-noviteam/ (LO-1234567890)',
    ],
    examples: ['LO-835645864', 'LO835645864', 'LO-1234567890'],
  },
  'ozon': {
    sources: OZON_SOURCES,
    examples: ['24319409-0021-1', '39268230-0002-3', '30587846-0001-1'],
    caveat: 'Примеры в API — 8 цифр в первой части; 9–10 цифр допускаем на случай роста номеров.',
  },
  'ozon-order': {
    sources: OZON_SOURCES,
    examples: ['30587846-0001'],
  },
  'boxberry': {
    sources: [
      'https://1track.ru/postservice/boxberry («Стандартный формат … XXXX-XXXX-XXXXBR»)',
      'https://www.4tracking.net/en/carriers/boxberry',
    ],
    examples: ['1234-5678-9012BR', '123456789012BR'],
    caveat: 'Источники сторонние, официальной страницы с форматом не нашли.',
  },
  'fivepost': {
    sources: [
      'https://5post-dostavka.ru/otslezhivanie/ (14 цифр, начинаются с 9999: 99990002955823)',
      'https://track24.ru/service/fivepost/tracking/99990034507086',
    ],
    examples: ['99990002955823', '99990034507086'],
    caveat: 'Источники сторонние, один из них 2020 года.',
  },
  'fivepost-p': {
    sources: ['https://www.avito.ru/ (реальный номер 5Post в кабинете Авито, показ «P08 121 51876»; в примере цифры изменены)'],
    examples: ['P0812437876', 'Р0812437876'],
    caveat: 'Второй формат 5Post. Кириллическая «Р» заменяется на латинскую при очистке ввода.',
  },
  'cdek': {
    sources: [
      'https://parcelsapp.com/ru/carriers/cdek (внутренний номер: 1150362728)',
      'https://www.ordertracker.com/uk/carriers/cdek (10 цифр, часто начинается с 14 или 16)',
      'https://www.avito.ru/ (реальный номер СДЭК из 11 цифр в кабинете Авито, показ «102 746 70102»; в примере цифры изменены)',
      'https://apidoc.cdek.ru/ (cdek_number — номер заказа СДЭК; примеры в документации и интеграциях: 1109932346, 1106207812)',
    ],
    examples: ['1150362728', '10274830162', '1109932346'],
  },
  'avito': {
    sources: ['https://www.avito.ru/ (реальный номер из кабинета Авито, показ «511 135 9155»; в примере цифры изменены)'],
    examples: ['5111842155'],
    caveat: 'Один реальный пример. Формат совпадает со СДЭК, поэтому показываем обоих кандидатов.',
  },
  'cdek-short': {
    sources: ['https://parcelsapp.com/ru/carriers/cdek (номера накладной из 7–10 цифр)'],
    examples: ['12345678'],
    caveat: 'Короткие номера СДЭК встречаются, но так же выглядят номера заказов магазинов.',
  },
  'dpd-ru': {
    sources: ['https://www.ship24.com/ru/couriers/dpd-tracking/dpd-ru (в России встречаются коды, начинающиеся с «RU»)'],
    examples: ['RU123456789'],
    caveat: 'Длина цифровой части не подтверждена, примеров реальных номеров не нашли.',
  },
  'dpd-14': {
    sources: ['https://www.ship24.com/ru/couriers/dpd-tracking/dpd-ru (14-значные коды общие для сети DPD)'],
    examples: ['05212345678901'],
    caveat: 'Пересекается с Почтой России и 5Post, примеров реальных номеров не нашли.',
  },
  'pony': {
    sources: ['https://parcelsapp.com/ru/carriers/pony-express (пример PN50181879)'],
    examples: ['PN50181879'],
    caveat: 'Единственный пример из стороннего источника. Pony Express просит вводить номер так, как он напечатан в накладной.',
  },
  'jde': {
    sources: ['https://www.jde.ru/ (поле «Номер ЭР» с маской 9999-9999-9999-9999)'],
    examples: ['1234-5678-9012-3456'],
    caveat: 'Маска с официального сайта, реальных номеров не нашли. Распознаём только запись с дефисами.',
  },
  'kit': {
    sources: ['https://tk-kit.ru/tracking (подсказка в поле: «ЕКБМСК0123456789»)'],
    examples: ['ЕКБМСК0123456789', 'екбмск 0123456789'],
  },
  'pek': {
    sources: [
      'https://parcelsapp.com/ru/carriers/pecom (ОЛВПИГИ-1/0808, КРПТББМ-1/1409, НК(МР)ЧЛАБ-12/0406, КК(КН)РДФАО-*/1106)',
    ],
    examples: ['ОЛВПИГИ-1/0808', 'КРПТББМ-1/1409', 'НК(МР)ЧЛАБ-12/0406', 'КК(КН)РДФАО-*/1106'],
    caveat: 'Источник сторонний. Формат с дробью уникален, поэтому ложных совпадений почти нет.',
  },
  'dellin': {
    sources: [
      'https://maintransport.ru/transportnye-kompanii/delovyie-linii/tracking (формат 12-3456789012…, с дефисом или без)',
      'https://track.global/ru/courier/dellin (пример 19-00111003643)',
    ],
    examples: ['19-00111003643', '17-00012345678'],
    caveat: 'Источники сторонние, официального описания формата нет.',
  },
  'dellin-plain': {
    sources: ['https://maintransport.ru/transportnye-kompanii/delovyie-linii/tracking'],
    examples: ['1900111003643'],
    caveat: '13 цифр без дефиса — слишком общий формат.',
  },
  'energia': {
    sources: [
      'https://maintransport.ru/transportnye-kompanii/energiya/tracking (0101-2157708)',
      'https://gdeposylka.ru/courier/nrg-tk (4562-1873423, иногда R на конце)',
    ],
    examples: ['0101-2157708', '4562-1873423'],
    caveat: 'Источники сторонние.',
  },
  'baikal': {
    sources: [
      'https://maintransport.ru/transportnye-kompanii/bajkal-servis/tracking (МФ-1234567)',
      'https://track.global/ru/courier/baykal-servis (MC-2111118)',
    ],
    examples: ['МФ-1234567', 'MC-2111118'],
    caveat: 'Источники расходятся (есть и «13 символов: 4 буквы и 9 цифр»), поэтому уверенность низкая.',
  },
};
