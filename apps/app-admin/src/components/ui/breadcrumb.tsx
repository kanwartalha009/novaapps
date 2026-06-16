import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** shadcn-pattern breadcrumb — current page last, parents linked. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-body text-zinc-400">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} strokeWidth={1.5} className="text-zinc-300" />}
          {it.href ? (
            <Link href={it.href} className="transition-colors duration-150 hover:text-zinc-900 hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="font-medium text-zinc-700">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
