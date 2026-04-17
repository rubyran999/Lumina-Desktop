import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, X, Clock, Command, Send, Sparkles, Trash2, CheckCircle2, MessageSquare, Minimize2, Maximize2, Cpu, Globe, Eraser, Link, ChevronDown, Play, Edit3, Save, Pause, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, parseISO } from 'date-fns';
import * as math from 'mathjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { callAI, Message, AIProvider } from './services/geminiService';
import { showNotification, playNotificationSound, hideWindow, isDesktopApp } from './lib/desktop';

interface Reminder {
  id: string;
  task: string;
  time?: string;
  completed: boolean;
  isAllDay?: boolean;
  noTime?: boolean;
}

interface Pomo {
  id: string;
  name: string;
  duration: number; // in seconds
  totalTime: number;
  mode: 'work' | 'break';
  isActive: boolean;
  finishedCount: number;
  pausesUsed: number;
}

type SectionState = 'expanded' | 'collapsed';

const COUNTRY_PRESETS: Record<string, any> = {
  'United States': { length: 'inch', weight: 'lb', currency: 'USD', timezone: 'America/New_York', numberFormat: '1,234.56', dateFormat: 'MM/DD/YYYY', temperature: 'degF', timeFormat: '12h' },
  'United Kingdom': { length: 'm', weight: 'kg', currency: 'GBP', timezone: 'Europe/London', numberFormat: '1,234.56', dateFormat: 'DD/MM/YYYY', temperature: 'degC', timeFormat: '24h' },
  'China': { length: 'm', weight: 'kg', currency: 'CNY', timezone: 'Asia/Shanghai', numberFormat: '1,234.56', dateFormat: 'YYYY/MM/DD', temperature: 'degC', timeFormat: '24h' },
  'Germany': { length: 'm', weight: 'kg', currency: 'EUR', timezone: 'Europe/Berlin', numberFormat: '1.234,56', dateFormat: 'DD.MM.YYYY', temperature: 'degC', timeFormat: '24h' },
  'Japan': { length: 'm', weight: 'kg', currency: 'JPY', timezone: 'Asia/Tokyo', numberFormat: '1,234.56', dateFormat: 'YYYY/MM/DD', temperature: 'degC', timeFormat: '24h' },
};

