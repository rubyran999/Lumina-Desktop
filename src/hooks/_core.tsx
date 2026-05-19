import React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Cpu, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as math from 'mathjs';
import { callAI, Message, AIProvider } from '../services/geminiService';
import { isDesktopApp, resizeWindow, setIgnoreCursorEvents } from '../lib/desktop';
import { appendLog, openLogs } from '../services/dataLogService';
import { listen } from '@tauri-apps/api/event';
import { Reminder, Pomo, SectionState, COUNTRY_PRESETS, UNIT_OPTIONS, CITY_TO_TIMEZONE, CURRENCY_CODES } from '../types';
import { usePomodoro } from './usePomodoro';
import { useReminders } from './useReminders';
import { useLogger } from './useLogger';
import { useSettings } from './useSettings';
import { useChat } from './useChat';

export function useCore() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUserExpanded, setIsUserExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(Date.now());

  // Note: query, isLoading, messages, isTimeout, pendingQuery, timeoutRef
  // are now owned by useChat() — called below after helpers are defined.

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Settings hook (must be first — other hooks depend on pref values) ──
  const {
    selectedCountry, setSelectedCountry,
    prefLength, setPrefLength,
    prefWeight, setPrefWeight,
    prefCurrency, setPrefCurrency,
    prefTemperature, setPrefTemperature,
    prefTimezone, setPrefTimezone,
    prefNumberFormat, setPrefNumberFormat,
    prefDateFormat, setPrefDateFormat,
    prefTimeFormat, setPrefTimeFormat,
    prefPomoFocus, setPrefPomoFocus,
    prefPomoBreak, setPrefPomoBreak,
    prefFocusSound, setPrefFocusSound,
    prefNotificationSound, setPrefNotificationSound,
    prefPomoAutoStart, setPrefPomoAutoStart,
    isAiEnabled, setIsAiEnabled,
    apiKeys, setApiKeys,
    selectedProvider, setSelectedProvider,
    customEndpoint, setCustomEndpoint,
    location, setLocation,
    exchangeRates, setExchangeRates,
    handleCountryChange,
    updateApiKey,
    providers,
  } = useSettings();

  // Load state
  useEffect(() => {
    const savedExpanded = localStorage.getItem('lumina_is_expanded');
    if (savedExpanded !== null) setIsExpanded(JSON.parse(savedExpanded));

    const savedUserExpanded = localStorage.getItem('lumina_is_user_expanded');
    if (savedUserExpanded !== null) setIsUserExpanded(JSON.parse(savedUserExpanded));

    // Global shortcut listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Q to toggle bubble
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
        setLastActionTime(Date.now());
      }
      if (e.key === 'Escape') {
        setIsExpanded(false);
        setShowSettings(false);
        setIsUserExpanded(false);
      }
    };

    // Click outside app to collapse
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowSettings(false);
        setIsUserExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    // Listen for Tauri global shortcut event
    let unlistenFn: (() => void) | null = null;
    if (isDesktopApp()) {
      listen('shortcut-show', () => {
        setIsExpanded(prev => !prev);
        setLastActionTime(Date.now());
      }).then((unlisten) => {
        unlistenFn = unlisten;
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Focus input and reset panels when widget expands
  useEffect(() => {
    if (isExpanded) {
      setIsUserExpanded(false);
      setShowSettings(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isExpanded]);

  // Save state
  useEffect(() => {
    localStorage.setItem('lumina_is_expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    localStorage.setItem('lumina_is_user_expanded', JSON.stringify(isUserExpanded));
  }, [isUserExpanded]);

  // Resize window and toggle click-through based on expanded state
  useEffect(() => {
    if (isDesktopApp()) {
      if (isExpanded) {
        // Expanded state: full size and interactive
        resizeWindow(420, 700);
        setIgnoreCursorEvents(false);
      } else {
        // Collapsed state: tiny bubble, click-through so it doesn't block other apps
        resizeWindow(80, 120);
        setIgnoreCursorEvents(true);
      }
    }
  }, [isExpanded]);

  // ── Logger hook ──
  const {
    nextLogId, setNextLogId,
    isLogLocked, setIsLogLocked,
    fmtDate, fmtTime, fmtISOtoDate, fmtISOtoTime, genLogId,
  } = useLogger({ isExpanded });

  // ── Chat hook (must be before usePomodoro — both need setMessages) ──
  const {
    query, setQuery,
    isLoading, setIsLoading,
    isTimeout, setIsTimeout,
    messages, setMessages,
    pendingQuery, setPendingQuery,
    timeoutRef,
    handleCancel, clearConversation,
  } = useChat({ scrollRef, setLastActionTime });

  // ── Pomodoro hook (needs setMessages from useChat) ──
  const pomodoroDeps = useMemo(() => ({
    prefPomoFocus, prefPomoBreak, prefFocusSound, prefNotificationSound, prefPomoAutoStart,
    setIsExpanded, setIsUserExpanded, setMessages,
    appendLog, genLogId, fmtDate, fmtTime, fmtISOtoTime,
  }), [prefPomoFocus, prefPomoBreak, prefFocusSound, prefNotificationSound, prefPomoAutoStart]);
  const {
    pomoList, setPomoList,
    pomoSectionState, setPomoSectionState,
    pomoTime, setPomoTime,
    isPomoActive, setIsPomoActive,
    pomoMode, setPomoMode,
    pomoTotalTime, setPomoTotalTime,
    pomoName, setPomoName,
    pomoStartTime, setPomoStartTime,
    pomoPausesUsed, setPomoPausesUsed,
    togglePomo, pausePomo, restartPomo, deletePomo,
    togglePomoSection, formatPomoTime, startPomo,
  } = usePomodoro(pomodoroDeps);

  // Auto-hide logic (placed after useChat so isLoading is in scope)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isExpanded && !isLoading && !showSettings && Date.now() - lastActionTime > 180000) {
        setIsExpanded(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isExpanded, lastActionTime, isLoading, showSettings]);

  // ── Reminders hook (needs setMessages from useChat) ──
  const remindersDeps = useMemo(() => ({
    prefNotificationSound, prefTimeFormat,
    setIsExpanded, setIsUserExpanded, setLastActionTime, setMessages,
    genLogId, fmtDate, fmtTime, fmtISOtoTime,
  }), [prefNotificationSound, prefTimeFormat]);
  const {
    reminders, setReminders,
    reminderSectionState, setReminderSectionState,
    editingReminderId, setEditingReminderId,
    editingReminderValue, setEditingReminderValue,
    editingReminderTimeValue, setEditingReminderTimeValue,
    toggleReminderSection, deleteReminder, startEditingReminder,
    saveReminderEdit, toggleReminder,
    parseTimeInfo, addReminder,
  } = useReminders(remindersDeps);

  // ── handleSubmit (orchestrator — bridges chat, reminders, pomodoro, settings) ──
  const handleSubmit = async (e?: React.FormEvent, retryText?: string) => {
    e?.preventDefault();
    const userQuery = retryText || query;
    if (!userQuery.trim() || isLoading) return;

    if (!retryText) setQuery('');
    setLastActionTime(Date.now());
    
    // Handle /todo command
    let processedQuery = userQuery;
    if (processedQuery.startsWith('/todo ')) {
      const rawTask = processedQuery.slice(6).trim();
      
      // Time detection logic
      const timeInfo = parseTimeInfo(rawTask);

      if (!isAiEnabled) {
        addReminder(timeInfo.task, timeInfo.found ? timeInfo.time : undefined, !timeInfo.found);
        
        let displayTime = '';
        if (timeInfo.found) {
          const date = parseISO(timeInfo.time!);
          displayTime = ` at ${format(date, prefTimeFormat === '12h' ? 'h:mm a' : 'HH:mm')}`;
        }

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ **Todo added (Free Mode):** ${timeInfo.task}${displayTime}`, 
          type: 'reminder' 
        }]);
        return;
      }
      processedQuery = `I want to set a reminder. Task and time info: ${rawTask}. 
      Please respond with:
      - For specific time: REMINDER_TASK: [task] REMINDER_TIME: [ISO time]
      - For no time (todo): REMINDER_TASK: [task] REMINDER_TIME: NONE
      - For whole day: REMINDER_TASK: [task] REMINDER_TIME: [ISO date] REMINDER_ALLDAY: TRUE`;
    }

    // Handle /pomo command
    if (processedQuery.trim().toLowerCase().startsWith('/pomo')) {
      const parts = processedQuery.slice(5).trim().split(' ');
      let duration = prefPomoFocus;
      let name = 'Focus Session';

      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (parts.length > 1 && !isNaN(parseInt(lastPart)) && /^\d+$/.test(lastPart)) {
          duration = parseInt(lastPart);
          name = parts.slice(0, -1).join(' ') || 'Focus Session';
        } else {
          name = parts.join(' ') || 'Focus Session';
        }
      }

      startPomo(name, duration);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `🍅 **Pomodoro started: ${name}!** ${duration} minutes of focus begins now.`, 
        type: 'answer' 
      }]);
      setQuery('');
      setIsUserExpanded(true);
      return;
    }

    // Handle /help command
    if (processedQuery.trim().toLowerCase().startsWith('/help')) {
      const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
      setMessages([...updatedMessages, { 
        role: 'assistant', 
        content: `🛠️ **Available Commands:**
- \`/pomo [name]\`: Start a 25m focus session
- \`/todo [task]\`: Add a quick reminder
- \`/num [expression]\`: Perform calculations (e.g., \`/num 12 x 45\`)
- \`/tobe [value] to [unit]\` or \`/tobe [value]=[unit]\`: Convert units (e.g., \`/tobe 10km to miles\`, \`/tobe 100degF=degC\`)
- \`/time [timezone]\`: Show current time (e.g., \`/time Europe/London\`)
- \`/help\`: Show this list

*Note: In Free Mode, any non-command input will be treated as a conversion attempt.*`, 
        type: 'answer' 
      }]);
      setIsUserExpanded(true);
      return;
    }

    // Handle /time command
    if (processedQuery.trim().toLowerCase().startsWith('/time')) {
      const input = processedQuery.slice(5).trim();
      const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
      
      if (!input) {
        const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const localDate = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        setMessages([...updatedMessages, { 
          role: 'assistant', 
          content: `🕒 **Local Time:** ${localTime}\n📅 **Date:** ${localDate}`, 
          type: 'answer' 
        }]);
        setIsUserExpanded(true);
        return;
      }

      // Try to get world time
      setIsLoading(true);
      try {
        let displayTime = '';
        let locationName = input;

        // 1. Check for GMT/UTC offset (e.g., GMT+9, UTC-5, +8)
        const offsetMatch = input.match(/^(?:gmt|utc)?\s*([+-]\d+(?:\.\d+)?)$/i);
        if (offsetMatch) {
          const offset = parseFloat(offsetMatch[1]);
          const now = new Date();
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const targetDate = new Date(utc + (3600000 * offset));
          
          const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const dateStr = targetDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          displayTime = `${timeStr}\n📅 **Date:** ${dateStr}`;
          locationName = `GMT${offset >= 0 ? '+' : ''}${offset}`;
        } else {
          // 2. Check city mapping or direct IANA string
          const mappedTz = CITY_TO_TIMEZONE[input.toLowerCase()];
          const tzToUse = mappedTz || input.replace(/\s+/g, '_');

          try {
            const formatter = new Intl.DateTimeFormat([], {
              timeZone: tzToUse,
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            displayTime = formatter.format(new Date());
            // Use the formatted city name if it was in our mapping
            if (mappedTz) {
              locationName = input.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
          } catch (e) {
            throw new Error(`Could not find timezone for "${input}"`);
          }
        }

        setMessages([...updatedMessages, { 
          role: 'assistant', 
          content: `🌍 **Time in ${locationName}:** ${displayTime}`, 
          type: 'answer' 
        }]);
      } catch (e) {
        setMessages([...updatedMessages, { 
          role: 'assistant', 
          content: `❌ **Error:** Could not find timezone for "${input}". Try cities like "Paris", "Tokyo", or offsets like "GMT+9".`, 
          type: 'error' 
        }]);
      }
      setIsLoading(false);
      setIsUserExpanded(true);
      return;
    }

    // Handle /num and /tobe (Free Mode or explicit command)
    const isNum = processedQuery.trim().toLowerCase().startsWith('/num ');
    const isToBe = processedQuery.trim().toLowerCase().startsWith('/tobe ');
    
    if (isNum || isToBe || processedQuery.trim().length > 0) {
      let expression = isNum ? processedQuery.slice(5) : isToBe ? processedQuery.slice(6) : processedQuery;
      
      // Normalize expression
      expression = expression.replace(/\bmil\b/gi, 'mile');
      // Temperature normalization (Source)
      expression = expression.replace(/(\d+(?:\.\d+)?)\s*(?:degc|c|℃|celsius)\b/gi, '$1 degC');
      expression = expression.replace(/(\d+(?:\.\d+)?)\s*(?:degf|f|℉|fahrenheit)\b/gi, '$1 degF');
      expression = expression.replace(/(\d+(?:\.\d+)?)\s*(?:k|kelvin)\b/gi, '$1 kelvin');
      // Temperature normalization (Target)
      expression = expression.replace(/(?:to|=)\s*(?:degc|c|℃|celsius)\b/gi, 'to degC');
      expression = expression.replace(/(?:to|=)\s*(?:degf|f|℉|fahrenheit)\b/gi, 'to degF');
      expression = expression.replace(/(?:to|=)\s*(?:k|kelvin)\b/gi, 'to kelvin');

      // For /num, allow 'x' and 'X' as multiply
      if (isNum) {
        expression = expression.replace(/[xX]/g, '*');
      }

      // Handle [value]=[unit] format (for both /tobe and auto-detection)
      if (expression.includes('=') && !isNum) {
        const parts = expression.split('=');
        if (parts.length === 2) {
          const value = parts[0].trim();
          const targetUnit = parts[1].trim();
          expression = `${value} to ${targetUnit}`;
        }
      }

      // Currency conversion logic
      const currencyRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${CURRENCY_CODES.join('|')})\\s*(?:to|\\s+to\\s+|=)\\s*(${CURRENCY_CODES.join('|')})`, 'i');
      const currencyMatch = expression.match(currencyRegex);

      if (currencyMatch && !isNum) {
        const amount = parseFloat(currencyMatch[1]);
        const from = currencyMatch[2].toUpperCase();
        const to = currencyMatch[3].toUpperCase();
        
        if (exchangeRates[from] && exchangeRates[to]) {
          const result = (amount / exchangeRates[from]) * exchangeRates[to];
          const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
          setMessages([...updatedMessages, { 
            role: 'assistant', 
            content: `💱 **Currency Conversion:** ${amount} ${from} = **${result.toFixed(2)} ${to}**`, 
            type: 'answer' 
          }]);
          setIsUserExpanded(true);
          return;
        }
      }

      // Auto-convert single currency if no target specified
      const singleCurrencyRegex = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${CURRENCY_CODES.join('|')})$`, 'i');
      const singleCurrencyMatch = expression.trim().match(singleCurrencyRegex);
      if (singleCurrencyMatch && !isNum) {
        const amount = parseFloat(singleCurrencyMatch[1]);
        const from = singleCurrencyMatch[2].toUpperCase();
        const to = prefCurrency;
        
        if (from !== to && exchangeRates[from] && exchangeRates[to]) {
          const result = (amount / exchangeRates[from]) * exchangeRates[to];
          const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
          setMessages([...updatedMessages, { 
            role: 'assistant', 
            content: `💱 **Currency Conversion:** ${amount} ${from} = **${result.toFixed(2)} ${to}**`, 
            type: 'answer' 
          }]);
          setIsUserExpanded(true);
          return;
        }
      }

      try {
        // Try to evaluate as math/conversion
        let result = math.evaluate(expression);
        
        if (result !== undefined && typeof result !== 'function') {
          const isUnit = math.typeOf(result) === 'Unit';
          
          // Auto-convert single units if no target specified
          if (isUnit && !expression.toLowerCase().includes(' to ')) {
            let targetUnit = '';
            if (result.equalBase(math.unit('1m'))) targetUnit = prefLength;
            else if (result.equalBase(math.unit('1kg'))) targetUnit = prefWeight;
            else if (result.equalBase(math.unit('1degC'))) targetUnit = prefTemperature;
            
            if (targetUnit) {
              result = result.to(targetUnit);
            }
          }

          // Format result to 2 decimal places
          const resultStr = math.format(result, { notation: 'fixed', precision: 2 });
          
          // Show result if:
          // 1. Explicit command (/num, /tobe)
          // 2. AI is disabled
          // 3. It's a unit (auto-detected conversion)
          if (isNum || isToBe || !isAiEnabled || isUnit) {
            const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
            setMessages([...updatedMessages, { 
              role: 'assistant', 
              content: `🔢 **Result:** ${resultStr}`, 
              type: 'answer' 
            }]);
            setIsUserExpanded(true);
            return;
          }
        }
      } catch (e) {
        // If explicit command failed, show error
        if (isNum || isToBe) {
          const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
          setMessages([...updatedMessages, { 
            role: 'assistant', 
            content: `❌ **Error:** Could not evaluate expression. Please check your syntax.`, 
            type: 'error' 
          }]);
          setIsUserExpanded(true);
          return;
        }
        // Fall through to AI
      }
    }

    const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
    if (!retryText) setMessages(updatedMessages);
    
    if (!isAiEnabled) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "AI mode is currently disabled. You can use `/pomo` or `/todo` commands, or enable AI in Settings to chat.", 
        type: 'answer' 
      }]);
      return;
    }

    setIsLoading(true);
    setIsTimeout(false);
    setPendingQuery(userQuery);
    setIsExpanded(true); 
    setIsUserExpanded(true); 

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsTimeout(true);
    }, 20000); // 20 second timeout

    try {
      const result = await callAI(processedQuery, updatedMessages, selectedProvider, apiKeys, location, customEndpoint);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      setMessages(prev => [...prev, result]);
      setIsLoading(false);
      setIsTimeout(false);
      setPendingQuery(null);

      if (result.type === 'reminder') {
        const task = result.metadata?.task || result.content;
        const r = addReminder(task, result.metadata?.time, result.metadata?.noTime);
        if (result.metadata?.isAllDay) {
          setReminders(prev => prev.map(rr => rr.id === r.id ? { ...rr, isAllDay: true } : rr));
        }
      }
    } catch (error) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsLoading(false);
      setIsTimeout(false);
      setPendingQuery(null);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to fetch response. Please check your API key or connection.', type: 'error' }]);
    }
  };

  const handleRetry = () => {
    if (pendingQuery) {
      handleSubmit(undefined, pendingQuery);
    }
  };

  const showHistory = isUserExpanded;

  return {
    // UI state
    isExpanded, setIsExpanded,
    isUserExpanded, setIsUserExpanded,
    showHistory,
    showSettings, setShowSettings,
    isFocused, setIsFocused,
    isLoading, setIsLoading,
    isTimeout, setIsTimeout,
    // Input
    query, setQuery,
    inputRef,
    scrollRef,
    widgetRef,
    containerRef,
    settingsRef,
    // Chat
    messages, setMessages,
    pendingQuery, setPendingQuery,
    // Reminders
    reminders, setReminders,
    editingReminderId, setEditingReminderId,
    editingReminderValue, setEditingReminderValue,
    editingReminderTimeValue, setEditingReminderTimeValue,
    reminderSectionState, setReminderSectionState,
    // Pomos
    pomoList, setPomoList,
    pomoSectionState, setPomoSectionState,
    pomoTime, setPomoTime,
    isPomoActive, setIsPomoActive,
    pomoMode, setPomoMode,
    pomoTotalTime, setPomoTotalTime,
    pomoName, setPomoName,
    pomoStartTime, setPomoStartTime,
    pomoPausesUsed, setPomoPausesUsed,
    // AI
    isAiEnabled, setIsAiEnabled,
    apiKeys, setApiKeys,
    selectedProvider, setSelectedProvider,
    customEndpoint, setCustomEndpoint,
    location, setLocation,
    // Preferences
    selectedCountry, setSelectedCountry,
    prefLength, setPrefLength,
    prefWeight, setPrefWeight,
    prefCurrency, setPrefCurrency,
    prefTemperature, setPrefTemperature,
    prefTimezone, setPrefTimezone,
    prefNumberFormat, setPrefNumberFormat,
    prefDateFormat, setPrefDateFormat,
    prefTimeFormat, setPrefTimeFormat,
    prefPomoFocus, setPrefPomoFocus,
    prefPomoBreak, setPrefPomoBreak,
    prefFocusSound, setPrefFocusSound,
    prefNotificationSound, setPrefNotificationSound,
    prefPomoAutoStart, setPrefPomoAutoStart,
    // Other
    lastActionTime, setLastActionTime,
    isLogLocked, setIsLogLocked,
    nextLogId, setNextLogId,
    exchangeRates, setExchangeRates,
    timeoutRef,
    // Derived
    providers,
    // Handlers
    handleSubmit,
    handleRetry,
    handleCancel,
    clearConversation,
    togglePomo,
    pausePomo,
    restartPomo,
    deletePomo,
    togglePomoSection,
    toggleReminderSection,
    deleteReminder,
    startEditingReminder,
    saveReminderEdit,
    toggleReminder,
    formatPomoTime,
    updateApiKey,
    handleCountryChange,
    parseTimeInfo,
    openLogs,
  };
}
