import os

# Read _core.tsx to get the return statement
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\_core.tsx', 'r', encoding='utf-8') as f:
    core = f.read()

# Define what each hook returns
settings_exports = [
    'isExpanded', 'setIsExpanded', 'isUserExpanded', 'setIsUserExpanded',
    'showHistory', 'showSettings', 'setShowSettings',
    'isFocused', 'setIsFocused', 'isLoading', 'setIsLoading',
    'isTimeout', 'setIsTimeout', 'query', 'setQuery',
    'inputRef', 'scrollRef', 'widgetRef', 'containerRef', 'settingsRef',
    'messages', 'setMessages', 'pendingQuery', 'setPendingQuery',
    'reminders', 'setReminders', 'editingReminderId', 'setEditingReminderId',
    'editingReminderValue', 'setEditingReminderValue',
    'editingReminderTimeValue', 'setEditingReminderTimeValue',
    'reminderSectionState', 'setReminderSectionState',
    'pomoList', 'setPomoList', 'pomoSectionState', 'setPomoSectionState',
    'pomoTime', 'setPomoTime', 'isPomoActive', 'setIsPomoActive',
    'pomoMode', 'setPomoMode', 'pomoTotalTime', 'setPomoTotalTime',
    'pomoName', 'setPomoName', 'pomoStartTime', 'setPomoStartTime',
    'pomoPausesUsed', 'setPomoPausesUsed',
    'isAiEnabled', 'setIsAiEnabled', 'apiKeys', 'setApiKeys',
    'selectedProvider', 'setSelectedProvider',
    'customEndpoint', 'setCustomEndpoint', 'location', 'setLocation',
    'selectedCountry', 'setSelectedCountry',
    'prefLength', 'setPrefLength', 'prefWeight', 'setPrefWeight',
    'prefCurrency', 'setPrefCurrency', 'prefTemperature', 'setPrefTemperature',
    'prefTimezone', 'setPrefTimezone', 'prefNumberFormat', 'setPrefNumberFormat',
    'prefDateFormat', 'setPrefDateFormat', 'prefTimeFormat', 'setPrefTimeFormat',
    'prefPomoFocus', 'setPrefPomoFocus', 'prefPomoBreak', 'setPrefPomoBreak',
    'prefFocusSound', 'setPrefFocusSound',
    'prefNotificationSound', 'setPrefNotificationSound',
    'prefPomoAutoStart', 'setPrefPomoAutoStart',
    'lastActionTime', 'setLastActionTime',
    'isLogLocked', 'setIsLogLocked',
    'nextLogId', 'setNextLogId',
    'exchangeRates', 'setExchangeRates',
    'timeoutRef', 'providers',
    'handleSubmit', 'handleRetry', 'handleCancel',
    'clearConversation', 'togglePomo', 'pausePomo',
    'restartPomo', 'deletePomo', 'togglePomoSection',
    'toggleReminderSection', 'deleteReminder',
    'startEditingReminder', 'saveReminderEdit',
    'toggleReminder', 'formatPomoTime',
    'updateApiKey', 'handleCountryChange', 'openLogs',
]

# Write useSettings.tsx
settings_code = "import { useCore } from './_core';\n\nexport function useSettings() {\n  const core = useCore();\n  return {\n"
for name in settings_exports:
    settings_code += f"    {name}: core.{name},\n"
settings_code += "  };\n}\n"

with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(settings_code)

# Write useLogger.tsx
logger_exports = ['nextLogId', 'setNextLogId', 'isLogLocked', 'setIsLogLocked',
                  'fmtDate', 'fmtTime', 'fmtISOtoDate', 'fmtISOtoTime', 'genLogId',
                  'appendLog', 'updateLog', 'openLogs', 'isLogWritable', 'flushLogQueue']
logger_code = "import { useCore } from './_core';\n\nexport function useLogger() {\n  const core = useCore();\n  return {\n"
for name in logger_exports:
    logger_code += f"    {name}: core.{name},\n"
logger_code += "  };\n}\n"

with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useLogger.tsx', 'w', encoding='utf-8') as f:
    f.write(logger_code)

