"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Lock, Unlock, ArrowRight, Cloud, CloudOff, RefreshCw, AlertTriangle, History, RotateCcw, Palette, Check } from 'lucide-react';

// --- THEME DEFINITIONS ---
const THEMES = {
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#111111',
      '--bg-tertiary': '#1a1a1a',
      '--text-primary': '#e5e5e5',
      '--text-secondary': '#a3a3a3',
      '--text-dim': '#525252',
      '--border': '#262626',
      '--color-prio': '#ef4444', // Red-500
      '--color-project': '#22c55e', // Green-500
      '--color-context': '#06b6d4', // Cyan-500
      '--color-date': '#a855f7', // Purple-500
      '--bg-sticky': 'rgba(66, 32, 6, 0.3)',
      '--text-sticky': '#fde047',
    }
  },
  solarized: {
    name: 'Solarized',
    colors: {
      '--bg-primary': '#002b36',
      '--bg-secondary': '#073642',
      '--bg-tertiary': '#073642',
      '--text-primary': '#93a1a1',
      '--text-secondary': '#586e75',
      '--text-dim': '#073642',
      '--border': '#073642',
      '--color-prio': '#dc322f', // Red
      '--color-project': '#859900', // Green
      '--color-context': '#268bd2', // Blue
      '--color-date': '#2aa198', // Cyan
      '--bg-sticky': 'rgba(181, 137, 0, 0.1)',
      '--text-sticky': '#b58900',
    }
  },
  gruvbox: {
    name: 'Gruvbox',
    colors: {
      '--bg-primary': '#282828',
      '--bg-secondary': '#3c3836',
      '--bg-tertiary': '#504945',
      '--text-primary': '#ebdbb2',
      '--text-secondary': '#a89984',
      '--text-dim': '#7c6f64',
      '--border': '#504945',
      '--color-prio': '#fb4934', // Red
      '--color-project': '#b8bb26', // Green
      '--color-context': '#fabd2f', // Yellow
      '--color-date': '#8ec07c', // Aqua
      '--bg-sticky': 'rgba(215, 153, 33, 0.1)',
      '--text-sticky': '#d79921',
    }
  },
  dracula: {
    name: 'Dracula',
    colors: {
      '--bg-primary': '#282a36',
      '--bg-secondary': '#44475a',
      '--bg-tertiary': '#6272a4',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#6272a4',
      '--text-dim': '#44475a',
      '--border': '#44475a',
      '--color-prio': '#ff5555', // Red
      '--color-project': '#50fa7b', // Green
      '--color-context': '#8be9fd', // Cyan
      '--color-date': '#bd93f9', // Purple
      '--bg-sticky': 'rgba(241, 250, 140, 0.1)',
      '--text-sticky': '#f1fa8c',
    }
  },
  catppuccin: {
    name: 'Catppuccin',
    colors: {
      '--bg-primary': '#1e1e2e',
      '--bg-secondary': '#181825',
      '--bg-tertiary': '#313244',
      '--text-primary': '#cdd6f4',
      '--text-secondary': '#a6adc8',
      '--text-dim': '#585b70',
      '--border': '#313244',
      '--color-prio': '#f38ba8', // Red
      '--color-project': '#a6e3a1', // Green
      '--color-context': '#89b4fa', // Blue
      '--color-date': '#f5c2e7', // Pink
      '--bg-sticky': 'rgba(249, 226, 175, 0.1)',
      '--text-sticky': '#f9e2af',
    }
  },
  swiss: {
    name: 'Swiss',
    colors: {
      '--bg-primary': '#f5f5f5',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#e5e5e5',
      '--text-primary': '#171717',
      '--text-secondary': '#525252',
      '--text-dim': '#d4d4d4',
      '--border': '#d4d4d4',
      '--color-prio': '#dc2626', // Red
      '--color-project': '#16a34a', // Green
      '--color-context': '#0284c7', // Blue
      '--color-date': '#9333ea', // Purple
      '--bg-sticky': 'rgba(250, 204, 21, 0.1)',
      '--text-sticky': '#854d0e',
    }
  }
};

// --- CONFIGURATION ---
const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'password';
const SESSION_KEY = 'todotxt_session_token';
const DATA_KEY = 'todotxt_local_data';
const TS_KEY = 'todotxt_timestamp';
const THEME_KEY = 'todotxt_theme';

