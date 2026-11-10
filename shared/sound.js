/* האקדמיה של רוני · sound: synthesized SFX + female Hebrew voice
 * Voice = pre-rendered MP3s (macOS "Carmit", see tools/gen-audio.mjs).
 * Fallback = browser speechSynthesis, preferring a female he-IL voice. */
window.Sound = (() => {
  let base = 'audio/', texts = {};
  const audio = new Audio();
  audio.preload = 'auto';
  let token = 0;

  function config(opts) { base = opts.base ?? base; texts = opts.texts ?? texts; }
  const S = () => window.Store ? Store.settings : { sfx: true, voice: true };

  /* ---------- voice ---------- */
  let heVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const v = speechSynthesis.getVoices().filter(v => /^(he|iw)/i.test(v.lang));
    heVoice = v.find(v => /carmit|female|woman|אישה/i.test(v.name)) || v.find(v => !/male|asaf|אסף/i.test(v.name)) || v[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function speak(text, onend) {
    if (!text || !('speechSynthesis' in window)) { onend && onend(); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}/gu, ''));
    u.lang = 'he-IL'; if (heVoice) u.voice = heVoice;
    u.rate = .95; u.pitch = heVoice && /carmit/i.test(heVoice.name) ? 1.05 : 1.25;
    if (onend) u.onend = onend;
    speechSynthesis.speak(u);
  }

  function stop() {
    token++;
    try { audio.pause(); } catch (e) {}
    audio.onended = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  /* say(key[, fallbackText][, onend]) */
  function say(key, text, onend) {
    if (typeof text === 'function') { onend = text; text = null; }
    stop();
    if (!S().voice) { onend && onend(); return; }
    const my = token;
    let fell = false;
    const fallback = () => {
      if (fell || my !== token) return; fell = true;
      speak(text || texts[key], onend);
    };
    audio.onerror = fallback;
    audio.onended = () => { if (my === token && onend) onend(); };
    audio.src = base + key + '.mp3';
    const p = audio.play();
    if (p) p.catch(e => {
      if (e.name === 'NotAllowedError') { if (my === token && onend) onend(); }
      else if (e.name !== 'AbortError') fallback();
    });
  }
  function sayRandom(prefix, n, onend) { say(prefix + (1 + Math.floor(Math.random() * n)), onend); }

  /* ---------- SFX (Web Audio, no files) ---------- */
  let ac;
  function A() {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, t0, d, type = 'sine', g = .18, f2) {
    const a = A(), o = a.createOscillator(), v = a.createGain(), t = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .01);
    v.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(v).connect(a.destination); o.start(t); o.stop(t + d + .05);
  }
  function noise(t0, d, g = .2, hp = 800, lp) {
    const a = A(), b = a.createBuffer(1, Math.max(1, a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain();
    f.type = lp ? 'lowpass' : 'highpass'; f.frequency.value = lp || hp; v.gain.value = g;
    s.buffer = b; s.connect(f).connect(v).connect(a.destination); s.start(a.currentTime + t0);
  }
  const FX = {
    tap() { tone(880, 0, .06, 'triangle', .06); },
    pop() { tone(500, 0, .09, 'sine', .14, 1200); },
    correct() { tone(660, 0, .15, 'triangle'); tone(990, .12, .3, 'triangle'); },
    wrong() { tone(330, 0, .18, 'sine', .15, 260); tone(262, .16, .3, 'sine', .12, 220); },
    star() { [1319, 1568, 2093, 2637].forEach((f, i) => tone(f, i * .07, .35, 'sine', .1)); },
    coin() { tone(1568, 0, .07, 'square', .05); tone(2093, .07, .25, 'square', .05); },
    fanfare() { [[523, 0], [659, .12], [784, .24], [1047, .36]].forEach(([f, t]) => tone(f, t, .22, 'square', .07)); tone(1047, .6, .8, 'square', .08); tone(784, .6, .8, 'triangle', .08); tone(523, .6, .8, 'triangle', .08); },
    unlock() { noise(0, .05, .3, 2000); tone(180, .06, .12, 'square', .12, 90); noise(.2, .08, .25, 1200); tone(880, .3, .4, 'triangle', .12); },
    whoosh() { noise(0, .6, .12, 0, 1800); tone(220, 0, .6, 'sine', .05, 900); },
    heart() { tone(196, 0, .25, 'sawtooth', .08, 98); tone(147, .2, .4, 'sawtooth', .07, 73); },
    tick() { tone(1200, 0, .03, 'square', .05); },
    drum() { for (let i = 0; i < 14; i++) noise(i * .075, .07, .18 + i * .01, 0, 400); },
    lose() { [392, 370, 349, 330].forEach((f, i) => tone(f, i * .28, .3, 'sawtooth', .07)); },
    applause() { for (let i = 0; i < 40; i++) noise(Math.random() * 1.6, .04, .12, 1500); },
    splash() { noise(0, .5, .2, 0, 1200); tone(300, 0, .3, 'sine', .05, 120); },
    warp() { tone(200, 0, .9, 'sawtooth', .06, 1800); tone(300, .05, .9, 'sine', .08, 2400); noise(0, .9, .06, 3000); }
  };
  function sfx(name) { if (!S().sfx) return; try { FX[name] && FX[name](); } catch (e) {} }
  function unlock() { try { A(); } catch (e) {} }

  return { config, say, sayRandom, speak, stop, sfx, unlock };
})();
