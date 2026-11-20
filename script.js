const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";            // OpenRouter free router
const KEY_STORAGE = "tuskai_api_key";       // API key
const NAME_STORAGE = "tuskai_name";         // visitor's display name
const HISTORY_STORAGE = "tuskai_history";   // chat history as JSON
const THEME_STORAGE = "tuskai_theme";       // light or dark
const MAX_FILE_BYTES = 50 * 1024;           // 50 KB limit for .txt files

const $ = (id) => document.getElementById(id);
const welcomeEl = $("welcome"), appEl = $("app"), welcomeForm = $("welcome-form");
const nameInput = $("name"), keyInput = $("api-key");
const welcomeError = $("welcome-error"), welcomeNote = $("welcome-note");
const greetingEl = $("greeting"), messagesEl = $("messages"), emptyEl = $("empty"), statusEl = $("status");
const askForm = $("ask-form"), questionEl = $("question"), sendBtn = $("send");
const fileInput = $("file"), fileChip = $("file-chip"), fileNameEl = $("file-name");
const menuEl = $("menu"), reopenBtn = $("reopen-chat"), clearBtn = $("clear-history"), themeBtn = $("theme-btn");

let apiKey = "";         // key held in memory
let userName = "";
let history = [];        // conversation context: {role, content, display?, fileName?}
let attachedFile = null; // {name, text}
let busy = false;
let verified = false;    // true only after a successful API request

// ---- Small helpers ----
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}
function storageGet(name) { try { return localStorage.getItem(name); } catch { return null; } }
function storageSet(name, value) { try { localStorage.setItem(name, value); return true; } catch { return false; } }
function storageRemove(name) { try { localStorage.removeItem(name); } catch { /* ignore */ } }

function readSavedHistory() {
  try {
    const data = JSON.parse(storageGet(HISTORY_STORAGE) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
  } catch { return []; }
}
function saveHistory() { storageSet(HISTORY_STORAGE, JSON.stringify(history)); updateButtons(); }
function updateButtons() {
  reopenBtn.disabled = readSavedHistory().length === 0;
  clearBtn.disabled = storageGet(HISTORY_STORAGE) === null;
}

// ---- Status line ----
function setStatus(text, isError = false) {
  statusEl.textContent = "Status: " + text;
  statusEl.classList.toggle("error", isError);
}
function setReady() { setStatus(verified ? "Ready (key verified by a successful request)" : "Ready"); }

// ---- Screens ----
function showScreen(name) {
  welcomeEl.hidden = name !== "welcome";
  appEl.hidden = name !== "app";
  if (name === "app") { greetingEl.textContent = "Hello, " + userName; questionEl.focus(); }
  else nameInput.focus();
}

welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const key = keyInput.value.trim();
  welcomeNote.textContent = "";
  if (!name) { welcomeError.textContent = "Enter your name to continue."; nameInput.focus(); return; }
  if (!key) { welcomeError.textContent = "Enter your OpenRouter API key to continue."; keyInput.focus(); return; }
  welcomeError.textContent = "";
  userName = name;
  apiKey = key;
  verified = false;
  storageSet(NAME_STORAGE, name);
  const saved = storageSet(KEY_STORAGE, key);
  showScreen("app");
  setStatus(saved
    ? "Key saved in this browser. Not tested yet: it is confirmed after your first successful question."
    : "Key kept for this visit only (browser storage is blocked). Not tested yet.");
});

function forgetKey() {
  apiKey = "";
  verified = false;
  storageRemove(KEY_STORAGE);
  keyInput.value = "";
  welcomeError.textContent = "";
  welcomeNote.textContent = "Key removed from this browser and from memory.";
  showScreen("welcome");
}
$("forget-key").addEventListener("click", forgetKey);
$("forget-key-menu").addEventListener("click", forgetKey);
$("settings-btn").addEventListener("click", () => {
  nameInput.value = userName;
  keyInput.value = apiKey;
  welcomeNote.textContent = "";
  showScreen("welcome");
});

// ---- Theme ----
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  storageSet(THEME_STORAGE, next);
  applyTheme(next);
});
applyTheme(storageGet(THEME_STORAGE) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
menuEl.addEventListener("click", (event) => { if (event.target.closest("button")) menuEl.open = false; });

// ---- Rendering messages (safe: only textContent, never innerHTML) ----
function renderInline(parent, text) {
  text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/).forEach((part) => {
    if (/^`[^`\n]+`$/.test(part)) parent.append(el("code", "", part.slice(1, -1)));
    else if (/^\*\*[^*\n]+\*\*$/.test(part)) parent.append(el("strong", "", part.slice(2, -2)));
    else parent.append(document.createTextNode(part));
  });
}
function renderRichText(parent, text) {
  text.split("```").forEach((part, i) => {
    if (i % 2 === 1) {
      const pre = el("pre");
      pre.append(el("code", "", part.replace(/^[^\n]*\n/, "").replace(/\n$/, "")));
      parent.append(pre);
    } else renderInline(parent, part);
  });
}
function updateEmpty() { emptyEl.hidden = messagesEl.querySelector(".msg") !== null; }
function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

