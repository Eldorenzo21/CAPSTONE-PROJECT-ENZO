const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free"; // OpenRouter free router
const STORAGE_KEY = "openrouter_api_key";

const keyForm = document.getElementById("key-form");
const keyInput = document.getElementById("api-key");
const forgetBtn = document.getElementById("forget-key");
const keyStatus = document.getElementById("key-status");
const askForm = document.getElementById("ask-form");
const questionEl = document.getElementById("question");
const sendBtn = document.getElementById("send");
const thinkingEl = document.getElementById("thinking");
const errorEl = document.getElementById("ask-error");
const messagesEl = document.getElementById("messages");
const emptyEl = document.getElementById("empty");

let apiKey = ""; // key held in memory

// ---- Storage helpers (wrapped: storage can be blocked) ----
function loadKey() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
}
function saveKey(value) {
  try { localStorage.setItem(STORAGE_KEY, value); return true; } catch { return false; }
}
function removeKey() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// ---- API key settings ----
keyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = keyInput.value.trim();
  if (!value) {
    keyStatus.textContent = "Enter your OpenRouter API key first.";
    keyInput.focus();
    return;
  }
  apiKey = value;
  keyStatus.textContent = saveKey(value)
    ? "Key saved in this browser."
    : "Key kept for this visit only (browser storage is blocked).";
});

forgetBtn.addEventListener("click", () => {
  apiKey = "";
  removeKey();
  keyInput.value = "";
  keyStatus.textContent = "Key removed.";
});

// ---- Messages ----
function addMessage(role, text, failed = false) {
  if (emptyEl) emptyEl.hidden = true;
  const div = document.createElement("div");
  div.className = "msg " + role + (failed ? " failed" : "");
  const who = document.createElement("span");
  who.className = "who";
  who.textContent = role === "user" ? "You" : "Assistant";
  const body = document.createElement("span");
  body.textContent = text; // textContent avoids HTML injection
  div.append(who, body);
  messagesEl.append(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}
function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
}
function setBusy(busy) {
  sendBtn.disabled = busy;
  thinkingEl.hidden = !busy;
}

// ---- Ask a question ----
askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const question = questionEl.value.trim();
  if (!question) {
    showError("Type a question before sending.");
    questionEl.focus();
    return;
  }
  if (!apiKey) {
    showError("Save your OpenRouter API key above before sending.");
    keyInput.focus();
    return;
  }

  addMessage("user", question);
  setBusy(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: question }]
      })
    });

    let data = null;
    try { data = await response.json(); } catch { /* non-JSON body */ }

    if (!response.ok) {
      throw new Error(describeHttpError(response.status, data));
    }

    const answer = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (!answer) throw new Error("The model returned an empty answer. Please try again.");

    addMessage("assistant", answer.trim());
    questionEl.value = "";
  } catch (err) {
    const message = err instanceof TypeError
      ? "Network problem. Check your internet connection and try again."
      : err.message;
    showError(message);
    addMessage("assistant", message, true);
  } finally {
    setBusy(false);
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

// Ctrl/Cmd + Enter sends
questionEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    askForm.requestSubmit();
  }
});

// ---- Load saved key on return ----
apiKey = loadKey();
if (apiKey) {
  keyInput.value = apiKey;
  keyStatus.textContent = "Saved key loaded.";
}