// --- Utilities ---
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

const getRelativeDates = () => {
  const today = new Date();
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + (8 - today.getDay())); // Next Monday
  
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + (5 + 7 - today.getDay()) % 7); // Upcoming Friday (or today if friday)
  if (nextFriday <= today) nextFriday.setDate(nextFriday.getDate() + 7);

  const formatDate = (d) => d.toISOString().split('T')[0];

  return [
    { type: 'DATE', label: 'Today', value: formatDate(today) },
    { type: 'DATE', label: 'Tomorrow', value: formatDate(tomorrow) },
    { type: 'DATE', label: 'Next Week', value: formatDate(nextWeek) },
    { type: 'DATE', label: 'Friday', value: formatDate(nextFriday) },
  ];
};

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-mono bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-8 shadow-2xl">
        <div className="flex justify-center mb-6 text-[var(--text-secondary)]">
          <Lock size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold text-center mb-2 tracking-tight">Access Restricted</h2>
        <form onSubmit={handleSubmit} className="relative mt-8">
          <input
            autoFocus
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Enter password..."
            className={`w-full bg-[var(--bg-primary)] border ${error ? 'border-red-900 text-red-500' : 'border-[var(--border)] text-[var(--text-primary)]'} rounded px-4 py-3 outline-none focus:border-[var(--text-secondary)] transition-colors text-center tracking-widest`}
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 aspect-square bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded flex items-center justify-center border border-[var(--border)]">
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

const ConflictModal = ({ serverDate, onKeepLocal, onLoadCloud }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 max-w-sm w-full shadow-2xl">
      <div className="flex items-center gap-3 mb-4 text-amber-500">
        <AlertTriangle size={24} />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Sync Conflict</h3>
      </div>
      <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
        A newer version exists in the cloud.<br/>
        <span className="text-xs text-[var(--text-dim)] font-mono mt-2 block">Server Time: {new Date(serverDate).toLocaleString()}</span>
      </p>
      <div className="flex gap-3">
        <button onClick={onKeepLocal} className="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] hover:opacity-80 text-[var(--text-primary)] rounded text-sm font-bold transition-all border border-[var(--border)]">
          Keep Local
        </button>
        <button onClick={onLoadCloud} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold transition-colors">
          Load Cloud
        </button>
      </div>
    </div>
  </div>
);

const HistoryModal = ({ onClose, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: APP_PASSWORD, action: 'list' })
        });
        const data = await res.json();
        setVersions(data.history || []);
      } catch (e) {
        console.error("Failed to fetch history list", e);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, []);

  const handleSelectVersion = async (version) => {
    setLoadingContent(true);
    setSelectedVersion({ ...version, content: 'Loading...' }); 
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: APP_PASSWORD, action: 'get', id: version.id })
      });
      const data = await res.json();
      setSelectedVersion({ ...version, content: data.content });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-4xl h-[80vh] flex overflow-hidden shadow-2xl flex-col md:flex-row text-[var(--text-primary)]">
        
        {/* Left: List */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col bg-[var(--bg-primary)]">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><History size={16}/> Time Machine</h3>
            <button onClick={onClose} className="md:hidden p-1 hover:bg-[var(--bg-tertiary)] rounded"><X size={16}/></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-center text-[var(--text-dim)] text-sm">Loading history...</div>}
            {!loading && versions.length === 0 && <div className="p-4 text-center text-[var(--text-dim)] text-sm">No history found.</div>}
            {versions.map(v => (
              <button 
                key={v.id}
                onClick={() => handleSelectVersion(v)}
                className={`w-full text-left p-4 border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors ${selectedVersion?.id === v.id ? 'bg-[var(--bg-tertiary)] border-l-2 border-l-[var(--color-context)]' : ''}`}
              >
                <div className="text-xs font-mono text-[var(--text-dim)] mb-1">{new Date(v.created_at).toLocaleDateString()}</div>
                <div className="text-sm font-bold">{new Date(v.created_at).toLocaleTimeString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col bg-[var(--bg-secondary)] relative">
           <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)]">
             <span className="text-xs font-mono text-[var(--text-dim)] uppercase tracking-widest">Preview</span>
             <button onClick={onClose} className="hidden md:block p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={18}/></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 font-mono text-sm whitespace-pre-wrap">
              {loadingContent ? (
                <div className="flex items-center justify-center h-full text-[var(--text-dim)] gap-2"><RefreshCw className="animate-spin" size={16}/> Loading content...</div>
              ) : selectedVersion ? (
                selectedVersion.content
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-dim)]">Select a version to preview</div>
              )}
           </div>

           {selectedVersion && !loadingContent && (
             <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-primary)] flex justify-end gap-3">
               <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
               <button 
                 onClick={() => onRestore(selectedVersion.content)}
                 className="px-6 py-2 bg-[var(--color-context)] hover:opacity-90 text-[var(--bg-primary)] rounded text-sm font-bold shadow-lg flex items-center gap-2 transition-all"
               >
                 <RotateCcw size={16} /> Restore this version
               </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};


