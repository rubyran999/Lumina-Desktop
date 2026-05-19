import re

# Read current App.tsx (restored from git, uses useLumina)
with open(r'D:\Ruby\Projects\DeskHelper\src\App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# Replace import
app = app.replace(
    "import { useLumina } from './hooks/useLumina.tsx';",
    "import { useSettings } from './hooks/useSettings';\nimport { useLogger } from './hooks/useLogger';\nimport { usePomodoro } from './hooks/usePomodoro';\nimport { useReminders } from './hooks/useReminders';\nimport { useChat } from './hooks/useChat';"
)

# Replace the hook call and destructuring
old_pattern = r'const lumina = useLumina\(\);\s*\n\s*const \{.*?\} = lumina;'

new_code = '''const settings = useSettings();
  const logger = useLogger();
  const pomo = usePomodoro();
  const reminders = useReminders();
  const chat = useChat();

  const {
    isExpanded, setIsExpanded, isUserExpanded, setIsUserExpanded,
    showHistory, showSettings, setShowSettings, isFocused, setIsFocused,
    lastActionTime, setLastActionTime, handleCountryChange,
    selectedCountry, setSelectedCountry,
    prefLength, setPrefLength, prefWeight, setPrefWeight,
    prefCurrency, setPrefCurrency, prefTemperature, setPrefTemperature,
    prefTimezone, setPrefTimezone, prefNumberFormat, setPrefNumberFormat,
    prefDateFormat, setPrefDateFormat, prefTimeFormat, setPrefTimeFormat,
    prefPomoFocus, setPrefPomoFocus, prefPomoBreak, setPrefPomoBreak,
    prefFocusSound, setPrefFocusSound,
    prefNotificationSound, setPrefNotificationSound,
    prefPomoAutoStart, setPrefPomoAutoStart,
    exchangeRates, inputRef, scrollRef, widgetRef, containerRef, settingsRef, timeoutRef,
  } = settings;

  const {
    fmtDate, fmtTime, fmtISOtoDate, fmtISOtoTime, genLogId,
    appendLog, updateLog, openLogs, isLogWritable, flushLogQueue,
  } = logger;

  const {
    pomoList, setPomoList, pomoSectionState, setPomoSectionState,
    pomoTime, setPomoTime, isPomoActive, setIsPomoActive,
    pomoMode, setPomoMode, pomoTotalTime, setPomoTotalTime,
    pomoName, setPomoName, pomoStartTime, setPomoStartTime,
    pomoPausesUsed, setPomoPausesUsed,
    togglePomo, pausePomo, restartPomo, deletePomo,
    togglePomoSection, formatPomoTime,
  } = pomo;

  const {
    reminders, setReminders,
    editingReminderId, setEditingReminderId,
    editingReminderValue, setEditingReminderValue,
    editingReminderTimeValue, setEditingReminderTimeValue,
    reminderSectionState, setReminderSectionState,
    toggleReminderSection, deleteReminder, startEditingReminder,
    saveReminderEdit, toggleReminder, parseTimeInfo,
  } = reminders;

  const {
    query, setQuery, isLoading, setIsLoading,
    isTimeout, setIsTimeout, messages, setMessages,
    pendingQuery, setPendingQuery,
    isAiEnabled, setIsAiEnabled,
    apiKeys, setApiKeys,
    selectedProvider, setSelectedProvider,
    customEndpoint, setCustomEndpoint,
    location, setLocation,
  } = chat;

  const providers = [
    { id: 'gemini' as any, name: 'Gemini' },
    { id: 'openai' as any, name: 'GPT-4o' },
    { id: 'anthropic' as any, name: 'Claude 3.5' },
    { id: 'deepseek' as any, name: 'DeepSeek' },
    { id: 'kimi' as any, name: 'Kimi' },
    { id: 'custom' as any, name: 'Custom' },
  ];'''

app = re.sub(old_pattern, new_code, app, flags=re.DOTALL)

with open(r'D:\Ruby\Projects\DeskHelper\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print("App.tsx updated")
