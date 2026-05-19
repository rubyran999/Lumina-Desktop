import React from 'react';

export interface Reminder {
  id: string;
  task: string;
  time?: string;
  completed: boolean;
  isAllDay?: boolean;
  noTime?: boolean;
  createdAt: string;
  logId?: number;
}

export interface Pomo {
  id: string;
  name: string;
  duration: number;
  totalTime: number;
  mode: 'work' | 'break';
  isActive: boolean;
  finishedCount: number;
  pausesUsed: number;
  startTime: string;
}

export type SectionState = 'expanded' | 'collapsed';

export const COUNTRY_PRESETS: Record<string, any> = {
  'United States': { length: 'inch', weight: 'lb', currency: 'USD', timezone: 'America/New_York', numberFormat: '1,234.56', dateFormat: 'MM/DD/YYYY', temperature: 'degF', timeFormat: '12h' },
  'United Kingdom': { length: 'm', weight: 'kg', currency: 'GBP', timezone: 'Europe/London', numberFormat: '1,234.56', dateFormat: 'DD/MM/YYYY', temperature: 'degC', timeFormat: '24h' },
  'China': { length: 'm', weight: 'kg', currency: 'CNY', timezone: 'Asia/Shanghai', numberFormat: '1,234.56', dateFormat: 'YYYY/MM/DD', temperature: 'degC', timeFormat: '24h' },
  'Germany': { length: 'm', weight: 'kg', currency: 'EUR', timezone: 'Europe/Berlin', numberFormat: '1.234,56', dateFormat: 'DD.MM.YYYY', temperature: 'degC', timeFormat: '24h' },
  'Japan': { length: 'm', weight: 'kg', currency: 'JPY', timezone: 'Asia/Tokyo', numberFormat: '1,234.56', dateFormat: 'YYYY/MM/DD', temperature: 'degC', timeFormat: '24h' },
};

export const UNIT_OPTIONS = {
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

export const CITY_TO_TIMEZONE: Record<string, string> = {
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

export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD', 'HKD', 'SGD', 'INR', 'KRW', 'RUB', 'BRL', 'MXN', 'IDR', 'TRY', 'ZAR'];

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'answer' | 'reminder' | 'error';
  metadata?: Record<string, any>;
}