// --- HIGHLIGHTER COMPONENTS ---

const HighlighterLine = ({ line, index, onToggle, isRawMode, isActiveLine, searchQuery, onTagClick }) => {
  if (!line) return <br />;
  if (isRawMode) return <div className="text-[var(--text-dim)]"><HighlighterContent line={line} isRawMode={true} isActiveLine={true} searchQuery={searchQuery} /></div>;
  
  if (REGEX.divider.test(line.trim())) {
    return <div className="flex items-center" style={{ height: '1.625em' }}><hr className="w-full border-[var(--border)]" /><span className="opacity-0 w-0 h-0 overflow-hidden absolute">{line}</span></div>;
  }
  const isPending = REGEX.pendingTask.test(line);
  const isCompleted = REGEX.completed.test(line);
  const isPriority = REGEX.priority.test(line);
  const isNote = !isPending && !isCompleted && !isPriority;

  if (isNote) {
    return (
      <div className="bg-[var(--bg-sticky)] -mx-2 px-2 rounded-sm text-[var(--text-sticky)] border-l-2 border-[var(--text-sticky)]">
        <HighlighterContent line={line} isRawMode={false} isActiveLine={isActiveLine} searchQuery={searchQuery} onTagClick={onTagClick} />
      </div>
    );
  }
  if (isPending || isCompleted) {
    const content = line.slice(2);
    const Checkbox = (
      <span className="inline-block relative align-middle" style={{ width: '2ch', height: '1.5em' }}>
         <input type="checkbox" checked={isCompleted} onChange={() => onToggle(index)} className="absolute top-1 left-0 w-4 h-4 cursor-pointer z-20 pointer-events-auto accent-[var(--color-context)] rounded-sm opacity-60 hover:opacity-100" />
         <span className="opacity-0 select-none">{line.slice(0, 2)}</span>
      </span>
    );
    return (
      <div className={`relative ${isCompleted ? 'text-[var(--text-dim)] line-through decoration-[var(--text-dim)]' : 'text-[var(--text-primary)]'}`}>
        {Checkbox}<HighlighterContent line={content} isRawMode={false} isActiveLine={isActiveLine} searchQuery={searchQuery} onTagClick={onTagClick} />
      </div>
    );
  }
  return <div className="text-[var(--text-primary)]"><HighlighterContent line={line} isRawMode={false} isActiveLine={isActiveLine} searchQuery={searchQuery} onTagClick={onTagClick} /></div>;
};

