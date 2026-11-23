// Каталог служб доставки. Отсюда же этап 3 сгенерирует SEO-страницы.
// Статус ссылок (verified) проверен 22.11.2026, подробности — docs/tracking-links.md.

import type { Country } from './types';

export type CarrierKind = 'post' | 'parcel' | 'freight' | 'marketplace' | 'international';

export interface Tracking {
  /** Шаблон: {n} заменяется на номер (encodeURIComponent). Без {n} — страница, куда номер вставляют вручную. */
  url: string;
  /** Проверено ли, что ссылка принимает номер. Как проверяли — docs/tracking-links.md. */
  verified: boolean;
}

export interface Carrier {
  id: string;
  name: string;
  /** Человекопонятный адрес будущей SEO-страницы. */
  slug: string;
  kind: CarrierKind;
  country: Country | null;
  site: string;
  tracking: Tracking | null;
  /** Где смотреть в приложении, если сайт не показывает статус по ссылке. */
  appHint?: string;
  /** Номер смотрят только в кабинете или приложении: без 17TRACK и без подсказки «вставьте на сайте». */
  appOnly?: boolean;
  /** Подпись ссылки вместо «Отследить на сайте …». */
  linkLabel?: string;
  /** Название в родительном падеже: «на сайте Почты России». Если не задано — как name. */
  nameGen?: string;
}

const RU: Country = { code: 'RU', name: 'Россия' };
const CN: Country = { code: 'CN', name: 'Китай' };
const US: Country = { code: 'US', name: 'США' };

export const UNIVERSAL_TRACKER: Tracking = {
  url: 'https://t.17track.net/ru#nums={n}',
  verified: true,
};

