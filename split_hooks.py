import re

with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useLumina.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Helper to get line content by 0-indexed line number
def get(lineno):
    return lines[lineno] if lineno < len(lines) else ''

# ============================================================
# useSettings.tsx - UI state, preferences, refs, load/save, shortcut, auto-hide, resize
# ============================================================
useSettings = '''import { useState, useEffect, useRef } from 'react';
import { isDesktopApp, resizeWindow, setIgnoreCursorEvents } from '../lib/desktop';
import { listen } from '@tauri-apps/api/event';
import { COUNTRY_PRESETS } from '../types';

export function useSettings() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUserExpanded, setIsUserExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(Date.now());

  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [prefLength, setPrefLength] = useState('inch');
  const [prefWeight, setPrefWeight] = useState('lb');
  const [prefCurrency, setPrefCurrency] = useState('USD');
  const [prefTemperature, setPrefTemperature] = useState('degF');
  const [prefTimezone, setPrefTimezone] = useState('America/New_York');
  const [prefNumberFormat, setPrefNumberFormat] = useState('1,234.56');
  const [prefDateFormat, setPrefDateFormat] = useState('MM/DD/YYYY');
  const [prefTimeFormat, setPrefTimeFormat] = useState('12h');
  const [prefPomoFocus, setPrefPomoFocus] = useState(25);
  const [prefPomoBreak, setPrefPomoBreak] = useState(5);
  const [prefFocusSound, setPrefFocusSound] = useState(true);
  const [prefNotificationSound, setPrefNotificationSound] = useState(true);
  const [prefPomoAutoStart, setPrefPomoAutoStart] = useState(true);

  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load state
  useEffect(() => {
    const fetchRates = async () => {
      const FALLBACK_RATES: Record<string, number> = {
        USD: 1, EUR: 0.92, GBP: 0.79, CNY: 7.23, JPY: 151.5,
        CAD: 1.36, AUD: 1.52, HKD: 7.82, SGD: 1.35, INR: 83.3,
        KRW: 1350, RUB: 92.5, BRL: 5.05, MXN: 16.5, IDR: 15900,
        TRY: 32.2, ZAR: 18.8
      };
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (!response.ok) throw new Error('Primary API failed');
        const data = await response.json();
        if (data && data.rates) { setExchangeRates({ ...data.rates, USD: 1 }); return; }
      } catch (e) {
        try {
          const response = await fetch('https://open.er-api.com/v6/latest/USD');
          if (!response.ok) throw new Error('Secondary API failed');
          const data = await response.json();
          if (data && data.rates) { setExchangeRates(data.rates); return; }
        } catch (e2) {
          setExchangeRates(FALLBACK_RATES);
        }
      }
    };
    fetchRates();

    const savedExpanded = localStorage.getItem('lumina_is_expanded');
    if (savedExpanded !== null) setIsExpanded(JSON.parse(savedExpanded));
    const savedUserExpanded = localStorage.getItem('lumina_is_user_expanded');
    if (savedUserExpanded !== null) setIsUserExpanded(JSON.parse(savedUserExpanded));
    const savedPrefs = localStorage.getItem('lumina_prefs');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setSelectedCountry(prefs.country || 'United States');
      setPrefLength(prefs.length || 'inch');
      setPrefWeight(prefs.weight || 'lb');
      setPrefCurrency(prefs.currency || 'USD');
      setPrefTemperature(prefs.temperature || 'degF');
      setPrefTimezone(prefs.timezone || 'America/New_York');
      setPrefNumberFormat(prefs.numberFormat || '1,234.56');
      setPrefDateFormat(prefs.dateFormat || 'MM/DD/YYYY');
      setPrefTimeFormat(prefs.timeFormat || '12h');
      setPrefPomoFocus(prefs.pomoFocus || 25);
      setPrefPomoBreak(prefs.pomoBreak || 5);
      setPrefFocusSound(prefs.focusSound ?? prefs.pomoSound ?? true);
      setPrefNotificationSound(prefs.notificationSound ?? true);
      setPrefPomoAutoStart(prefs.pomoAutoStart ?? true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
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
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowSettings(false);
        setIsUserExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    let unlistenFn: (() => void) | null = null;
    if (isDesktopApp()) {
      listen('shortcut-show', () => {
        setIsExpanded(prev => !prev);
        setLastActionTime(Date.now());
      }).then((unlisten) => { unlistenFn = unlisten; });
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      if (unlistenFn) unlistenFn();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isExpanded && !showSettings && Date.now() - lastActionTime > 180000) {
        setIsExpanded(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isExpanded, lastActionTime, showSettings]);

  useEffect(() => {
    if (isExpanded) {
      setIsUserExpanded(false);
      setShowSettings(false);
      if (inputRef.current) inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (isDesktopApp()) {
      if (isExpanded) { resizeWindow(420, 700); setIgnoreCursorEvents(false); }
      else { resizeWindow(80, 120); setIgnoreCursorEvents(true); }
    }
  }, [isExpanded]);

  useEffect(() => {
    localStorage.setItem('lumina_prefs', JSON.stringify({
      country: selectedCountry, length: prefLength, weight: prefWeight,
      currency: prefCurrency, temperature: prefTemperature, timezone: prefTimezone,
      numberFormat: prefNumberFormat, dateFormat: prefDateFormat, timeFormat: prefTimeFormat,
      pomoFocus: prefPomoFocus, pomoBreak: prefPomoBreak, focusSound: prefFocusSound,
      notificationSound: prefNotificationSound, pomoAutoStart: prefPomoAutoStart
    }));
  }, [selectedCountry, prefLength, prefWeight, prefCurrency, prefTemperature, prefTimezone, prefNumberFormat, prefDateFormat, prefTimeFormat, prefPomoFocus, prefPomoBreak, prefFocusSound, prefNotificationSound, prefPomoAutoStart]);

  useEffect(() => { localStorage.setItem('lumina_is_expanded', JSON.stringify(isExpanded)); }, [isExpanded]);
  useEffect(() => { localStorage.setItem('lumina_is_user_expanded', JSON.stringify(isUserExpanded)); }, [isUserExpanded]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    const preset = COUNTRY_PRESETS[country];
    if (preset) {
      setPrefLength(preset.length);
      setPrefWeight(preset.weight);
      setPrefCurrency(preset.currency);
      setPrefTemperature(preset.temperature);
      setPrefTimezone(preset.timezone);
      setPrefNumberFormat(preset.numberFormat);
      setPrefDateFormat(preset.dateFormat);
      setPrefTimeFormat(preset.timeFormat || '12h');
    }
  };

  return {
    isExpanded, setIsExpanded, isUserExpanded, setIsUserExpanded,
    showSettings, setShowSettings, isFocused, setIsFocused,
    lastActionTime, setLastActionTime,
    selectedCountry, setSelectedCountry,
    prefLength, setPrefLength, prefWeight, setPrefWeight,
    prefCurrency, setPrefCurrency, prefTemperature, setPrefTemperature,
    prefTimezone, setPrefTimezone, prefNumberFormat, setPrefNumberFormat,
    prefDateFormat, setPrefDateFormat, prefTimeFormat, setPrefTimeFormat,
    prefPomoFocus, setPrefPomoFocus, prefPomoBreak, setPrefPomoBreak,
    prefFocusSound, setPrefFocusSound,
    prefNotificationSound, setPrefNotificationSound,
    prefPomoAutoStart, setPrefPomoAutoStart,
    exchangeRates, setExchangeRates,
    inputRef, scrollRef, settingsRef, widgetRef, containerRef, timeoutRef,
    handleCountryChange,
  };
}
'''

