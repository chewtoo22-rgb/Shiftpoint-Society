import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import "./mobile-nav.css";
import { MobileNav } from "./mobile-nav";
import { getOptionalCurrentMember } from "@/lib/current-member";
import { getUnreadActivityCount } from "@/lib/activity-repository";
import { primaryNavigation } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Shiftpoint Society",
  description: "Cars & Coffee that never ends.",
};

const ACTIVITY_SEEN_COOKIE = "shiftpoint-activity-seen-at";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [member, cookieStore] = await Promise.all([
    getOptionalCurrentMember(),
    cookies(),
  ]);

  let unreadActivity = 0;
  if (member) {
    const rawSeenAt = cookieStore.get(ACTIVITY_SEEN_COOKIE)?.value;
    const parsedSeenAt = rawSeenAt ? new Date(rawSeenAt) : null;
    const seenAt = parsedSeenAt && !Number.isNaN(parsedSeenAt.getTime()) ? parsedSeenAt : null;
    unreadActivity = await getUnreadActivityCount(member.id, seenAt);
  }

  const activityBadge = unreadActivity > 0 ? (
    <span className="navBadge" aria-label={`${unreadActivity} unread activity items`}>
      {unreadActivity > 99 ? "99+" : unreadActivity}
    </span>
  ) : null;

  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <Link className="brand" href="/">
            <span className="brandMark">SP</span>
            <span>SHIFTPOINT <b>SOCIETY</b></span>
          </Link>
          <nav className="desktopNav" aria-label="Primary navigation">
            {primaryNavigation.map(({ label, href }) => (
              <Link key={href} href={href}>
                {label}
                {href === "/activity" && activityBadge}
              </Link>
            ))}
          </nav>
          <Link className="garageButton" href="/garage">MY GARAGE</Link>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>SHIFTPOINT SOCIETY</span>
          <span>BUILT FOR PEOPLE WHO WRENCH.</span>
        </footer>
        <MobileNav unreadActivity={unreadActivity} />
      </body>
    </html>
  );
}