# Write usePomodoro.tsx
pomo_exports = ['pomoList', 'setPomoList', 'pomoSectionState', 'setPomoSectionState',
                'pomoTime', 'setPomoTime', 'isPomoActive', 'setIsPomoActive',
                'pomoMode', 'setPomoMode', 'pomoTotalTime', 'setPomoTotalTime',
                'pomoName', 'setPomoName', 'pomoStartTime', 'setPomoStartTime',
                'pomoPausesUsed', 'setPomoPausesUsed',
                'togglePomo', 'pausePomo', 'restartPomo', 'deletePomo',
                'togglePomoSection', 'formatPomoTime']
pomo_code = "import { useCore } from './_core';\n\nexport function usePomodoro() {\n  const core = useCore();\n  return {\n"
for name in pomo_exports:
    pomo_code += f"    {name}: core.{name},\n"
pomo_code += "  };\n}\n"

with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\usePomodoro.tsx', 'w', encoding='utf-8') as f:
    f.write(pomo_code)

# Write useReminders.tsx
rem_exports = ['reminders', 'setReminders', 'editingReminderId', 'setEditingReminderId',
               'editingReminderValue', 'setEditingReminderValue',
               'editingReminderTimeValue', 'setEditingReminderTimeValue',
               'reminderSectionState', 'setReminderSectionState',
               'toggleReminderSection', 'deleteReminder', 'startEditingReminder',
               'saveReminderEdit', 'toggleReminder', 'parseTimeInfo']
rem_code = "import { useCore } from './_core';\n\nexport function useReminders() {\n  const core = useCore();\n  return {\n"
for name in rem_exports:
    rem_code += f"    {name}: core.{name},\n"
rem_code += "  };\n}\n"

with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useReminders.tsx', 'w', encoding='utf-8') as f:
    f.write(rem_code)

# Write useChat.tsx
chat_exports = ['query', 'setQuery', 'isLoading', 'setIsLoading',
                'isTimeout', 'setIsTimeout', 'messages', 'setMessages',
                'pendingQuery', 'setPendingQuery',
                'isAiEnabled', 'setIsAiEnabled', 'apiKeys', 'setApiKeys',
                'selectedProvider', 'setSelectedProvider',
                'customEndpoint', 'setCustomEndpoint', 'location', 'setLocation']
chat_code = "import { useCore } from './_core';\n\nexport function useChat() {\n  const core = useCore();\n  return {\n"
for name in chat_exports:
    chat_code += f"    {name}: core.{name},\n"
chat_code += "  };\n}\n"

with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useChat.tsx', 'w', encoding='utf-8') as f:
    f.write(chat_code)