# ============================================================
# useLogger.tsx - CSV logging helpers and state
# ============================================================
useLogger = '''import { useState, useEffect } from 'react';
import { initLogs, appendLog, updateLog, openLogs, getNextLogId, isLogWritable, flushLogQueue } from '../services/dataLogService';

export function useLogger() {
  const [nextLogId, setNextLogId] = useState(1);
  const [isLogLocked, setIsLogLocked] = useState(false);

  useEffect(() => {
    initLogs();
    getNextLogId().then(id => setNextLogId(id));
  }, []);

  useEffect(() => {
    localStorage.setItem('lumina_next_log_id', JSON.stringify(nextLogId));
  }, [nextLogId]);

  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);
  const fmtISOtoDate = (iso: string) => fmtDate(new Date(iso));
  const fmtISOtoTime = (iso: string) => fmtTime(new Date(iso));
  const genLogId = () => { const id = nextLogId; setNextLogId(id + 1); return id; };

  return {
    nextLogId, setNextLogId,
    isLogLocked, setIsLogLocked,
    fmtDate, fmtTime, fmtISOtoDate, fmtISOtoTime, genLogId,
    appendLog, updateLog, openLogs, isLogWritable, flushLogQueue,
  };
}
'''

# ============================================================
# usePomodoro.tsx - Pomodoro state and timer logic
# ============================================================
usePomodoro = '''import { useState, useEffect } from 'react';
import { showNotification, playNotificationSound } from '../lib/desktop';
import { Pomo, SectionState } from '../types';

interface UsePomodoroDeps {
  prefNotificationSound: boolean;
  prefFocusSound: boolean;
  prefPomoFocus: number;
  prefPomoBreak: number;
  prefPomoAutoStart: boolean;
  setIsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setIsUserExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  appendLog: (data: any) => Promise<void>;
  genLogId: () => number;
  fmtDate: (d: Date) => string;
  fmtTime: (d: Date) => string;
  fmtISOtoTime: (iso: string) => string;
}

export function usePomodoro(deps: UsePomodoroDeps) {
  const {
    prefNotificationSound, prefFocusSound, prefPomoFocus, prefPomoBreak, prefPomoAutoStart,
    setIsExpanded, setIsUserExpanded, setMessages, appendLog, genLogId, fmtDate, fmtTime, fmtISOtoTime
  } = deps;

  const [pomoList, setPomoList] = useState<Pomo[]>([]);
  const [pomoSectionState, setPomoSectionState] = useState<SectionState>('collapsed');
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [isPomoActive, setIsPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoTotalTime, setPomoTotalTime] = useState(25 * 60);
  const [pomoName, setPomoName] = useState('');
  const [pomoStartTime, setPomoStartTime] = useState('');
  const [pomoPausesUsed, setPomoPausesUsed] = useState(0);

  useEffect(() => {
    const savedPomos = localStorage.getItem('lumina_pomos');
    if (savedPomos) {
      const parsed = JSON.parse(savedPomos);
      const migrated = parsed.map((p: any) => p.startTime ? p : { ...p, startTime: new Date().toISOString() });
      setPomoList(migrated);
    }
    const savedPomoTime = localStorage.getItem('lumina_pomo_time');
    if (savedPomoTime !== null) setPomoTime(JSON.parse(savedPomoTime));
    setIsPomoActive(false);
    const savedPomoMode = localStorage.getItem('lumina_pomo_mode');
    if (savedPomoMode !== null) setPomoMode(savedPomoMode as 'work' | 'break');
    const savedPomoTotalTime = localStorage.getItem('lumina_pomo_total_time');
    if (savedPomoTotalTime !== null) setPomoTotalTime(JSON.parse(savedPomoTotalTime));
    const savedPomoName = localStorage.getItem('lumina_pomo_name');
    if (savedPomoName !== null) setPomoName(savedPomoName);
    const savedPomoSectionState = localStorage.getItem('lumina_pomo_section_state');
    if (savedPomoSectionState !== null) {
      const state = savedPomoSectionState as any;
      setPomoSectionState(state === 'default' ? 'expanded' : state);
    }
  }, []);

  useEffect(() => { localStorage.setItem('lumina_pomos', JSON.stringify(pomoList)); }, [pomoList]);
  useEffect(() => { localStorage.setItem('lumina_pomo_time', JSON.stringify(pomoTime)); }, [pomoTime]);
  useEffect(() => { localStorage.setItem('lumina_pomo_active', JSON.stringify(isPomoActive)); }, [isPomoActive]);
  useEffect(() => { localStorage.setItem('lumina_pomo_mode', pomoMode); }, [pomoMode]);
  useEffect(() => { localStorage.setItem('lumina_pomo_total_time', JSON.stringify(pomoTotalTime)); }, [pomoTotalTime]);
  useEffect(() => { localStorage.setItem('lumina_pomo_name', pomoName); }, [pomoName]);
  useEffect(() => { localStorage.setItem('lumina_pomo_section_state', pomoSectionState); }, [pomoSectionState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomoActive && pomoTime > 0) {
      interval = setInterval(() => { setPomoTime(prev => prev - 1); }, 1000);
    } else if (isPomoActive && pomoTime === 0) {
      setIsPomoActive(false);
      if (prefNotificationSound) playNotificationSound();
      const nextMode = pomoMode === 'work' ? 'break' : 'work';
      showNotification('Lumina Pomodoro', `Time for a ${nextMode}!`);
      const nextDuration = nextMode === 'work' ? prefPomoFocus : prefPomoBreak;
      const nextTime = nextDuration * 60;
      const now = new Date();
      if (pomoMode === 'work') {
        appendLog({
          id: genLogId(), date: fmtDate(now), name: pomoName, type: 'pomo',
          duration: String(Math.round(pomoTotalTime / 60)),
          start_time: fmtISOtoTime(pomoStartTime), end_time: fmtTime(now),
          status: 'completed', pause_count: pomoPausesUsed,
        });
      }
      if (pomoMode === 'work') {
        setPomoList(prev => prev.map(p => {
          if (p.isActive) {
            const isCounted = (p.pausesUsed || 0) <= 3;
            return { ...p, finishedCount: (p.finishedCount || 0) + (isCounted ? 1 : 0), pausesUsed: 0 };
          }
          return p;
        }));
      }
      const pomoMsg = { role: 'assistant', content: `🍅 **Pomodoro Finished!** Time for a ${nextMode}.`, type: 'reminder' };
      setMessages(prev => [...prev, pomoMsg]);
      setPomoMode(nextMode);
      setPomoTime(nextTime);
      setPomoTotalTime(nextTime);
      if (prefPomoAutoStart) {
        const nowISO = now.toISOString();
        setPomoStartTime(nowISO);
        setPomoPausesUsed(0);
        setPomoList(prev => prev.map(p => p.isActive ? { ...p, startTime: nowISO, mode: nextMode, totalTime: nextTime } : p));
        setIsPomoActive(true);
      }
      setIsExpanded(true);
      setIsUserExpanded(true);
    }
    return () => clearInterval(interval);
  }, [isPomoActive, pomoTime, pomoMode]);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let interval: NodeJS.Timeout | null = null;
    if (isPomoActive && pomoMode === 'work' && prefFocusSound && prefNotificationSound) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTick = () => {
        if (!audioContext) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioContext.currentTime);
        gain.gain.setValueAtTime(0.05, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
        osc.stop(audioContext.currentTime + 0.05);
      };
      interval = setInterval(playTick, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (audioContext) audioContext.close();
    };
  }, [isPomoActive, pomoMode, prefFocusSound, prefNotificationSound]);

  const togglePomo = (id: string) => {
    setPomoList(prev => prev.map(p => {
      if (p.id === id) {
        const nextActive = !p.isActive;
        if (nextActive) {
          const nowISO = new Date().toISOString();
          setIsPomoActive(true);
          setPomoTime(p.duration);
          setPomoTotalTime(p.totalTime);
          setPomoMode(p.mode);
          setPomoName(p.name);
          setPomoStartTime(nowISO);
          setPomoPausesUsed(0);
          return { ...p, isActive: true, pausesUsed: 0, startTime: nowISO };
        } else {
          setIsPomoActive(false);
          return { ...p, isActive: false };
        }
      }
      return { ...p, isActive: false };
    }));
  };

  const pausePomo = () => {
    if (isPomoActive) {
      setIsPomoActive(false);
      setPomoPausesUsed(prev => prev + 1);
      setPomoList(prev => prev.map(p => p.isActive ? { ...p, pausesUsed: (p.pausesUsed || 0) + 1 } : p));
    } else {
      setIsPomoActive(true);
    }
  };

  const restartPomo = () => {
    const active = pomoList.find(p => p.isActive);
    if (active) {
      if (active.mode === 'work') {
        const now = new Date();
        appendLog({
          id: genLogId(), date: fmtDate(now), name: pomoName, type: 'pomo',
          duration: String(Math.round(pomoTotalTime / 60)),
          start_time: fmtISOtoTime(pomoStartTime), end_time: fmtTime(now),
          status: 'cancelled', pause_count: pomoPausesUsed,
        });
      }
      const nowISO = new Date().toISOString();
      setPomoTime(active.totalTime);
      setIsPomoActive(false);
      setPomoStartTime(nowISO);
      setPomoPausesUsed(0);
      setPomoList(prev => prev.map(p => p.isActive ? { ...p, pausesUsed: 0, startTime: nowISO } : p));
    }
  };

  const deletePomo = (id: string) => {
    setPomoList(prev => {
      const p = prev.find(item => item.id === id);
      if (p) {
        if (p.isActive) setIsPomoActive(false);
        if (p.mode === 'work') {
          const now = new Date();
          appendLog({
            id: genLogId(), date: fmtDate(now), name: pomoName, type: 'pomo',
            duration: String(Math.round(pomoTotalTime / 60)),
            start_time: fmtISOtoTime(pomoStartTime), end_time: fmtTime(now),
            status: 'cancelled', pause_count: pomoPausesUsed,
          });
        }
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const togglePomoSection = () => { setPomoSectionState(prev => prev === 'expanded' ? 'collapsed' : 'expanded'); };
  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    pomoList, setPomoList, pomoSectionState, setPomoSectionState,
    pomoTime, setPomoTime, isPomoActive, setIsPomoActive,
    pomoMode, setPomoMode, pomoTotalTime, setPomoTotalTime,
    pomoName, setPomoName, pomoStartTime, setPomoStartTime,
    pomoPausesUsed, setPomoPausesUsed,
    togglePomo, pausePomo, restartPomo, deletePomo, togglePomoSection, formatPomoTime,
  };
}
'''

