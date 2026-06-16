"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";

export interface CommandGroupDef {
  heading: string;
  items: { label: string; href: string; hint?: string }[];
}

/**
 * ⌘K command palette (cmdk, shadcn pattern) + its sidebar trigger.
 * Groups are plain serializable objects, so server layouts can build them.
 */
export function CommandMenu({ groups, placeholder = "Search pages, apps…" }: { groups: CommandGroupDef[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function go(href: string) {
    setOpen(false);
    if (href.startsWith("http")) window.open(href, "_blank");
    else router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-[260px] max-w-[35vw] items-center gap-2 rounded-[7px] border border-zinc-200 bg-white px-2.5 text-body text-zinc-400 transition-colors duration-150 hover:border-zinc-300 hover:text-zinc-600"
      >
        <Search size={14} strokeWidth={1.5} />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded border border-zinc-200 bg-white px-1 font-sans text-2xs text-zinc-400">⌘K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search"
        overlayClassName="fixed inset-0 z-50 bg-zinc-950/25"
        contentClassName="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 px-4"
        className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-3.5">
          <Search size={14} strokeWidth={1.5} className="shrink-0 text-zinc-400" />
          <Command.Input
            placeholder={placeholder}
            className="h-11 flex-1 bg-transparent text-body text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 text-2xs text-zinc-400">esc</kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-8 text-center text-body text-zinc-400">No results.</Command.Empty>
          {groups.map((g) => (
            <Command.Group
              key={g.heading}
              heading={g.heading}
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-zinc-400"
            >
              {g.items.map((it) => (
                <Command.Item
                  key={g.heading + it.href + it.label}
                  value={`${g.heading} ${it.label} ${it.hint ?? ""}`}
                  onSelect={() => go(it.href)}
                  className="flex h-8 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 text-body text-zinc-700 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900"
                >
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="mono shrink-0 text-2xs text-zinc-400">{it.hint}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
