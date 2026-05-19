import { useState, useEffect } from 'react';
import { showNotification, playNotificationSound } from '../lib/desktop';
import { Pomo, SectionState } from '../types';
import type { Message } from '../services/geminiService';

// ── Dependencies (things usePomodoro needs but doesn't own) ──
export interface PomodoroDeps {
  // Preferences
  prefPomoFocus: number;
  prefPomoBreak: number;
  prefFocusSound: boolean;
  prefNotificationSound: boolean;
  prefPomoAutoStart: boolean;
  // UI state setters
  setIsExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setIsUserExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  // Logging helpers
  appendLog: (data: any) => Promise<void>;
  genLogId: () => number;
  fmtDate: (d: Date) => string;
  fmtTime: (d: Date) => string;
  fmtISOtoTime: (iso: string) => string;
}

// ── Return type ──
export interface PomodoroState {
  pomoList: Pomo[];
  setPomoList: React.Dispatch<React.SetStateAction<Pomo[]>>;
  pomoSectionState: SectionState;
  setPomoSectionState: React.Dispatch<React.SetStateAction<SectionState>>;
  pomoTime: number;
  setPomoTime: React.Dispatch<React.SetStateAction<number>>;
  isPomoActive: boolean;
  setIsPomoActive: React.Dispatch<React.SetStateAction<boolean>>;
  pomoMode: 'work' | 'break';
  setPomoMode: React.Dispatch<React.SetStateAction<'work' | 'break'>>;
  pomoTotalTime: number;
  setPomoTotalTime: React.Dispatch<React.SetStateAction<number>>;
  pomoName: string;
  setPomoName: React.Dispatch<React.SetStateAction<string>>;
  pomoStartTime: string;
  setPomoStartTime: React.Dispatch<React.SetStateAction<string>>;
  pomoPausesUsed: number;
  setPomoPausesUsed: React.Dispatch<React.SetStateAction<number>>;
  // Actions
  togglePomo: (id: string) => void;
  pausePomo: () => void;
  restartPomo: () => void;
  deletePomo: (id: string) => void;
  togglePomoSection: () => void;
  formatPomoTime: (seconds: number) => string;
  startPomo: (name: string, durationMin: number) => void;
}