# Now update App.tsx - replace the import and hook calls
with open(r'D:\Ruby\Projects\DeskHelper\src\App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# Fix import
app = app.replace(
    "import { useLumina } from './hooks/useLumina.tsx';",
    "import { useSettings } from './hooks/useSettings';\nimport { useLogger } from './hooks/useLogger';\nimport { usePomodoro } from './hooks/usePomodoro';\nimport { useReminders } from './hooks/useReminders';\nimport { useChat } from './hooks/useChat';"
)

# Fix hook calls
app = app.replace(
    "  const lumina = useLumina();",
    "  const settings = useSettings();\n  const logger = useLogger();\n  const pomo = usePomodoro();\n  const reminders = useReminders();\n  const chat = useChat();"
)

# Fix destructuring - replace the whole destructuring block
# Find "const {" and "} = lumina;"
old_destructure = "  const {\n    isExpanded, setIsExpanded,\n    isUserExpanded, setIsUserExpanded,\n    showHistory,\n    showSettings, setShowSettings,\n    isFocused, setIsFocused,\n    isLoading, setIsLoading,\n    isTimeout,\n    query, setQuery,\n    inputRef,\n    scrollRef,\n    widgetRef,\n    containerRef,\n    settingsRef,\n    messages,\n    reminders,\n    editingReminderId, setEditingReminderId,\n    editingReminderValue, setEditingReminderValue,\n    editingReminderTimeValue, setEditingReminderTimeValue,\n    reminderSectionState,\n    pomoList,\n    pomoSectionState,\n    pomoTime,\n    isPomoActive, setIsPomoActive,\n    pomoMode,\n    pomoTotalTime,\n    isAiEnabled, setIsAiEnabled,\n    apiKeys,\n    selectedProvider, setSelectedProvider,\n    customEndpoint, setCustomEndpoint,\n    location, setLocation,\n    selectedCountry,\n    prefLength, setPrefLength,\n    prefWeight, setPrefWeight,\n    prefCurrency, setPrefCurrency,\n    prefTemperature, setPrefTemperature,\n    prefTimezone, setPrefTimezone,\n    prefNumberFormat, setPrefNumberFormat,\n    prefDateFormat, setPrefDateFormat,\n    prefTimeFormat, setPrefTimeFormat,\n    prefPomoFocus, setPrefPomoFocus,\n    prefPomoBreak, setPrefPomoBreak,\n    prefFocusSound, setPrefFocusSound,\n    prefNotificationSound, setPrefNotificationSound,\n    prefPomoAutoStart, setPrefPomoAutoStart,\n    isLogLocked,\n    setLastActionTime,\n    providers,\n    handleSubmit,\n    handleRetry,\n    handleCancel,\n    clearConversation,\n    togglePomo,\n    pausePomo,\n    restartPomo,\n    deletePomo,\n    togglePomoSection,\n    toggleReminderSection,\n    deleteReminder,\n    startEditingReminder,\n    saveReminderEdit,\n    toggleReminder,\n    formatPomoTime,\n    updateApiKey,\n    handleCountryChange,\n    openLogs,\n  } = lumina;",
    "  const {\n    isExpanded, setIsExpanded, isUserExpanded, setIsUserExpanded,\n    showHistory, showSettings, setShowSettings, isFocused, setIsFocused,\n    isLoading, setIsLoading, isTimeout, setIsTimeout,\n    query, setQuery, inputRef, scrollRef, widgetRef, containerRef, settingsRef,\n    messages, setMessages, pendingQuery, setPendingQuery,\n    reminders, setReminders, editingReminderId, setEditingReminderId,\n    editingReminderValue, setEditingReminderValue,\n    editingReminderTimeValue, setEditingReminderTimeValue,\n    reminderSectionState, setReminderSectionState,\n    pomoList, setPomoList, pomoSectionState, setPomoSectionState,\n    pomoTime, setPomoTime, isPomoActive, setIsPomoActive,\n    pomoMode, setPomoMode, pomoTotalTime, setPomoTotalTime,\n    pomoName, setPomoName, pomoStartTime, setPomoStartTime,\n    pomoPausesUsed, setPomoPausesUsed,\n    isAiEnabled, setIsAiEnabled, apiKeys, setApiKeys,\n    selectedProvider, setSelectedProvider,\n    customEndpoint, setCustomEndpoint, location, setLocation,\n    selectedCountry, setSelectedCountry,\n    prefLength, setPrefLength, prefWeight, setPrefWeight,\n    prefCurrency, setPrefCurrency, prefTemperature, setPrefTemperature,\n    prefTimezone, setPrefTimezone, prefNumberFormat, setPrefNumberFormat,\n    prefDateFormat, setPrefDateFormat, prefTimeFormat, setPrefTimeFormat,\n    prefPomoFocus, setPrefPomoFocus, prefPomoBreak, setPrefPomoBreak,\n    prefFocusSound, setPrefFocusSound,\n    prefNotificationSound, setPrefNotificationSound,\n    prefPomoAutoStart, setPrefPomoAutoStart,\n    lastActionTime, setLastActionTime,\n    isLogLocked, setIsLogLocked, nextLogId, setNextLogId,\n    exchangeRates, setExchangeRates, timeoutRef,\n    providers, handleSubmit, handleRetry, handleCancel,\n    clearConversation, togglePomo, pausePomo, restartPomo, deletePomo,\n    togglePomoSection, toggleReminderSection, deleteReminder,\n    startEditingReminder, saveReminderEdit, toggleReminder,\n    formatPomoTime, updateApiKey, handleCountryChange, openLogs,\n    fmtDate, fmtTime, fmtISOtoDate, fmtISOtoTime, genLogId,\n    appendLog, updateLog, isLogWritable, flushLogQueue,\n  } = settings;"
)

with open(r'D:\Ruby\Projects\DeskHelper\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print("Done!")
