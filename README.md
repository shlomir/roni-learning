# האקדמיה של רוני 🎒

Hebrew learning & exam-prep game sites for Roni. One folder per exam, with shared sound / progress / exercise-engine modules.

## Sites
| Exam | Folder | Status |
|---|---|---|
| גאוגרפיה – פרק 1 "יוצאים לדרך" (מפות) | `geography-maps/` | 📄 plan: [`plans/geography.html`](plans/geography.html) |

## Principles
- Pure HTML/CSS/JS, no build step, RTL + mobile-first
- Progress saved in `localStorage` (key `roni-academy:v1`)
- Content lives in `content.json` per exam, so new exams reuse the engine
- Scanned textbook material is **not** committed (copyright), only our own questions

## Run locally
```bash
python3 -m http.server 8000
```
