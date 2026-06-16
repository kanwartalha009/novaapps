import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          Nova<span className="text-brand-600">Apps</span>
        </Link>
        <nav className="flex items-center gap-7 text-body font-medium text-zinc-500">
          <Link href="/apps" className="transition-colors hover:text-zinc-900">Apps</Link>
          <Link href="/for-agencies" className="transition-colors hover:text-zinc-900">For agencies</Link>
          <Link href="/login" className="transition-colors hover:text-zinc-900">Log in</Link>
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-3.5 py-1.5 text-white transition-colors hover:bg-zinc-800"
          >
            Become a partner
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8 text-body text-zinc-400">
        <p>© {new Date().getFullYear()} Nova Apps Platform</p>
        <nav className="flex gap-6">
          <Link href="/apps" className="transition-colors hover:text-zinc-900">App catalog</Link>
          <Link href="/for-agencies" className="transition-colors hover:text-zinc-900">Agency program</Link>
        </nav>
      </div>
    </footer>
  );
}
