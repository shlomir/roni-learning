/* האקדמיה של רוני · exercise engine
 * Question kinds (k): mc | tf | order | sort | match | open
 *  mc:    o:[correct, ...wrong]          answer = original option index
 *  tf:    a:true|false                   answer = true|false
 *  order: items:[in correct order]       answer = [original indices in chosen order]
 *  sort:  bins:[A,B], items:[[text,bin]] answer = [bin per item]
 *  match: pairs:[[left,right]]           answer = [right index chosen per left]
 *  open:  model, kw:["a|b",...]          answer = {text, grade:1|.5|0}
 */
window.Engine = (() => {
  const { esc, shuffle } = UI;
  let topics = {};
  const LET = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
  const PAIR_COLORS = ['#5cc8ff', '#ff7ad9', '#3ee8b5', '#ffcf4a', '#b48cff', '#ff9f43'];
  const KIND_LABEL = { mc: 'בחירה', tf: 'נכון / לא נכון', order: 'סידור', sort: 'מיון', match: 'התאמה', open: 'שאלה פתוחה' };

  function setTopics(list) { topics = Object.fromEntries(list.map(t => [t.id, t])); }

  const norm = s => String(s || '').replace(/[֑-ׇ]/g, '').replace(/["'״׳.,;:!?()\-־]/g, ' ').replace(/\s+/g, ' ');
  function keywordHits(q, text) {
    const t = norm(text);
    return (q.kw || []).map(k => ({ label: k.split('|')[0], hit: k.split('|').some(a => t.includes(norm(a).trim())) }));
  }

  function grade(q, a) {
    if (a == null) return 0;
    switch (q.k) {
      case 'mc': return a === 0 ? 1 : 0;
      case 'tf': return a === q.a ? 1 : 0;
      case 'order': return a.length === q.items.length && a.every((v, i) => v === i) ? 1 : 0;
      case 'sort': return a.length === q.items.length && a.every((b, i) => b === q.items[i][1]) ? 1 : 0;
      case 'match': return a.length === q.pairs.length && a.every((r, i) => r === i) ? 1 : 0;
      case 'open': return typeof a.grade === 'number' ? a.grade : 0;
    }
    return 0;
  }
  function isComplete(q, a) {
    if (a == null) return false;
    switch (q.k) {
      case 'mc': case 'tf': return true;
      case 'order': return a.length === q.items.length;
      case 'sort': return a.length === q.items.length && a.every(b => b === 0 || b === 1);
      case 'match': return a.length === q.pairs.length && a.every(r => r != null);
      case 'open': return !!(a.text && a.text.trim());
    }
  }

  function correctHtml(q) {
    switch (q.k) {
      case 'mc': return esc(q.o[0]);
      case 'tf': return q.a ? 'נכון' : 'לא נכון';
      case 'order': return '<ol style="margin:4px 0;padding-inline-start:1.3em">' + q.items.map(i => `<li>${esc(i)}</li>`).join('') + '</ol>';
      case 'sort': return q.bins.map((b, bi) => `<b>${esc(b)}:</b> ${q.items.filter(i => i[1] === bi).map(i => esc(i[0])).join(' · ')}`).join('<br>');
      case 'match': return q.pairs.map(p => `<b>${esc(p[0])}</b> ⟵ ${esc(p[1])}`).join('<br>');
      case 'open': return esc(q.model);
    }
  }
  function answerHtml(q, a) {
    if (a == null) return '<i class="muted">לא נענתה</i>';
    switch (q.k) {
      case 'mc': return esc(q.o[a]);
      case 'tf': return a ? 'נכון' : 'לא נכון';
      case 'order': return a.map((i, n) => `${n + 1}. ${esc(q.items[i])}`).join('<br>');
      case 'sort': return q.items.map((it, i) => `${esc(it[0])} ← ${a[i] == null ? '?' : esc(q.bins[a[i]])}`).join('<br>');
      case 'match': return q.pairs.map((p, i) => `<b>${esc(p[0])}</b> ⟵ ${a[i] == null ? '?' : esc(q.pairs[a[i]][1])}`).join('<br>');
      case 'open': return esc(a.text || '');
    }
  }

  /* render(host, q, opts) → controller
   * opts.mode: 'practice' (default) | 'exam'
   * opts.onResult({score, correct, answer})  – practice
   * opts.onChange(answer)                    – exam
   * opts.manual + opts.onPick(answer)        – mc/tf: caller calls ctrl.reveal()
   * opts.answer – prefill (exam navigation); opts.read – auto narration (default from settings)
   * opts.label – extra chip text */
  function render(host, q, opts = {}) {
    const mode = opts.mode || 'practice';
    const exam = mode === 'exam';
    const tp = topics[q.t] || {};
    let answer = opts.answer != null ? JSON.parse(JSON.stringify(opts.answer)) : null;
    let done = false;

    host.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'qcard';
    card.innerHTML = `<div class="qmeta">
        ${tp.name ? `<span class="qtag" style="color:${tp.color}">${tp.emoji} ${esc(tp.name)}</span>` : ''}
        <span class="qtag">${KIND_LABEL[q.k]}</span>
        ${opts.label ? `<span class="qtag" style="background:rgba(255,207,74,.18);color:var(--gold)">${opts.label}</span>` : ''}
        <button class="icon-btn qread" title="הקראה" aria-label="הקראת השאלה">🔊</button>
      </div>
      <div class="qtext">${esc(q.q)}</div>
      <div class="qbody"></div>
      <div class="check-row hidden"><button class="btn mint check">✔ בדיקה</button></div>`;
    host.appendChild(card);
    const body = card.querySelector('.qbody');
    const checkRow = card.querySelector('.check-row');
    const checkBtn = card.querySelector('.check');
    card.querySelector('.qread').onclick = () => Sound.say(q.id, q.q);
    const autoRead = opts.read ?? Store.settings.autoRead;
    if (autoRead) setTimeout(() => Sound.say(q.id, q.q), 250);

    const changed = () => {
      if (exam) opts.onChange && opts.onChange(answer);
      else if (q.k !== 'mc' && q.k !== 'tf') checkRow.classList.toggle('hidden', !isComplete(q, answer));
    };
    const finish = () => {
      if (done) return; done = true;
      const score = grade(q, answer);
      opts.onResult && opts.onResult({ score, correct: score === 1, answer });
    };

    let ctrl = { el: card, getAnswer: () => answer };

    /* ---------- mc / tf ---------- */
    if (q.k === 'mc' || q.k === 'tf') {
      const items = q.k === 'tf' ? [[true, '✔ נכון'], [false, '✘ לא נכון']] : shuffle(q.o.map((t, i) => [i, t]));
      const box = document.createElement('div');
      box.className = 'opts' + (q.k === 'tf' ? ' tf' : '');
      box.innerHTML = items.map(([v, t], n) => `<button class="opt" data-v="${v}">${q.k === 'mc' ? `<span class="let">${LET[n]}</span>` : ''}<span>${esc(t)}</span></button>`).join('');
      body.appendChild(box);
      const btns = [...box.children];
      const val = b => q.k === 'tf' ? b.dataset.v === 'true' : +b.dataset.v;
      const mark = () => btns.forEach(b => b.classList.toggle('sel', answer != null && val(b) === answer));
      if (answer != null) mark();
      const reveal = () => {
        btns.forEach(b => {
          b.disabled = true; b.classList.remove('sel');
          const v = val(b);
          if (grade(q, v) === 1) b.classList.add('ok');
          else if (v === answer) b.classList.add('bad');
        });
        finish();
      };
      btns.forEach(b => b.onclick = () => {
        if (done) return;
        answer = val(b); Sound.sfx('tap');
        if (exam) { mark(); changed(); return; }
        if (opts.manual) { mark(); btns.forEach(x => x.disabled = true); opts.onPick && opts.onPick(answer); return; }
        reveal();
      });
      ctrl.reveal = reveal;
      ctrl.fiftyFifty = () => {
        if (q.k !== 'mc') return false;
        shuffle(btns.filter(b => +b.dataset.v !== 0)).slice(0, Math.max(0, btns.length - 2)).forEach(b => b.classList.add('gone'));
        return true;
      };
    }

    /* ---------- order ---------- */
    if (q.k === 'order') {
      answer = answer || [];
      body.innerHTML = `<div class="order-ans"></div><div class="order-pool"></div>`;
      const ansEl = body.querySelector('.order-ans'), poolEl = body.querySelector('.order-pool');
      const pool = shuffle(q.items.map((t, i) => i));
      const draw = () => {
        ansEl.innerHTML = answer.map(i => `<button class="ochip" data-i="${i}">${esc(q.items[i])}</button>`).join('');
        poolEl.innerHTML = pool.filter(i => !answer.includes(i)).map(i => `<button class="ochip" data-i="${i}">${esc(q.items[i])}</button>`).join('');
      };
      draw();
      body.onclick = e => {
        const c = e.target.closest('.ochip'); if (!c || done) return;
        const i = +c.dataset.i; Sound.sfx('tap');
        if (answer.includes(i)) answer.splice(answer.indexOf(i), 1); else answer.push(i);
        draw(); changed();
      };
      ctrl.reveal = () => {
        [...ansEl.children].forEach((c, n) => c.classList.add(+c.dataset.i === n ? 'ok' : 'bad'));
        finish();
      };
    }

    /* ---------- sort ---------- */
    if (q.k === 'sort') {
      const order = shuffle(q.items.map((_, i) => i));
      answer = answer || new Array(q.items.length).fill(null);
      body.innerHTML = order.map(i => `<div class="sort-row" data-i="${i}"><span class="txt">${esc(q.items[i][0])}</span>
        <span class="bins">${q.bins.map((b, bi) => `<button class="bin" data-b="${bi}" style="--c:${bi ? 'var(--sky)' : 'var(--gold)'}">${esc(b)}</button>`).join('')}</span></div>`).join('');
      const sync = () => body.querySelectorAll('.sort-row').forEach(r => r.querySelectorAll('.bin').forEach(b => b.classList.toggle('on', answer[+r.dataset.i] === +b.dataset.b)));
      sync();
      body.onclick = e => {
        const b = e.target.closest('.bin'); if (!b || done) return;
        answer[+b.closest('.sort-row').dataset.i] = +b.dataset.b; Sound.sfx('tap');
        sync(); changed();
      };
      ctrl.reveal = () => {
        body.querySelectorAll('.sort-row').forEach(r => {
          const i = +r.dataset.i, ok = answer[i] === q.items[i][1];
          r.classList.add(ok ? 'ok' : 'bad');
          if (!ok) r.insertAdjacentHTML('beforeend', `<div class="fix">✔ שייך ל: ${esc(q.bins[q.items[i][1]])}</div>`);
        });
        finish();
      };
    }

    /* ---------- match ---------- */
    if (q.k === 'match') {
      answer = answer || new Array(q.pairs.length).fill(null);
      const rightOrder = shuffle(q.pairs.map((_, i) => i));
      body.innerHTML = `<div class="match-hint">לחצי על מושג מימין ואז על ההגדרה שמתאימה לו משמאל</div>
        <div class="match"><div class="col L">${q.pairs.map((p, i) => `<button class="mitem" data-l="${i}">${esc(p[0])}</button>`).join('')}</div>
        <div class="col R">${rightOrder.map(i => `<button class="mitem" data-r="${i}">${esc(q.pairs[i][1])}</button>`).join('')}</div></div>`;
      let selL = null;
      const sync = () => {
        body.querySelectorAll('[data-l]').forEach(b => {
          const l = +b.dataset.l, r = answer[l];
          b.classList.toggle('sel', selL === l);
          b.classList.toggle('paired', r != null);
          b.style.setProperty('--pc', PAIR_COLORS[l % PAIR_COLORS.length]);
        });
        body.querySelectorAll('[data-r]').forEach(b => {
          const r = +b.dataset.r, l = answer.indexOf(r);
          b.classList.toggle('paired', l >= 0);
          if (l >= 0) b.style.setProperty('--pc', PAIR_COLORS[l % PAIR_COLORS.length]);
        });
      };
      sync();
      body.onclick = e => {
        if (done) return;
        const L = e.target.closest('[data-l]'), R = e.target.closest('[data-r]');
        if (L) {
          const l = +L.dataset.l;
          if (answer[l] != null) { answer[l] = null; selL = l; }
          else selL = selL === l ? null : l;
          Sound.sfx('tap'); sync(); changed();
        } else if (R) {
          const r = +R.dataset.r;
          const owner = answer.indexOf(r);
          if (selL == null) { if (owner >= 0) { answer[owner] = null; sync(); changed(); } else UI.toast('קודם בחרי מושג מהעמודה הימנית 👉'); return; }
          if (owner >= 0) answer[owner] = null;
          answer[selL] = r; selL = null;
          Sound.sfx('pop'); sync(); changed();
        }
      };
      ctrl.reveal = () => {
        body.querySelectorAll('[data-l]').forEach(b => { const l = +b.dataset.l; b.classList.add(answer[l] === l ? 'ok' : 'bad'); });
        body.querySelector('.match').insertAdjacentHTML('afterend', `<div class="model"><h4>ההתאמה הנכונה</h4>${correctHtml(q)}</div>`);
        finish();
      };
    }

    /* ---------- open ---------- */
    if (q.k === 'open') {
      answer = answer || { text: '' };
      body.innerHTML = `<div class="open"><textarea placeholder="כתבי כאן את התשובה שלך…">${esc(answer.text || '')}</textarea></div>`;
      const ta = body.querySelector('textarea');
      ta.oninput = () => { answer.text = ta.value; changed(); };
      checkBtn.textContent = '👀 השוואה לתשובה לדוגמה';
      ctrl.reveal = () => {
        ta.readOnly = true; checkRow.classList.add('hidden');
        const hits = keywordHits(q, answer.text);
        body.insertAdjacentHTML('beforeend', `<div class="model"><h4>✨ תשובה לדוגמה <button class="icon-btn" style="display:inline-grid;width:34px;height:34px;font-size:1rem;vertical-align:middle" data-say>🔊</button></h4>
          <div>${esc(q.model)}</div>
          <div style="margin-top:10px"><b>מילות מפתח:</b> ${hits.map(h => `<span class="kw ${h.hit ? 'hit' : ''}">${h.hit ? '✔ ' : ''}${esc(h.label)}</span>`).join('')}</div>
          <p class="muted" style="margin:.6em 0 0">השווי את התשובה שלך. כמה הצלחת?</p>
          <div class="selfgrade">
            <button class="btn mint sm" data-g="1">💯 עניתי נכון</button>
            <button class="btn sm" data-g=".5">🤏 חלקית</button>
            <button class="btn ghost sm" data-g="0">📖 צריכה לחזור</button>
          </div></div>`);
        body.querySelector('[data-say]').onclick = () => Sound.say(q.id + '_m', q.model);
        Sound.say('open_check');
        body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
          answer.grade = +b.dataset.g;
          body.querySelectorAll('[data-g]').forEach(x => x.disabled = true);
          finish();
        });
      };
    }

    checkBtn.onclick = () => { if (!done && isComplete(q, answer)) { Sound.sfx('tap'); ctrl.reveal(); } };
    changed();
    return ctrl;
  }

  /* feedback panel after a practice answer */
  function feedback(host, q, res, { onNext, nextLabel = 'המשך ⟵', silent } = {}) {
    const ok = res.score === 1, half = res.score > 0 && res.score < 1;
    if (!silent) {
      Sound.sfx(ok ? 'correct' : 'wrong');
      if (q.k !== 'open') setTimeout(() => Sound.sayRandom(ok ? 'ok' : 'no', ok ? 10 : 6), 350);
    }
    const f = document.createElement('div');
    f.className = 'feedback ' + (ok || half ? 'ok' : 'bad');
    f.innerHTML = `<div class="head">${ok ? '🎉 נכון!' : half ? '👍 חלקית' : '💡 כמעט…'}</div>
      ${!ok && q.k === 'mc' ? `<div><b>התשובה הנכונה:</b> ${esc(q.o[0])}</div>` : ''}
      ${!ok && q.k === 'tf' ? `<div><b>התשובה הנכונה:</b> ${q.a ? 'נכון' : 'לא נכון'}</div>` : ''}
      ${!ok && q.k === 'order' ? `<div><b>הסדר הנכון:</b>${correctHtml(q)}</div>` : ''}
      ${q.x ? `<div class="x">${esc(q.x)} <button class="icon-btn" style="display:inline-grid;width:32px;height:32px;font-size:.95rem;vertical-align:middle" data-x>🔊</button></div>` : ''}
      ${q.p ? `<div class="page">${window.Book && Book.parse(q.p).length ? Book.chip(q.p, `לראות בספר: עמ' ${q.p}`) : `📖 בספר: עמ' ${q.p}`}</div>` : ''}
      <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn next">${nextLabel}</button></div>`;
    host.appendChild(f);
    const xb = f.querySelector('[data-x]'); if (xb) xb.onclick = () => Sound.say(q.id + '_x', q.x);
    f.querySelector('.next').onclick = () => { Sound.stop(); Sound.sfx('tap'); onNext && onNext(); };
    f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return f;
  }

  /* pick n questions from pool, weighting weak (low Leitner box) & unseen first */
  function pick(pool, n, sid, filter = () => true, avoid = new Set()) {
    let c = pool.filter(q => filter(q) && !avoid.has(q.id));
    if (c.length < n) c = c.concat(pool.filter(q => filter(q) && avoid.has(q.id)));
    if (c.length < n) c = c.concat(pool.filter(q => !filter(q) && !c.includes(q)));
    return c.map(q => ({ q, w: (sid ? Store.box(sid, q.id) : 0) + Math.random() * 2.2 }))
      .sort((a, b) => a.w - b.w).slice(0, n).map(x => x.q);
  }

  /* easy → hard: difficulty first, then how demanding the exercise kind is */
  const KIND_RANK = { tf: 0, mc: 1, sort: 2, match: 3, order: 4, open: 5 };
  const byDifficulty = qs => [...qs].sort((a, b) => (a.d - b.d) || (KIND_RANK[a.k] - KIND_RANK[b.k]));

  return { setTopics, render, feedback, grade, isComplete, correctHtml, answerHtml, keywordHits, pick, byDifficulty };
})();
