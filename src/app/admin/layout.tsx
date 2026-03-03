import { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell-admin">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="text-sm font-semibold flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-yellow text-[10px] font-extrabold text-brand-navy">
              LP
            </span>
            <span>Admin de Landing Pages</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs text-white/80">
            <Link href="/admin" className="hover:text-brand-yellow transition-colors">
              Landing pages
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

