"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import NotificationBell from "@/components/layout/NotificationBell";
import Logo from "@/components/layout/Logo";

const NAV_ITEMS = [
  { href: "/workspace", label: "워크스페이스", icon: "📋" },
  { href: "/khu", label: "경희대", icon: "🏫" },
  { href: "/budget", label: "가계부", icon: "💰" },
];

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/72 backdrop-blur-xl backdrop-saturate-[1.8] dark:border-white/[0.08] dark:bg-black/72">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Link href="/workspace" className="mr-0.5 flex-shrink-0 md:mr-1">
            <Logo size="sm" />
          </Link>

          {user && (
            <nav className="flex items-center gap-0.5 rounded-full bg-black/[0.04] p-[3px] dark:bg-white/[0.08]">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] font-medium md:gap-1.5 md:px-3.5 ${
                      isActive
                        ? "bg-white text-foreground shadow-sm dark:bg-white/15 dark:text-white"
                        : "text-secondary hover:text-foreground dark:hover:text-white"
                    }`}
                  >
                    <span className="text-[13px]">{item.icon}</span>
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 md:gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-secondary hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {user && <NotificationBell />}

          {user && (
            <div className="flex items-center gap-1 md:gap-2">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-7 w-7 rounded-full"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-[11px] font-semibold text-white">
                    {(profile?.name || profile?.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden text-[13px] font-medium text-foreground md:inline dark:text-[#e5e5e7]">
                  {profile?.name || profile?.email}
                </span>
              </Link>
              <button
                onClick={signOut}
                className="hidden rounded-full px-3 py-1.5 text-[13px] text-secondary hover:bg-black/[0.05] hover:text-foreground md:block dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
