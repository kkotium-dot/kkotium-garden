"use client";

// AppSidebar — v6 Retro Pop Garden Fantasy sidebar (240-280px).
// NEW shell component — does NOT replace src/components/layout/Sidebar.tsx.
// Use only inside AppShell on screens migrated to v6. Korean labels live in
// src/lib/i18n/garden-nav.ko.json (rule #35).
//
// Mascot + illustration are render slots (props) so Claude Design can swap
// assets after MCP connector recovery without editing this file.

import { Suspense, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Package, PackagePlus, RefreshCw,
  Search, Layers, Store, Truck,
  KeyRound, FileText, ShoppingCart,
  ChevronRight, MessageCircle, CreditCard, Workflow,
  Palette, Images, Sprout,
} from "lucide-react";
import { useSidebarStats } from "@/lib/hooks/useDashboardData";
import { gardenNav, type BadgeKey, type GardenNavItem } from "@/lib/i18n/garden-nav";

export interface AppSidebarProps {
  mascot?: ReactNode;
  illustration?: ReactNode;
}

const ICON_MAP: Record<string, typeof Package> = {
  fountain: Sprout, // placeholder until Claude Design ships fountain SVG asset
  shoppingbag: Package,
  packageplus: PackagePlus,
  refreshcw: RefreshCw,
  search: Search,
  layers: Layers,
  store: Store,
  truck: Truck,
  keyround: KeyRound,
  filetext: FileText,
  shoppingcart: ShoppingCart,
  messagecircle: MessageCircle,
  creditcard: CreditCard,
  workflow: Workflow,
  palette: Palette,
  package: Package,
  images: Images,
};

const NAV_HREFS: string[] = gardenNav.sections.flatMap((s) =>
  s.items.map((i) => i.href)
);

function computeActive(href: string, pathname: string, tabQuery: string | null): boolean {
  const qIdx = href.indexOf("?");
  if (qIdx === -1) {
    if (pathname !== href) return false;
    if (!tabQuery) return true;
    for (const h of NAV_HREFS) {
      const i = h.indexOf("?");
      if (i === -1) continue;
      if (h.slice(0, i) !== pathname) continue;
      const sq = new URLSearchParams(h.slice(i + 1));
      if (sq.get("tab") === tabQuery) return false;
    }
    return true;
  }
  const hPath = href.slice(0, qIdx);
  if (pathname !== hPath) return false;
  const hq = new URLSearchParams(href.slice(qIdx + 1));
  return hq.get("tab") === tabQuery;
}

function NavBadge({ count, active }: { count: number; active: boolean }) {
  if (count === 0) return null;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 900,
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 99,
        background: active ? "rgba(255,255,255,0.25)" : "var(--gp-red-500)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavIcon({ iconKey, active }: { iconKey: string; active: boolean }) {
  const Icon = ICON_MAP[iconKey] ?? Search;
  const color = active ? "#fff" : "var(--gp-red-500)";
  return (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: active ? "var(--gp-red-500)" : "var(--gp-pink-100)",
        border: active ? "1.5px solid var(--gp-red-600)" : "1.5px solid var(--gp-pink-200)",
        boxShadow: "var(--sticker-shadow)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={16} strokeWidth={2.25} color={color} />
    </span>
  );
}

function SidebarInner({ mascot, illustration }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get("tab");
  const { counts: sideStats } = useSidebarStats();

  const getBadgeCount = (key: BadgeKey | undefined): number => {
    if (!sideStats || !key) return 0;
    if (key === "sourcing") return sideStats.sourcingCount;
    if (key === "zombie") return sideStats.zombieCount;
    if (key === "orders") return sideStats.ordersCount;
    if (key === "draft") return sideStats.draftCount;
    if (key === "oos") return sideStats.oosCount;
    return 0;
  };

  return (
    <aside
      style={{
        width: "var(--shell-sidebar-w, 256px)",
        flexShrink: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        position: "relative",
      }}
    >
      {/* Brand header — pop red bar */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          background: "var(--gp-red-500)",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            background: "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.40)",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Mascot slot — Claude Design will ship final 꼬띠 illustration */}
          {mascot ?? (
            <img
              src="/kkotium-symbol-white.svg"
              alt={gardenNav.mascot.en}
              width={42}
              height={42}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
            />
          )}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <p
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#fff",
              fontFamily: "'Arial Black', Impact, sans-serif",
              letterSpacing: "-0.5px",
              margin: 0,
            }}
          >
            {gardenNav.brand.primary}
          </p>
          <p
            className="gp-label-serif-italic"
            style={{
              fontSize: 11,
              color: "var(--gp-pink-300)",
              letterSpacing: "0.18em",
              margin: 0,
              marginTop: 2,
            }}
          >
            {gardenNav.brand.secondary.toLowerCase()}
          </p>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
        {gardenNav.sections.map((section, si) => (
          <div key={section.key}>
            {si > 0 && (
              <div
                className="gp-scallop-divider"
                style={{ margin: "10px 4px 8px" }}
                aria-hidden
              />
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 12px",
                marginBottom: 6,
              }}
            >
              <span
                className="gp-label-serif-italic"
                style={{
                  fontSize: 11,
                  color: "var(--gp-red-500)",
                  letterSpacing: "0.16em",
                  textTransform: "lowercase",
                }}
              >
                {section.label.toLowerCase()}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((item: GardenNavItem) => {
                const active = computeActive(item.href, pathname, tabQuery);
                const badgeCount = getBadgeCount(item.badgeKey);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderRadius: 12,
                      padding: "8px 10px",
                      fontSize: 14,
                      fontWeight: 600,
                      background: active ? "var(--gp-pink-100)" : "transparent",
                      color: active ? "var(--gp-red-600)" : "var(--gp-ink-700)",
                      textDecoration: "none",
                      transition: "background 0.12s, color 0.12s",
                      wordBreak: "keep-all",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "var(--gp-pink-50)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }
                    }}
                  >
                    <NavIcon iconKey={item.icon} active={active} />
                    <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.ko}
                      </span>
                      <span
                        className="gp-label-serif-italic"
                        style={{
                          fontSize: 10,
                          color: active ? "var(--gp-red-500)" : "var(--gp-ink-500)",
                          letterSpacing: "0.04em",
                          marginTop: 1,
                        }}
                      >
                        {item.en}
                      </span>
                    </span>
                    {badgeCount > 0 && <NavBadge count={badgeCount} active={active} />}
                    {active && badgeCount === 0 && (
                      <ChevronRight
                        size={13}
                        style={{ color: "var(--gp-red-500)", marginLeft: "auto" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Illustration slot — Claude Design garden art when ready */}
      {illustration && (
        <div
          style={{
            padding: "12px 16px 20px",
            borderTop: "1px dashed var(--color-border)",
          }}
        >
          {illustration}
        </div>
      )}
    </aside>
  );
}

export default function AppSidebar(props: AppSidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  );
}
