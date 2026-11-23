import { defineConfig } from 'astro/config';

export default defineConfig({
  // ЗАПОЛНИТЬ: адрес сайта после покупки домена (нужен для canonical и sitemap на этапе 3)
  site: 'https://example.com',
  // CSS встраиваем в HTML: на медленной сети это минус один запрос до первого экрана
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  vite: {
    build: {
      // Скрипт главного экрана встраиваем в HTML: на 3G отдельный запрос — это ещё ~0,56 с задержки.
      // Шрифты и прочие файлы не встраиваем (иначе раздуется HTML до первого экрана).
      assetsInlineLimit: (file) => (/\.(js|mjs)$/.test(file) ? true : undefined),
    },
    // detector подключается исходниками TypeScript из соседнего пакета
    ssr: { noExternal: ['@trackcheck/detector'] },
  },
});
