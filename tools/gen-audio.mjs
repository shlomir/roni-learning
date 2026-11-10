#!/usr/bin/env node
/* Pre-render every spoken line with a female Hebrew voice → MP3.
 * Usage: node tools/gen-audio.mjs geography-maps [--engine hila|carmit]
 *   hila   – Microsoft neural "he-IL-HilaNeural" via edge-tts (natural; default when tools/.venv has edge-tts)
 *   carmit – macOS built-in "Carmit" (offline fallback, robotic)
 * Re-runs only regenerate lines whose text or engine changed (audio/manifest.json keeps hashes). */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const args = process.argv.slice(2);
const dir = path.resolve(args.find(a => !a.startsWith('--')) || 'geography-maps');
const EDGE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '.venv/bin/edge-tts');
const engine = (args[args.indexOf('--engine') + 1] && args.includes('--engine')) ? args[args.indexOf('--engine') + 1] : (fs.existsSync(EDGE) ? 'hila' : 'carmit');
console.log('voice engine:', engine);
const outDir = path.join(dir, 'audio');
fs.mkdirSync(outDir, { recursive: true });

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['content.js', 'phrases.js', 'lessons.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
const { GEO, GEO_PHRASES, GEO_LESSONS, lessonLines } = ctx.window;

const clean = s => String(s)
  .replace(/\p{Extended_Pictographic}|️/gu, '')
  .replace(/תצ[״"]א/g, 'תצלום אוויר')
  .replace(/ס[״"]מ/g, 'סנטימטר').replace(/ק[״"]מ/g, 'קילומטר')
  .replace(/א[״"]ב/g, 'אלף בית')
  .replace(/ה־15/g, 'החמש עשרה')
  .replace(/כ־/g, 'כ')
  .replace(/[״"]/g, '')
  .replace(/־/g, ' ')
  .replace(/…/g, '...')
  .trim();

const lines = [];
for (const q of GEO.questions) {
  lines.push([q.id, q.say || q.q]);
  if (q.x) lines.push([q.id + '_x', q.x]);
  if (q.model) lines.push([q.id + '_m', q.model]);
  if (q.k === 'match') q.pairs.forEach((p, i) => { lines.push([`c_${q.id}_${i}_f`, p[0]]); lines.push([`c_${q.id}_${i}_b`, p[1]]); });
}
for (const [k, v] of Object.entries(GEO_PHRASES)) lines.push([k, v]);
if (GEO_LESSONS) lines.push(...lessonLines(GEO_LESSONS));

const manPath = path.join(outDir, 'manifest.json');
const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));

const todo = lines.filter(([k, t]) => {
  const h = crypto.createHash('md5').update(engine + '|' + clean(t)).digest('hex').slice(0, 10);
  const ok = manifest[k] === h && fs.existsSync(path.join(outDir, k + '.mp3'));
  if (!ok) manifest[k] = h;
  return !ok;
});

let done = 0;
async function one([k, t]) {
  if (engine === 'hila') {
    for (let attempt = 1; ; attempt++) {
      try { await run(EDGE, ['--voice', 'he-IL-HilaNeural', '--rate=-6%', '--text', clean(t), '--write-media', path.join(outDir, k + '.mp3')]); break; }
      catch (e) { if (attempt >= 4) throw e; await new Promise(r => setTimeout(r, 1500 * attempt)); }
    }
    if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`);
    return;
  }
  const aiff = path.join(tmp, k + '.aiff');
  await run('say', ['-v', 'Carmit', '-r', '168', '-o', aiff, clean(t)]);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ac', '1', '-ar', '22050', '-b:a', '40k', path.join(outDir, k + '.mp3')]);
  fs.unlinkSync(aiff);
  if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`);
}
const queue = [...todo];
await Promise.all(Array.from({ length: engine === 'hila' ? 4 : 6 }, async () => { while (queue.length) await one(queue.shift()); }));

/* drop stale files */
const keys = new Set(lines.map(l => l[0]));
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith('.mp3') && !keys.has(f.slice(0, -4))) fs.unlinkSync(path.join(outDir, f));
}
for (const k of Object.keys(manifest)) if (!keys.has(k)) delete manifest[k];
fs.writeFileSync(manPath, JSON.stringify(manifest, null, 0));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✔ ${lines.length} lines, ${todo.length} rendered → ${path.relative(process.cwd(), outDir)}`);
