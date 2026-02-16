"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsNav = [
  { href: "/settings/plans", label: "Plans" },
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/guide", label: "Guide" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 sticky top-6 self-start space-y-1">
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-none text-[13px] font-medium transition-colors ${
                  isActive
                    ? "border-l-2 border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--foreground)]"
                    : "border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
