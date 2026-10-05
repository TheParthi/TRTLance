'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

/** Inline script that applies the saved theme before first paint (avoids a flash). */
export const themeScript = `(function(){try{var t=localStorage.getItem('tl-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export function ThemeMenuItems() {
  const [theme, setTheme] = React.useState<Theme>('system');
  React.useEffect(() => {
    try {
      setTheme((localStorage.getItem('tl-theme') as Theme) || 'system');
    } catch {
      /* storage unavailable */
    }
  }, []);
  const choose = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem('tl-theme', t);
    } catch {
      /* storage unavailable */
    }
    applyTheme(t);
  };
  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ];
  return (
    <div role="group" aria-label="Theme" className="grid grid-cols-3 gap-1 p-1">
      {options.map(({ value, label, Icon }) => (
        <DropdownMenuItem
          key={value}
          onSelect={(e) => {
            e.preventDefault();
            choose(value);
          }}
          aria-checked={theme === value}
          role="menuitemradio"
          className={`flex-col gap-1 px-1 py-2 text-xs ${theme === value ? 'bg-surface-subtle font-semibold' : ''}`}
        >
          <Icon />
          {label}
        </DropdownMenuItem>
      ))}
    </div>
  );
}
