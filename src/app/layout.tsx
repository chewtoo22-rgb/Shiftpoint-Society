import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shiftpoint Society",
  description: "Cars & Coffee that never ends.",
};

const nav = [
  ["Feed", "/feed"],
  ["Garages", "/garages"],
  ["Builds", "/builds"],
  ["Videos", "/videos"],
  ["Knowledge", "/knowledge"],
  ["Meets", "/meets"],
  ["Deals", "/deals"],
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <Link className="brand" href="/">
            <span className="brandMark">SP</span>
            <span>SHIFTPOINT <b>SOCIETY</b></span>
          </Link>
          <nav className="desktopNav" aria-label="Primary navigation">
            {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <Link className="garageButton" href="/garage">MY GARAGE</Link>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>SHIFTPOINT SOCIETY</span>
          <span>BUILT FOR PEOPLE WHO WRENCH.</span>
        </footer>
      </body>
    </html>
  );
}
