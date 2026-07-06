"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isResults = pathname === "/results";

  return (
    <header className="w-full shrink-0 z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)] sticky top-0">
      <div className="max-w-[1440px] w-[92%] mx-auto h-16 flex items-center justify-between">

        {/* Brand */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg px-1 py-0.5"
          aria-label="Roast My Resume Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] flex items-center justify-center text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-[var(--text)] group-hover:text-white transition-colors">
            Roast My Resume
          </span>
          <span className="text-[10px] font-bold text-[var(--accent-hover)] bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.2)] px-2 py-0.5 rounded-full ml-0.5">
            v2.0
          </span>
        </Link>

        {/* Right slot */}
        <div className="flex items-center gap-4">
          {isResults ? (
            <span className="text-xs sm:text-sm font-medium text-[var(--text-2)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
              Recruiter Audit Complete
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-medium text-[var(--text-3)] hidden sm:block">
              Brutally Honest AI Resume Review
            </span>
          )}
        </div>

      </div>
    </header>
  );
}

