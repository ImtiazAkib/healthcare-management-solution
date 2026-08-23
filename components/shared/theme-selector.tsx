'use client';

import { useSyncExternalStore, useTransition } from 'react';

import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';

import { THEMES, THEME_LABELS, type Theme } from '@/constants/theme.const';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';

import { setThemeAction } from './theme.actions';

type ThemeOption = {
  value: Theme;
  label: string;
  icon: LucideIcon;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: THEMES.LIGHT, label: THEME_LABELS[THEMES.LIGHT], icon: Sun },
  { value: THEMES.DARK, label: THEME_LABELS[THEMES.DARK], icon: Moon },
  { value: THEMES.SYSTEM, label: THEME_LABELS[THEMES.SYSTEM], icon: Monitor },
];

/* Fired after the class is flipped, so the subscribed snapshot re-reads and the menu updates. */
const THEME_CHANGE_EVENT = 'caresync:theme-change';

/*
  The server has already written the class on <html>, so the selection is legible from the
  DOM: `.dark` and `.light` are the two explicit overrides, and their absence is "system".
  Reading it back this way means the selector needs no prop threaded through the layout.
*/
function readThemeFromDocument(): Theme {
  const root = document.documentElement;

  if (root.classList.contains(THEMES.DARK)) return THEMES.DARK;
  if (root.classList.contains(THEMES.LIGHT)) return THEMES.LIGHT;

  return THEMES.SYSTEM;
}

/*
  Flip the class on <html> at once so the change is instant and flicker-free — the same class
  the server would render, so the later cookie-persisted render agrees rather than correcting.
  "system" clears both classes and lets `prefers-color-scheme` decide.
*/
function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;

  root.classList.toggle(THEMES.DARK, theme === THEMES.DARK);
  root.classList.toggle(THEMES.LIGHT, theme === THEMES.LIGHT);
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

/*
  The theme toggle in the topbar's right cluster — light / dark / match device — mirroring the
  account menu's DropdownMenu so it sits beside the bell as a sibling control. The active
  choice carries a check; the trigger shows its icon.
*/
export function ThemeSelector() {
  const [, startTransition] = useTransition();

  /*
    Read the live choice straight from <html> rather than mirror it into state: the class is
    the source of truth — the server wrote it, this component edits it. The server snapshot is
    "system" so the first client render matches the server's and never mismatches; after
    hydration the real class is read. Selecting fires the event above to re-read.
  */
  const theme = useSyncExternalStore(subscribe, readThemeFromDocument, () => THEMES.SYSTEM);

  const handleSelect = (next: Theme): void => {
    applyThemeToDocument(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    startTransition(() => setThemeAction(next));
  };

  const ActiveIcon = theme === THEMES.DARK ? Moon : theme === THEMES.LIGHT ? Sun : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Change theme" />}>
        <ActiveIcon className="size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel className="text-foreground text-sm font-medium">Theme</DropdownMenuLabel>

        <DropdownMenuSeparator />

        {THEME_OPTIONS.map(option => {
          const OptionIcon = option.icon;

          return (
            <DropdownMenuItem key={option.value} onClick={() => handleSelect(option.value)}>
              <OptionIcon />
              <span className="flex-1">{option.label}</span>
              {theme === option.value ? <Check className="text-foreground size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
