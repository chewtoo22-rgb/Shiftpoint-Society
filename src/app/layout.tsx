import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import "./mobile-nav.css";
import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";
import { getOptionalCurrentMember } from "@/lib/current-member";
import { getUnreadActivityCount } from "@/lib/activity-repository";
import { getActivitySeenCookieName, parseActivitySeenAt } from "@/lib/activity-seen";

export const metadata: Metadata = {
  title: "Shiftpoint Society",
  description: "Cars & Coffee that never ends.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [member, cookieStore] = await Promise.all([
    getOptionalCurrentMember(),
    cookies(),
  ]);

  let unreadActivity = 0;
  if (member) {
    const seenAt = parseActivitySeenAt(
      cookieStore.get(getActivitySeenCookieName(member.id))?.value,
    );
    unreadActivity = await getUnreadActivityCount(member.id, seenAt);
  }

  return (
    <html lang="en">
      <body>
        <a className="skipLink" href="#main-content">SKIP TO CONTENT</a>
        <header className="siteHeader">
          <Link className="brand" href="/">
            <span className="brandMark">SP</span>
            <span>SHIFTPOINT <b>SOCIETY</b></span>
          </Link>
          <DesktopNav unreadActivity={unreadActivity} />
          <Link className="garageButton" href="/garage">MY GARAGE</Link>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="footer">
          <span>SHIFTPOINT SOCIETY</span>
          <span>BUILT FOR PEOPLE WHO WRENCH.</span>
        </footer>
        <MobileNav unreadActivity={unreadActivity} />
      </body>
    </html>
  );
}
