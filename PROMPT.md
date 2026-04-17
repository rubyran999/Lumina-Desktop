# Lumina - Lightweight Desktop Helper Rebuild Prompt

You can use the following prompt to rebuild this application from scratch using a modern AI coding assistant.

---

## App Name: Lumina
## Description: A lightweight, glassmorphism-style desktop assistant widget with unit conversion, smart calculations, Pomodoro timers, and natural language reminders.

### Core Features:

1.  **Glassmorphism UI & Interaction**:
    *   **Bubble Trigger**: A fixed 56x56px (`w-14 h-14`) rounded-full button in the bottom-right. Indigo-600 background. Rotates 90 degrees when expanded. Shows a red badge with the count of active reminders.
    *   **Main Widget**: Semi-transparent (`bg-white/10 backdrop-blur-xl border-white/20`) with rounded-3xl corners.
    *   **States**: 
        *   **Collapsed**: Only the bubble is visible.
        *   **Minimalist**: Widget is 300px wide, showing only the "Next" section and input.
        *   **Expanded History**: Widget is 400px wide, showing full chat history.
    *   **Shortcuts**: `Ctrl+Q` (or `Cmd+Q`) to toggle the bubble. `Escape` to collapse.
    *   **Auto-collapse**: Collapse to bubble if clicking outside the app or after 3 minutes of inactivity. Do not collapse if AI is loading or Settings are open.

2.  **Smart Input (Free Mode - Default)**:
    *   **Calculations**: Detect math expressions (e.g., `12 * 45`). Support `x` or `X` as multiplication.
    *   **Unit Conversion**: Detect conversions (e.g., `10km to miles`, `100degF=degC`).
    *   **Currency Conversion**: Real-time fetching from `https://api.frankfurter.app/latest?from=USD` with a secondary fallback API (`open.er-api.com`) and hardcoded fallback rates.
    *   **Auto-conversion**: If only a value and unit are provided (e.g., `10inch`, `100eur`), auto-convert to the user's preferred units/currency based on their country preset.
    *   **Formatting**: Results must be formatted to exactly two decimal places with appropriate unit symbols.

3.  **Command System**:
    *   `/todo [task] [time]`: Add a reminder. Support natural time detection (e.g., `1130am`, `23:00`, `in 15m`, `at 5pm`). If input is purely numeric (e.g., `/todo 123`), treat it as the task name.
    *   `/pomo [name] [duration]`: Start a Pomodoro timer. Default duration is 25m. If input is purely numeric, treat it as the session name.
    *   `/num [expression]`: Explicit calculation.
    *   `/tobe [value] to [unit]`: Explicit unit/currency conversion.
    *   `/time [city/timezone]`: Show current time in a specific location using `Intl.DateTimeFormat`.
    *   `/help`: List all commands.

4.  **Pomodoro System**:
    *   **Next Section**: Shows `name [n finished]`, current time remaining, and 3 green "pause dots".
    *   **Pause Logic**: Max 3 pauses allowed per session. Each pause consumes one dot. If >3 pauses are used, the session does not increment the `finishedCount`.
    *   **Controls**: Start/Pause, Restart (resets timer only, does not auto-start), and Delete.
    *   **Focus Sound**: If enabled, play a synthesized "ticking" sound (using Web Audio API Oscillator) every second during the Work phase.
    *   **Modes**: Work (default 25m) and Break (default 5m) with distinct progress bar colors.

5.  **Reminders & Todos**:
    *   **Next Section**: Shows the single most urgent upcoming reminder.
    *   **Management**: List reminders in a scrollable section (max 3 visible).
    *   **Editing**: Support inline editing of both the task name and the time. Time editing should use the same natural language parsing logic.
    *   **Alerts**: Play a notification sound (`https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3`) when a reminder triggers.

6.  **Settings & AI Integration**:
    *   **Country Presets**: US, UK, China, Germany, Japan. Auto-configures Length, Weight, Temperature, Currency, Timezone, and Date/Time formats.
    *   **Global Sound**: Master "Notification Sound" toggle.
    *   **AI Providers**: Support Gemini (default), OpenAI, Anthropic, DeepSeek, and Custom Endpoints.
    *   **Persistence**: Save all state (reminders, pomos, api keys, preferences) to `localStorage`.

### Tech Stack & Design:
*   **Framework**: React 18+, Vite, TypeScript.
*   **Styling**: Tailwind CSS (Glassmorphism, Dark Mode).
*   **Animations**: `framer-motion` (AnimatePresence for all transitions).
*   **Libraries**: `mathjs` (calculations), `date-fns` (time parsing), `lucide-react` (icons), `@google/genai` (Gemini).
*   **Typography**: Inter (UI), JetBrains Mono (Numbers), Outfit (Headings).

### AI Response Parsing (AI Mode):
*   AI should be instructed to respond with specific tags for automated actions:
    *   `REMINDER_TASK: [task] REMINDER_TIME: [ISO time]`
    *   `POMO_NAME: [name] POMO_DURATION: [minutes]`

---
