// DataLog Service — calls Tauri backend to write CSV log file.
// Failed writes (CSV locked by Excel) are queued in localStorage, flushed on unlock.

import { invoke } from '@tauri-apps/api/core';

export interface LogEntry {
  id: number;
  date: string;
  name: string;
  type: 'todo' | 'pomo';
  duration: string;
  start_time: string;
  end_time: string;
  status: string;
  pause_count: number;
}

interface QueuedEntry {
  cmd: 'append_log' | 'update_log';
  params: Record<string, unknown>;
}

const QUEUE_KEY = 'lumina_log_queue';

function loadQueue(): QueuedEntry[] {
  try { const raw = localStorage.getItem(QUEUE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveQueue(q: QueuedEntry[]) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
function pushToQueue(entry: QueuedEntry) { const q = loadQueue(); q.push(entry); saveQueue(q); }

/** Replay all queued log writes. Call when the CSV becomes writable again. */
export async function flushLogQueue(): Promise<void> {
  const q = loadQueue();
  if (q.length === 0) return;
  for (const entry of q) {
    try { await invoke(entry.cmd, entry.params); } catch { return; } // still locked, keep queue
  }
  saveQueue([]);
}

export async function initLogs(): Promise<void> {
  try { await invoke('init_logs'); } catch (e) { console.error('init_logs:', e); }
}

export async function getNextLogId(): Promise<number> {
  try { return await invoke<number>('get_next_log_id'); } catch { return 1; }
}

export async function appendLog(entry: LogEntry): Promise<void> {
  const params: Record<string, unknown> = {
    id: entry.id, date: entry.date, name: entry.name,
    logType: entry.type, duration: entry.duration,
    startTime: entry.start_time, endTime: entry.end_time,
    status: entry.status, pauseCount: entry.pause_count,
  };
  try { await invoke('append_log', params); } catch { pushToQueue({ cmd: 'append_log', params }); }
}

export async function updateLog(id: number, endTime: string, status: string, name?: string): Promise<void> {
  const params: Record<string, unknown> = { id, endTime, status, name: name || '' };
  try { await invoke('update_log', params); } catch { pushToQueue({ cmd: 'update_log', params }); }
}

export async function isLogWritable(): Promise<boolean> {
  try { return await invoke<boolean>('check_log_writable'); } catch { return false; }
}

export async function openLogs(): Promise<void> {
  try { await invoke('open_logs'); } catch (e) { console.error('open_logs:', e); }
}



