# Minimal AI Chat

CS 121 Fall 2026 Capstone, by Enzo Massol.

A small responsive chat app (HTML, CSS, vanilla JavaScript) that sends text questions to a
large language model through OpenRouter. No login: each visitor pastes their own OpenRouter
API key, which is stored only in their browser's localStorage.

## Features
- Save / Forget API key (localStorage + in-memory)
- Rejects blank questions and requires a key
- Real OpenRouter response (`openrouter/free` model), user and assistant messages clearly separated
- "Thinking..." state, Send disabled while waiting, clear errors (bad key, network, service down)
- Responsive layout, visible labels, real buttons, keyboard focus styles

## Run locally
Open `index.html` in a browser.

## Live site
(Add your Netlify URL here)