import { useState, useEffect, useRef } from 'react';
import type { Message } from '../services/geminiService';

// ── Dependencies (minimal — handleSubmit lives in _core.tsx as the orchestrator) ──
export interface ChatDeps {
  scrollRef: React.RefObject<HTMLDivElement>;
  setLastActionTime: (v: number | ((prev: number) => number)) => void;
}

// ── Return type ──
export interface ChatState {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isTimeout: boolean;
  setIsTimeout: React.Dispatch<React.SetStateAction<boolean>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  pendingQuery: string | null;
  setPendingQuery: React.Dispatch<React.SetStateAction<string | null>>;
  timeoutRef: React.RefObject<NodeJS.Timeout | null>;
  handleCancel: () => void;
  clearConversation: () => void;
}

export function useChat(deps: ChatDeps): ChatState {
  const { scrollRef, setLastActionTime } = deps;

  // ── State ──
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load/save history ──
  useEffect(() => {
    const savedHistory = localStorage.getItem('lumina_history');
    if (savedHistory) setMessages(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    localStorage.setItem('lumina_history', JSON.stringify(messages));
  }, [messages]);

  // ── Scroll to bottom ──
  useEffect(() => {
    if (scrollRef?.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // ── Handlers ──
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

  return {
    query, setQuery,
    isLoading, setIsLoading,
    isTimeout, setIsTimeout,
    messages, setMessages,
    pendingQuery, setPendingQuery,
    timeoutRef,
    handleCancel,
    clearConversation,
  };
}
