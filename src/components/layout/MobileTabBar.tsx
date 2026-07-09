"use client";

// MobileTabBar — Phase 2-MOBILE-1 fixed bottom navigation for mobile
// (≤1023px). Replaces the desktop left Sidebar on narrow screens.
//
// Layout principles (docs/research/MOBILE_NAMING_FIREFLY_2026-06.md §1):
//   - 4 primary tabs: 가든홈 / 화단 / 씨앗심기 / 온실
//   - 44x44px touch targets (WCAG 2.5.5 AAA)
//   - Lucide icons only (no emoji per #38 rule and v6 token discipline)
//   - Active route highlighted via usePathname
//   - All Korean labels via garden-nav.ko.json (#35)
//
// The bar is hidden on lg+ via Tailwind responsive class so desktop users
// keep the existing left Sidebar.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sprout,
  Package,
  PackagePlus,
  Palette,
  MoreHorizontal,
} from "lucide-react";
import { gardenNav, type MobileTabItem } from "@/lib/i18n/garden-nav";

const ICON_MAP: Record<string, typeof Sprout> = {
  fountain: Sprout, // placeholder until Claude Design ships fountain asset
  shoppingbag: Package,
  packageplus: PackagePlus,
  palette: Palette,
};

function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // products/new is more specific than products — check exact first then
  // longer-prefix shadowing.
  if (href === "/products" && pathname.startsWith("/products/")) {
    // Prevent /products tab from lighting up on /products/new.
    if (pathname === "/products/new") return false;
    return true;
  }
  if (pathname.startsWith(`${href}/`)) return true;
  return false;
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const items = gardenNav.mobileTabs.items;

  return (
    <nav
      aria-label={gardenNav.mobileTabs.more}
      className="lg:hidden"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        // Account for iOS safe-area inset so the bar floats above the home indicator.
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        boxShadow: "0 -2px 12px rgba(246, 59, 40, 0.06)",
      }}
    >
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item: MobileTabItem) => {
          const Icon = ICON_MAP[item.icon] ?? MoreHorizontal;
          const active = isActiveHref(pathname ?? "", item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                style={{
                  // 44x44 hit area + label below = ~60px tall
                  minHeight: 60,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  padding: "6px 4px",
                  textDecoration: "none",
                  color: active ? "var(--gp-red-600)" : "var(--gp-ink-500)",
                  background: active ? "var(--gp-pink-50)" : "transparent",
                  borderTop: active
                    ? "2px solid var(--gp-red-500)"
                    : "2px solid transparent",
                  transition: "background 0.12s, color 0.12s, border-color 0.12s",
                  wordBreak: "keep-all",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: active ? "var(--gp-pink-100)" : "var(--gp-pink-50)",
                    border: active
                      ? "1.5px solid var(--gp-pink-300)"
                      : "1.5px solid var(--color-border)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: active ? "var(--sticker-shadow)" : undefined,
                  }}
                >
                  <Icon
                    size={18}
                    color={active ? "var(--gp-red-500)" : "var(--gp-ink-500)"}
                    strokeWidth={2.3}
                  />
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  {item.ko}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