function renderMessage(msg) {
  const div = el("div", "msg " + msg.role);
  div.append(el("span", "who", msg.role === "user" ? "You" : "TUSK AI"));
  const body = el("div", "body");
  if (msg.role === "assistant") renderRichText(body, msg.content);
  else body.textContent = msg.display || msg.content;
  div.append(body);
  if (msg.fileName) div.append(el("span", "file", "Attached: " + msg.fileName));
  if (msg.role === "assistant") {
    const copy = el("button", "ghost small copy", "Copy");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(msg.content); copy.textContent = "Copied"; }
      catch { copy.textContent = "Copy failed"; }
      setTimeout(() => { copy.textContent = "Copy"; }, 1500);
    });
    div.append(copy);
  }
  messagesEl.append(div);
  updateEmpty();
  scrollDown();
  return div;
}
function addTyping() {
  const div = el("div", "msg assistant typing");
  div.setAttribute("aria-hidden", "true");
  div.append(el("span", "dot"), el("span", "dot"), el("span", "dot"));
  messagesEl.append(div);
  updateEmpty();
  scrollDown();
  return div;
}
function clearDisplay() {
  messagesEl.querySelectorAll(".msg").forEach(node => node.remove());
  updateEmpty();
}

// ---- Textarea behaviour ----
function autoGrow() {
  questionEl.style.height = "auto";
  questionEl.style.height = Math.min(questionEl.scrollHeight, 200) + "px";
}
questionEl.addEventListener("input", autoGrow);
questionEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    askForm.requestSubmit();
  }
});
document.querySelectorAll(".sugg").forEach((btn) => btn.addEventListener("click", () => {
  questionEl.value = btn.dataset.q;
  autoGrow();
  questionEl.focus();
}));

// ---- File attachment (.txt only) ----
function rejectFile(message) { fileInput.value = ""; setStatus(message, true); }
function clearFile() {
  attachedFile = null;
  fileInput.value = "";
  fileChip.hidden = true;
  fileNameEl.textContent = "";
}
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".txt")) { rejectFile("Unsupported file. Only .txt files can be attached."); return; }
  if (file.size > MAX_FILE_BYTES) { rejectFile("That file is too large. The limit is 50 KB."); return; }
  try {
    const text = await file.text();
    if (!text.trim()) { rejectFile("That file is empty."); return; }
    attachedFile = { name: file.name, text };
    fileNameEl.textContent = "Attached: " + file.name;
    fileChip.hidden = false;
    setReady();
  } catch { rejectFile("Could not read that file. Try another one."); }
});
$("remove-file").addEventListener("click", () => { clearFile(); setStatus("Attachment removed."); });

// ---- Chat controls ----
$("new-chat").addEventListener("click", () => {
  history = [];
  clearDisplay();
  clearFile();
  questionEl.value = "";
  autoGrow();
  setStatus("New chat started. Your API key is kept.");
});
reopenBtn.addEventListener("click", () => {
  const saved = readSavedHistory();
  if (!saved.length) { setStatus("No saved chat to reopen.", true); return; }
  history = saved;
  clearDisplay();
  history.forEach(renderMessage);
  setStatus("Saved chat reopened.");
});
clearBtn.addEventListener("click", () => {
  storageRemove(HISTORY_STORAGE);
  updateButtons();
  setStatus("Saved history deleted from this browser.");
});

// ---- Ask a question ----
askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;

  const question = questionEl.value.trim();
  if (!question) { setStatus("Type a question before sending.", true); questionEl.focus(); return; }
  if (!apiKey) { setStatus("Save your OpenRouter API key before sending.", true); showScreen("welcome"); return; }

  let content = question;
  if (attachedFile) {
    content += "\n\n--- Attached file: " + attachedFile.name + " ---\n" + attachedFile.text + "\n--- End of file ---";
  }
  const userMsg = { role: "user", content, display: question, fileName: attachedFile ? attachedFile.name : "" };
  const pendingEl = renderMessage(userMsg);
  const typingEl = addTyping();
  busy = true;
  sendBtn.disabled = true;
  setStatus("Thinking…");

  try {
    const messages = history.map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: "user", content });

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, stream: false })
    });

    let data = null;
    try { data = await response.json(); } catch { /* non-JSON body */ }
    if (!response.ok) throw new Error(describeHttpError(response.status, data));

    const answer = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!answer) throw new Error("The model returned an empty answer. Please try again.");

    const assistantMsg = { role: "assistant", content: answer.trim() };
    history.push(userMsg, assistantMsg);
    typingEl.remove();
    renderMessage(assistantMsg);
    saveHistory();
    questionEl.value = "";
    autoGrow();
    clearFile();
    verified = true;
    setReady();
  } catch (err) {
    // Remove the unanswered question so the visitor can try again
    pendingEl.remove();
    updateEmpty();
    setStatus(err instanceof TypeError ? "Network problem. Check your internet connection and try again." : err.message, true);
  } finally {
    typingEl.remove();
    busy = false;
    sendBtn.disabled = false;
    questionEl.focus();
  }
});

function describeHttpError(status, data) {
  const detail = data && data.error && data.error.message ? " (" + data.error.message + ")" : "";
  if (status === 401 || status === 403) return "Your API key was rejected. Check it and save it again." + detail;
  if (status === 402) return "Your OpenRouter account has no credits for this request." + detail;
  if (status === 429) return "Too many requests. Wait a moment and try again." + detail;
  if (status >= 500) return "The AI service is unavailable right now. Try again shortly." + detail;
  return "Request failed (status " + status + ")." + detail;
}

// ---- On page load: restore name, key and saved chat ----
userName = storageGet(NAME_STORAGE) || "";
apiKey = storageGet(KEY_STORAGE) || "";
nameInput.value = userName;
keyInput.value = apiKey;
history = readSavedHistory();
history.forEach(renderMessage);
updateEmpty();
updateButtons();
if (userName && apiKey) {
  showScreen("app");
  setStatus("Saved key loaded. Not tested yet.");
} else {
  showScreen("welcome");
}
