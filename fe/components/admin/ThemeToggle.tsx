'use client';

import { Moon, Sun } from 'lucide-react';
import { useCallback, useSyncExternalStore } from 'react';

const themeSubscribe = (cb: () => void) => {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};

const getThemeSnapshot = () => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('theme');
  return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
};

export default function ThemeToggle() {
  const darkMode = useSyncExternalStore(themeSubscribe, getThemeSnapshot, () => false);

  const toggleDarkMode = useCallback(() => {
    const next = !darkMode;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
    }
    // Trigger storage listeners so useSyncExternalStore re-reads
    window.dispatchEvent(new StorageEvent('storage'));
  }, [darkMode]);

  return (
    <button
      onClick={toggleDarkMode}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-violet-100 hover:text-violet-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
      aria-label="Toggle dark mode"
    >
      {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
