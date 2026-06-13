"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname();
  const isResults = pathname === "/results";

  return (
    <nav className="w-full shrink-0 z-40 bg-[var(--bg)] border-b border-[var(--border)]">
      <div className="max-w-[1440px] w-[92%] mx-auto h-16 flex items-center justify-between">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span
            className="font-display font-semibold text-lg tracking-tight text-[var(--text)]"
          >
            Roast My Resume
          </span>
          <span className="text-[10px] font-medium text-[var(--text-3)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded ml-1">
            v2.0
          </span>
        </Link>

        {/* Right slot */}
        <div className="flex items-center gap-4">
          {isResults && (
            <span className="text-sm font-medium text-[var(--text-2)] hidden sm:block">
              Professional Resume Review
            </span>
          )}
        </div>

      </div>
    </nav>
  );
}
