"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPrimaryNavigationActive, primaryNavigation } from "../lib/navigation";

export function DesktopNav({ unreadActivity }: { unreadActivity: number }) {
  const pathname = usePathname();

  return (
    <nav className="desktopNav" aria-label="Primary navigation">
      {primaryNavigation.map(({ label, href }) => {
        const active = isPrimaryNavigationActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            className={active ? "desktopNavActive" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {label}
            {href === "/activity" && unreadActivity > 0 ? (
              <span className="navBadge" aria-label={`${unreadActivity} unread activity items`}>
                {unreadActivity > 99 ? "99+" : unreadActivity}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
