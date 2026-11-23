// Настройки сайта, которые заполняет владелец.

/** Ссылка на кошелёк для доната. ЗАПОЛНИТЬ перед запуском. */
export const DONATE_URL = 'ЗАПОЛНИТЬ_ССЫЛКУ_ДОНАТА';

/** Ссылка на Telegram-бота скрыта, пока бот не запущен (этап 4). */
export const BOT_ENABLED = false;
export const BOT_URL = 'ЗАПОЛНИТЬ_ССЫЛКУ_НА_БОТА';

export const isPlaceholder = (value: string) => value.startsWith('ЗАПОЛНИТЬ');
