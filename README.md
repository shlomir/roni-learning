# האקדמיה של רוני 🎒

### 🌐 [לאתר: shlomir.github.io/roni-learning](https://shlomir.github.io/roni-learning/)

<a href="https://shlomir.github.io/roni-learning/"><img src="qr.svg" width="180" alt="QR code to the site"></a>

📱 סרקי עם מצלמת הטלפון כדי לפתוח את האתר

Hebrew exam-prep game sites for Roni. One folder per exam, with shared sound / progress / exercise-engine modules.

## Sites
| Exam | Folder | Games |
|---|---|---|
| גאוגרפיה – פרק 1 "יוצאים לדרך" + האטלס (מבחן 12/11) | `geography-maps/` | 📖 5 שיעורים אינטראקטיביים · 🏝️ ארכיפלג המפות · 🎤 רוני שואו · 🎓 מבחן חזרה גמר |

Plan document: [`plans/geography.html`](plans/geography.html)

## Structure
```
index.html                 academy hub
shared/
  theme.css                design tokens, buttons, question card, modals
  progress.js              localStorage store (key roni-academy:v1), Leitner boxes, backup code
  sound.js                 Web Audio SFX + female Hebrew voice (MP3, speechSynthesis fallback)
  engine.js                6 exercise kinds: mc, tf, order, sort, match, open
  lesson.js / lesson.css   narrated interactive lesson player (flip cards, book, rings, compare,
                           timeline, map shop, treasure walk, atlas index, map-maker, checks)
  ui.js                    stars, confetti, modals, top bar, start gate
  book.js                  book page viewer (Book.open('18–20'), Book.chip, "what's in the book" map)
geography-maps/
  index.html               welcome page: pick a game, mastery, backup/restore
  archipelago.html         5 islands × (3 levels + captain) → lighthouse + golden question
  show.html                12-step million ladder (lifelines) → million question; speed round; flashcards
  exam.html                20-question rehearsal (16 closed + 4 open, self-graded), score /100
  content.js               95 questions (edit here)
  book.js                  what is on each book page
  materials/book/          scanned page images (LOCAL ONLY, git-ignored; public site shows page number + title instead)
  phrases.js               spoken lines
  lessons.js               one interactive lesson per topic (shown before each island / in the Show's rehearsal room)
  audio/                   pre-rendered MP3s (generated)
tools/gen-audio.mjs        renders all lines with macOS voice "Carmit" (female he-IL)
tools/responsive.html      preview any page at a device width: ?w=360&h=740&src=../geography-maps/index.html
```

## Voice
All narration is pre-rendered to MP3 with the female neural voice **Hila** (`he-IL-HilaNeural`, via edge-tts), so it plays in any browser, offline.
After editing `content.js`, `phrases.js` or `lessons.js`:
```bash
node tools/gen-audio.mjs geography-maps            # Hila (needs tools/.venv with edge-tts)
node tools/gen-audio.mjs geography-maps --engine carmit   # offline macOS fallback
```
One-time setup of the local tool environment (Apple's Python; Homebrew's is broken on this Mac):
```bash
TMPDIR=$PWD/.tmp /usr/bin/python3 -m venv tools/.venv && tools/.venv/bin/pip install edge-tts
```
Only changed lines are re-rendered. Missing files fall back to the browser's Hebrew voice.

## Run locally
Open `index.html`, or:
```bash
python3 -m http.server 8000
```
Progress and the current screen/step are saved on every action, so a refresh resumes exactly where Roni was.

Scanned textbook material is **not** in the repo (copyright), only our own questions.