const list: Carrier[] = [
  {
    id: 'pochta', name: 'Почта России', nameGen: 'Почты России', slug: 'pochta-rossii', kind: 'post', country: RU,
    site: 'https://www.pochta.ru/',
    tracking: {
      url: 'https://www.pochta.ru/tracking?barcode={n}', verified: true,
    },
  },
  {
    id: 'cdek', name: 'СДЭК', slug: 'sdek', kind: 'parcel', country: RU,
    site: 'https://www.cdek.ru/',
    tracking: {
      url: 'https://www.cdek.ru/ru/tracking?order_id={n}', verified: false,
    },
  },
  {
    id: 'yandex', name: 'Яндекс Доставка', nameGen: 'Яндекс Доставки', slug: 'yandex-dostavka', kind: 'parcel', country: RU,
    site: 'https://dostavka.yandex.ru/',
    tracking: {
      url: 'https://dostavka.yandex.ru/ndd/tracking/?order_tracking_id={n}', verified: true,
    },
  },
  {
    id: 'boxberry', name: 'Boxberry', slug: 'boxberry', kind: 'parcel', country: RU,
    site: 'https://boxberry.ru/',
    tracking: {
      url: 'https://dostavka.yandex.ru/ndd/tracking/?order_tracking_id={n}', verified: false,
    },
  },
  {
    id: 'ozon', name: 'Ozon', slug: 'ozon', kind: 'marketplace', country: RU,
    site: 'https://www.ozon.ru/',
    tracking: {
      url: 'https://tracking.ozon.ru/?track={n}', verified: false,
    },
    appHint: 'В приложении Ozon статус виден в разделе «Заказы»',
  },
  {
    id: 'wb', name: 'Wildberries (WB Track)', slug: 'wildberries', kind: 'marketplace', country: RU,
    site: 'https://www.wildberries.ru/',
    tracking: null,
    appHint: 'Заказы Wildberries отслеживаются в приложении WB в разделе «Доставки». Посылки WB Track — там же, у отправителя',
  },
  {
    id: 'avito', name: 'Авито Доставка', nameGen: 'Авито Доставки', slug: 'avito-dostavka', kind: 'marketplace', country: RU,
    site: 'https://www.avito.ru/',
    tracking: {
      url: 'https://www.avito.ru/orders', verified: false,
    },
    appHint: 'Смотрите в приложении Авито → Заказы',
    appOnly: true,
    linkLabel: 'Открыть заказы на Авито',
  },
  {
    id: 'dpd', name: 'DPD', slug: 'dpd', kind: 'parcel', country: RU,
    site: 'https://www.dpd.ru/',
    tracking: {
      url: 'https://www.dpd.ru/', verified: false,
    },
  },
  {
    id: 'fivepost', name: '5Post', slug: '5post', kind: 'parcel', country: RU,
    site: 'https://fivepost.ru/',
    tracking: {
      url: 'https://fivepost.ru/tracking/?id={n}', verified: true,
    },
  },
  {
    id: 'pony', name: 'Pony Express', slug: 'pony-express', kind: 'parcel', country: RU,
    site: 'https://www.ponyexpress.ru/',
    tracking: {
      url: 'https://www.ponyexpress.ru/tracking/', verified: false,
    },
  },
  {
    id: 'cse', name: 'КСЭ', slug: 'kse', kind: 'parcel', country: RU,
    site: 'https://www.cse.ru/',
    tracking: {
      url: 'https://www.cse.ru/mow/track/?number={n}', verified: true,
    },
  },
  // Грузовые
  {
    id: 'pek', name: 'ПЭК', slug: 'pek', kind: 'freight', country: RU,
    site: 'https://pecom.ru/',
    tracking: {
      url: 'https://pecom.ru/', verified: false,
    },
  },
  {
    id: 'dellin', name: 'Деловые Линии', nameGen: 'Деловых Линий', slug: 'delovye-linii', kind: 'freight', country: RU,
    site: 'https://www.dellin.ru/',
    tracking: {
      url: 'https://www.dellin.ru/tracker/', verified: false,
    },
  },
  {
    id: 'kit', name: 'КИТ', slug: 'kit', kind: 'freight', country: RU,
    site: 'https://tk-kit.ru/',
    tracking: {
      url: 'https://tk-kit.ru/tracking?track_code={n}', verified: true,
    },
  },
  {
    id: 'energia', name: 'Энергия', nameGen: 'Энергии', slug: 'energiya', kind: 'freight', country: RU,
    site: 'https://nrg-tk.ru/',
    tracking: {
      url: 'https://nrg-tk.ru/client/tracking/', verified: false,
    },
  },
  {
    id: 'baikal', name: 'Байкал Сервис', nameGen: 'Байкал Сервиса', slug: 'baikal-servis', kind: 'freight', country: RU,
    site: 'https://www.baikalsr.ru/',
    tracking: {
      url: 'https://www.baikalsr.ru/', verified: false,
    },
  },
  {
    id: 'jde', name: 'ЖелДорЭкспедиция', nameGen: 'ЖелДорЭкспедиции', slug: 'zheldorekspeditsiya', kind: 'freight', country: RU,
    site: 'https://www.jde.ru/',
    tracking: {
      url: 'https://i.jde.ru/track/?ttn={n}', verified: true,
    },
  },
  // Китай и международные
  {
    id: 'cainiao', name: 'Cainiao (AliExpress)', slug: 'cainiao-aliexpress', kind: 'international', country: CN,
    site: 'https://global.cainiao.com/',
    tracking: {
      url: 'https://global.cainiao.com/newDetail.htm?mailNoList={n}', verified: true,
    },
  },
  { id: 'yunexpress', name: 'YunExpress', slug: 'yunexpress', kind: 'international', country: CN, site: 'https://www.yunexpress.com/', tracking: null },
  { id: '4px', name: '4PX', slug: '4px', kind: 'international', country: CN, site: 'https://www.4px.com/', tracking: null },
  { id: 'yanwen', name: 'Yanwen', slug: 'yanwen', kind: 'international', country: CN, site: 'https://www.yw56.com.cn/', tracking: null },
  {
    id: 'ups', name: 'UPS', slug: 'ups', kind: 'international', country: US,
    site: 'https://www.ups.com/',
    tracking: {
      url: 'https://www.ups.com/track?tracknum={n}', verified: true,
    },
  },
];

export const CARRIERS: Readonly<Record<string, Carrier>> = Object.fromEntries(list.map((c) => [c.id, c]));
export const CARRIER_LIST: readonly Carrier[] = list;

/** Партнёры Авито Доставки (кроме собственной доставки Авито). */
export const AVITO_PARTNERS = ['pochta', 'cdek', 'boxberry', 'yandex', 'fivepost', 'dpd'] as const;

export function fillUrl(template: string, number: string): string {
  return template.replace('{n}', encodeURIComponent(number));
}
