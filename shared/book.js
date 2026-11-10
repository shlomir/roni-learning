/* האקדמיה של רוני · book page viewer
 * Book.open(ref) – ref like "18", "18–20", "18, 21", "דף עבודה"; uses window.BOOK
 * Book.chip(ref) – html for a clickable "📖 עמ' X" button (handled by a global click listener) */
window.Book = (() => {
  const { esc } = UI;
  const B = () => window.BOOK || { pages: [], base: '' };
  const label = p => p.label || `עמוד ${p.id}`;

  function parse(ref) {
    if (!ref) return [];
    const ids = B().pages.map(p => p.id), out = [];
    String(ref).split(',').forEach(tok => {
      tok = tok.trim();
      if (tok.includes('דף עבודה')) { out.push('ws1', 'ws2'); return; }
      const m = tok.match(/(\d+)\s*[–-]\s*(\d+)/);
      if (m) { for (let n = +m[1]; n <= +m[2]; n++) out.push(String(n)); return; }
      const n = tok.match(/\d+/); if (n) out.push(n[0]);
    });
    return [...new Set(out)].filter(id => ids.includes(id));
  }

  function chip(ref, text) {
    if (!parse(ref).length) return '';
    return `<button class="bookchip" data-book="${esc(ref)}">📖 ${esc(text || `בספר: עמ' ${ref}`)}</button>`;
  }

  function open(ref, startId) {
    const all = B().pages, list = parse(ref);
    if (!all.length) return;
    let cur = all.findIndex(p => p.id === (startId || list[0] || all[0].id));
    if (cur < 0) cur = 0;
    const o = document.createElement('div');
    o.className = 'bookview';
    o.innerHTML = `<div class="bv-head"><button class="icon-btn" data-close aria-label="סגירה">✖</button>
        <div class="bv-title"><b></b><small></small></div><button class="icon-btn" data-zoom aria-label="הגדלה">🔍</button></div>
      ${list.length > 1 ? `<div class="bv-tabs">${list.map(id => `<button data-id="${id}">${esc(label(all.find(p => p.id === id)))}</button>`).join('')}</div>` : ''}
      <div class="bv-body"><img alt=""><div class="bv-missing hidden"></div></div>
      <div class="bv-foot"><button class="btn ghost sm" data-prev>→ עמוד קודם</button><button class="btn ghost sm" data-next>עמוד הבא ←</button></div>`;
    document.body.appendChild(o);
    const img = o.querySelector('img'), miss = o.querySelector('.bv-missing'), body = o.querySelector('.bv-body');
    const draw = () => {
      const p = all[cur];
      o.querySelector('.bv-title b').textContent = `📖 ${label(p)}`;
      o.querySelector('.bv-title small').textContent = p.title;
      o.querySelectorAll('.bv-tabs button').forEach(b => b.classList.toggle('on', b.dataset.id === p.id));
      o.querySelector('[data-prev]').disabled = cur === 0;
      o.querySelector('[data-next]').disabled = cur === all.length - 1;
      img.classList.remove('hidden'); miss.classList.add('hidden');
      img.src = B().base + 'p' + p.id + '.jpg';
      body.scrollTop = 0;
    };
    img.onerror = () => {
      const p = all[cur];
      img.classList.add('hidden'); miss.classList.remove('hidden');
      miss.innerHTML = `<div style="font-size:4rem">📖</div><h3>${esc(label(p))}</h3><p>${esc(p.title)}</p><p class="muted">פתחי את הספר בעמוד הזה 👆</p>`;
    };
    img.onclick = () => o.classList.toggle('zoom');
    o.querySelector('[data-zoom]').onclick = () => o.classList.toggle('zoom');
    o.querySelector('[data-close]').onclick = () => { o.remove(); Sound.sfx('tap'); };
    o.querySelector('[data-prev]').onclick = () => { cur--; Sound.sfx('whoosh'); draw(); };
    o.querySelector('[data-next]').onclick = () => { cur++; Sound.sfx('whoosh'); draw(); };
    o.querySelectorAll('.bv-tabs button').forEach(b => b.onclick = () => { cur = all.findIndex(p => p.id === b.dataset.id); Sound.sfx('whoosh'); draw(); });
    o.addEventListener('keydown', e => { if (e.key === 'Escape') o.remove(); });
    Sound.sfx('whoosh');
    draw();
  }

  /* "what's in the book and where" – grouped by topic */
  function mapHtml(topics) {
    const all = B().pages;
    return topics.map(t => {
      const ps = all.filter(p => p.topic === t.id);
      if (!ps.length) return '';
      return `<div class="bookmap-card" style="--c:${t.color}"><h4>${t.emoji} ${esc(t.name)}</h4>
        ${ps.map(p => `<button class="bm-row" data-book="${p.id}"><span class="pg">${p.label ? '📝' : p.id}</span><span>${esc(p.title)}</span></button>`).join('')}</div>`;
    }).join('');
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book]');
    if (b) { e.stopPropagation(); open(b.dataset.book); }
  }, true);

  return { open, parse, chip, mapHtml };
})();
