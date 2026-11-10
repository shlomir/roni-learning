/* האקדמיה של רוני · UI helpers */
window.UI = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stars() {
    let c = $('#stars');
    if (!c) { c = document.createElement('canvas'); c.id = 'stars'; document.body.prepend(c); }
    const x = c.getContext('2d'); let w, h, s = [];
    const size = () => {
      w = c.width = innerWidth; h = c.height = innerHeight;
      s = Array.from({ length: Math.min(200, w / 5) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + .2, t: Math.random() * 6 }));
    };
    size(); addEventListener('resize', size);
    (function draw(n) {
      x.clearRect(0, 0, w, h);
      for (const p of s) { x.fillStyle = `rgba(255,255,255,${.3 + .7 * Math.abs(Math.sin(p.t + n / 1400))})`; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); }
      if (!reduced()) requestAnimationFrame(draw);
    })(0);
  }

  function toast(m) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = m; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function confetti(n = 80) {
    if (reduced()) return;
    const cols = ['#ffcf4a', '#ff6b6b', '#3ee8b5', '#5cc8ff', '#b48cff', '#ff7ad9'];
    for (let i = 0; i < n; i++) {
      const e = document.createElement('i');
      e.className = 'confetti';
      e.style.left = Math.random() * 100 + 'vw';
      e.style.background = cols[i % cols.length];
      e.style.animationDuration = (1.8 + Math.random() * 2) + 's';
      e.style.animationDelay = Math.random() * .5 + 's';
      e.style.borderRadius = Math.random() < .5 ? '50%' : '2px';
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 4500);
    }
  }

  function floater(text, x, y) {
    const f = document.createElement('div');
    f.className = 'floater'; f.textContent = text;
    f.style.left = (x ?? innerWidth / 2) + 'px'; f.style.top = (y ?? innerHeight / 2) + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
  }

  /* modal({emoji,title,html,actions:[{label,cls,onClick,keep}]}) → close() */
  function modal({ emoji, title, html = '', actions = [], dismiss = true }) {
    const o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      ${emoji ? `<span class="bigemoji">${emoji}</span>` : ''}
      ${title ? `<h2>${title}</h2>` : ''}<div class="mbody">${html}</div>
      <div class="actions"></div></div>`;
    const close = () => o.remove();
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || ''); b.innerHTML = a.label;
      b.onclick = () => { Sound.sfx('tap'); if (!a.keep) close(); a.onClick && a.onClick(o); };
      $('.actions', o).appendChild(b);
    });
    if (dismiss) o.addEventListener('click', e => { if (e.target === o) close(); });
    document.body.appendChild(o);
    close.el = o;
    return close;
  }

  function confirmBox(title, html, yes, onYes) {
    modal({ emoji: '🤔', title, html, actions: [{ label: yes, onClick: onYes }, { label: 'ביטול', cls: 'ghost' }] });
  }

  /* top bar with back + toggles. extra = html for chips */
  function topbar({ title, back, backLabel = 'חזרה', extra = '' }) {
    const h = document.createElement('header');
    h.className = 'topbar';
    h.innerHTML = `<div class="wrap">
      ${back ? `<a class="icon-btn back" href="${back}" aria-label="${backLabel}" title="${backLabel}">➜</a>` : ''}
      <div class="title">${title}</div>
      <span class="extra" style="display:flex;gap:6px;align-items:center">${extra}</span>
      <button class="icon-btn" id="tglVoice" title="קריינות" aria-label="קריינות">🗣️</button>
      <button class="icon-btn" id="tglSfx" title="צלילים" aria-label="צלילים">🔊</button>
    </div>`;
    document.body.prepend(h);
    const sync = () => {
      $('#tglVoice').classList.toggle('off', !Store.settings.voice);
      $('#tglSfx').classList.toggle('off', !Store.settings.sfx);
      $('#tglSfx').textContent = Store.settings.sfx ? '🔊' : '🔇';
    };
    $('#tglVoice').onclick = () => { Store.settings.voice = !Store.settings.voice; Store.save(); sync(); if (!Store.settings.voice) Sound.stop(); toast(Store.settings.voice ? 'הקריינות פועלת 🗣️' : 'הקריינות כבויה'); };
    $('#tglSfx').onclick = () => { Store.settings.sfx = !Store.settings.sfx; Store.save(); sync(); Sound.sfx('pop'); };
    sync();
    return h;
  }

  /* full-screen "tap to start" – unlocks audio on mobile */
  function gate({ title, sub = '', emoji = '🗺️', onStart, once }) {
    if (once && sessionStorage.getItem(once)) { onStart && onStart(false); return; }
    const g = document.createElement('div');
    g.className = 'gate';
    g.innerHTML = `<div><span class="bigemoji" style="font-size:6rem">${emoji}</span><h1>${title}</h1><p class="muted" style="font-size:1.2rem">${sub}</p><div class="tap">👆 לחצי כדי להתחיל</div></div>`;
    g.onclick = () => {
      Sound.unlock(); g.remove();
      try { once && sessionStorage.setItem(once, 1); } catch (e) {}
      onStart && onStart(true);
    };
    document.body.appendChild(g);
  }

  return { $, $$, esc, shuffle, stars, toast, confetti, floater, modal, confirmBox, topbar, gate };
})();
