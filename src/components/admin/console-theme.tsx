'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

const KEY = 'tl-console-theme';

/**
 * The console keeps its own appearance, separate from the member app's.
 *
 * It is dark by default because that is what it was designed in; an operator who prefers light gets
 * a light console without changing the marketplace, and vice versa. Storing the choice under its
 * own key is what keeps the two from fighting each other.
 */
export const consoleThemeScript = `(function(){try{if(localStorage.getItem('${KEY}')==='light'){var e=document.querySelector('[data-console]');if(e)e.setAttribute('data-console-theme','light')}}catch(e){}})()`;

function apply(theme: 'dark' | 'light') {
  const root = document.querySelector('[data-console]');
  if (!root) return;
  if (theme === 'light') root.setAttribute('data-console-theme', 'light');
  else root.removeAttribute('data-console-theme');
}

export function ConsoleTheme() {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    try {
      setTheme(localStorage.getItem(KEY) === 'light' ? 'light' : 'dark');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Moon : Sun;

  return (
    <Tooltip content={`Console appearance: ${theme}. Switch to ${next}.`}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Console appearance: ${theme}. Switch to ${next}.`}
        onClick={() => {
          setTheme(next);
          try {
            localStorage.setItem(KEY, next);
          } catch {
            /* storage unavailable */
          }
          apply(next);
        }}
      >
        <Icon />
      </Button>
    </Tooltip>
  );
}
