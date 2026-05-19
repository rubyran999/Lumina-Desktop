# Lumina — Future Implementation

## Bug Fixes

### P1 — Click-through & auto-collapse
- **Problem:** Tauri transparent window blocks clicks on apps behind it. Collapsed bubble area (~80×120px) intercepts mouse events. `handleClickOutside` DOM listener only works within the Tauri window, not cross-window.
- **Approach tried:** Focus-loss listener (`onFocusChanged`) + tighter window sizing. Didn't work as expected.
- **Ideas to try:**
  - Use `setIgnoreCursorEvents(true)` + CSS `pointer-events: auto` only on bubble (may not work at OS level)
  - Two separate Tauri windows: tiny bubble window (always shown) + floating widget window (shown on demand)
  - Global mouse hook via Tauri plugin to detect clicks outside the app rectangle

### P2 — Shortcut doesn't focus text input
- **Problem:** When `Ctrl+Q` opens Lumina via global shortcut, the text input is not focused. User must click manually.
- **Approach tried:** Centralized `useEffect` with `requestAnimationFrame` + 150ms retry. Didn't work.
- **Ideas to try:**
  - Use `window.setFocus()` + `webview.focus()` in Rust before emitting `shortcut-show`
  - Add a `data-tauri-focus` attribute or use `autofocus` on the input
  - Chain: Rust `show()` → `setFocus()` → wait 200ms → emit event → frontend focuses input

---

## Features

### Dashboard
- Read `lumina_log.csv` and visualize in-app:
  - Pomodoro: sessions per day, total focus time, completion rate (completed vs cancelled)
  - Todo: created vs completed, average time to complete
- Simple charts via a lightweight library (e.g., chart.js or canvas)

### Log viewer in-app
- A `/log` command or settings tab that shows recent log entries in a table
- Filter by type (pomo/todo), date range, status

### Export
- Button to export log as `.xlsx` (with proper formatting) in addition to the raw CSV
- Auto-backup: periodically copy the CSV to a user-chosen folder

### Pomodoro enhancements
- Custom break duration per session
- Sound options (different sounds for work start, break start, session end)
- Session notes field (log what you worked on)
- Pause time tracking: log actual pause durations, not just count

### Reminders / Todo
- Recurring reminders (daily, weekly, weekdays)
- Snooze on reminder notifications
- Priority levels (high/medium/low)
- Due date separate from time (currently combined in `time` field)

### UI / UX
- Minimize to tray instead of bottom-right bubble (optional mode)
- Multiple bubble positions (corners)
- Keyboard shortcut to quickly add a todo without opening full widget
- Dark/light theme toggle
- Configurable auto-hide timeout

### Settings
- Backup/restore all app data (settings, reminders, pomos, logs)
- Import reminders from a CSV or text file
- Clear all data button with confirmation

### Tauri / Desktop
- Auto-start with Windows
- Update checker (compare version with GitHub releases)
- Single-instance lock (prevent multiple Lumina windows)

---

## Technical Debt

- [ ] `src/App.tsx` is ~2,200 lines — split into components (PomoPanel, ReminderPanel, ChatPanel, SettingsPanel, Header)
- [ ] Extract business logic into custom hooks (`usePomodoro`, `useReminders`, `useLogger`)
- [ ] `tsconfig.json` missing `exclude` for `src-tauri/target/` (causes spurious TS errors on `tsc --noEmit`)
- [ ] CSV parsing in Rust (`split(',')`) doesn't handle quoted fields with commas — replace with a proper CSV crate
- [ ] Remove retry logic in Rust if queue approach proves sufficient
- [ ] Add unit tests for Rust `logging` module
