export const primaryNavigation = [
  { label: "Feed", href: "/feed", mobileKicker: "WIRE" },
  { label: "Activity", href: "/activity", mobileKicker: "PULSE" },
  { label: "Garage", href: "/garage", mobileKicker: "SHOP" },
  { label: "Profile", href: "/profile", mobileKicker: "YOU" },
] as const;

export type PrimaryNavigationItem = (typeof primaryNavigation)[number];
