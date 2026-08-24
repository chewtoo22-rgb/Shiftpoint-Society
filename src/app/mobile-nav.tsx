"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "../lib/navigation";

function isActivePath(pathname: string, href: string) {
  if (href === "/garage") {
    return pathname === href || pathname.startsWith("/garage/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ unreadActivity }: { unreadActivity: number }) {
  const pathname = usePathname();

  return (
    <nav className="mobileNav" aria-label="Mobile navigation">
      {primaryNavigation.map(({ label, href, mobileKicker }) => {
        const active = isActivePath(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            className={active ? "mobileNavActive" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobileNavKicker">{mobileKicker}</span>
            <span className="mobileNavLabel">
              {label}
              {href === "/activity" && unreadActivity > 0 ? (
                <span className="navBadge" aria-label={`${unreadActivity} unread activity items`}>
                  {unreadActivity > 99 ? "99+" : unreadActivity}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