# ============================================================
# useReminders.tsx - Reminder state and trigger logic
# ============================================================
useReminders = '''import { useState, useEffect } from 'react';
import { format, isAfter, parseISO } from 'date-fns';
import { showNotification, playNotificationSound } from '../lib/desktop';
import { updateLog } from '../services/dataLogService';
import { Reminder, SectionState } from '../types';

interface UseRemindersDeps {
  prefNotificationSound: boolean;
  prefTimeFormat: string;
  setIsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setIsUserExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setLastActionTime: (t: number) => void;
}

export function useReminders(deps: UseRemindersDeps) {
  const { prefNotificationSound, prefTimeFormat, setIsExpanded, setIsUserExpanded, setMessages, setLastActionTime } = deps;

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingReminderValue, setEditingReminderValue] = useState('');
  const [editingReminderTimeValue, setEditingReminderTimeValue] = useState('');
  const [reminderSectionState, setReminderSectionState] = useState<SectionState>('collapsed');

  useEffect(() => {
    const savedReminders = localStorage.getItem('lumina_reminders');
    if (savedReminders) {
      const parsed = JSON.parse(savedReminders);
      const migrated = parsed.map((r: any) => r.createdAt ? r : { ...r, createdAt: r.time || new Date().toISOString() });
      setReminders(migrated);
    }
    const savedReminderSectionState = localStorage.getItem('lumina_reminder_section_state');
    if (savedReminderSectionState !== null) {
      const state = savedReminderSectionState as any;
      setReminderSectionState(state === 'default' ? 'expanded' : state);
    }
  }, []);

  useEffect(() => { localStorage.setItem('lumina_reminders', JSON.stringify(reminders)); }, [reminders]);
  useEffect(() => { localStorage.setItem('lumina_reminder_section_state', reminderSectionState); }, [reminderSectionState]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const triggeredReminders = reminders.filter(r => !r.completed && r.time && isAfter(now, parseISO(r.time)));
      if (triggeredReminders.length > 0) {
        if (prefNotificationSound) playNotificationSound();
        triggeredReminders.forEach(reminder => {
          showNotification('Lumina Reminder', reminder.task);
          const reminderMsg = { role: 'assistant', content: `🔔 **Reminder:** ${reminder.task}`, type: 'reminder', metadata: { time: reminder.time } };
          setMessages(prev => [...prev, reminderMsg]);
        });
        setIsExpanded(true);
        setIsUserExpanded(true);
        setLastActionTime(Date.now());
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [reminders]);

  const toggleReminderSection = () => { setReminderSectionState(prev => prev === 'expanded' ? 'collapsed' : 'expanded'); };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    if (editingReminderId === id) setEditingReminderId(null);
    setLastActionTime(Date.now());
  };

  const startEditingReminder = (r: Reminder) => {
    setEditingReminderId(r.id);
    setEditingReminderValue(r.task);
    setEditingReminderTimeValue(r.noTime ? '' : r.time ? format(parseISO(r.time), prefTimeFormat === '12h' ? 'h:mm a' : 'HH:mm') : '');
  };

  const parseTimeInfo = (text: string) => {
    const timeRegex = /\b(\d{1,2})[:](\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b|\b(\d{3,4})\b/i;
    const relativeRegex = /\b(\d+)\s*(m|min|h|hour)s?\b/i;
    const relMatch = text.match(relativeRegex);
    if (relMatch) {
      const value = parseInt(relMatch[1]);
      const unit = relMatch[2].toLowerCase();
      const now = new Date();
      if (unit.startsWith('m')) now.setMinutes(now.getMinutes() + value);
      else now.setHours(now.getHours() + value);
      return { time: now.toISOString(), task: text.replace(relMatch[0], '').trim(), found: true };
    }
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      if (text.trim() === timeMatch[0].trim() && !timeMatch[3] && !timeMatch[5] && !text.includes(':')) {
        return { task: text, found: false };
      }
      let hours = 0, minutes = 0, ampm = '';
      if (timeMatch[1]) { hours = parseInt(timeMatch[1]); minutes = parseInt(timeMatch[2]); ampm = timeMatch[3]?.toLowerCase(); }
      else if (timeMatch[4]) { hours = parseInt(timeMatch[4]); ampm = timeMatch[5]?.toLowerCase(); }
      else if (timeMatch[6]) {
        const val = timeMatch[6];
        if (val.length === 3) { hours = parseInt(val[0]); minutes = parseInt(val.slice(1)); }
        else { hours = parseInt(val.slice(0, 2)); minutes = parseInt(val.slice(2)); }
      }
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      if (hours > 23 || minutes > 59) return { task: text, found: false };
      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);
      if (target < now) target.setDate(target.getDate() + 1);
      return { time: target.toISOString(), task: text.replace(timeMatch[0], '').trim(), found: true };
    }
    return { task: text, found: false };
  };

  const saveReminderEdit = (id: string) => {
    const timeInfo = parseTimeInfo(editingReminderTimeValue);
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        if (r.logId && editingReminderValue !== r.task) updateLog(r.logId, '', '', editingReminderValue);
        return { ...r, task: editingReminderValue, time: timeInfo.found ? timeInfo.time : r.time, noTime: !timeInfo.found && !editingReminderTimeValue.trim() ? true : timeInfo.found ? false : r.noTime };
      }
      return r;
    }));
    setEditingReminderId(null);
    setLastActionTime(Date.now());
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        const nextCompleted = !r.completed;
        if (nextCompleted && r.logId) updateLog(r.logId, new Date().toTimeString().slice(0, 5), 'completed', r.task);
        return { ...r, completed: nextCompleted };
      }
      return r;
    }));
    setLastActionTime(Date.now());
  };

  return {
    reminders, setReminders,
    editingReminderId, setEditingReminderId,
    editingReminderValue, setEditingReminderValue,
    editingReminderTimeValue, setEditingReminderTimeValue,
    reminderSectionState, setReminderSectionState,
    toggleReminderSection, deleteReminder, startEditingReminder,
    saveReminderEdit, toggleReminder, parseTimeInfo,
  };
}
'''

