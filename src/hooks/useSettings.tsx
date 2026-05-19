import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Settings } from 'lucide-react';
import { AIProvider } from '../services/geminiService';
import { COUNTRY_PRESETS } from '../types';

// ── Return type ──
export interface SettingsState {
  // Preferences
  selectedCountry: string;
  setSelectedCountry: React.Dispatch<React.SetStateAction<string>>;
  prefLength: string;
  setPrefLength: React.Dispatch<React.SetStateAction<string>>;
  prefWeight: string;
  setPrefWeight: React.Dispatch<React.SetStateAction<string>>;
  prefCurrency: string;
  setPrefCurrency: React.Dispatch<React.SetStateAction<string>>;
  prefTemperature: string;
  setPrefTemperature: React.Dispatch<React.SetStateAction<string>>;
  prefTimezone: string;
  setPrefTimezone: React.Dispatch<React.SetStateAction<string>>;
  prefNumberFormat: string;
  setPrefNumberFormat: React.Dispatch<React.SetStateAction<string>>;
  prefDateFormat: string;
  setPrefDateFormat: React.Dispatch<React.SetStateAction<string>>;
  prefTimeFormat: string;
  setPrefTimeFormat: React.Dispatch<React.SetStateAction<string>>;
  prefPomoFocus: number;
  setPrefPomoFocus: React.Dispatch<React.SetStateAction<number>>;
  prefPomoBreak: number;
  setPrefPomoBreak: React.Dispatch<React.SetStateAction<number>>;
  prefFocusSound: boolean;
  setPrefFocusSound: React.Dispatch<React.SetStateAction<boolean>>;
  prefNotificationSound: boolean;
  setPrefNotificationSound: React.Dispatch<React.SetStateAction<boolean>>;
  prefPomoAutoStart: boolean;
  setPrefPomoAutoStart: React.Dispatch<React.SetStateAction<boolean>>;
  // AI / Provider
  isAiEnabled: boolean;
  setIsAiEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  apiKeys: Record<string, string>;
  setApiKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedProvider: AIProvider;
  setSelectedProvider: React.Dispatch<React.SetStateAction<AIProvider>>;
  customEndpoint: string;
  setCustomEndpoint: React.Dispatch<React.SetStateAction<string>>;
  location: string;
  setLocation: React.Dispatch<React.SetStateAction<string>>;
  // Exchange rates
  exchangeRates: Record<string, number>;
  setExchangeRates: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  // Actions
  handleCountryChange: (country: string) => void;
  updateApiKey: (provider: string, key: string) => void;
  // Derived
  providers: { id: AIProvider; name: string; icon: React.ReactNode }[];
}

export function useSettings(): SettingsState {
  // ── Preferences State ──
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

  // ── AI / Provider State ──
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [location, setLocation] = useState('');

  // ── Exchange Rates ──
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const savedKeys = localStorage.getItem('lumina_api_keys');
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));

    const savedProvider = localStorage.getItem('lumina_provider');
    if (savedProvider) setSelectedProvider(savedProvider as AIProvider);

    const savedEndpoint = localStorage.getItem('lumina_custom_endpoint');
    if (savedEndpoint) setCustomEndpoint(savedEndpoint);

    const savedLocation = localStorage.getItem('lumina_location');
    if (savedLocation) setLocation(savedLocation);

    const savedAiEnabled = localStorage.getItem('lumina_ai_enabled');
    if (savedAiEnabled !== null) setIsAiEnabled(JSON.parse(savedAiEnabled));

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
  }, []);

  // ── Fetch exchange rates ──
  useEffect(() => {
    const FALLBACK_RATES: Record<string, number> = {
      USD: 1, EUR: 0.92, GBP: 0.79, CNY: 7.23, JPY: 151.5,
      CAD: 1.36, AUD: 1.52, HKD: 7.82, SGD: 1.35, INR: 83.3,
      KRW: 1350, RUB: 92.5, BRL: 5.05, MXN: 16.5, IDR: 15900,
      TRY: 32.2, ZAR: 18.8,
    };

    const fetchRates = async () => {
      try {
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
  }, []);

  // ── Persist to localStorage ──
  useEffect(() => { localStorage.setItem('lumina_api_keys', JSON.stringify(apiKeys)); }, [apiKeys]);
  useEffect(() => { localStorage.setItem('lumina_ai_enabled', JSON.stringify(isAiEnabled)); }, [isAiEnabled]);
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
      pomoAutoStart: prefPomoAutoStart,
    }));
  }, [selectedCountry, prefLength, prefWeight, prefCurrency, prefTemperature, prefTimezone, prefNumberFormat, prefDateFormat, prefTimeFormat, prefPomoFocus, prefPomoBreak, prefFocusSound, prefNotificationSound, prefPomoAutoStart]);
  useEffect(() => { localStorage.setItem('lumina_provider', selectedProvider); }, [selectedProvider]);
  useEffect(() => { localStorage.setItem('lumina_custom_endpoint', customEndpoint); }, [customEndpoint]);
  useEffect(() => { localStorage.setItem('lumina_location', location); }, [location]);

  // ── Actions ──
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

  const updateApiKey = (provider: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  // ── Derived ──
  const providers: { id: AIProvider; name: string; icon: React.ReactNode }[] = [
    { id: 'gemini', name: 'Gemini', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'openai', name: 'GPT-4o', icon: <Cpu className="w-4 h-4" /> },
    { id: 'anthropic', name: 'Claude 3.5', icon: <Cpu className="w-4 h-4" /> },
    { id: 'deepseek', name: 'DeepSeek', icon: <Cpu className="w-4 h-4" /> },
    { id: 'kimi', name: 'Kimi', icon: <Cpu className="w-4 h-4" /> },
    { id: 'custom', name: 'Custom', icon: <Settings className="w-4 h-4" /> },
  ];

  return {
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
  };
}
