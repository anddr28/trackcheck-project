// Иконки — один набор (Lucide, ISC), одна толщина линии. Рендер в строку SVG:
// годится и для Astro-шаблонов (set:html), и для скрипта страницы (innerHTML).
import {
  Check,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Info,
  Monitor,
  Moon,
  Pencil,
  Share2,
  Sun,
  TriangleAlert,
  X,
} from 'lucide';

type IconNode = ReadonlyArray<readonly [string, Record<string, string | number | undefined>]>;

export const ICONS = {
  check: Check,
  paste: ClipboardPaste,
  copy: Copy,
  external: ExternalLink,
  info: Info,
  monitor: Monitor,
  moon: Moon,
  pencil: Pencil,
  share: Share2,
  sun: Sun,
  warning: TriangleAlert,
  close: X,
} as const satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 20, className = ''): string {
  const body = (ICONS[name] as IconNode)
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  return `<svg class="icon ${className}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
