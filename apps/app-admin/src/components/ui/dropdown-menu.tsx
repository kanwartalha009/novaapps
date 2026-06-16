"use client";

import type { ComponentProps } from "react";
import * as Dm from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

/* shadcn/Radix dropdown menu, Helm-styled: bordered panel, no shadow/blur. */

export const DropdownMenu = Dm.Root;
export const DropdownMenuTrigger = Dm.Trigger;

export function DropdownMenuContent({
  className, sideOffset = 6, align = "end", ...props
}: ComponentProps<typeof Dm.Content>) {
  return (
    <Dm.Portal>
      <Dm.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1",
          className,
        )}
        {...props}
      />
    </Dm.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Dm.Item>) {
  return (
    <Dm.Item
      className={cn(
        "flex h-8 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 text-body text-zinc-700 outline-none transition-colors duration-[120ms] data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Dm.Label>) {
  return (
    <Dm.Label
      className={cn("px-2.5 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-widest text-zinc-400", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Dm.Separator>) {
  return <Dm.Separator className={cn("my-1 h-px bg-zinc-100", className)} {...props} />;
}
