'use client';

import { useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Input } from './input';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  showLabel?: string;
  hideLabel?: string;
};

/*
  A password field with a reveal toggle.

  The toggle only flips the input's `type` between `password` and `text`. The value never
  leaves the field and nothing about how the form reads it changes, so `{...register(...)}`
  spreads onto this exactly as it would onto a bare `Input` — including the ref, which React
  forwards through the spread.

  `pe-10` reserves the lane the button sits in so a long password does not slide under it.
  The button carries its state on `aria-pressed` and swaps its own label, because the icon
  alone says nothing to a screen reader.
*/
export function PasswordInput({ showLabel = 'Show password', hideLabel = 'Hide password', className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleToggleClick = (): void => {
    setIsVisible(x => !x);
  };

  return (
    <div className="relative">
      <Input type={isVisible ? 'text' : 'password'} className={cn('pe-10', className)} {...props} />

      <button
        type="button"
        aria-label={isVisible ? hideLabel : showLabel}
        aria-pressed={isVisible}
        onClick={handleToggleClick}
        className="text-muted-foreground hover:text-foreground focus-visible:text-foreground absolute inset-y-0 inset-e-0 flex items-center pe-3 outline-none">
        {isVisible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
