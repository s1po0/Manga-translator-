# Manga-translator- — English → Kurdish Sorani (کوردی سۆرانی)

A single-page web tool that translates a **whole Manhwa/Manga chapter** (many speech
bubbles at once) from English into natural Kurdish Sorani.

## How to run

```bash
cd Manga-translator-
python3 -m http.server 8000 --bind 0.0.0.0
```

Then open `http://localhost:8000`.

## How translation works

The app calls **Google Gemini** directly from your browser (no server needed).
Gemini has a **free tier** — no credit card required.

1. Get a free key at <https://aistudio.google.com/apikey>
2. Open **Settings** in the app and paste the key.
3. Paste your chapter text (one speech bubble / narration per line).
4. Press **Translate to Kurdish Sorani** (or `Ctrl/Cmd + Enter`).

The key is stored only in your browser's `localStorage` and is never sent anywhere
except Google's API.

## Features

- Bulk chapter translation in one request (keeps names & terms consistent).
- Optional glossary to pin specific name/term translations.
- Kurdish output rendered right-to-left with preserved line breaks.
- Copy / download the result as UTF-8 text.

## Files

- `index.html` — markup
- `styles.css` — styling
- `app.js` — Gemini integration + logic