export function usePomodoro(deps: PomodoroDeps): PomodoroState {
  const {
    prefPomoFocus, prefPomoBreak, prefFocusSound, prefNotificationSound, prefPomoAutoStart,
    setIsExpanded, setIsUserExpanded, setMessages,
    appendLog, genLogId, fmtDate, fmtTime, fmtISOtoTime,
  } = deps;

  // ── State ──
  const [pomoList, setPomoList] = useState<Pomo[]>([]);
  const [pomoSectionState, setPomoSectionState] = useState<SectionState>('collapsed');
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [isPomoActive, setIsPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoTotalTime, setPomoTotalTime] = useState(25 * 60);
  const [pomoName, setPomoName] = useState('');
  const [pomoStartTime, setPomoStartTime] = useState('');
  const [pomoPausesUsed, setPomoPausesUsed] = useState(0);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const savedPomos = localStorage.getItem('lumina_pomos');
    if (savedPomos) {
      const parsed = JSON.parse(savedPomos);
      const migrated = parsed.map((p: any) => p.startTime ? p : { ...p, startTime: new Date().toISOString() });
      setPomoList(migrated);
    }

    const savedPomoTime = localStorage.getItem('lumina_pomo_time');
    if (savedPomoTime !== null) setPomoTime(JSON.parse(savedPomoTime));

    // Never restore active state — always start inactive
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

  // ── Persist to localStorage ──
  useEffect(() => { localStorage.setItem('lumina_pomos', JSON.stringify(pomoList)); }, [pomoList]);
  useEffect(() => { localStorage.setItem('lumina_pomo_time', JSON.stringify(pomoTime)); }, [pomoTime]);
  useEffect(() => { localStorage.setItem('lumina_pomo_active', JSON.stringify(isPomoActive)); }, [isPomoActive]);
  useEffect(() => { localStorage.setItem('lumina_pomo_mode', pomoMode); }, [pomoMode]);
  useEffect(() => { localStorage.setItem('lumina_pomo_total_time', JSON.stringify(pomoTotalTime)); }, [pomoTotalTime]);
  useEffect(() => { localStorage.setItem('lumina_pomo_name', pomoName); }, [pomoName]);
  useEffect(() => { localStorage.setItem('lumina_pomo_section_state', pomoSectionState); }, [pomoSectionState]);

  // ── Countdown timer ──
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPomoActive && pomoTime > 0) {
      interval = setInterval(() => { setPomoTime(prev => prev - 1); }, 1000);
    } else if (isPomoActive && pomoTime === 0) {
      // Timer finished
      setIsPomoActive(false);
      if (prefNotificationSound) playNotificationSound();

      const nextMode = pomoMode === 'work' ? 'break' : 'work';
      showNotification('Lumina Pomodoro', `Time for a ${nextMode}!`);
      const nextDuration = nextMode === 'work' ? prefPomoFocus : prefPomoBreak;
      const nextTime = nextDuration * 60;
      const now = new Date();

      // Log completed work sessions only (skip breaks)
      if (pomoMode === 'work') {
        appendLog({
          id: genLogId(),
          date: fmtDate(now),
          name: pomoName,
          type: 'pomo',
          duration: String(Math.round(pomoTotalTime / 60)),
          start_time: fmtISOtoTime(pomoStartTime),
          end_time: fmtTime(now),
          status: 'completed',
          pause_count: pomoPausesUsed,
        });
      }

      // Update finished count if work mode
      if (pomoMode === 'work') {
        setPomoList(prev => prev.map(p => {
          if (p.isActive) {
            const isCounted = (p.pausesUsed || 0) <= 3;
            return {
              ...p,
              finishedCount: (p.finishedCount || 0) + (isCounted ? 1 : 0),
              pausesUsed: 0,
            };
          }
          return p;
        }));
      }

      const pomoMsg: Message = {
        role: 'assistant',
        content: `🍅 **Pomodoro Finished!** Time for a ${nextMode}.`,
        type: 'reminder',
      };
      setMessages(prev => [...prev, pomoMsg]);

      setPomoMode(nextMode);
      setPomoTime(nextTime);
      setPomoTotalTime(nextTime);

      if (prefPomoAutoStart) {
        const nowISO = now.toISOString();
        setPomoStartTime(nowISO);
        setPomoPausesUsed(0);
        setPomoList(prev => prev.map(p =>
          p.isActive ? { ...p, startTime: nowISO, mode: nextMode, totalTime: nextTime } : p
        ));
        setIsPomoActive(true);
      }

      setIsExpanded(true);
      setIsUserExpanded(true);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPomoActive, pomoTime, pomoMode]);

  // ── Focus sound (ticking) ──
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

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

  // ── Actions ──

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
      setPomoList(prev => prev.map(p =>
        p.isActive ? { ...p, pausesUsed: (p.pausesUsed || 0) + 1 } : p
      ));
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
          id: genLogId(),
          date: fmtDate(now),
          name: pomoName,
          type: 'pomo',
          duration: String(Math.round(pomoTotalTime / 60)),
          start_time: fmtISOtoTime(pomoStartTime),
          end_time: fmtTime(now),
          status: 'cancelled',
          pause_count: pomoPausesUsed,
        });
      }
      const nowISO = new Date().toISOString();
      setPomoTime(active.totalTime);
      setIsPomoActive(false);
      setPomoStartTime(nowISO);
      setPomoPausesUsed(0);
      setPomoList(prev => prev.map(p =>
        p.isActive ? { ...p, pausesUsed: 0, startTime: nowISO } : p
      ));
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
            id: genLogId(),
            date: fmtDate(now),
            name: pomoName,
            type: 'pomo',
            duration: String(Math.round(pomoTotalTime / 60)),
            start_time: fmtISOtoTime(pomoStartTime),
            end_time: fmtTime(now),
            status: 'cancelled',
            pause_count: pomoPausesUsed,
          });
        }
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const togglePomoSection = () => {
    setPomoSectionState(prev => prev === 'expanded' ? 'collapsed' : 'expanded');
  };

  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /** Start a new pomodoro session (called by /pomo command handler). */
  const startPomo = (name: string, durationMin: number) => {
    const durationSec = durationMin * 60;
    const newPomo: Pomo = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      duration: durationSec,
      totalTime: durationSec,
      mode: 'work',
      isActive: true,
      finishedCount: 0,
      pausesUsed: 0,
      startTime: new Date().toISOString(),
    };

    setPomoList(prev => [newPomo, ...prev.map(p => ({ ...p, isActive: false }))]);
    setIsPomoActive(true);
    setPomoTime(durationSec);
    setPomoTotalTime(durationSec);
    setPomoMode('work');
    setPomoName(name);
    setPomoStartTime(new Date().toISOString());
    setPomoPausesUsed(0);
  };

  return {
    // State
    pomoList, setPomoList,
    pomoSectionState, setPomoSectionState,
    pomoTime, setPomoTime,
    isPomoActive, setIsPomoActive,
    pomoMode, setPomoMode,
    pomoTotalTime, setPomoTotalTime,
    pomoName, setPomoName,
    pomoStartTime, setPomoStartTime,
    pomoPausesUsed, setPomoPausesUsed,
    // Actions
    togglePomo,
    pausePomo,
    restartPomo,
    deletePomo,
    togglePomoSection,
    formatPomoTime,
    startPomo,
  };
}
