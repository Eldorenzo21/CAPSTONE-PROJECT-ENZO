# TUSK AI

CS 121 Fall 2026 Capstone, by Enzo Massol.

TUSK AI is a small responsive chat app (HTML, CSS, vanilla JavaScript) that sends questions to a
large language model through OpenRouter. There is no account and no login: on the Welcome screen,
each visitor types a display name and pastes their own OpenRouter API key, then chats.

- GitHub repo: https://github.com/Eldorenzo21/CAPSTONE-PROJECT-ENZO
- Live site: https://brilliant-meringue-233e04.netlify.app/

## Setup
1. Create a free account at openrouter.ai and create an API key (set an expiration and a small credit limit).
2. Open the live site (or open `index.html` locally).
3. Enter your name, paste the key, and click **Save & start**.
4. Type a question and click **Send** (or press Enter).

No build step is needed. To deploy: push the files to a public GitHub repo and import the repo in Netlify (no build command).

## Model
Router ID: `openrouter/free` (OpenRouter free router). Requests use `stream: false`.
Free models have usage limits and can be unavailable. The app never switches to a paid model.

## localStorage usage
- `tuskai_api_key`: the visitor's API key. Loaded on return. **Forget key** removes it and clears the value held in memory.
- `tuskai_name`: the visitor's display name, used for the greeting.
- `tuskai_history`: the conversation saved as JSON (role, content, display text, file name). The API key is never saved in history.
- `tuskai_theme`: light or dark mode.

The key is not in this repository. It is still readable by JavaScript running on the page, so use a limited, expiring key.

## Features
- Welcome screen for name and API key, with Save and Forget key buttons (Forget key is also in the chat menu)
- Rejects blank questions and requires a key before sending
- Real OpenRouter responses, with the user's questions and TUSK AI's answers clearly separated
- "Thinking…" status with an animated indicator, Send disabled while waiting, clear errors (invalid key, no credits, rate limit, network failure, service unavailable), and the question returned so the visitor can retry
- Honest status: the key is only shown as verified after a successful request
- Privacy notice before the first request
- Responsive layout, visible labels, real buttons, keyboard focus styles, light/dark theme
- Extras: suggestion buttons, Copy button on answers, code block formatting, auto-growing input

## Completed bonuses
- **New chat (+2):** clears the display and the conversation context without deleting the API key.
- **Chat history (+4):** each reply is saved to localStorage as JSON and restored on refresh. **Reopen saved chat** reloads it after New chat, and **Clear saved history** deletes it. For follow-up questions, the earlier user and assistant messages are sent with the new question so the model has context.
- **File upload (+4):** one attachment type, `.txt` files up to 50 KB. The filename is shown, the file can be removed before Send, and unsupported or oversized files are rejected. The file text is read with `File.text()` and included in the prompt.

## Known limitations
- Free models can be slow, rate limited or unavailable.
- Formatting support is basic (bold, inline code and code blocks only).
- A new reply after New chat overwrites the previously saved chat.
- Only `.txt` attachments are supported (no images or PDFs).
- The key sits in browser storage, so do not use the app on a shared computer without clicking Forget key.

## Privacy
Questions and attached files are sent to OpenRouter and its model provider. Use non-sensitive test data only.

## Checks performed
(Tick each box only after you have tested it yourself.)
- [ ] Real question and response
- [ ] Blank question rejected
- [ ] Missing key and invalid key errors
- [ ] Offline mode error
- [ ] Repeated Send clicks (Send disabled while thinking)
- [ ] Key and name persist after refresh
- [ ] Forget key removes the key
- [ ] Phone and desktop layouts
- [ ] New chat, history restore/clear, and .txt upload (including rejecting a non-.txt file)
- [ ] Live Netlify site tested in a fresh browser session

## AI usage statement
I used Claude (Anthropic) to help generate the starting code and this README. I reviewed the code, tested each feature in my browser (see the checks above), and deployed it myself. I can explain and modify the code.
