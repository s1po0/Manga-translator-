"use strict";

/* ---------------------------------------------------------------
 * Manhwa / Manga Translator — English → Kurdish Sorani
 * Bulk chapter translation via Google Gemini (free tier).
 * ------------------------------------------------------------- */

const els = {
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  apiKey: document.getElementById("apiKey"),
  keyToggle: document.getElementById("keyToggle"),
  model: document.getElementById("model"),
  glossary: document.getElementById("glossary"),
  source: document.getElementById("source"),
  output: document.getElementById("output"),
  srcCount: document.getElementById("srcCount"),
  outCount: document.getElementById("outCount"),
  clearSrc: document.getElementById("clearSrc"),
  pasteBtn: document.getElementById("pasteBtn"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  translateBtn: document.getElementById("translateBtn"),
  translateLabel: document.getElementById("translateLabel"),
  status: document.getElementById("status"),
};

const LS_KEY = "manga_tr_ckb";

/* ---------- Persistence ---------- */
function saveSettings() {
  const data = {
    key: els.apiKey.value.trim(),
    model: els.model.value,
    glossary: els.glossary.value,
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {}
}

function loadSettings() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (_) {}
  if (data) {
    if (data.key) els.apiKey.value = data.key;
    if (data.model) els.model.value = data.model;
    if (data.glossary) els.glossary.value = data.glossary;
  }
}

/* ---------- System prompt ---------- */
const SYSTEM_PROMPT = `You are a professional Manhwa and Manga translator. Your ONLY task is to translate Manhwa/Manga text from English into natural Kurdish Sorani (کوردی سۆرانی), written in the Arabic script.

Rules:
- Translate the entire provided text into Kurdish Sorani.
- Do not summarize, explain, or add your own content.
- Do not remove any dialogue or narration.
- Do not change the meaning.
- Do not translate word-for-word when it sounds unnatural.
- Make the Kurdish sound natural, fluent, and easy to understand.
- Preserve each character's emotion, personality, tone, and speaking style.
- Keep names, skills, techniques, titles, places, and special terminology consistent throughout the whole text.
- Translate SFX / sound effects naturally when appropriate.
- Preserve the original line breaks and formatting exactly: keep every line as its own line, in the same order.
- Keep the same number of lines as the input (one output line per input line).

Output format:
- Output ONLY the Kurdish Sorani translation, line by line, matching the input lines exactly.
- Do not include the English original.
- Do not include any explanations, notes, numbering, or labels.`;

/* ---------- Build user content ---------- */
function buildUserContent() {
  const lines = els.source.value
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""));

  let content = "Translate the following Manhwa/Manga chapter. One line per speech bubble/narration.\n\n";

  const glossary = els.glossary.value.trim();
  if (glossary) {
    content += "Use these exact term translations consistently:\n" + glossary + "\n\n";
  }

  content += "TEXT:\n" + lines.join("\n");
  return content;
}

/* ---------- Count lines ---------- */
function updateCounts() {
  const srcLines = els.source.value.split("\n").filter((l) => l.trim() !== "").length;
  const outLines = els.output.value.split("\n").filter((l) => l.trim() !== "").length;
  els.srcCount.textContent = srcLines + (srcLines === 1 ? " line" : " lines");
  els.outCount.textContent = outLines + (outLines === 1 ? " line" : " lines");
}

/* ---------- Status ---------- */
function setStatus(msg, kind) {
  els.status.textContent = msg || "";
  els.status.className = "status" + (kind ? " " + kind : "");
}

/* ---------- Translate ---------- */
async function translate() {
  const key = els.apiKey.value.trim();
  if (!key) {
    els.settingsPanel.classList.remove("hidden");
    els.apiKey.focus();
    setStatus("Add your free Gemini API key first (Settings).", "err");
    return;
  }

  const text = els.source.value.trim();
  if (!text) {
    setStatus("Paste some English text to translate first.", "err");
    return;
  }

  const model = els.model.value;
  const userContent = buildUserContent();

  els.translateBtn.disabled = true;
  els.translateLabel.textContent = "Translating…";
  setStatus("Translating (this can take a few seconds)…");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(key);

  const body = {
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(apiErrorMessage(res.status, errText));
    }

    const data = await res.json();
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate && candidate.content && candidate.content.parts;
    let out = "";
    if (parts) {
      for (const p of parts) {
        if (p.text) out += p.text;
      }
    }
    out = out.trim();

    if (!out) {
      throw new Error("The model returned an empty response. Try again.");
    }

    els.output.value = out;
    setStatus("Done ✓", "ok");
    updateCounts();
  } catch (err) {
    setStatus("Error: " + err.message, "err");
  } finally {
    els.translateBtn.disabled = false;
    els.translateLabel.textContent = "Translate to Kurdish Sorani";
  }
}

function apiErrorMessage(status, body) {
  let detail = "";
  try {
    const j = JSON.parse(body);
    detail = (j.error && j.error.message) || "";
  } catch (_) {}

  if (status === 400 && /API key not valid/i.test(detail)) {
    return "Invalid API key. Check it in Settings.";
  }
  if (status === 403) {
    return "API key has no permission / quota. Check your key or region.";
  }
  if (status === 404) {
    return "Model not found. Pick a different model in Settings.";
  }
  if (status === 429) {
    return "Rate limit reached. Wait a moment and try again.";
  }
  if (detail) return detail;
  return "Request failed (HTTP " + status + ").";
}

/* ---------- Copy / Download ---------- */
async function copyOutput() {
  const out = els.output.value;
  if (!out) { setStatus("Nothing to copy yet.", "err"); return; }
  try {
    await navigator.clipboard.writeText(out);
    setStatus("Copied to clipboard ✓", "ok");
  } catch (_) {
    els.output.select();
    document.execCommand("copy");
    setStatus("Copied ✓", "ok");
  }
}

function downloadOutput() {
  const out = els.output.value;
  if (!out) { setStatus("Nothing to download yet.", "err"); return; }
  const blob = new Blob(["\uFEFF" + out], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "translated-kurdish-sorani.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Wiring ---------- */
els.settingsToggle.addEventListener("click", () => {
  els.settingsPanel.classList.toggle("hidden");
});
els.keyToggle.addEventListener("click", () => {
  const isPw = els.apiKey.type === "password";
  els.apiKey.type = isPw ? "text" : "password";
  els.keyToggle.textContent = isPw ? "Hide" : "Show";
});
els.apiKey.addEventListener("input", saveSettings);
els.model.addEventListener("change", saveSettings);
els.glossary.addEventListener("input", saveSettings);

els.source.addEventListener("input", updateCounts);
els.output.addEventListener("input", updateCounts);
els.clearSrc.addEventListener("click", () => {
  els.source.value = "";
  els.output.value = "";
  updateCounts();
  els.source.focus();
});
els.pasteBtn.addEventListener("click", async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (t) { els.source.value = t; updateCounts(); setStatus("Pasted ✓", "ok"); }
  } catch (_) {
    els.source.focus();
    setStatus("Clipboard blocked by browser — paste with Ctrl/Cmd+V.", "err");
  }
});
els.copyBtn.addEventListener("click", copyOutput);
els.downloadBtn.addEventListener("click", downloadOutput);
els.translateBtn.addEventListener("click", translate);

/* Ctrl/Cmd + Enter to translate */
els.source.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    translate();
  }
});

/* Init */
loadSettings();
updateCounts();
