import { detectAll, type Candidate, type DetectResult, type Hint } from '@trackcheck/detector';

const EXAMPLES = [
  'RA260500636FI', '45005145009749', 'LO-835645864', '30587846-0001', '30587846-0001-1',
  '1150362728', '10274830162', '5111842155', 'P0812437876', '70000000459918575', 'LP894106589032648021', '99990034507086', 'ЕКБМСК0123456789',
  'НК(МР)ЧЛАБ-12/0406', '19-00111003643', 'RA260500637FI', 'RA26050063FI',
  // по итогам исследования
  '80092841278829', '80092841278820', '45005145009744', '45005145009749', '1109932346',
  'PO-211-123456789012345', '28829113-0131', '89161234567', '4111 1111 1111 1111', '22.11.2026',
  'ИНН 7707083893, тел. 9161234567, артикул 123456789, оплачено 22.11.2026. Трек: 1150362728',
  'Привет! Посылка с Авито: RA 260500636 FI, вторая СДЭК 1150362728, звони +7 916 123-45-67',
];

const inp = document.getElementById('inp') as HTMLTextAreaElement;
const out = document.getElementById('out')!;
const ex = document.getElementById('examples')!;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const CONF = { high: 'высокая', medium: 'средняя', low: 'низкая' } as const;

const hint = (h: Hint) => `<div class="hint ${h.level}">${esc(h.text)}</div>`;

function cand(c: Candidate): string {
  const links = c.links
    .map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a> <span class="badge">${l.verified ? 'ссылка проверена' : 'не проверена'}</span>`)
    .join('<br>');
  return `<div class="cand">
    <div><span class="rank">${c.rank === 'likely' ? 'Скорее всего' : 'Возможно'} ${esc(c.carrier)}</span>
      <span class="badge">уверенность: ${CONF[c.confidence]}</span>
      ${c.country ? `<span class="badge">${esc(c.country.code)} · ${esc(c.country.name)}</span>` : ''}</div>
    <div class="num">${esc(c.display)}</div>
    <div class="muted">${[c.type, ...c.labels].filter(Boolean).map((s) => esc(s!)).join(' · ')}</div>
    <div class="muted">Копируется: <code>${esc(c.number)}</code> <button data-copy="${esc(c.number)}">Копировать</button></div>
    <div>${links}</div>
    ${c.hints.map(hint).join('')}
  </div>`;
}

function result(r: DetectResult): string {
  const body = r.candidates.length
    ? r.candidates.map(cand).join('')
    : `<div>Служба не определилась. <a href="${esc(r.fallback.url)}" target="_blank" rel="noopener">Проверить на 17TRACK</a></div>`;
  return `<div class="result">${body}${r.hints.map(hint).join('')}</div>`;
}

function render() {
  const text = inp.value;
  if (!text.trim()) { out.innerHTML = ''; return; }
  const b = detectAll(text);
  out.innerHTML = b.hints.map(hint).join('') + (b.results.length ? b.results.map(result).join('') : result({
    input: text, query: text, candidates: [], hints: [], fallback: { label: '', url: `https://t.17track.net/ru#nums=${encodeURIComponent(text.trim())}`, kind: 'universal', verified: true },
  }));
}

for (const e of EXAMPLES) {
  const b = document.createElement('button');
  b.textContent = e.length > 30 ? `${e.slice(0, 28)}…` : e;
  b.onclick = () => { inp.value = e; render(); inp.focus(); };
  ex.append(b);
}
out.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.copy) navigator.clipboard?.writeText(t.dataset.copy).then(() => { t.textContent = 'Скопировано'; });
});
inp.addEventListener('input', render);
