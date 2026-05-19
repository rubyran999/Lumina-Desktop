import { useState, useEffect, useRef } from 'react';
import { initLogs, getNextLogId, isLogWritable, flushLogQueue } from '../services/dataLogService';

// ── Dependencies ──
export interface LoggerDeps {
  isExpanded: boolean;
}

// ── Return type ──
export interface LoggerState {
  nextLogId: number;
  setNextLogId: React.Dispatch<React.SetStateAction<number>>;
  isLogLocked: boolean;
  setIsLogLocked: React.Dispatch<React.SetStateAction<boolean>>;
  // Date/time format helpers for CSV logging
  fmtDate: (d: Date) => string;
  fmtTime: (d: Date) => string;
  fmtISOtoDate: (iso: string) => string;
  fmtISOtoTime: (iso: string) => string;
  genLogId: () => number;
}

export function useLogger(deps: LoggerDeps): LoggerState {
  const { isExpanded } = deps;

  // ── State ──
  const [nextLogId, setNextLogId] = useState(1);
  const [isLogLocked, setIsLogLocked] = useState(false);
  const nextLogIdRef = useRef(1); // sync counter — avoids stale-closure bug in genLogId

  // ── Initialize CSV log on mount ──
  useEffect(() => {
    initLogs();
    getNextLogId().then(id => {
      setNextLogId(id);
      nextLogIdRef.current = id;
    });
  }, []);

  // ── Poll CSV lock status while expanded ──
  useEffect(() => {
    if (!isExpanded) { setIsLogLocked(false); return; }
    const check = async () => {
      const writable = await isLogWritable();
      setIsLogLocked(!writable);
      if (writable) flushLogQueue();
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [isExpanded]);

  // ── Date/time format helpers ──
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);          // YYYY-MM-DD
  const fmtTime = (d: Date) => d.toTimeString().slice(0, 5);          // HH:MM
  const fmtISOtoDate = (iso: string) => fmtDate(new Date(iso));
  const fmtISOtoTime = (iso: string) => fmtTime(new Date(iso));
  const genLogId = () => { const id = nextLogIdRef.current; nextLogIdRef.current = id + 1; setNextLogId(id + 1); return id; };

  return {
    nextLogId, setNextLogId,
    isLogLocked, setIsLogLocked,
    fmtDate, fmtTime, fmtISOtoDate, fmtISOtoTime, genLogId,
  };
}
