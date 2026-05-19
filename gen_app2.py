import re

# Read original useLumina.tsx
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useLumina.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

# Extract handleSubmit and related handlers from useLumina.tsx
# handleSubmit: lines ~630-1031
# handleRetry, handleCancel, clearConversation, updateApiKey after that

# Find handleSubmit
submit_match = re.search(
    r'(const handleSubmit = async \(e\?: React\.FormEvent, retryText\?: string\) => \{.*?)^  const handleRetry = ',
    orig, re.DOTALL
)
handle_submit = submit_match.group(1) if submit_match else ''

# Find handleRetry through updateApiKey
other_match = re.search(
    r'(const handleRetry = \(\) => \{.*?)^  const providers = ',
    orig, re.DOTALL
)
other_handlers = other_match.group(1) if other_match else ''

# Also need parseTimeInfo for App.tsx
parse_match = re.search(
    r'(const parseTimeInfo = \(text: string\) => \{.*?)^  const handleSubmit = ',
    orig, re.DOTALL
)
parse_time = parse_match.group(1) if parse_match else ''

# Extract JSX from current App.tsx
with open(r'D:\Ruby\Projects\DeskHelper\src\App.tsx', 'r', encoding='utf-8') as f:
    app_lines = f.readlines()

# Find JSX (from "return (")
jsx_start = None
for i, line in enumerate(app_lines):
    if line.strip().startswith('return ('):
        jsx_start = i
        break

jsx_lines = app_lines[jsx_start:]

# Build new App.tsx
app = '''import React, { useEffect } from 'react';
import { Search, Bell, Settings, X, Clock, Command, Send, Sparkles, Trash2, CheckCircle2, MessageSquare, Minimize2, Maximize2, Cpu, Globe, Eraser, Link, ChevronDown, Play, Edit3, Save, Pause, RotateCcw, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { callAI } from './services/geminiService';
import { appendLog } from './services/dataLogService';
import { useSettings } from './hooks/useSettings';
import { useLogger } from './hooks/useLogger';
import { usePomodoro } from './hooks/usePomodoro';
import { useReminders } from './hooks/useReminders';
import { useChat } from './hooks/useChat';
import { Message, COUNTRY_PRESETS, UNIT_OPTIONS, CITY_TO_TIMEZONE, CURRENCY_CODES } from './types';

export default function App() {
  const settings = useSettings();
  const logger = useLogger();
  const chat = useChat();

  const pomo = usePomodoro({
    prefNotificationSound: settings.prefNotificationSound,
    prefFocusSound: settings.prefFocusSound,
    prefPomoFocus: settings.prefPomoFocus,
    prefPomoBreak: settings.prefPomoBreak,
    prefPomoAutoStart: settings.prefPomoAutoStart,
    setIsExpanded: settings.setIsExpanded,
    setIsUserExpanded: settings.setIsUserExpanded,
    setMessages: chat.setMessages,
    appendLog: logger.appendLog,
    genLogId: logger.genLogId,
    fmtDate: logger.fmtDate,
    fmtTime: logger.fmtTime,
    fmtISOtoTime: logger.fmtISOtoTime,
  });

  const reminders = useReminders({
    prefNotificationSound: settings.prefNotificationSound,
    prefTimeFormat: settings.prefTimeFormat,
    setIsExpanded: settings.setIsExpanded,
    setIsUserExpanded: settings.setIsUserExpanded,
    setMessages: chat.setMessages,
    setLastActionTime: settings.setLastActionTime,
  });

  // Scroll to bottom effect
  useEffect(() => {
    if (settings.scrollRef.current) {
      settings.scrollRef.current.scrollTop = settings.scrollRef.current.scrollHeight;
    }
  }, [chat.messages, chat.isLoading]);

  // Destructure for handleSubmit and JSX
  const {
    isExpanded, setIsExpanded, isUserExpanded, setIsUserExpanded,
    showSettings, setShowSettings, isFocused, setIsFocused,
    lastActionTime, setLastActionTime,
    selectedCountry, prefLength, prefWeight, prefCurrency,
    prefTemperature, prefTimezone, prefNumberFormat, prefDateFormat,
    prefTimeFormat, prefPomoFocus, prefPomoBreak, prefFocusSound,
    prefNotificationSound, prefPomoAutoStart,
    exchangeRates, inputRef, scrollRef, widgetRef, containerRef,
    settingsRef, timeoutRef, handleCountryChange,
  } = settings;

  const { isLogLocked, openLogs, fmtDate, fmtTime, genLogId } = logger;

  const {
    pomoList, pomoSectionState, pomoTime, isPomoActive, pomoMode,
    pomoTotalTime, pomoName, togglePomo, pausePomo, restartPomo,
    deletePomo, togglePomoSection, formatPomoTime,
  } = pomo;

  const {
    reminders: reminderList, editingReminderId, editingReminderValue,
    editingReminderTimeValue, reminderSectionState,
    toggleReminderSection, deleteReminder, startEditingReminder,
    saveReminderEdit, toggleReminder, parseTimeInfo,
  } = reminders;

  const {
    query, setQuery, isLoading, isTimeout, messages,
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
  ];

  const showHistory = isUserExpanded;

'''

# Add parseTimeInfo (needed by handleSubmit)
app += parse_time + '\n'

# Add handleSubmit and related handlers
app += handle_submit + '\n'
app += other_handlers + '\n'

# Add JSX
app += ''.join(jsx_lines)
app += '}\n'

with open(r'D:\Ruby\Projects\DeskHelper\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print(f"App.tsx written: {len(app)} chars, {len(app.split(chr(10)))} lines")
