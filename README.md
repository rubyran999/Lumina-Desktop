# Lumina

A lightweight, always-on-top desktop helper that lives in your system tray. Ask questions, set reminders, run timers, convert units, and chat with AI — all from a compact bubble interface.

![Lumina](https://img.shields.io/badge/Windows-10%2F11-blue)
![Tauri](https://img.shields.io/badge/Tauri-v2-purple)
![React](https://img.shields.io/badge/React-19-61dafb)

---

## Features

- **AI Chat** — Connect to Gemini, GPT-4o, Claude, DeepSeek, Kimi, or a custom endpoint
- **Pomodoro Timer** — Focus sessions with optional ticking sound, auto-start breaks
- **Reminders & Todos** — Set time-based reminders with native OS notifications
- **Unit Conversion** — Length, weight, temperature, currency, timezone lookup
- **Global Shortcut** — Press `Ctrl+Q` anywhere to toggle the widget
- **System Tray** — Minimize to tray; left-click tray icon to show/hide
- **No Installation Hassle** — Single `.exe` installer, no extra dependencies

---

## Download

| Platform | Installer | Size |
|----------|-----------|------|
| Windows x64 | [Lumina_0.1.0_x64-setup.exe](https://github.com/rubyran999/Lumina-Desktop/releases/download/v0.1.0/Lumina_0.1.0_x64-setup.exe) | 2.3 MB |
| Windows x64 (MSI) | [Lumina_0.1.0_x64_en-US.msi](https://github.com/rubyran999/Lumina-Desktop/releases/download/v0.1.0/Lumina_0.1.0_x64_en-US.msi) | 3.3 MB |

> Download the `.exe` and double-click to install. Lumina will start automatically.

---

## Quick Start

1. **Open** — Click the floating bubble or press `Ctrl+Q`
2. **Type** — Enter a command or natural language query
3. **Collapse** — Click outside the bubble, press `Escape`, or click the minimize button

---

## Commands

Type these in the input field:

| Command | Example | Description |
|---------|---------|-------------|
| `/pomo [name] [minutes]` | `/pomo Write report 25` | Start a focus timer |
| `/todo [task]` | `/todo Call mom at 3pm` | Add a reminder or todo |
| `/time [location]` | `/time Tokyo` | Show current time in any city/timezone |
| `/num [expression]` | `/num 12 x 45` | Calculator |
| `/tobe [value] to [unit]` | `/tobe 10km to miles` | Convert units |
| `/tobe [value]=[unit]` | `/tobe 100degF=degC` | Convert temperature |
| `/help` | `/help` | List all commands |

### Currency Conversion

Lumina auto-detects currency expressions:

```
100 USD to EUR
50 CNY
```

Supported: USD, EUR, GBP, CNY, JPY, CAD, AUD, HKD, SGD, INR, KRW, RUB, BRL, MXN, IDR, TRY, ZAR

### Unit Conversion

Auto-detects and converts when you type things like:

```
5 feet
12 lb
25 celsius
```

Results are shown in your preferred units (configurable in Settings).

### Time

Check time anywhere:

```
/time Paris
/time GMT+9
/time UTC-5
```

---

## Settings

Click the gear icon to open Settings:

- **Country/Region** — Auto-configures units, timezone, currency, date/number formats
- **AI Provider** — Choose Gemini, GPT-4o, Claude, DeepSeek, Kimi, or Custom
- **API Key** — Enter your provider's API key (stored locally)
- **Pomodoro** — Adjust focus/break duration, ticking sound, auto-start
- **Notifications** — Toggle notification sounds

All preferences are saved locally.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Q` | Toggle show/hide |
| `Escape` | Collapse widget |
| `Enter` | Send message |

---

## System Requirements

- Windows 10 or 11 (x64)
- No additional software required

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion
- **Desktop**: Tauri v2 (Rust)
- **Math**: MathJS
- **Markdown**: React Markdown + Remark GFM

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ workload)

### Run locally

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri-dev

# Build for production
npm run tauri-build
```

The built installers will be in `src-tauri/target/release/bundle/`.

---

## License

MIT

---

Made with [Tauri](https://tauri.app) + [React](https://react.dev)
