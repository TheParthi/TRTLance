'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { applyTheme } from '@/components/shell/theme-toggle';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark' | 'system';

const order: Theme[] = ['system', 'light', 'dark'];
const icons = { system: Monitor, light: Sun, dark: Moon };
const labels = { system: 'Match the system', light: 'Light', dark: 'Dark' };

/**
 * One button that cycles the theme, rather than the member app's three-way menu: the console's top
 * bar has no room for a dropdown, and a console is often read for hours in one lighting condition.
 * Shares the same storage key and apply function as the rest of the app, so a choice made here
 * follows you back to TrustLance.
 */
export function ConsoleTheme() {
  const [theme, setTheme] = React.useState<Theme>('system');

  React.useEffect(() => {
    try {
      setTheme((localStorage.getItem('tl-theme') as Theme) || 'system');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = icons[theme];

  return (
    <Tooltip content={`Theme: ${labels[theme]}. Switch to ${labels[next].toLowerCase()}.`}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Theme: ${labels[theme]}. Switch to ${labels[next]}.`}
        onClick={() => {
          setTheme(next);
          try {
            localStorage.setItem('tl-theme', next);
          } catch {
            /* storage unavailable */
          }
          applyTheme(next);
        }}
      >
        <Icon />
      </Button>
    </Tooltip>
  );
}
