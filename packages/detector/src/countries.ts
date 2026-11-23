// Страны для международных номеров UPU S10 (две последние буквы номера).
// Код страны в S10 — ISO 3166-1 alpha-2: UPU Standard S10, раздел «Country code»
// https://www.upu.int/en/postal-solutions/programmes-services/standards
// Названия почтовых операторов — по сайтам операторов и списку назначенных операторов UPU:
// https://www.upu.int/en/universal-postal-union/about-upu/member-countries

export type Region = 'cis' | 'europe' | 'asia' | 'america' | 'other';

export interface PostCountry {
  code: string;
  name: string;
  post: string;
  region: Region;
  /** Официальный сайт оператора (только главная страница — ссылки с номером не проверены). */
  site?: string;
  /** Отдельно отмеченные операторы: Казпочта, Белпочта, Почта Узбекистана. */
  featured?: boolean;
}

const list: PostCountry[] = [
  // СНГ и соседи
  { code: 'RU', name: 'Россия', post: 'Почта России', region: 'cis', site: 'https://www.pochta.ru/' },
  { code: 'KZ', name: 'Казахстан', post: 'Казпочта', region: 'cis', site: 'https://post.kz/', featured: true },
  { code: 'BY', name: 'Беларусь', post: 'Белпочта', region: 'cis', site: 'https://www.belpost.by/', featured: true },
  { code: 'UZ', name: 'Узбекистан', post: 'Почта Узбекистана', region: 'cis', site: 'https://www.pochta.uz/', featured: true },
  { code: 'KG', name: 'Киргизия', post: 'Кыргыз почтасы', region: 'cis' },
  { code: 'TJ', name: 'Таджикистан', post: 'Почта Таджикистана', region: 'cis' },
  { code: 'TM', name: 'Туркменистан', post: 'Туркменпочта', region: 'cis' },
  { code: 'AM', name: 'Армения', post: 'HayPost', region: 'cis' },
  { code: 'AZ', name: 'Азербайджан', post: 'Azərpoçt', region: 'cis' },
  { code: 'GE', name: 'Грузия', post: 'Georgian Post', region: 'cis' },
  { code: 'MD', name: 'Молдова', post: 'Poșta Moldovei', region: 'cis' },
  { code: 'UA', name: 'Украина', post: 'Укрпошта', region: 'cis' },
  { code: 'MN', name: 'Монголия', post: 'Mongol Post', region: 'asia' },
  // Европа
  { code: 'DE', name: 'Германия', post: 'Deutsche Post', region: 'europe' },
  { code: 'GB', name: 'Великобритания', post: 'Royal Mail', region: 'europe' },
  { code: 'FR', name: 'Франция', post: 'La Poste', region: 'europe' },
  { code: 'IT', name: 'Италия', post: 'Poste Italiane', region: 'europe' },
  { code: 'ES', name: 'Испания', post: 'Correos', region: 'europe' },
  { code: 'PT', name: 'Португалия', post: 'CTT', region: 'europe' },
  { code: 'NL', name: 'Нидерланды', post: 'PostNL', region: 'europe' },
  { code: 'BE', name: 'Бельгия', post: 'bpost', region: 'europe' },
  { code: 'LU', name: 'Люксембург', post: 'POST Luxembourg', region: 'europe' },
  { code: 'AT', name: 'Австрия', post: 'Österreichische Post', region: 'europe' },
  { code: 'CH', name: 'Швейцария', post: 'Swiss Post', region: 'europe' },
  { code: 'PL', name: 'Польша', post: 'Poczta Polska', region: 'europe' },
  { code: 'CZ', name: 'Чехия', post: 'Česká pošta', region: 'europe' },
  { code: 'SK', name: 'Словакия', post: 'Slovenská pošta', region: 'europe' },
  { code: 'HU', name: 'Венгрия', post: 'Magyar Posta', region: 'europe' },
  { code: 'RO', name: 'Румыния', post: 'Poșta Română', region: 'europe' },
  { code: 'BG', name: 'Болгария', post: 'Български пощи', region: 'europe' },
  { code: 'GR', name: 'Греция', post: 'ELTA', region: 'europe' },
  { code: 'HR', name: 'Хорватия', post: 'Hrvatska pošta', region: 'europe' },
  { code: 'SI', name: 'Словения', post: 'Pošta Slovenije', region: 'europe' },
  { code: 'RS', name: 'Сербия', post: 'Pošta Srbije', region: 'europe' },
  { code: 'ME', name: 'Черногория', post: 'Pošta Crne Gore', region: 'europe' },
  { code: 'MK', name: 'Северная Македония', post: 'Пошта на Северна Македонија', region: 'europe' },
  { code: 'AL', name: 'Албания', post: 'Posta Shqiptare', region: 'europe' },
  { code: 'LV', name: 'Латвия', post: 'Latvijas Pasts', region: 'europe' },
  { code: 'LT', name: 'Литва', post: 'Lietuvos paštas', region: 'europe' },
  { code: 'EE', name: 'Эстония', post: 'Omniva', region: 'europe' },
  { code: 'FI', name: 'Финляндия', post: 'Posti', region: 'europe' },
  { code: 'SE', name: 'Швеция', post: 'PostNord', region: 'europe' },
  { code: 'NO', name: 'Норвегия', post: 'Posten', region: 'europe' },
  { code: 'DK', name: 'Дания', post: 'PostNord', region: 'europe' },
  { code: 'IS', name: 'Исландия', post: 'Íslandspóstur', region: 'europe' },
  { code: 'IE', name: 'Ирландия', post: 'An Post', region: 'europe' },
  { code: 'CY', name: 'Кипр', post: 'Cyprus Post', region: 'europe' },
  { code: 'MT', name: 'Мальта', post: 'MaltaPost', region: 'europe' },
  { code: 'TR', name: 'Турция', post: 'PTT', region: 'europe' },
  // Азия
  { code: 'CN', name: 'Китай', post: 'China Post', region: 'asia' },
  { code: 'HK', name: 'Гонконг', post: 'Hongkong Post', region: 'asia' },
  { code: 'MO', name: 'Макао', post: 'Correios de Macau', region: 'asia' },
  { code: 'TW', name: 'Тайвань', post: 'Chunghwa Post', region: 'asia' },
  { code: 'JP', name: 'Япония', post: 'Japan Post', region: 'asia' },
  { code: 'KR', name: 'Южная Корея', post: 'Korea Post', region: 'asia' },
  { code: 'SG', name: 'Сингапур', post: 'SingPost', region: 'asia' },
  { code: 'MY', name: 'Малайзия', post: 'Pos Malaysia', region: 'asia' },
  { code: 'TH', name: 'Таиланд', post: 'Thailand Post', region: 'asia' },
  { code: 'VN', name: 'Вьетнам', post: 'Vietnam Post', region: 'asia' },
  { code: 'ID', name: 'Индонезия', post: 'Pos Indonesia', region: 'asia' },
  { code: 'PH', name: 'Филиппины', post: 'PHLPost', region: 'asia' },
  { code: 'KH', name: 'Камбоджа', post: 'Cambodia Post', region: 'asia' },
  { code: 'IN', name: 'Индия', post: 'India Post', region: 'asia' },
  { code: 'PK', name: 'Пакистан', post: 'Pakistan Post', region: 'asia' },
  { code: 'BD', name: 'Бангладеш', post: 'Bangladesh Post', region: 'asia' },
  { code: 'LK', name: 'Шри-Ланка', post: 'Sri Lanka Post', region: 'asia' },
  { code: 'AE', name: 'ОАЭ', post: 'Emirates Post', region: 'asia' },
  { code: 'SA', name: 'Саудовская Аравия', post: 'Saudi Post', region: 'asia' },
  { code: 'IL', name: 'Израиль', post: 'Israel Post', region: 'asia' },
  { code: 'QA', name: 'Катар', post: 'Q-Post', region: 'asia' },
  { code: 'KW', name: 'Кувейт', post: 'Kuwait Post', region: 'asia' },
  { code: 'OM', name: 'Оман', post: 'Oman Post', region: 'asia' },
  { code: 'BH', name: 'Бахрейн', post: 'Bahrain Post', region: 'asia' },
  { code: 'IR', name: 'Иран', post: 'Iran Post', region: 'asia' },
  // Америка
  { code: 'US', name: 'США', post: 'USPS', region: 'america' },
  { code: 'CA', name: 'Канада', post: 'Canada Post', region: 'america' },
  { code: 'MX', name: 'Мексика', post: 'Correos de México', region: 'america' },
  { code: 'BR', name: 'Бразилия', post: 'Correios', region: 'america' },
  { code: 'AR', name: 'Аргентина', post: 'Correo Argentino', region: 'america' },
  { code: 'CL', name: 'Чили', post: 'Correos de Chile', region: 'america' },
  // Прочие
  { code: 'AU', name: 'Австралия', post: 'Australia Post', region: 'other' },
  { code: 'NZ', name: 'Новая Зеландия', post: 'NZ Post', region: 'other' },
  { code: 'ZA', name: 'ЮАР', post: 'SAPO', region: 'other' },
  { code: 'EG', name: 'Египет', post: 'Egypt Post', region: 'other' },
];

export const COUNTRIES: Readonly<Record<string, PostCountry>> = Object.fromEntries(
  list.map((c) => [c.code, c]),
);

export const COUNTRY_LIST: readonly PostCountry[] = list;
