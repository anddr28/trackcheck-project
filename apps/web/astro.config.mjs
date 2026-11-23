import { defineConfig } from 'astro/config';

export default defineConfig({
  // Адрес сайта и путь задаются при сборке. Локально — корень; на GitHub Pages workflow передаёт
  // SITE_URL=https://<владелец>.github.io и BASE_PATH=/<репозиторий>/ (.github/workflows/pages.yml).
  // ЗАПОЛНИТЬ: после покупки домена — SITE_URL=https://домен и BASE_PATH=/ (нужно для canonical и sitemap на этапе 3).
  site: process.env.SITE_URL ?? 'https://example.com',
  base: process.env.BASE_PATH ?? '/',
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