const HighlighterContent = ({ line, isRawMode, isActiveLine, searchQuery, onTagClick }) => {
  if (!line) return null;
  let parts = [];
  const priorityMatch = line.match(REGEX.priority);
  let priorityEnd = 0;
  if (priorityMatch) {
    const pCode = priorityMatch[1];
    let pClass = "text-[var(--color-prio)] font-bold";
    parts.push(<span key="prio" className={pClass}>{priorityMatch[0]}</span>);
    priorityEnd = priorityMatch[0].length;
  }
  const remaining = line.slice(priorityEnd);
  const words = remaining.split(/(\s+)/);
  parts.push(...words.map((word, i) => {
      const key = `w-${i}`;
      const isSearchMatch = searchQuery && word.toLowerCase().includes(searchQuery.toLowerCase());
      const baseStyle = isSearchMatch ? "bg-[var(--color-context)] text-[var(--bg-primary)] font-bold rounded-sm px-0.5" : "";
      
      if (REGEX.date.test(word)) {
        if (isRawMode) return <span key={key} className={`text-[var(--color-date)] ${baseStyle}`}>{word}</span>;
        if (!isActiveLine && !isSearchMatch) return null;
        return <span key={key} className={`text-[var(--text-dim)] select-none ${baseStyle}`}>{word}</span>;
      }
      
      // Clickable Tags
      if (word.startsWith('+')) return <span key={key} onClick={(e) => { e.stopPropagation(); onTagClick && onTagClick(word); }} className={`text-[var(--color-project)] ${baseStyle} cursor-pointer hover:underline pointer-events-auto relative z-30`}>{word}</span>;
      if (word.startsWith('@')) return <span key={key} onClick={(e) => { e.stopPropagation(); onTagClick && onTagClick(word); }} className={`text-[var(--color-context)] ${baseStyle} cursor-pointer hover:underline pointer-events-auto relative z-30`}>{word}</span>;
      
      if (word.includes(':')) return <span key={key} className={`text-[var(--text-dim)] italic ${baseStyle}`}>{word}</span>;
      return <span key={key} className={baseStyle}>{word}</span>;
    }));
  return <>{parts}</>;
};

