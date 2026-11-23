// QR-код ссылки на донат собирается при сборке сайта в /donate-qr.svg.
// Так на странице не нужен ни скрипт, ни библиотека: картинка грузится, только когда человек раскроет блок.
import { renderSVG } from 'uqr';
import { DONATE_URL } from '../config';

export function GET() {
  return new Response(renderSVG(DONATE_URL, { border: 1 }), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
}