const UNIT_OPTIONS = {
  length: [
    { label: 'Meter (m)', value: 'm' },
    { label: 'Centimeter (cm)', value: 'cm' },
    { label: 'Millimeter (mm)', value: 'mm' },
    { label: 'Kilometer (km)', value: 'km' },
    { label: 'Inch (in)', value: 'inch' },
    { label: 'Foot (ft)', value: 'ft' },
    { label: 'Yard (yd)', value: 'yd' },
    { label: 'Mile (mi)', value: 'mile' },
  ],
  weight: [
    { label: 'Kilogram (kg)', value: 'kg' },
    { label: 'Gram (g)', value: 'g' },
    { label: 'Milligram (mg)', value: 'mg' },
    { label: 'Pound (lb)', value: 'lb' },
    { label: 'Ounce (oz)', value: 'oz' },
  ],
  temperature: [
    { label: 'Celsius (℃)', value: 'degC' },
    { label: 'Fahrenheit (℉)', value: 'degF' },
    { label: 'Kelvin (K)', value: 'kelvin' },
  ],
  timeFormat: [
    { label: '12h (AM/PM)', value: '12h' },
    { label: '24h', value: '24h' },
  ],
  currency: [
    { label: 'USD ($)', value: 'USD' },
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'GBP (£)', value: 'GBP' },
    { label: 'CNY (¥)', value: 'CNY' },
    { label: 'JPY (¥)', value: 'JPY' },
    { label: 'CAD ($)', value: 'CAD' },
    { label: 'AUD ($)', value: 'AUD' },
  ],
  timezone: [
    { label: 'New York (EST/EDT)', value: 'America/New_York' },
    { label: 'London (GMT/BST)', value: 'Europe/London' },
    { label: 'Berlin (CET/CEST)', value: 'Europe/Berlin' },
    { label: 'Shanghai (CST)', value: 'Asia/Shanghai' },
    { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'UTC', value: 'UTC' },
  ],
  numberFormat: [
    { label: '1,234.56', value: '1,234.56' },
    { label: '1.234,56', value: '1.234,56' },
  ],
  dateFormat: [
    { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
    { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
    { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
    { label: 'DD.MM.YYYY', value: 'DD.MM.YYYY' },
  ],
};

const CITY_TO_TIMEZONE: Record<string, string> = {
  'paris': 'Europe/Paris',
  'london': 'Europe/London',
  'new york': 'America/New_York',
  'nyc': 'America/New_York',
  'tokyo': 'Asia/Tokyo',
  'shanghai': 'Asia/Shanghai',
  'beijing': 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong',
  'singapore': 'Asia/Singapore',
  'sydney': 'Australia/Sydney',
  'los angeles': 'America/Los_Angeles',
  'la': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'dubai': 'Asia/Dubai',
  'moscow': 'Europe/Moscow',
  'seoul': 'Asia/Seoul',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'berlin': 'Europe/Berlin',
  'rome': 'Europe/Berlin',
  'madrid': 'Europe/Madrid',
  'toronto': 'America/Toronto',
  'vancouver': 'America/Vancouver',
  'san francisco': 'America/Los_Angeles',
  'sf': 'America/Los_Angeles',
  'seattle': 'America/Los_Angeles',
  'bangkok': 'Asia/Bangkok',
  'jakarta': 'Asia/Jakarta',
  'manila': 'Asia/Manila',
  'taipei': 'Asia/Taipei',
};

const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD', 'HKD', 'SGD', 'INR', 'KRW', 'RUB', 'BRL', 'MXN', 'IDR', 'TRY', 'ZAR'];

export default function App() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUserExpanded, setIsUserExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [pomoList, setPomoList] = useState<Pomo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [pomoSectionState, setPomoSectionState] = useState<SectionState>('collapsed');
  const [reminderSectionState, setReminderSectionState] = useState<SectionState>('collapsed');
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingReminderValue, setEditingReminderValue] = useState('');
  const [editingReminderTimeValue, setEditingReminderTimeValue] = useState('');
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  
  // Preferences
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

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [location, setLocation] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(Date.now());
  
  // Pomodoro State
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [isPomoActive, setIsPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoTotalTime, setPomoTotalTime] = useState(25 * 60);
  const [pomoName, setPomoName] = useState('');
  
  const [isTimeout, setIsTimeout] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        // Primary source
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (!response.ok) throw new Error('Primary API failed');
        const data = await response.json();
        if (data && data.rates) {
          setExchangeRates({ ...data.rates, USD: 1 });
          return;
        }
      } catch (e) {
        console.warn('Primary exchange rate API failed, trying secondary...', e);
        try {
          // Secondary source
          const response = await fetch('https://open.er-api.com/v6/latest/USD');
          if (!response.ok) throw new Error('Secondary API failed');
          const data = await response.json();
          if (data && data.rates) {
            setExchangeRates(data.rates);
            return;
          }
        } catch (e2) {
          console.error('All exchange rate APIs failed, using fallback rates.', e2);
          setExchangeRates(FALLBACK_RATES);
        }
      }
    };
    fetchRates();

    const savedReminders = localStorage.getItem('lumina_reminders');
    if (savedReminders) setReminders(JSON.parse(savedReminders));
    
    const savedPomos = localStorage.getItem('lumina_pomos');
    if (savedPomos) setPomoList(JSON.parse(savedPomos));

    const savedKeys = localStorage.getItem('lumina_api_keys');
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));

    const savedProvider = localStorage.getItem('lumina_provider');
    if (savedProvider) setSelectedProvider(savedProvider as AIProvider);

    const savedEndpoint = localStorage.getItem('lumina_custom_endpoint');
    if (savedEndpoint) setCustomEndpoint(savedEndpoint);

    const savedLocation = localStorage.getItem('lumina_location');
    if (savedLocation) setLocation(savedLocation);

    const savedHistory = localStorage.getItem('lumina_history');
    if (savedHistory) setMessages(JSON.parse(savedHistory));

    const savedAiEnabled = localStorage.getItem('lumina_ai_enabled');
    if (savedAiEnabled !== null) setIsAiEnabled(JSON.parse(savedAiEnabled));

    const savedExpanded = localStorage.getItem('lumina_is_expanded');
    if (savedExpanded !== null) setIsExpanded(JSON.parse(savedExpanded));

    const savedUserExpanded = localStorage.getItem('lumina_is_user_expanded');
    if (savedUserExpanded !== null) setIsUserExpanded(JSON.parse(savedUserExpanded));

    const savedPomoTime = localStorage.getItem('lumina_pomo_time');
    if (savedPomoTime !== null) setPomoTime(JSON.parse(savedPomoTime));

    const savedPomoActive = localStorage.getItem('lumina_pomo_active');
    if (savedPomoActive !== null) setIsPomoActive(JSON.parse(savedPomoActive));

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

    const savedReminderSectionState = localStorage.getItem('lumina_reminder_section_state');
    if (savedReminderSectionState !== null) {
      const state = savedReminderSectionState as any;
      setReminderSectionState(state === 'default' ? 'expanded' : state);
    }

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

    // Global shortcut listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Q to toggle bubble
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setIsExpanded(prev => {
          const next = !prev;
          if (next) {
            setIsUserExpanded(false); // Always start minimalist when opened via shortcut
            setShowSettings(false);
            // Focus input on next tick
            setTimeout(() => inputRef.current?.focus(), 50);
          }
          return next;
        });
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-hide logic
  useEffect(() => {
    const interval = setInterval(() => {
      // Do not auto-hide if fetching or if settings are open
      if (isExpanded && !isLoading && !showSettings && Date.now() - lastActionTime > 180000) { 
        setIsExpanded(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isExpanded, lastActionTime, isLoading, showSettings]);

  // Save state
  useEffect(() => {
    localStorage.setItem('lumina_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('lumina_pomos', JSON.stringify(pomoList));
  }, [pomoList]);

  useEffect(() => {
    localStorage.setItem('lumina_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('lumina_ai_enabled', JSON.stringify(isAiEnabled));
  }, [isAiEnabled]);

  useEffect(() => {
    localStorage.setItem('lumina_prefs', JSON.stringify({
      country: selectedCountry,
      length: prefLength,
      weight: prefWeight,
      currency: prefCurrency,
      temperature: prefTemperature,
      timezone: prefTimezone,
      numberFormat: prefNumberFormat,
      dateFormat: prefDateFormat,
      timeFormat: prefTimeFormat,
      pomoFocus: prefPomoFocus,
      pomoBreak: prefPomoBreak,
      focusSound: prefFocusSound,
      notificationSound: prefNotificationSound,
      pomoAutoStart: prefPomoAutoStart
    }));
  }, [selectedCountry, prefLength, prefWeight, prefCurrency, prefTemperature, prefTimezone, prefNumberFormat, prefDateFormat, prefTimeFormat, prefPomoFocus, prefPomoBreak, prefFocusSound, prefNotificationSound, prefPomoAutoStart]);

  useEffect(() => {
    localStorage.setItem('lumina_provider', selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    localStorage.setItem('lumina_custom_endpoint', customEndpoint);
  }, [customEndpoint]);

  useEffect(() => {
    localStorage.setItem('lumina_location', location);
  }, [location]);

  useEffect(() => {
    localStorage.setItem('lumina_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('lumina_is_expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    localStorage.setItem('lumina_is_user_expanded', JSON.stringify(isUserExpanded));
  }, [isUserExpanded]);

  useEffect(() => {
    localStorage.setItem('lumina_pomo_time', JSON.stringify(pomoTime));
  }, [pomoTime]);

  useEffect(() => {
    localStorage.setItem('lumina_pomo_active', JSON.stringify(isPomoActive));
  }, [isPomoActive]);

  useEffect(() => {
    localStorage.setItem('lumina_pomo_mode', pomoMode);
  }, [pomoMode]);

  useEffect(() => {
    localStorage.setItem('lumina_pomo_total_time', JSON.stringify(pomoTotalTime));
  }, [pomoTotalTime]);

  useEffect(() => {
    localStorage.setItem('lumina_pomo_name', pomoName);
  }, [pomoName]);

  useEffect(() => {
    localStorage.setItem('lumina_pomo_section_state', pomoSectionState);
  }, [pomoSectionState]);

  useEffect(() => {
    localStorage.setItem('lumina_reminder_section_state', reminderSectionState);
  }, [reminderSectionState]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Reminder trigger logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const triggeredReminders = reminders.filter(r => !r.completed && r.time && isAfter(now, parseISO(r.time)));

      if (triggeredReminders.length > 0) {
        // Play notification sound and show native notification
        if (prefNotificationSound) {
          playNotificationSound();
        }

        triggeredReminders.forEach(reminder => {
          // Show native OS notification
          showNotification('Lumina Reminder', reminder.task);
          // Add to conversation
          const reminderMsg: Message = {
            role: 'assistant',
            content: `🔔 **Reminder:** ${reminder.task}`,
            type: 'reminder',
            metadata: { time: reminder.time }
          };
          setMessages(prev => [...prev, reminderMsg]);
          
          // Mark as completed
          setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, completed: true } : r));
        });

        // Expand widget to show notification
        setIsExpanded(true);
        setIsUserExpanded(true);
        setLastActionTime(Date.now());
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [reminders, isExpanded]);

  // Pomodoro logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomoActive && pomoTime > 0) {
      interval = setInterval(() => {
        setPomoTime(prev => prev - 1);
      }, 1000);
    } else if (isPomoActive && pomoTime === 0) {
      setIsPomoActive(false);
      if (prefNotificationSound) {
        playNotificationSound();
      }

      const nextMode = pomoMode === 'work' ? 'break' : 'work';
      showNotification('Lumina Pomodoro', `Time for a ${nextMode}!`);
      const nextDuration = nextMode === 'work' ? prefPomoFocus : prefPomoBreak;
      const nextTime = nextDuration * 60;
      
      // Update finished count if work mode and pauses <= 3
      if (pomoMode === 'work') {
        setPomoList(prev => prev.map(p => {
          if (p.isActive) {
            const isCounted = (p.pausesUsed || 0) <= 3;
            return { 
              ...p, 
              finishedCount: (p.finishedCount || 0) + (isCounted ? 1 : 0),
              pausesUsed: 0 // Reset for next session
            };
          }
          return p;
        }));
      }

      const pomoMsg: Message = {
        role: 'assistant',
        content: `🍅 **Pomodoro Finished!** Time for a ${nextMode}.`,
        type: 'reminder'
      };
      setMessages(prev => [...prev, pomoMsg]);
      
      setPomoMode(nextMode);
      setPomoTime(nextTime);
      setPomoTotalTime(nextTime);

      if (prefPomoAutoStart) {
        setIsPomoActive(true);
      }
      
      setIsExpanded(true);
      setIsUserExpanded(true);
    }
    return () => clearInterval(interval);
  }, [isPomoActive, pomoTime, pomoMode]);

  // Focus sound (ticking) logic
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

  const parseTimeInfo = (text: string) => {
    // 1130am, 11:30am, 11:30, 2300, 23:00
    // Must have am/pm, or a colon, or be 3-4 digits (like 2300)
    const timeRegex = /\b(\d{1,2})[:](\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b|\b(\d{3,4})\b/i;
    // 15m, 1h
    const relativeRegex = /\b(\d+)\s*(m|min|h|hour)s?\b/i;

    const relMatch = text.match(relativeRegex);
    if (relMatch) {
      const value = parseInt(relMatch[1]);
      const unit = relMatch[2].toLowerCase();
      const now = new Date();
      if (unit.startsWith('m')) now.setMinutes(now.getMinutes() + value);
      else now.setHours(now.getHours() + value);
      return { 
        time: now.toISOString(), 
        task: text.replace(relMatch[0], '').trim(),
        found: true
      };
    }

    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      if (text.trim() === timeMatch[0].trim() && !timeMatch[3] && !timeMatch[5] && !text.includes(':')) {
         return { task: text, found: false };
      }

      let hours = 0;
      let minutes = 0;
      let ampm = '';

      if (timeMatch[1]) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        ampm = timeMatch[3]?.toLowerCase();
      } else if (timeMatch[4]) {
        hours = parseInt(timeMatch[4]);
        ampm = timeMatch[5]?.toLowerCase();
      } else if (timeMatch[6]) {
        const val = timeMatch[6];
        if (val.length === 3) {
          hours = parseInt(val[0]);
          minutes = parseInt(val.slice(1));
        } else {
          hours = parseInt(val.slice(0, 2));
          minutes = parseInt(val.slice(2));
        }
      }

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      if (hours > 23 || minutes > 59) return { task: text, found: false };

      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      if (target < now) {
        target.setDate(target.getDate() + 1);
      }

      return { 
        time: target.toISOString(), 
        task: text.replace(timeMatch[0], '').trim(),
        found: true
      };
    }

    return { task: text, found: false };
  };

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
        const newReminder: Reminder = {
          id: Math.random().toString(36).substr(2, 9),
          task: timeInfo.task,
          time: timeInfo.found ? timeInfo.time : undefined,
          completed: false,
          noTime: !timeInfo.found
        };
        setReminders(prev => [...prev, newReminder]);
        
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
        // Only treat as duration if there's more than one part OR if it's clearly not just a name
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
        name: name,
        duration: durationSec,
        totalTime: durationSec,
        mode: 'work',
        isActive: true,
        finishedCount: 0,
        pausesUsed: 0
      };
      
      setPomoList(prev => [newPomo, ...prev.map(p => ({ ...p, isActive: false }))]);
      setIsPomoActive(true);
      setPomoTime(durationSec);
      setPomoTotalTime(durationSec);
      setPomoMode('work');
      setPomoName(name);
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
        const newReminder: Reminder = {
          id: Math.random().toString(36).substr(2, 9),
          task: result.metadata?.task || result.content,
          time: result.metadata?.time,
          isAllDay: result.metadata?.isAllDay,
          noTime: result.metadata?.noTime,
          completed: false
        };
        setReminders(prev => [...prev, newReminder]);
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

  const handleCancel = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLoading(false);
    setIsTimeout(false);
    setPendingQuery(null);
  };

  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem('lumina_history');
    setLastActionTime(Date.now());
  };

  const togglePomo = (id: string) => {
    setPomoList(prev => prev.map(p => {
      if (p.id === id) {
        const nextActive = !p.isActive;
        if (nextActive) {
          setIsPomoActive(true);
          setPomoTime(p.duration);
          setPomoTotalTime(p.totalTime);
          setPomoMode(p.mode);
          setPomoName(p.name);
          return { ...p, isActive: true, pausesUsed: 0 };
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
      setPomoList(prev => prev.map(p => {
        if (p.isActive) {
          return { ...p, pausesUsed: (p.pausesUsed || 0) + 1 };
        }
        return p;
      }));
    } else {
      setIsPomoActive(true);
    }
  };

  const restartPomo = () => {
    const active = pomoList.find(p => p.isActive);
    if (active) {
      setPomoTime(active.totalTime);
      setIsPomoActive(false);
      setPomoList(prev => prev.map(p => p.isActive ? { ...p, pausesUsed: 0 } : p));
    }
  };

  const deletePomo = (id: string) => {
    setPomoList(prev => {
      const p = prev.find(item => item.id === id);
      if (p?.isActive) setIsPomoActive(false);
      return prev.filter(item => item.id !== id);
    });
  };

  const togglePomoSection = () => {
    setPomoSectionState(prev => prev === 'expanded' ? 'collapsed' : 'expanded');
  };

  const toggleReminderSection = () => {
    setReminderSectionState(prev => prev === 'expanded' ? 'collapsed' : 'expanded');
  };

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

  const saveReminderEdit = (id: string) => {
    const timeInfo = parseTimeInfo(editingReminderTimeValue);
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        return { 
          ...r, 
          task: editingReminderValue,
          time: timeInfo.found ? timeInfo.time : r.time,
          noTime: !timeInfo.found && !editingReminderTimeValue.trim() ? true : timeInfo.found ? false : r.noTime
        };
      }
      return r;
    }));
    setEditingReminderId(null);
    setLastActionTime(Date.now());
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
    setLastActionTime(Date.now());
  };

  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateApiKey = (provider: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const providers: { id: AIProvider; name: string; icon: React.ReactNode }[] = [
    { id: 'gemini', name: 'Gemini', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'openai', name: 'GPT-4o', icon: <Cpu className="w-4 h-4" /> },
    { id: 'anthropic', name: 'Claude 3.5', icon: <Cpu className="w-4 h-4" /> },
    { id: 'deepseek', name: 'DeepSeek', icon: <Cpu className="w-4 h-4" /> },
    { id: 'kimi', name: 'Kimi', icon: <Cpu className="w-4 h-4" /> },
    { id: 'custom', name: 'Custom', icon: <Settings className="w-4 h-4" /> },
  ];

  const showHistory = isUserExpanded;

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      
      {/* Main Widget */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            ref={widgetRef}
            initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "glass rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col transition-all duration-300",
              showHistory ? "w-[400px] max-h-[85vh]" : "w-[300px] max-h-[60vh]"
            )}
          >
            {/* Header - Always show if expanded */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  data-tauri-drag-region
                  className="border-b border-white/5 bg-white/5 flex items-center justify-between p-4 cursor-move"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight">Lumina</h2>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none">
                        {isAiEnabled ? `${providers.find(p => p.id === selectedProvider)?.name || selectedProvider} Mode` : 'Free Mode'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {messages.length > 0 && (
                      <button 
                        onClick={clearConversation}
                        title="Clear Conversation"
                        className="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-red-400 transition-colors"
                      >
                        <Eraser className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={cn("p-2 rounded-lg transition-colors", showSettings ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:bg-white/5 hover:text-white")}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsUserExpanded(false)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Fixed Top Section: Next, Pomo and Reminders */}
              <div className={cn(
                "px-4 transition-all duration-300 border-b border-white/5 bg-white/[0.02]",
                (pomoList.length > 0 || reminders.filter(r => !r.completed).length > 0) ? "py-2" : "h-0 overflow-hidden"
              )}>
                {/* Next Section */}
                {(() => {
                  const activePomo = pomoList.find(p => p.isActive);
                  const nextReminder = reminders
                    .filter(r => !r.completed && !r.noTime && r.time)
                    .sort((a, b) => parseISO(a.time!).getTime() - parseISO(b.time!).getTime())[0];
                  const nextTodo = reminders.filter(r => !r.completed && r.noTime)[0];
                  const actualNextReminder = nextReminder || nextTodo;

                  if (!activePomo && !actualNextReminder) return null;

                  return (
                    <div className="mb-3 space-y-1.5">
                      <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Next
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {activePomo && (
                          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                isPomoActive ? "animate-pulse bg-red-500" : "bg-slate-600"
                              )} />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] uppercase tracking-widest font-bold text-indigo-400 truncate">
                                  {activePomo.name} [{activePomo.finishedCount || 0} finished]
                                </span>
                                <div className="text-xs font-mono font-bold text-white">
                                  {formatPomoTime(pomoTime)}
                                </div>
                              </div>
                            </div>

                            {/* Pause Dots */}
                            <div className="flex items-center gap-1 px-2">
                              {[1, 2, 3].map(dot => (
                                <div 
                                  key={dot}
                                  className={cn(
                                    "w-1 h-1 rounded-full",
                                    (activePomo.pausesUsed || 0) < dot ? "bg-green-500" : "bg-white/10"
                                  )}
                                />
                              ))}
                            </div>

                            <div className="flex items-center gap-1">
                              <button 
                                onClick={pausePomo}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              >
                                {isPomoActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                onClick={restartPomo}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => deletePomo(activePomo.id)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {actualNextReminder && (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] text-amber-100 font-medium truncate">{actualNextReminder.task}</span>
                              <span className="text-[8px] text-amber-500/60 font-mono">
                                {actualNextReminder.noTime ? 'Todo' : actualNextReminder.isAllDay ? format(parseISO(actualNextReminder.time!), 'MMM d') : format(parseISO(actualNextReminder.time!), prefTimeFormat === '12h' ? 'h:mm a' : 'HH:mm')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => toggleReminder(actualNextReminder.id)}
                                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-green-400"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Pomodoro Section */}
                {pomoList.length > 0 && !showSettings && (
                  <div className="mb-2 space-y-1.5">
                    <button 
                      onClick={togglePomoSection}
                      className="w-full text-[10px] text-indigo-400 uppercase tracking-widest font-bold flex items-center justify-between hover:text-indigo-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Pomodoro ({pomoList.length})
                      </div>
                      <motion.div
                        animate={{ rotate: pomoSectionState === 'collapsed' ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {pomoSectionState !== 'collapsed' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={cn(
                            "space-y-1.5 overflow-x-hidden custom-scrollbar",
                            pomoSectionState === 'expanded' ? "max-h-[180px] overflow-y-auto pr-1" : "overflow-y-hidden"
                          )}
                        >
                          {([...pomoList].sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))).map(p => (
                            <div key={p.id} className={cn(
                              "p-2 rounded-xl border transition-all space-y-1.5",
                              p.isActive ? "bg-indigo-500/10 border-indigo-500/20" : "bg-white/5 border-white/5"
                            )}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    p.isActive ? "animate-pulse bg-red-500" : "bg-slate-600"
                                  )} />
                                  <span className={cn("text-[9px] uppercase tracking-widest font-bold truncate", p.isActive ? "text-indigo-400" : "text-slate-500")}>
                                    {p.name} [{p.finishedCount || 0} finished]
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {!p.isActive && (
                                    <button 
                                      onClick={() => togglePomo(p.id)}
                                      className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-green-400 transition-colors"
                                    >
                                      <Play className="w-3 h-3" />
                                    </button>
                                  )}
                                  {p.isActive && (
                                    <button 
                                      onClick={() => setIsPomoActive(false)}
                                      className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => deletePomo(p.id)}
                                    className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              
                              {p.isActive && (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-lg font-mono font-bold text-white tracking-tighter">
                                    {formatPomoTime(pomoTime)}
                                  </div>
                                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={false}
                                      animate={{ width: `${(pomoTime / pomoTotalTime) * 100}%` }}
                                      className={cn(
                                        "h-full transition-colors duration-1000",
                                        pomoMode === 'work' ? "bg-red-500" : "bg-green-500"
                                      )}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Reminder Section */}
                {reminders.filter(r => !r.completed).length > 0 && !showSettings && (
                  <div className="space-y-1.5">
                    <button 
                      onClick={toggleReminderSection}
                      className="w-full text-[10px] text-amber-500 uppercase tracking-widest font-bold flex items-center justify-between hover:text-amber-400 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="w-3 h-3" /> Reminders ({reminders.filter(r => !r.completed).length})
                      </div>
                      <motion.div
                        animate={{ rotate: reminderSectionState === 'collapsed' ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </button>
                    
                    <AnimatePresence>
                      {reminderSectionState !== 'collapsed' && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={cn(
                            "space-y-1 overflow-x-hidden custom-scrollbar",
                            reminderSectionState === 'expanded' ? "max-h-[130px] overflow-y-auto pr-1" : "overflow-y-hidden"
                          )}
                        >
                          {reminders.filter(r => !r.completed).map(r => (
                            <div key={r.id} className="group flex items-center justify-between p-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-all">
                              <div className="flex flex-col min-w-0 flex-1">
                                {editingReminderId === r.id ? (
                                  <div className="flex flex-col gap-1 pr-2">
                                    <input 
                                      autoFocus
                                      value={editingReminderValue}
                                      onChange={(e) => setEditingReminderValue(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && saveReminderEdit(r.id)}
                                      placeholder="Task name"
                                      className="w-full bg-black/40 border border-indigo-500/30 rounded px-1.5 py-0.5 text-[11px] text-white outline-none"
                                    />
                                    <div className="flex items-center gap-1">
                                      <input 
                                        value={editingReminderTimeValue}
                                        onChange={(e) => setEditingReminderTimeValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && saveReminderEdit(r.id)}
                                        placeholder="Time (e.g. 11am, 15m)"
                                        className="flex-1 bg-black/40 border border-indigo-500/30 rounded px-1.5 py-0.5 text-[9px] text-slate-300 outline-none"
                                      />
                                      <button 
                                        onClick={() => saveReminderEdit(r.id)}
                                        className="p-1 rounded hover:bg-indigo-500/20 text-indigo-400"
                                      >
                                        <Save className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-[11px] text-amber-100 font-medium truncate">{r.task}</span>
                                    <span className="text-[8px] text-amber-500/60 font-mono">
                                      {r.noTime ? 'Todo' : r.isAllDay ? format(parseISO(r.time!), 'MMM d') : format(parseISO(r.time!), prefTimeFormat === '12h' ? 'h:mm a' : 'HH:mm')}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {editingReminderId !== r.id && (
                                  <button 
                                    onClick={() => startEditingReminder(r)}
                                    className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-indigo-400"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => toggleReminder(r.id)}
                                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-green-400"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => deleteReminder(r.id)}
                                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Scrollable Section: Messages / Settings */}
              <div 
                ref={scrollRef}
                className={cn(
                  "flex-1 overflow-y-auto custom-scrollbar px-4 transition-all duration-300",
                  isUserExpanded ? "py-4" : "h-0 py-0"
                )}
              >
                <AnimatePresence mode="wait">
                  {isUserExpanded && (
                    showSettings ? (
                      <motion.div
                        key="settings"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Settings</h3>
                            <button 
                              onClick={() => setShowSettings(false)}
                              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Preferences Section */}
                          <div className="space-y-4 pb-4 border-b border-white/5">
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Country / Region</label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                                <select 
                                  value={selectedCountry}
                                  onChange={(e) => handleCountryChange(e.target.value)}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs focus:border-indigo-500/50 outline-none appearance-none cursor-pointer text-slate-200"
                                >
                                  {Object.keys(COUNTRY_PRESETS).map(c => (
                                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Length</label>
                                <div className="relative">
                                  <select 
                                    value={prefLength}
                                    onChange={(e) => setPrefLength(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.length.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Weight</label>
                                <div className="relative">
                                  <select 
                                    value={prefWeight}
                                    onChange={(e) => setPrefWeight(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.weight.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Temperature</label>
                                <div className="relative">
                                  <select 
                                    value={prefTemperature}
                                    onChange={(e) => setPrefTemperature(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.temperature.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Currency</label>
                                <div className="relative">
                                  <select 
                                    value={prefCurrency}
                                    onChange={(e) => setPrefCurrency(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.currency.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Timezone</label>
                                <div className="relative">
                                  <select 
                                    value={prefTimezone}
                                    onChange={(e) => setPrefTimezone(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.timezone.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Number Format</label>
                                <div className="relative">
                                  <select 
                                    value={prefNumberFormat}
                                    onChange={(e) => setPrefNumberFormat(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.numberFormat.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Date Format</label>
                                <div className="relative">
                                  <select 
                                    value={prefDateFormat}
                                    onChange={(e) => setPrefDateFormat(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.dateFormat.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Time Format</label>
                                <div className="relative">
                                  <select 
                                    value={prefTimeFormat}
                                    onChange={(e) => setPrefTimeFormat(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                                  >
                                    {UNIT_OPTIONS.timeFormat.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Notification Sound</label>
                                <button 
                                  onClick={() => setPrefNotificationSound(!prefNotificationSound)}
                                  className={cn(
                                    "relative w-8 h-4 rounded-full transition-colors duration-300",
                                    prefNotificationSound ? "bg-indigo-600" : "bg-slate-700"
                                  )}
                                >
                                  <motion.div 
                                    animate={{ x: prefNotificationSound ? 16 : 2 }}
                                    className="absolute top-1 w-2 h-2 rounded-full bg-white"
                                  />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-white/5">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-indigo-400" />
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pomodoro Settings</label>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Focus (min)</label>
                                  <input 
                                    type="number"
                                    value={prefPomoFocus}
                                    onChange={(e) => setPrefPomoFocus(parseInt(e.target.value) || 25)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Break (min)</label>
                                  <input 
                                    type="number"
                                    value={prefPomoBreak}
                                    onChange={(e) => setPrefPomoBreak(parseInt(e.target.value) || 5)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:border-indigo-500/50 outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Focus Sound (Ticking)</label>
                                <button 
                                  onClick={() => setPrefFocusSound(!prefFocusSound)}
                                  className={cn(
                                    "relative w-8 h-4 rounded-full transition-colors duration-300",
                                    prefFocusSound ? "bg-indigo-600" : "bg-slate-700"
                                  )}
                                >
                                  <motion.div 
                                    animate={{ x: prefFocusSound ? 16 : 2 }}
                                    className="absolute top-1 w-2 h-2 rounded-full bg-white"
                                  />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Auto-start Next</label>
                                <button 
                                  onClick={() => setPrefPomoAutoStart(!prefPomoAutoStart)}
                                  className={cn(
                                    "relative w-8 h-4 rounded-full transition-colors duration-300",
                                    prefPomoAutoStart ? "bg-indigo-600" : "bg-slate-700"
                                  )}
                                >
                                  <motion.div 
                                    animate={{ x: prefPomoAutoStart ? 16 : 2 }}
                                    className="absolute top-1 w-2 h-2 rounded-full bg-white"
                                  />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <Sparkles className={cn("w-3 h-3", isAiEnabled ? "text-indigo-400" : "text-slate-600")} />
                              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">AI Mode</label>
                            </div>
                            <button 
                              onClick={() => setIsAiEnabled(!isAiEnabled)}
                              className={cn(
                                "relative w-8 h-4 rounded-full transition-colors duration-300",
                                isAiEnabled ? "bg-indigo-600" : "bg-slate-700"
                              )}
                            >
                              <motion.div 
                                animate={{ x: isAiEnabled ? 16 : 2 }}
                                className="absolute top-1 w-2 h-2 rounded-full bg-white"
                              />
                            </button>
                          </div>

                          {isAiEnabled ? (
                            <>
                              <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Select Provider</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {providers.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => setSelectedProvider(p.id)}
                                      className={cn(
                                        "flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-medium transition-all",
                                        selectedProvider === p.id 
                                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" 
                                          : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                      )}
                                    >
                                      {p.icon}
                                      {p.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              {selectedProvider !== 'custom' && (
                                <div className="space-y-2">
                                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">API Key</label>
                                  <input 
                                    type="password" 
                                    value={apiKeys[selectedProvider] || ''}
                                    onChange={(e) => updateApiKey(selectedProvider, e.target.value)}
                                    placeholder={`Enter ${selectedProvider} API Key`}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-indigo-500/50 outline-none"
                                  />
                                </div>
                              )}

                              {selectedProvider === 'custom' && (
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Endpoint URL</label>
                                    <div className="relative">
                                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                      <input 
                                        type="text" 
                                        value={customEndpoint}
                                        onChange={(e) => setCustomEndpoint(e.target.value)}
                                        placeholder="https://api.example.com/v1"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs focus:border-indigo-500/50 outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">API Key</label>
                                    <input 
                                      type="password" 
                                      value={apiKeys['custom'] || ''}
                                      onChange={(e) => updateApiKey('custom', e.target.value)}
                                      placeholder="Enter Custom API Key"
                                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-indigo-500/50 outline-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="py-4 text-center space-y-2">
                              <div className="w-8 h-8 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
                                <Cpu className="w-4 h-4 text-slate-600" />
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium italic">Free Mode Active. AI features are disabled.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="messages"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        {/* Empty State */}
                        {messages.length === 0 && reminders.filter(r => !r.completed).length === 0 && !isPomoActive && !isLoading && (
                          <div className="py-8 text-center space-y-3 opacity-30">
                            <Globe className="w-10 h-10 mx-auto text-slate-400" />
                            <p className="text-xs font-medium">Search anything or set a reminder</p>
                          </div>
                        )}

                        {/* Messages */}
                        <div className="space-y-4">
                          {messages.map((msg, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex flex-col gap-1",
                                msg.role === 'user' ? "items-end" : "items-start"
                              )}
                            >
                              <div className={cn(
                                "max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                msg.role === 'user' 
                                  ? "bg-indigo-600 text-white rounded-tr-none" 
                                  : msg.type === 'reminder'
                                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-200 rounded-tl-none shadow-amber-500/10"
                                    : "bg-white/5 border border-white/5 text-slate-200 rounded-tl-none"
                              )}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                              {msg.metadata?.time && (
                                <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-mono mt-1">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(msg.metadata.time), 'MMM d, h:mm a')}
                                </div>
                              )}
                            </motion.div>
                          ))}

                          {isLoading && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start gap-2">
                                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                                  <div className="flex gap-1">
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                  </div>
                                </div>
                              </div>

                              {isTimeout && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex flex-col gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
                                >
                                  <div className="flex items-center gap-2 text-red-400">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs font-medium">This is taking longer than expected...</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={handleRetry}
                                      className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-[10px] font-bold text-red-200 transition-all"
                                    >
                                      RETRY
                                    </button>
                                    <button 
                                      onClick={handleCancel}
                                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-400 transition-all"
                                    >
                                      CANCEL
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Input Area */}
            <div 
              onClick={() => {
                if (showSettings) setShowSettings(false);
              }}
              className={cn(
                "p-4 transition-all duration-300 flex items-center gap-2",
                showHistory ? "bg-black/20 border-t border-white/5" : "bg-transparent"
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserExpanded(!isUserExpanded);
                  setLastActionTime(Date.now());
                }}
                className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
                title={isUserExpanded ? "Collapse" : "Expand"}
              >
                {isUserExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <form onSubmit={handleSubmit} className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLastActionTime(Date.now());
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    // We don't auto-expand on focus anymore per user request "only expand after sending or clicking in the bubble"
                    // Wait, user said "Click anywhere outside the bubble > collapse". 
                    // And "Click expand button > expand/minimalist".
                  }}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Type a message..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-indigo-600 text-white disabled:opacity-30 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble Trigger */}
      <motion.button
        layoutId="bubble"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) {
            setIsUserExpanded(false); 
            setShowSettings(false);
            // Focus input on next tick
            setTimeout(() => inputRef.current?.focus(), 50);
          }
          setLastActionTime(Date.now());
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500",
          isExpanded ? "bg-white/10 text-white rotate-90" : "bg-indigo-600 text-white"
        )}
      >
        {isExpanded ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isExpanded && reminders.filter(r => !r.completed).length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-slate-950">
            {reminders.filter(r => !r.completed).length}
          </span>
        )}
      </motion.button>

      {/* Shortcut Hint */}
      {!isExpanded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mr-2"
        >
          Ctrl + Q to open
        </motion.div>
      )}
    </div>
  );
}

