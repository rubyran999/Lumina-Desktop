import React from 'react';
import { Search, Bell, Settings, X, Clock, Command, Send, Sparkles, Trash2, CheckCircle2, MessageSquare, Minimize2, Maximize2, Cpu, Globe, Eraser, Link, ChevronDown, Play, Edit3, Save, Pause, RotateCcw, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { useCore } from './hooks/_core';
import { COUNTRY_PRESETS, UNIT_OPTIONS } from './types';
import type { AIProvider, Message } from './services/geminiService';

export default function App() {
  const {
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
    inputRef, scrollRef, widgetRef, containerRef, settingsRef,
    // Chat
    messages, setMessages,
    pendingQuery,
    // Reminders
    reminders, setReminders,
    editingReminderId, setEditingReminderId,
    editingReminderValue, setEditingReminderValue,
    editingReminderTimeValue, setEditingReminderTimeValue,
    reminderSectionState,
    // Pomos
    pomoList, setPomoList,
    pomoSectionState,
    pomoTime, isPomoActive, setIsPomoActive, pomoMode, pomoTotalTime, pomoName,
    // AI
    isAiEnabled, setIsAiEnabled,
    apiKeys,
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
    isLogLocked,
    exchangeRates,
    timeoutRef,
    // Derived
    providers,
    // Handlers
    handleSubmit, handleRetry, handleCancel, clearConversation,
    togglePomo, pausePomo, restartPomo, deletePomo,
    togglePomoSection, toggleReminderSection,
    deleteReminder, startEditingReminder, saveReminderEdit, toggleReminder,
    formatPomoTime,
    updateApiKey,
    handleCountryChange,
    openLogs,
  } = useCore();

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
                      onClick={() => openLogs()}
                      title="Open Productivity Log"
                      className="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-emerald-400 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
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
                                disabled={isLogLocked}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {isPomoActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                onClick={restartPomo}
                                disabled={isLogLocked}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => deletePomo(activePomo.id)}
                                disabled={isLogLocked}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                disabled={isLogLocked}
                                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                      disabled={isLogLocked}
                                      className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-green-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <Play className="w-3 h-3" />
                                    </button>
                                  )}
                                  {p.isActive && (
                                    <button 
                                      onClick={() => setIsPomoActive(false)}
                                      disabled={isLogLocked}
                                      className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => deletePomo(p.id)}
                                    disabled={isLogLocked}
                                    className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    disabled={isLogLocked}
                                    className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => toggleReminder(r.id)}
                                  disabled={isLogLocked}
                                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => deleteReminder(r.id)}
                                  disabled={isLogLocked}
                                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
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
                          {messages.map((msg: Message, i: number) => (
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

            {/* Log-locked warning */}
            {isLogLocked && (
              <div className="mx-4 p-2 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="text-[10px] text-red-300 font-medium">CSV log file is open in another app. Close it to resume logging.</span>
              </div>
            )}

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
                  autoFocus
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLastActionTime(Date.now());
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                  }}
                  onBlur={() => setIsFocused(false)}
                  placeholder={isLogLocked ? "Close CSV file to enable logging..." : "Type a message..."}
                  disabled={isLogLocked}
                  className={cn(
                    "w-full bg-white/5 border rounded-2xl pl-4 pr-12 py-3 text-sm outline-none transition-all",
                    isLogLocked ? "border-red-500/30 text-slate-600 cursor-not-allowed" : "border-white/10 focus:border-indigo-500/50"
                  )}
                />
                <button 
                  type="submit"
                  disabled={!query.trim() || isLoading || isLogLocked}
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
        data-tauri-drag-region
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
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 cursor-move",
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

