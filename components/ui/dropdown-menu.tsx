'use client';

import type { ComponentProps } from 'react';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import { cn } from '@/lib/utils';

/*
  The overflow / action menu, on Base UI's headless Menu. It backs the account menu in the
  shell now, and the row-action menus in the users, patients and other tables from step 6 on.
  Styled to match a popover surface — 1px ring, 8px radius, a 100ms fade/zoom — so every
  floating surface in the app reads the same.
*/
const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuGroup = MenuPrimitive.Group;

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  side = 'bottom',
  sideOffset = 4,
  align = 'end',
  alignOffset = 0,
  ...props
}: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, 'side' | 'sideOffset' | 'align' | 'alignOffset'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} className="isolate z-50">
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            'bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative z-50 max-h-(--available-height) min-w-40 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg p-1 text-sm shadow-md ring-1 duration-100 outline-none',
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: MenuPrimitive.Item.Props & {
  /** `destructive` tints the row red, for the delete / sign-out action that ends a list of choices. */
  variant?: 'default' | 'destructive';
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 [&_svg]:text-muted-foreground data-[variant=destructive]:[&_svg]:text-destructive relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

/*
  A link row (Base UI `Menu.LinkItem`), for the menu entries that navigate. `Menu.Item`
  rendered as an anchor would have its click swallowed by the item's own handler and never
  navigate; `LinkItem` is the part that lets the link through. The caller supplies the `Link`
  via `render`.
*/
function DropdownMenuLinkItem({ className, ...props }: MenuPrimitive.LinkItem.Props) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-menu-link-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

/*
  A plain styled label, not Base UI's `Menu.GroupLabel` — that part throws unless it sits
  inside a `Menu.Group`, and the common use (the account-menu header) is a standalone label.
  A non-focusable div is skipped by the menu's keyboard navigation.
*/
function DropdownMenuLabel({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="dropdown-menu-label" className={cn('text-muted-foreground px-2 py-1.5 text-xs font-medium', className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return <MenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn('bg-border -mx-1 my-1 h-px', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
