'use client';

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, type ThemeMode } from './theme-provider';

export function ThemeTopbarButton() {
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();

  const handleCycle = () => {
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  const title = `Theme: ${themeMode} (${resolvedTheme})`;

  return (
    <button
      className="icon-button theme-toggle-btn"
      onClick={handleCycle}
      title={title}
      aria-label={title}
      type="button"
    >
      {themeMode === 'system' ? (
        <Laptop size={18} />
      ) : resolvedTheme === 'dark' ? (
        <Moon size={18} />
      ) : (
        <Sun size={18} />
      )}
    </button>
  );
}

export function ThemeSelectorCard() {
  const { themeMode, setThemeMode } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'system', label: 'System', icon: Laptop },
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div className="theme-selector-group" role="radiogroup" aria-label="Theme mode">
      {options.map(({ mode, label, icon: Icon }) => {
        const isSelected = themeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setThemeMode(mode)}
            className={`theme-selector-option ${isSelected ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
