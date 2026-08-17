'use client';

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import { cn } from '@/lib/utils';

/*
  Avatar on Base UI's headless Avatar. The app stores no photo, so in practice this renders
  the initials fallback — a small muted circle carrying a name's initials — in the shell's
  user block and, later, the users table and doctor directory. The initials themselves are
  derived by a pure helper at the call site; this primitive only renders what it is given.
*/
function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root data-slot="avatar" className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)} {...props} />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn('aspect-square size-full object-cover', className)} {...props} />;
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-xs font-medium select-none',
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