const SuggestionBar = ({ suggestions, activeIndex, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="fixed bottom-10 left-0 right-0 mx-auto w-full max-w-2xl px-4 z-50">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl rounded-lg overflow-hidden flex flex-col">
        <div className="bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] border-b border-[var(--border)] flex justify-between">
          <span>SUGGESTIONS</span><span className="hidden sm:inline">Tab to select</span>
        </div>
        <div className="max-h-48 overflow-y-auto p-1 bg-[var(--bg-secondary)]">
          {suggestions.map((item, idx) => (
            <button key={item.label + idx} onClick={() => onSelect(item)} className={`w-full text-left px-3 py-2 text-sm font-mono rounded-md transition-colors ${idx === activeIndex ? 'bg-[var(--bg-primary)] text-[var(--color-context)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
              <span className="opacity-50 mr-2 text-[var(--text-dim)] text-xs tracking-wider">{item.type}</span>
              <span className="text-[var(--text-primary)] font-medium">{item.label || item.value}</span>
              {item.label && <span className="ml-2 text-[var(--text-dim)] opacity-50 text-xs">{item.value}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const GuideFooter = () => (
  <footer className="mt-8 mb-4 border-t border-[var(--border)] pt-6 px-2 text-sm text-[var(--text-secondary)]">
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       <div><h3 className="font-bold text-[var(--text-primary)] mb-2">Shortcuts</h3><ul className="space-y-1 text-xs"><li>Enter: New Task</li><li>Backspace: Delete Task</li></ul></div>
       <div><h3 className="font-bold text-[var(--text-primary)] mb-2">Syntax</h3><ul className="space-y-1 text-xs"><li>- Task, x Done, (A) Prio</li><li>+Project, @Context</li></ul></div>
       <div><h3 className="font-bold text-[var(--text-primary)] mb-2">Autofill</h3><ul className="space-y-1 text-xs"><li>Type <code className="text-[var(--color-context)] font-bold">//</code> for dates</li><li>Type <code className="text-[var(--color-project)]">+</code> or <code className="text-[var(--color-context)]">@</code> for tags</li></ul></div>
     </div>
  </footer>
);

const ThemeSelector = ({ currentTheme, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded hover:bg-[var(--bg-secondary)]"
        title="Change Theme"
      >
        <Palette size={18} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 top-10 w-48 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden py-1">
             {Object.entries(THEMES).map(([key, theme]) => (
               <button
                 key={key}
                 onClick={() => { onSelect(key); setIsOpen(false); }}
                 className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-between"
               >
                 <span>{theme.name}</span>
                 {currentTheme === key && <Check size={14} className="text-[var(--color-project)]" />}
               </button>
             ))}
          </div>
        </>
      )}
    </div>
  );
};


// --- MAIN COMPONENT ---

export default function TodoTxtApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // App State
  const [text, setText] = useState("");
  const [lastSyncedTime, setLastSyncedTime] = useState(0); 
  const [syncStatus, setSyncStatus] = useState('idle'); 
  const [currentTheme, setCurrentTheme] = useState('cyberpunk');
  
  // Modal States
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pendingServerData, setPendingServerData] = useState(null);

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

  // --- ACTIONS ---
  
  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleRestoreVersion = (content) => {
    setText(content);
    triggerSync(content); 
    setShowHistoryModal(false);
  };

  const handleThemeChange = (themeKey) => {
    setCurrentTheme(themeKey);
    localStorage.setItem(THEME_KEY, themeKey);
  };

  // --- SYNC ENGINE ---
  
  const performSync = async (content, timestamp, isBackground = false) => {
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
        if (timestamp === 0) {
            applyServerData(data.content, data.timestamp);
            return;
        }
        setPendingServerData({ content: data.content, timestamp: data.timestamp });
        setShowConflictModal(true);
        setSyncStatus('idle');
      } else {
        setSyncStatus('synced');
      }
    } catch (e) {
      console.error("Sync failed", e);
      setSyncStatus('error');
    }
  };

  const applyServerData = (newContent, newTimestamp) => {
    setText(newContent);
    setLastSyncedTime(newTimestamp);
    localStorage.setItem(DATA_KEY, newContent);
    localStorage.setItem(TS_KEY, newTimestamp.toString());
    setSyncStatus('synced');
    setShowConflictModal(false);
    setPendingServerData(null);
  };

  const handleKeepLocal = () => {
    setShowConflictModal(false);
    setPendingServerData(null);
    triggerSync(text); 
  };

  const handleLoadCloud = () => {
    if (pendingServerData) {
      applyServerData(pendingServerData.content, pendingServerData.timestamp);
    }
  };

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

  // --- INITIALIZATION ---
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    const localData = localStorage.getItem(DATA_KEY);
    const localTS = localStorage.getItem(TS_KEY);
    const storedTheme = localStorage.getItem(THEME_KEY);
    
    if (storedTheme && THEMES[storedTheme]) {
      setCurrentTheme(storedTheme);
    }
    
    let initialText = "- Welcome to Todo.txt @home\n- Syncs automatically +feature\n";
    let initialTS = 0;

    if (localData) {
      initialText = localData;
      initialTS = parseInt(localTS || '0');
    }

    setText(initialText);
    setLastSyncedTime(initialTS);
    
    if (token) {
      setIsAuthenticated(true);
      performSync(initialText, initialTS);
    }
    
    setIsLoadingAuth(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- BACKGROUND POLLING ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (syncStatus !== 'syncing' && !showConflictModal && !showHistoryModal) {
        performSync(text, lastSyncedTime, true); 
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [isAuthenticated, text, lastSyncedTime, syncStatus, showConflictModal, showHistoryModal]);

  const handleLogin = () => {
    localStorage.setItem(SESSION_KEY, 'active');
    setIsAuthenticated(true);
    performSync(text, lastSyncedTime);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
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

    // DATE SHORTCUTS //
    if (word.startsWith('//')) {
      const dates = getRelativeDates();
      setSuggestionState({ isOpen: true, list: dates, activeIndex: 0, cursorWordStart: start, cursorWordEnd: end });
      return;
    }

    // PROJECT & CONTEXT
    if (word.startsWith('+') || word.startsWith('@')) {
      const type = word[0] === '+' ? 'PROJECT' : 'CONTEXT';
      const query = word.slice(1);
      const source = type === 'PROJECT' ? metadata.projects : metadata.contexts;
      const filtered = source.filter(item => item.toLowerCase().includes(query.toLowerCase()) && item !== query).map(item => ({ type, label: null, value: item }));
      if (filtered.length > 0) {
        setSuggestionState({ isOpen: true, list: filtered, activeIndex: 0, cursorWordStart: start, cursorWordEnd: end });
        return;
      }
    }
    setSuggestionState(p => ({ ...p, isOpen: false }));
  };

  const applySuggestion = (suggestion) => {
    const before = text.slice(0, suggestionState.cursorWordStart);
    const after = text.slice(suggestionState.cursorWordEnd);
    
    let inserted = "";
    if (suggestion.type === 'DATE') {
      inserted = `${suggestion.value} `;
    } else if (suggestion.type === 'PROJECT') {
      inserted = `+${suggestion.value} `;
    } else if (suggestion.type === 'CONTEXT') {
      inserted = `@${suggestion.value} `;
    }

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

  if (isLoadingAuth) return <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300" style={THEMES[currentTheme].colors} />;
  if (!isAuthenticated) return (
    <div style={THEMES[currentTheme].colors} className="contents">
       <LoginScreen onLogin={handleLogin} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 bg-[var(--bg-primary)] text-[var(--text-primary)]" style={THEMES[currentTheme].colors}>
      <header className="px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border)] flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">todo.txt</h1>
          <div className="flex items-center gap-2 text-xs font-mono">
            {syncStatus === 'syncing' && <RefreshCw className="animate-spin text-blue-500" size={14} />}
            {syncStatus === 'synced' && <Cloud className="text-[var(--color-project)]" size={14} />}
            {syncStatus === 'error' && <CloudOff className="text-[var(--color-prio)]" size={14} />}
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className={`flex items-center transition-all duration-300 overflow-hidden ${showSearch ? 'w-48 sm:w-64 opacity-100' : 'w-0 opacity-0'}`}>
            <input ref={searchInputRef} type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] px-3 py-1.5 rounded-l-md outline-none focus:border-[var(--text-secondary)] placeholder-[var(--text-dim)]" />
            <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="bg-[var(--bg-tertiary)] px-2 py-1.5 rounded-r-md border border-l-0 border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"><X size={16} /></button>
          </div>
          <button onClick={toggleSearch} className={`p-2 rounded-md hover:bg-[var(--bg-secondary)] ${showSearch ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}><Search size={18} /></button>
          
          <button onClick={() => setShowHistoryModal(true)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Time Machine"><History size={18} /></button>

          <ThemeSelector currentTheme={currentTheme} onSelect={handleThemeChange} />

          <button onClick={() => setIsRawMode(!isRawMode)} className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all ${isRawMode ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-dim)] border-[var(--border)] hover:border-[var(--text-dim)]'}`}>{isRawMode ? 'RAW' : 'VISUAL'}</button>
          <button onClick={handleLogout} className="p-2 text-[var(--text-dim)] hover:text-[var(--color-prio)] transition-colors" title="Logout"><Unlock size={14} /></button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-4xl mx-auto mt-6 px-4 pb-20 flex flex-col">
        <div className="relative w-full min-h-[60vh] flex-grow bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
          <div ref={highlighterRef} aria-hidden="true" className={`absolute inset-0 p-6 font-mono text-base leading-relaxed whitespace-pre-wrap break-words pointer-events-none z-20 overflow-hidden transition-opacity duration-200 ${isRawMode ? 'opacity-0' : 'opacity-100'}`} style={{ fontFamily: 'monospace' }}>
            {text.split('\n').map((line, i) => (<HighlighterLine key={i} index={i} line={line} onToggle={handleToggleLine} isRawMode={isRawMode} isActiveLine={i === activeLineIndex} searchQuery={searchQuery} onTagClick={handleTagClick} />))}
          </div>
          <textarea ref={textareaRef} value={text} onChange={handleChange} onScroll={handleScroll} onKeyDown={handleKeyDown} spellCheck="false" className={`absolute inset-0 w-full h-full p-6 font-mono text-base leading-relaxed bg-transparent resize-none outline-none z-10 whitespace-pre-wrap break-words transition-colors duration-200 ${isRawMode ? 'text-[var(--text-primary)] caret-[var(--text-primary)]' : 'text-transparent caret-[var(--color-context)]'}`} style={{ fontFamily: 'monospace', WebkitTextFillColor: isRawMode ? 'inherit' : 'transparent', }} placeholder="Type your tasks here..." />
        </div>
        {!isRawMode && (<SuggestionBar suggestions={suggestionState.isOpen ? suggestionState.list : null} activeIndex={suggestionState.activeIndex} onSelect={applySuggestion} />)}
        <GuideFooter />
      </main>

      {showConflictModal && pendingServerData && (
        <ConflictModal 
          serverDate={pendingServerData.timestamp}
          onKeepLocal={handleKeepLocal}
          onLoadCloud={handleLoadCloud}
        />
      )}

      {showHistoryModal && (
        <HistoryModal 
          onClose={() => setShowHistoryModal(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}