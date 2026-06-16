"use client";

import type { ComponentProps, ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

/* shadcn/Radix tooltip, Helm-styled: ink surface, no shadow, no animation theatrics. */

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className, sideOffset = 6, ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn("z-[60] max-w-xs rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs leading-4 text-white", className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** Convenience wrapper for the common single-tip case. */
export function WithTooltip({ tip, children }: { tip: ReactNode; children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