# ============================================================
# useChat.tsx - Chat messages, AI, commands
# ============================================================
useChat = '''import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import * as math from 'mathjs';
import { callAI, AIProvider } from '../services/geminiService';
import { appendLog } from '../services/dataLogService';
import { Message, Reminder, Pomo, CITY_TO_TIMEZONE, CURRENCY_CODES } from '../types';

interface UseChatDeps {
  isAiEnabled: boolean;
  selectedProvider: AIProvider;
  apiKeys: Record<string, string>;
  location: string;
  customEndpoint: string;
  prefCurrency: string;
  prefLength: string;
  prefWeight: string;
  prefTemperature: string;
  prefTimeFormat: string;
  exchangeRates: Record<string, number>;
  setIsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setIsUserExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setLastActionTime: (t: number) => void;
  setQuery: (v: string | ((prev: string) => string)) => void;
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setPomoList: React.Dispatch<React.SetStateAction<Pomo[]>>;
  setIsPomoActive: (v: boolean | ((prev: boolean) => boolean)) => void;
  setPomoTime: (v: number | ((prev: number) => number)) => void;
  setPomoTotalTime: (v: number | ((prev: number) => number)) => void;
  setPomoMode: (v: 'work' | 'break') => void;
  setPomoName: (v: string) => void;
  setPomoStartTime: (v: string) => void;
  setPomoPausesUsed: (v: number | ((prev: number) => number)) => void;
  genLogId: () => number;
  fmtDate: (d: Date) => string;
  fmtTime: (d: Date) => string;
  parseTimeInfo: (text: string) => { time?: string; task: string; found: boolean };
}

export function useChat(deps: UseChatDeps) {
  const {
    isAiEnabled, selectedProvider, apiKeys, location, customEndpoint,
    prefCurrency, prefLength, prefWeight, prefTemperature, prefTimeFormat, exchangeRates,
    setIsExpanded, setIsUserExpanded, setLastActionTime, setQuery: setParentQuery,
    setReminders, setPomoList, setIsPomoActive, setPomoTime, setPomoTotalTime,
    setPomoMode, setPomoName, setPomoStartTime, setPomoPausesUsed,
    genLogId, fmtDate, fmtTime, parseTimeInfo
  } = deps;

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTimeout, setIsTimeout] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('lumina_history');
    if (savedHistory) setMessages(JSON.parse(savedHistory));
    const savedAiEnabled = localStorage.getItem('lumina_ai_enabled');
    if (savedAiEnabled !== null) setIsAiEnabledState(JSON.parse(savedAiEnabled));
    const savedKeys = localStorage.getItem('lumina_api_keys');
    if (savedKeys) setApiKeysState(JSON.parse(savedKeys));
    const savedProvider = localStorage.getItem('lumina_provider');
    if (savedProvider) setSelectedProviderState(savedProvider as AIProvider);
    const savedEndpoint = localStorage.getItem('lumina_custom_endpoint');
    if (savedEndpoint) setCustomEndpointState(savedEndpoint);
    const savedLocation = localStorage.getItem('lumina_location');
    if (savedLocation) setLocationState(savedLocation);
  }, []);

  useEffect(() => { localStorage.setItem('lumina_history', JSON.stringify(messages)); }, [messages]);

  // Local state for AI settings that also sync to parent
  const [isAiEnabledState, setIsAiEnabledState] = useState(isAiEnabled);
  const [apiKeysState, setApiKeysState] = useState(apiKeys);
  const [selectedProviderState, setSelectedProviderState] = useState(selectedProvider);
  const [customEndpointState, setCustomEndpointState] = useState(customEndpoint);
  const [locationState, setLocationState] = useState(location);

  useEffect(() => { localStorage.setItem('lumina_ai_enabled', JSON.stringify(isAiEnabledState)); }, [isAiEnabledState]);
  useEffect(() => { localStorage.setItem('lumina_api_keys', JSON.stringify(apiKeysState)); }, [apiKeysState]);
  useEffect(() => { localStorage.setItem('lumina_provider', selectedProviderState); }, [selectedProviderState]);
  useEffect(() => { localStorage.setItem('lumina_custom_endpoint', customEndpointState); }, [customEndpointState]);
  useEffect(() => { localStorage.setItem('lumina_location', locationState); }, [locationState]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // Note: scrollRef needs to be provided by parent (useSettings)
  // We'll expose a ref callback or require parent to pass it

  const handleSubmit = async (e?: React.FormEvent, retryText?: string) => {
    e?.preventDefault();
    const userQuery = retryText || query;
    if (!userQuery.trim() || isLoading) return;
    if (!retryText) setQuery('');
    setLastActionTime(Date.now());
    let processedQuery = userQuery;

    if (processedQuery.startsWith('/todo ')) {
      const rawTask = processedQuery.slice(6).trim();
      const timeInfo = parseTimeInfo(rawTask);
      if (!isAiEnabledState) {
        const logId = genLogId();
        const createdDate = new Date();
        const newReminder: Reminder = {
          id: Math.random().toString(36).substr(2, 9),
          task: timeInfo.task, time: timeInfo.found ? timeInfo.time : undefined,
          completed: false, noTime: !timeInfo.found,
          createdAt: createdDate.toISOString(), logId,
        };
        setReminders(prev => [...prev, newReminder]);
        appendLog({ id: logId, date: fmtDate(createdDate), name: timeInfo.task, type: 'todo', duration: '', start_time: fmtTime(createdDate), end_time: '', status: 'pending', pause_count: 0 });
        let displayTime = '';
        if (timeInfo.found) {
          const date = parseISO(timeInfo.time!);
          displayTime = ` at ${format(date, prefTimeFormat === '12h' ? 'h:mm a' : 'HH:mm')}`;
        }
        setMessages(prev => [...prev, { role: 'assistant', content: `✅ **Todo added (Free Mode):** ${timeInfo.task}${displayTime}`, type: 'reminder' }]);
        return;
      }
      processedQuery = `I want to set a reminder. Task and time info: ${rawTask}.
      Please respond with:
      - For specific time: REMINDER_TASK: [task] REMINDER_TIME: [ISO time]
      - For no time (todo): REMINDER_TASK: [task] REMINDER_TIME: NONE
      - For whole day: REMINDER_TASK: [task] REMINDER_TIME: [ISO date] REMINDER_ALLDAY: TRUE`;
    }

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
      const durationSec = duration * 60;
      const newPomo: Pomo = {
        id: Math.random().toString(36).substr(2, 9),
        name, duration: durationSec, totalTime: durationSec, mode: 'work',
        isActive: true, finishedCount: 0, pausesUsed: 0, startTime: new Date().toISOString(),
      };
      setPomoList(prev => [newPomo, ...prev.map(p => ({ ...p, isActive: false }))]);
      setIsPomoActive(true);
      setPomoTime(durationSec);
      setPomoTotalTime(durationSec);
      setPomoMode('work');
      setPomoName(name);
      setPomoStartTime(new Date().toISOString());
      setPomoPausesUsed(0);
      setMessages(prev => [...prev, { role: 'assistant', content: `🍅 **Pomodoro started: ${name}!** ${duration} minutes of focus begins now.`, type: 'answer' }]);
      setParentQuery('');
      setIsUserExpanded(true);
      return;
    }

    if (processedQuery.trim().toLowerCase().startsWith('/help')) {
      const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
      setMessages([...updatedMessages, {
        role: 'assistant',
        content: `🛠️ **Available Commands:**
- \`/pomo [name]\`: Start a 25m focus session
- \`/todo [task]\`: Add a quick reminder
- \`/num [expression]\`: Perform calculations
- \`/tobe [value] to [unit]\` or \`/tobe [value]=[unit]\`: Convert units
- \`/time [timezone]\`: Show current time
- \`/help\`: Show this list

*Note: In Free Mode, any non-command input will be treated as a conversion attempt.*`,
        type: 'answer'
      }]);
      setIsUserExpanded(true);
      return;
    }

    if (processedQuery.trim().toLowerCase().startsWith('/time')) {
      const input = processedQuery.slice(5).trim();
      const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
      if (!input) {
        const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const localDate = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        setMessages([...updatedMessages, { role: 'assistant', content: `🕒 **Local Time:** ${localTime}\n📅 **Date:** ${localDate}`, type: 'answer' }]);
        setIsUserExpanded(true);
        return;
      }
      setIsLoading(true);
      try {
        let displayTime = '', locationName = input;
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
          const mappedTz = CITY_TO_TIMEZONE[input.toLowerCase()];
          const tzToUse = mappedTz || input.replace(/\s+/g, '_');
          try {
            const formatter = new Intl.DateTimeFormat([], { timeZone: tzToUse, hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            displayTime = formatter.format(new Date());
            if (mappedTz) locationName = input.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          } catch (e) { throw new Error(`Could not find timezone for "${input}"`); }
        }
        setMessages([...updatedMessages, { role: 'assistant', content: `🌍 **Time in ${locationName}:** ${displayTime}`, type: 'answer' }]);
      } catch (e) {
        setMessages([...updatedMessages, { role: 'assistant', content: `❌ **Error:** Could not find timezone for "${input}". Try cities like "Paris", "Tokyo", or offsets like "GMT+9".`, type: 'error' }]);
      }
      setIsLoading(false);
      setIsUserExpanded(true);
      return;
    }

    const isNum = processedQuery.trim().toLowerCase().startsWith('/num ');
    const isToBe = processedQuery.trim().toLowerCase().startsWith('/tobe ');
    if (isNum || isToBe || processedQuery.trim().length > 0) {
      let expression = isNum ? processedQuery.slice(5) : isToBe ? processedQuery.slice(6) : processedQuery;
      expression = expression.replace(/\bmil\b/gi, 'mile');
      expression = expression.replace(/(\d+(?:\.\d+)?)\s*(?:degc|c|℃|celsius)\b/gi, '$1 degC');
      expression = expression.replace(/(\d+(?:\.\d+)?)\s*(?:degf|f|℉|fahrenheit)\b/gi, '$1 degF');
      expression = expression.replace(/(\d+(?:\.\d+)?)\s*(?:k|kelvin)\b/gi, '$1 kelvin');
      expression = expression.replace(/(?:to|=)\s*(?:degc|c|℃|celsius)\b/gi, 'to degC');
      expression = expression.replace(/(?:to|=)\s*(?:degf|f|℉|fahrenheit)\b/gi, 'to degF');
      expression = expression.replace(/(?:to|=)\s*(?:k|kelvin)\b/gi, 'to kelvin');
      if (isNum) expression = expression.replace(/[xX]/g, '*');
      if (expression.includes('=') && !isNum) {
        const parts = expression.split('=');
        if (parts.length === 2) expression = `${parts[0].trim()} to ${parts[1].trim()}`;
      }
      const currencyRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${CURRENCY_CODES.join('|')})\\s*(?:to|\\s+to\\s+|=)\\s*(${CURRENCY_CODES.join('|')})`, 'i');
      const currencyMatch = expression.match(currencyRegex);
      if (currencyMatch && !isNum) {
        const amount = parseFloat(currencyMatch[1]);
        const from = currencyMatch[2].toUpperCase();
        const to = currencyMatch[3].toUpperCase();
        if (exchangeRates[from] && exchangeRates[to]) {
          const result = (amount / exchangeRates[from]) * exchangeRates[to];
          const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
          setMessages([...updatedMessages, { role: 'assistant', content: `💱 **Currency Conversion:** ${amount} ${from} = **${result.toFixed(2)} ${to}**`, type: 'answer' }]);
          setIsUserExpanded(true);
          return;
        }
      }
      const singleCurrencyRegex = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${CURRENCY_CODES.join('|')})$`, 'i');
      const singleCurrencyMatch = expression.trim().match(singleCurrencyRegex);
      if (singleCurrencyMatch && !isNum) {
        const amount = parseFloat(singleCurrencyMatch[1]);
        const from = singleCurrencyMatch[2].toUpperCase();
        const to = prefCurrency;
        if (from !== to && exchangeRates[from] && exchangeRates[to]) {
          const result = (amount / exchangeRates[from]) * exchangeRates[to];
          const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
          setMessages([...updatedMessages, { role: 'assistant', content: `💱 **Currency Conversion:** ${amount} ${from} = **${result.toFixed(2)} ${to}**`, type: 'answer' }]);
          setIsUserExpanded(true);
          return;
        }
      }
      try {
        let result = math.evaluate(expression);
        if (result !== undefined && typeof result !== 'function') {
          const isUnit = math.typeOf(result) === 'Unit';
          if (isUnit && !expression.toLowerCase().includes(' to ')) {
            let targetUnit = '';
            if (result.equalBase(math.unit('1m'))) targetUnit = prefLength;
            else if (result.equalBase(math.unit('1kg'))) targetUnit = prefWeight;
            else if (result.equalBase(math.unit('1degC'))) targetUnit = prefTemperature;
            if (targetUnit) result = result.to(targetUnit);
          }
          const resultStr = math.format(result, { notation: 'fixed', precision: 2 });
          if (isNum || isToBe || !isAiEnabledState || isUnit) {
            const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
            setMessages([...updatedMessages, { role: 'assistant', content: `🔢 **Result:** ${resultStr}`, type: 'answer' }]);
            setIsUserExpanded(true);
            return;
          }
        }
      } catch (e) {
        if (isNum || isToBe) {
          const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
          setMessages([...updatedMessages, { role: 'assistant', content: `❌ **Error:** Could not evaluate expression. Please check your syntax.`, type: 'error' }]);
          setIsUserExpanded(true);
          return;
        }
      }
    }

    const updatedMessages: Message[] = retryText ? messages : [...messages, { role: 'user', content: userQuery }];
    if (!retryText) setMessages(updatedMessages);
    if (!isAiEnabledState) {
      setMessages(prev => [...prev, { role: 'assistant', content: "AI mode is currently disabled. You can use `/pomo` or `/todo` commands, or enable AI in Settings to chat.", type: 'answer' }]);
      return;
    }
    setIsLoading(true);
    setIsTimeout(false);
    setPendingQuery(userQuery);
    setIsExpanded(true);
    setIsUserExpanded(true);
    try {
      const result = await callAI(processedQuery, updatedMessages, selectedProviderState, apiKeysState, locationState, customEndpointState);
      setMessages(prev => [...prev, result]);
      setIsLoading(false);
      setIsTimeout(false);
      setPendingQuery(null);
      if (result.type === 'reminder') {
        const logId = genLogId();
        const createdDate = new Date();
        const newReminder: Reminder = {
          id: Math.random().toString(36).substr(2, 9),
          task: result.metadata?.task || result.content,
          time: result.metadata?.time, isAllDay: result.metadata?.isAllDay,
          noTime: result.metadata?.noTime, completed: false,
          createdAt: createdDate.toISOString(), logId,
        };
        setReminders(prev => [...prev, newReminder]);
        appendLog({ id: logId, date: fmtDate(createdDate), name: newReminder.task, type: 'todo', duration: '', start_time: fmtTime(createdDate), end_time: '', status: 'pending', pause_count: 0 });
      }
    } catch (error) {
      setIsLoading(false);
      setIsTimeout(false);
      setPendingQuery(null);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to fetch response. Please check your API key or connection.', type: 'error' }]);
    }
  };

  const handleRetry = () => { if (pendingQuery) handleSubmit(undefined, pendingQuery); };
  const handleCancel = () => { setIsLoading(false); setIsTimeout(false); setPendingQuery(null); };
  const clearConversation = () => { setMessages([]); localStorage.removeItem('lumina_history'); setLastActionTime(Date.now()); };
  const updateApiKey = (provider: string, key: string) => { setApiKeysState(prev => ({ ...prev, [provider]: key })); };

  return {
    query, setQuery,
    isLoading, setIsLoading,
    isTimeout, setIsTimeout,
    messages, setMessages,
    pendingQuery, setPendingQuery,
    handleSubmit, handleRetry, handleCancel, clearConversation, updateApiKey,
    // Expose AI settings for App.tsx binding
    isAiEnabledState, setIsAiEnabledState,
    apiKeysState, setApiKeysState,
    selectedProviderState, setSelectedProviderState,
    customEndpointState, setCustomEndpointState,
    locationState, setLocationState,
  };
}
'''

# ============================================================
# Write all files
# ============================================================
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(useSettings)
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useLogger.tsx', 'w', encoding='utf-8') as f:
    f.write(useLogger)
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\usePomodoro.tsx', 'w', encoding='utf-8') as f:
    f.write(usePomodoro)
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useReminders.tsx', 'w', encoding='utf-8') as f:
    f.write(useReminders)
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useChat.tsx', 'w', encoding='utf-8') as f:
    f.write(useChat)

print("All 5 hook files written.")
