"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Lock, Unlock, ArrowRight, Cloud, CloudOff, RefreshCw } from 'lucide-react';

// --- CONFIGURATION ---
const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'password';
const SESSION_KEY = 'todotxt_session_token';
const DATA_KEY = 'todotxt_local_data';
const TS_KEY = 'todotxt_timestamp';

// --- Utilities & Components ---
// (Reusing logic for brevity where possible, ensuring full file is runnable)

const REGEX = {
  priority: /^\(([A-Z])\)\s/,
  completed: /^x\s/,
  pendingTask: /^-\s/, 
  date: /\d{4}-\d{2}-\d{2}/, 
  project: /\+(\S+)/g,
  context: /@(\S+)/g,
  divider: /^---$/,
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const extractMetadata = (text) => {
  const projects = new Set();
  const contexts = new Set();
  const lines = text.split('\n');
  lines.forEach(line => {
    let match;
    const pRegex = new RegExp(REGEX.project);
    while ((match = pRegex.exec(line)) !== null) projects.add(match[1]);
    const cRegex = new RegExp(REGEX.context);
    while ((match = cRegex.exec(line)) !== null) contexts.add(match[1]);
  });
  return {
    projects: Array.from(projects).sort(),
    contexts: Array.from(contexts).sort()
  };
};

// --- Sub-Components ---

const LoginScreen = ({ onLogin }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === APP_PASSWORD) {
      onLogin();
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-neutral-300 font-mono">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-lg p-8 shadow-2xl">
        <div className="flex justify-center mb-6 text-neutral-500">
          <Lock size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold text-center text-white mb-2 tracking-tight">Access Restricted</h2>
        <form onSubmit={handleSubmit} className="relative mt-8">
          <input
            autoFocus
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Enter password..."
            className={`w-full bg-black border ${error ? 'border-red-900 text-red-500' : 'border-neutral-800 text-white'} rounded px-4 py-3 outline-none focus:border-neutral-600 transition-colors text-center tracking-widest`}
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 aspect-square bg-neutral-800 hover:bg-neutral-700 text-white rounded flex items-center justify-center">
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

const HighlighterLine = ({ line, index, onToggle, isRawMode, isActiveLine, searchQuery }) => {
  if (!line) return <br />;
  if (isRawMode) return <div className="text-neutral-400"><HighlighterContent line={line} isRawMode={true} isActiveLine={true} searchQuery={searchQuery} /></div>;
  
  if (REGEX.divider.test(line.trim())) {
    return <div className="flex items-center" style={{ height: '1.625em' }}><hr className="w-full border-neutral-800" /><span className="opacity-0 w-0 h-0 overflow-hidden absolute">{line}</span></div>;
  }
  
  const isPending = REGEX.pendingTask.test(line);
  const isCompleted = REGEX.completed.test(line);
  const isPriority = REGEX.priority.test(line);
  const isNote = !isPending && !isCompleted && !isPriority;

  if (isNote) {
    return (
      <div className="bg-yellow-900/10 -mx-2 px-2 rounded-sm text-yellow-100/80 border-l-2 border-yellow-700/40">
        <HighlighterContent line={line} isRawMode={false} isActiveLine={isActiveLine} searchQuery={searchQuery} />
      </div>
    );
  }

  if (isPending || isCompleted) {
    const content = line.slice(2);
    const Checkbox = (
      <span className="inline-block relative align-middle" style={{ width: '2ch', height: '1.5em' }}>
         <input type="checkbox" checked={isCompleted} onChange={() => onToggle(index)} className="absolute top-1 left-0 w-4 h-4 cursor-pointer z-20 pointer-events-auto accent-neutral-700 rounded-sm opacity-60 hover:opacity-100" />
         <span className="opacity-0 select-none">{line.slice(0, 2)}</span>
      </span>
    );
    return (
      <div className={`relative ${isCompleted ? 'text-neutral-600 line-through decoration-neutral-700' : 'text-neutral-300'}`}>
        {Checkbox}<HighlighterContent line={content} isRawMode={false} isActiveLine={isActiveLine} searchQuery={searchQuery} />
      </div>
    );
  }
  return <div className="text-neutral-300"><HighlighterContent line={line} isRawMode={false} isActiveLine={isActiveLine} searchQuery={searchQuery} /></div>;
};

const HighlighterContent = ({ line, isRawMode, isActiveLine, searchQuery }) => {
  if (!line) return null;
  let parts = [];
  const priorityMatch = line.match(REGEX.priority);
  let priorityEnd = 0;
  if (priorityMatch) {
    const pCode = priorityMatch[1];
    let pClass = "text-blue-500 font-bold";
    if (pCode === 'A') pClass = "text-red-500 font-bold";
    if (pCode === 'B') pClass = "text-orange-500 font-bold";
    if (pCode === 'C') pClass = "text-yellow-500 font-bold";
    parts.push(<span key="prio" className={pClass}>{priorityMatch[0]}</span>);
    priorityEnd = priorityMatch[0].length;
  }
  const remaining = line.slice(priorityEnd);
  const words = remaining.split(/(\s+)/);
  parts.push(...words.map((word, i) => {
      const key = `w-${i}`;
      const isSearchMatch = searchQuery && word.toLowerCase().includes(searchQuery.toLowerCase());
      const baseStyle = isSearchMatch ? "bg-yellow-400 text-black font-bold rounded-sm px-0.5" : "";
      if (REGEX.date.test(word)) {
        if (isRawMode) return <span key={key} className={`text-purple-400 ${baseStyle}`}>{word}</span>;
        if (!isActiveLine && !isSearchMatch) return null;
        return <span key={key} className={`text-neutral-600 select-none ${baseStyle}`}>{word}</span>;
      }
      if (word.startsWith('+')) return <span key={key} className={`text-green-500 ${baseStyle}`}>{word}</span>;
      if (word.startsWith('@')) return <span key={key} className={`text-cyan-500 ${baseStyle}`}>{word}</span>;
      if (word.includes(':')) return <span key={key} className={`text-neutral-500 italic ${baseStyle}`}>{word}</span>;
      return <span key={key} className={baseStyle}>{word}</span>;
    }));
  return <>{parts}</>;
};

const SuggestionBar = ({ suggestions, activeIndex, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="fixed bottom-10 left-0 right-0 mx-auto w-full max-w-2xl px-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 shadow-2xl rounded-lg overflow-hidden flex flex-col">
        <div className="bg-black px-3 py-1 text-xs font-semibold text-neutral-500 border-b border-neutral-800 flex justify-between">
          <span>SUGGESTIONS</span><span className="hidden sm:inline">Tab to select</span>
        </div>
        <div className="max-h-48 overflow-y-auto p-1 bg-black">
          {suggestions.map((item, idx) => (
            <button key={item.value + idx} onClick={() => onSelect(item)} className={`w-full text-left px-3 py-2 text-sm font-mono rounded-md transition-colors ${idx === activeIndex ? 'bg-neutral-800 text-blue-400' : 'hover:bg-neutral-900 text-neutral-400'}`}>
              <span className="opacity-50 mr-1 text-neutral-600">{item.type}</span>{item.value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const GuideFooter = () => (
  <footer className="mt-8 mb-4 border-t border-neutral-900 pt-6 px-2 text-sm text-neutral-500">
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       <div><h3 className="font-bold text-neutral-400 mb-2">Shortcuts</h3><ul className="space-y-1 text-xs"><li>Enter: New Task</li><li>Backspace: Delete Task</li></ul></div>
       <div><h3 className="font-bold text-neutral-400 mb-2">Syntax</h3><ul className="space-y-1 text-xs"><li>- Task, x Done, (A) Prio</li><li>+Project, @Context</li></ul></div>
       <div><h3 className="font-bold text-neutral-400 mb-2">Sync</h3><ul className="space-y-1 text-xs"><li>Auto-syncs to cloud</li><li>Works offline</li></ul></div>
     </div>
  </footer>
);

// --- MAIN COMPONENT ---

export default function TodoTxtApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // App State
  const [text, setText] = useState("");
  const [lastSyncedTime, setLastSyncedTime] = useState(0); 
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error, conflict

  const [isRawMode, setIsRawMode] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [suggestionState, setSuggestionState] = useState({ isOpen: false, list: [], activeIndex: 0, cursorWordStart: 0, cursorWordEnd: 0 });

  const textareaRef = useRef(null);
  const highlighterRef = useRef(null);
  const searchInputRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  const metadata = useMemo(() => extractMetadata(text), [text]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) setIsAuthenticated(true);
    
    // Load local data
    const localData = localStorage.getItem(DATA_KEY);
    const localTS = localStorage.getItem(TS_KEY);
    if (localData) {
      setText(localData);
      setLastSyncedTime(parseInt(localTS || '0'));
    } else {
      setText("- Welcome to Todo.txt @home\n- Syncs automatically +feature\n");
    }
    
    setIsLoadingAuth(false);
  }, []);

  // --- BACKGROUND POLLING ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      // Only poll if not currently typing/syncing
      if (syncStatus !== 'syncing') {
        performSync(text, lastSyncedTime, true); // True = background mode
      }
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, text, lastSyncedTime, syncStatus]);

  const handleLogin = () => {
    localStorage.setItem(SESSION_KEY, 'active');
    setIsAuthenticated(true);
    performSync(text, Date.now());
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  // --- SYNC ENGINE ---
  
  const performSync = async (content, timestamp, isBackground = false) => {
    // If background sync, don't show spinner to avoid distraction
    if (!isBackground) setSyncStatus('syncing');

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: APP_PASSWORD,
          content: content,
          clientTimestamp: timestamp
        })
      });

      const data = await res.json();

      if (res.status === 401) {
        setSyncStatus('error');
        return;
      }

      if (data.status === 'conflict') {
        // Server has newer data -> Update Local
        setText(data.content);
        setLastSyncedTime(data.timestamp);
        localStorage.setItem(DATA_KEY, data.content);
        localStorage.setItem(TS_KEY, data.timestamp.toString());
        setSyncStatus('synced');
      } else {
        // Synced successfully
        setSyncStatus('synced');
      }
    } catch (e) {
      console.error("Sync failed", e);
      setSyncStatus('error');
    }
  };

  // Debounced Sync Trigger (For typing)
  const triggerSync = (newContent) => {
    const now = Date.now();
    localStorage.setItem(DATA_KEY, newContent);
    localStorage.setItem(TS_KEY, now.toString());
    setLastSyncedTime(now);
    setSyncStatus('idle');

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      performSync(newContent, now);
    }, 2000); 
  };

  // --- HANDLERS ---

  const updateActiveLine = (el) => {
    if (!el) return;
    const cursor = el.selectionStart;
    const linesBefore = text.slice(0, cursor).split('\n');
    setActiveLineIndex(linesBefore.length - 1);
  };

  const handleChange = (e) => {
    const newVal = e.target.value;
    setText(newVal);
    triggerSync(newVal); 
    updateActiveLine(e.target);
  };

  const handleToggleLine = (index) => {
    const lines = text.split('\n');
    const line = lines[index];
    if (REGEX.pendingTask.test(line)) {
      lines[index] = 'x ' + line.slice(2);
    } else if (REGEX.completed.test(line)) {
      lines[index] = '- ' + line.slice(2);
    }
    const newText = lines.join('\n');
    setText(newText);
    triggerSync(newText);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (suggestionState.isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionState(p => ({...p, activeIndex: (p.activeIndex + 1) % p.list.length})); return;}
        if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionState(p => ({...p, activeIndex: (p.activeIndex - 1 + p.list.length) % p.list.length})); return;}
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySuggestion(suggestionState.list[suggestionState.activeIndex]); return;}
        if (e.key === 'Escape') { setSuggestionState(p => ({...p, isOpen: false})); return;}
      }
    }

    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const val = el.value;
    const lines = val.split('\n');
    const lineIndex = val.slice(0, cursor).split('\n').length - 1;
    const currentLine = lines[lineIndex];

    if (e.key === 'Backspace') {
      if (currentLine.trim() === '-' && cursor === val.lastIndexOf('\n', cursor - 1) + 3) {
         e.preventDefault();
         const lineStart = val.lastIndexOf('\n', cursor - 1) + 1;
         const lineEnd = cursor;
         const newVal = val.slice(0, lineStart) + val.slice(lineEnd);
         setText(newVal);
         triggerSync(newVal);
         setTimeout(() => el.setSelectionRange(lineStart, lineStart), 0);
         return;
      }
    }

    if (e.key === 'Enter') {
      if (REGEX.pendingTask.test(currentLine) || REGEX.completed.test(currentLine)) {
        e.preventDefault();
        const today = getTodayDate();
        let updatedLine = currentLine;
        if (!REGEX.date.test(currentLine) && currentLine.length > 3) updatedLine = `${currentLine} ${today}`;
        
        lines[lineIndex] = updatedLine;
        lines.splice(lineIndex + 1, 0, '- '); 
        const newText = lines.join('\n');
        setText(newText);
        triggerSync(newText);
        setTimeout(() => {
           const splitNew = newText.split('\n');
           let pos = 0;
           for(let i=0; i<=lineIndex; i++) pos += splitNew[i].length + 1;
           const finalPos = pos + 2; 
           el.setSelectionRange(finalPos, finalPos);
           updateActiveLine(el);
        }, 0);
      }
    }
  };

  const checkSuggestions = () => {
    if (isRawMode) return;
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const val = el.value;
    let start = cursor;
    while (start > 0 && !/\s/.test(val[start - 1])) start--;
    let end = cursor;
    while (end < val.length && !/\s/.test(val[end])) end++;
    const word = val.slice(start, end);
    
    if (word.startsWith('+') || word.startsWith('@')) {
      const type = word[0];
      const query = word.slice(1);
      const source = type === '+' ? metadata.projects : metadata.contexts;
      const filtered = source.filter(item => item.toLowerCase().includes(query.toLowerCase()) && item !== query).map(item => ({ type, value: item }));
      if (filtered.length > 0) {
        setSuggestionState({ isOpen: true, list: filtered, activeIndex: 0, type, query, cursorWordStart: start, cursorWordEnd: end });
        return;
      }
    }
    setSuggestionState(p => ({ ...p, isOpen: false }));
  };

  const applySuggestion = (suggestion) => {
    const before = text.slice(0, suggestionState.cursorWordStart);
    const after = text.slice(suggestionState.cursorWordEnd);
    const inserted = `${suggestion.type}${suggestion.value} `;
    const newText = before + inserted + after;
    setText(newText);
    triggerSync(newText);
    setSuggestionState(p => ({ ...p, isOpen: false }));
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) { el.focus(); const newCursorPos = before.length + inserted.length; el.setSelectionRange(newCursorPos, newCursorPos); }
    }, 0);
  };
  
  const handleScroll = () => { if (textareaRef.current && highlighterRef.current) { highlighterRef.current.scrollTop = textareaRef.current.scrollTop; highlighterRef.current.scrollLeft = textareaRef.current.scrollLeft; } };
  const toggleSearch = () => { setShowSearch(!showSearch); if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 100); else setSearchQuery(''); };
  const handleSelectionChange = (e) => { updateActiveLine(e.target); checkSuggestions(); };

  useEffect(() => {
    const el = textareaRef.current;
    const onInteract = (e) => handleSelectionChange(e);
    el?.addEventListener('click', onInteract);
    el?.addEventListener('keyup', onInteract);
    if(el) updateActiveLine(el);
    return () => { el?.removeEventListener('click', onInteract); el?.removeEventListener('keyup', onInteract); };
  }, [text, metadata, isRawMode]);

  if (isLoadingAuth) return <div className="min-h-screen bg-black" />;
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans text-neutral-300">
      <header className="px-6 py-4 bg-black border-b border-neutral-800 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-tight">todo.txt</h1>
          <div className="flex items-center gap-2 text-xs font-mono">
            {syncStatus === 'syncing' && <RefreshCw className="animate-spin text-blue-500" size={14} />}
            {syncStatus === 'synced' && <Cloud className="text-green-500" size={14} />}
            {syncStatus === 'error' && <CloudOff className="text-red-500" size={14} />}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className={`flex items-center transition-all duration-300 overflow-hidden ${showSearch ? 'w-48 sm:w-64 opacity-100' : 'w-0 opacity-0'}`}>
            <input ref={searchInputRef} type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 text-sm text-white px-3 py-1.5 rounded-l-md outline-none focus:border-neutral-700" />
            <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="bg-neutral-800 px-2 py-1.5 rounded-r-md border border-l-0 border-neutral-800 hover:bg-neutral-700"><X size={16} /></button>
          </div>
          <button onClick={toggleSearch} className={`p-2 rounded-md hover:bg-neutral-900 ${showSearch ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}><Search size={18} /></button>
          <button onClick={() => setIsRawMode(!isRawMode)} className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all ${isRawMode ? 'bg-neutral-200 text-black border-neutral-200' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'}`}>{isRawMode ? 'RAW' : 'VISUAL'}</button>
          <button onClick={handleLogout} className="p-2 text-neutral-700 hover:text-red-500 transition-colors" title="Logout"><Unlock size={14} /></button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-4xl mx-auto mt-6 px-4 pb-20 flex flex-col">
        <div className="relative w-full min-h-[60vh] flex-grow bg-black rounded-lg border border-neutral-800 overflow-hidden">
          <div ref={highlighterRef} aria-hidden="true" className={`absolute inset-0 p-6 font-mono text-base leading-relaxed whitespace-pre-wrap break-words pointer-events-none z-20 overflow-hidden transition-opacity duration-200 ${isRawMode ? 'opacity-0' : 'opacity-100'}`} style={{ fontFamily: 'monospace' }}>
            {text.split('\n').map((line, i) => (<HighlighterLine key={i} index={i} line={line} onToggle={handleToggleLine} isRawMode={isRawMode} isActiveLine={i === activeLineIndex} searchQuery={searchQuery} />))}
          </div>
          <textarea ref={textareaRef} value={text} onChange={handleChange} onScroll={handleScroll} onKeyDown={handleKeyDown} spellCheck="false" className={`absolute inset-0 w-full h-full p-6 font-mono text-base leading-relaxed bg-transparent resize-none outline-none z-10 whitespace-pre-wrap break-words transition-colors duration-200 ${isRawMode ? 'text-neutral-300 caret-white' : 'text-transparent caret-blue-500'}`} style={{ fontFamily: 'monospace', WebkitTextFillColor: isRawMode ? 'inherit' : 'transparent', }} placeholder="Type your tasks here..." />
        </div>
        {!isRawMode && (<SuggestionBar suggestions={suggestionState.isOpen ? suggestionState.list : null} activeIndex={suggestionState.activeIndex} onSelect={applySuggestion} />)}
        <GuideFooter />
      </main>
    </div>
  );
}