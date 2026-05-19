import { useState, useEffect } from 'react';
import { format, isAfter, parseISO } from 'date-fns';
import { showNotification, playNotificationSound } from '../lib/desktop';
import { appendLog, updateLog } from '../services/dataLogService';
import { Reminder, SectionState } from '../types';
import type { Message } from '../services/geminiService';

// ── Dependencies ──
export interface ReminderDeps {
  // Preferences (from settings)
  prefNotificationSound: boolean;
  prefTimeFormat: string;
  // UI state setters (from core)
  setIsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setIsUserExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setLastActionTime: (v: number | ((prev: number) => number)) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  // Logger helpers (from logger / _core)
  genLogId: () => number;
  fmtDate: (d: Date) => string;
  fmtTime: (d: Date) => string;
  fmtISOtoTime: (iso: string) => string;
}

// ── Return type ──
export interface ReminderState {
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  reminderSectionState: SectionState;
  setReminderSectionState: React.Dispatch<React.SetStateAction<SectionState>>;
  editingReminderId: string | null;
  setEditingReminderId: React.Dispatch<React.SetStateAction<string | null>>;
  editingReminderValue: string;
  setEditingReminderValue: React.Dispatch<React.SetStateAction<string>>;
  editingReminderTimeValue: string;
  setEditingReminderTimeValue: React.Dispatch<React.SetStateAction<string>>;
  // Actions
  toggleReminderSection: () => void;
  deleteReminder: (id: string) => void;
  startEditingReminder: (r: Reminder) => void;
  saveReminderEdit: (id: string) => void;
  toggleReminder: (id: string) => void;
  // Utilities
  parseTimeInfo: (text: string) => { time?: string; task: string; found: boolean };
  /** Create a reminder from the /todo command (AI-disabled path). Returns the new Reminder. */
  addReminder: (task: string, timeIso?: string, noTime?: boolean) => Reminder;
}

export function useReminders(deps: ReminderDeps): ReminderState {
  const {
    prefNotificationSound, prefTimeFormat,
    setIsExpanded, setIsUserExpanded, setLastActionTime, setMessages,
    genLogId, fmtDate, fmtTime, fmtISOtoTime,
  } = deps;

  // ── State ──
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderSectionState, setReminderSectionState] = useState<SectionState>('collapsed');
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingReminderValue, setEditingReminderValue] = useState('');
  const [editingReminderTimeValue, setEditingReminderTimeValue] = useState('');

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const savedReminders = localStorage.getItem('lumina_reminders');
    if (savedReminders) {
      const parsed = JSON.parse(savedReminders);
      const migrated = parsed.map((r: any) =>
        r.createdAt ? r : { ...r, createdAt: r.time || new Date().toISOString() }
      );
      setReminders(migrated);
    }

    const savedReminderSectionState = localStorage.getItem('lumina_reminder_section_state');
    if (savedReminderSectionState !== null) {
      const state = savedReminderSectionState as any;
      setReminderSectionState(state === 'default' ? 'expanded' : state);
    }
  }, []);

  // ── Persist to localStorage ──
  useEffect(() => { localStorage.setItem('lumina_reminders', JSON.stringify(reminders)); }, [reminders]);
  useEffect(() => { localStorage.setItem('lumina_reminder_section_state', reminderSectionState); }, [reminderSectionState]);

  // ── Reminder trigger (check every 10s) ──
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const triggeredReminders = reminders.filter(
        r => !r.completed && r.time && isAfter(now, parseISO(r.time))
      );

      if (triggeredReminders.length > 0) {
        if (prefNotificationSound) {
          playNotificationSound();
        }

        triggeredReminders.forEach(reminder => {
          showNotification('Lumina Reminder', reminder.task);
          const reminderMsg: Message = {
            role: 'assistant',
            content: `🔔 **Reminder:** ${reminder.task}`,
            type: 'reminder',
            metadata: { time: reminder.time },
          };
          setMessages(prev => [...prev, reminderMsg]);
        });

        setIsExpanded(true);
        setIsUserExpanded(true);
        setLastActionTime(Date.now());
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [reminders, prefNotificationSound]);

  // ── Time parsing utility ──
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
      return {
        time: now.toISOString(),
        task: text.replace(relMatch[0], '').trim(),
        found: true,
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
      if (target < now) target.setDate(target.getDate() + 1);

      return {
        time: target.toISOString(),
        task: text.replace(timeMatch[0], '').trim(),
        found: true,
      };
    }

    return { task: text, found: false };
  };

  // ── Actions ──

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
    setEditingReminderTimeValue(
      r.noTime
        ? ''
        : r.time
          ? format(parseISO(r.time), prefTimeFormat === '12h' ? 'h:mm a' : 'HH:mm')
          : ''
    );
  };

  const saveReminderEdit = (id: string) => {
    const timeInfo = parseTimeInfo(editingReminderTimeValue);
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        if (r.logId && editingReminderValue !== r.task) {
          updateLog(r.logId, '', '', editingReminderValue);
        }
        return {
          ...r,
          task: editingReminderValue,
          time: timeInfo.found ? timeInfo.time : r.time,
          noTime: !timeInfo.found && !editingReminderTimeValue.trim()
            ? true
            : timeInfo.found
              ? false
              : r.noTime,
        };
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
        if (nextCompleted && r.logId) {
          updateLog(r.logId, fmtTime(new Date()), 'completed', r.task);
        }
        return { ...r, completed: nextCompleted };
      }
      return r;
    }));
    setLastActionTime(Date.now());
  };

  /** Create a reminder (used by /todo command AI-disabled path). */
  const addReminder = (task: string, timeIso?: string, noTime?: boolean): Reminder => {
    const logId = genLogId();
    const createdDate = new Date();
    const newReminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      task,
      time: timeIso,
      completed: false,
      noTime: noTime ?? !timeIso,
      createdAt: createdDate.toISOString(),
      logId,
    };
    setReminders(prev => [...prev, newReminder]);

    appendLog({
      id: logId,
      date: fmtDate(createdDate),
      name: task,
      type: 'todo',
      duration: '',
      start_time: fmtTime(createdDate),
      end_time: '',
      status: 'pending',
      pause_count: 0,
    });

    return newReminder;
  };

  return {
    // State
    reminders, setReminders,
    reminderSectionState, setReminderSectionState,
    editingReminderId, setEditingReminderId,
    editingReminderValue, setEditingReminderValue,
    editingReminderTimeValue, setEditingReminderTimeValue,
    // Actions
    toggleReminderSection,
    deleteReminder,
    startEditingReminder,
    saveReminderEdit,
    toggleReminder,
    // Utilities
    parseTimeInfo,
    addReminder,
  };
}
