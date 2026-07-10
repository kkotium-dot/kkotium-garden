'use client';
// Sidebar — KKOTIUM v12 (2026-07-09 ADHD-IA-REAUDIT · #233)
// - Single source of truth: renders directly from garden-nav.ko.json (no more
//   hardcoded NAV — the previous mirror drifted, e.g. /market·/growth·/control
//   missing from the JSON. Now one file drives both, #26/#5 consistency).
// - 6 top groups · ≤5 items each · function-first labels + metaphor sublabel.
// - Merged workspaces (상품 만들기 / 공급사 관리 / 설정) carry `children` shown
//   as indented sub-tabs when that section is active (progressive disclosure,
//   #233 §3B). Every route preserved — no renames, no redirects.
// - 4 live badges (sourcing/zombie/orders/draft) on top-level items via
//   useSidebarStats().

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSidebarStats } from '@/lib/hooks/useDashboardData';
import { gardenNav, type GardenNavItem, type GardenNavChild, type BadgeKey } from '@/lib/i18n/garden-nav';
import {
  Package, PackagePlus, RefreshCw,
  Search, Layers, Store, Truck,
  KeyRound, FileText, ShoppingCart,
  ChevronRight, MessageCircle, CreditCard, Workflow,
  Palette, Images, Link2, BarChart3, Sprout, Settings,
} from 'lucide-react';

// Fountain SVG — garden concept, matches dashboard page header icon
function FountainIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 22V12"/>
      <path d="M12 12C12 12 8 9 8 6a4 4 0 0 1 8 0c0 3-4 6-4 6z"/>
      <path d="M12 12c0 0-4 3-7 3"/>
      <path d="M12 12c0 0 4 3 7 3"/>
      <ellipse cx="12" cy="20" rx="5" ry="2"/>
    </svg>
  );
}

function ShoppingBagIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

// Pre-computed href list (parents + children) for sibling deep-link detection.
const NAV_HREFS: string[] = gardenNav.sections.flatMap((s) =>
  s.items.flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]),
);

// Z-3b: active path matcher — supports query-based deep-links (e.g., /crawl?tab=history)
function computeActive(href: string, pathname: string, tabQuery: string | null): boolean {
  const qIdx = href.indexOf('?');
  if (qIdx === -1) {
    if (pathname !== href) return false;
    if (!tabQuery) return true;
    for (const h of NAV_HREFS) {
      const i = h.indexOf('?');
      if (i === -1) continue;
      if (h.slice(0, i) !== pathname) continue;
      const sq = new URLSearchParams(h.slice(i + 1));
      if (sq.get('tab') === tabQuery) return false;
    }
    return true;
  }
  const hPath = href.slice(0, qIdx);
  if (pathname !== hPath) return false;
  const hq = new URLSearchParams(href.slice(qIdx + 1));
  return hq.get('tab') === tabQuery;
}

// A merged parent's sub-tabs surface when the current route is anywhere inside
// that workspace (parent href or any child href matches).
function isSectionActive(item: GardenNavItem, pathname: string, tabQuery: string | null): boolean {
  if (computeActive(item.href, pathname, tabQuery)) return true;
  return (item.children ?? []).some((c) => computeActive(c.href, pathname, tabQuery));
}

function FlowerSVG({ fill, size = 40 }: { fill: string; size?: number }) {
  const c = size / 2;
  const petalOffset = size * 0.22;
  const petalRx     = size * 0.27;
  const petalRy     = size * 0.20;
  const centerR     = size * 0.28;
  const p2 = (n: number) => Math.round(n * 10000) / 10000;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      style={{ position: 'absolute', top: 0, left: 0 }}>
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const cx = p2(c + Math.cos(rad) * petalOffset);
        const cy = p2(c + Math.sin(rad) * petalOffset);
        return (
          <ellipse key={i} cx={cx} cy={cy} rx={p2(petalRx)} ry={p2(petalRy)}
            transform={`rotate(${deg} ${cx} ${cy})`} fill={fill} />
        );
      })}
      <circle cx={c} cy={c} r={p2(centerR)} fill={fill} />
    </svg>
  );
}

function FlowerIconBox({ active, children }: { active: boolean; children: React.ReactNode }) {
  const fill = active ? '#F63B28' : '#F8DCE5';
  const size = 40;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FlowerSVG fill={fill} size={size} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function SectionFlower() {
  return (
    <div style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
      <FlowerSVG fill="#F63B28" size={14} />
    </div>
  );
}

function iconFor(iconKey: string, color: string, size: number) {
  switch (iconKey) {
    case 'fountain':     return <FountainIcon size={size} color={color} />;
    case 'shoppingbag':  return <ShoppingBagIcon size={size} color={color} />;
    case 'packageplus':  return <PackagePlus size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'refreshcw':    return <RefreshCw   size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'search':       return <Search      size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'layers':       return <Layers      size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'store':        return <Store       size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'truck':        return <Truck       size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'keyround':     return <KeyRound    size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'filetext':     return <FileText    size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'shoppingcart': return <ShoppingCart size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'link2':        return <Link2        size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'messagecircle': return <MessageCircle size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'creditcard':   return <CreditCard   size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'workflow':     return <Workflow     size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'palette':      return <Palette      size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'package':      return <Package      size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'images':       return <Images       size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'chart':        return <BarChart3    size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'sprout':       return <Sprout       size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    case 'settings':     return <Settings     size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
    default:             return <Search       size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
  }
}

function NavIcon({ iconKey, active }: { iconKey: string; active: boolean }) {
  const color = active ? '#fff' : '#c0687a';
  return <FlowerIconBox active={active}>{iconFor(iconKey, color, 15)}</FlowerIconBox>;
}

function SectionLine() {
  return (
    <div style={{ height: 1, background: '#FFB3CE', margin: '8px 4px 5px', borderRadius: 99, opacity: 0.6 }} />
  );
}

// ── Nav badge pill ─────────────────────────────────────────────────────────────
function NavBadge({ count, active }: { count: number; active: boolean }) {
  if (count === 0) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 900, minWidth: 18, height: 18,
      padding: '0 5px', borderRadius: 99,
      background: active ? 'rgba(255,255,255,0.25)' : '#F63B28',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ── Child sub-tab row (indented, no flower box — visually subordinate) ──────
function SubTab({ child, active }: { child: GardenNavChild; active: boolean }) {
  return (
    <Link
      href={child.href}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '2px 0 2px 30px',
        borderRadius: 9, padding: '7px 10px',
        fontSize: 13, fontWeight: active ? 700 : 500,
        background: active ? '#FFF0F5' : 'transparent',
        color: active ? '#F63B28' : '#6A5560',
        textDecoration: 'none',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#FFF6FA'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: 99, flexShrink: 0,
        background: active ? '#F63B28' : '#E7B7C6',
      }} />
      {iconFor(child.icon, active ? '#F63B28' : '#B78598', 13)}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.ko}</span>
    </Link>
  );
}

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get('tab');

  const { counts: sideStats } = useSidebarStats();

  const getBadgeCount = (key: BadgeKey | undefined): number => {
    if (!sideStats || !key) return 0;
    if (key === 'sourcing') return sideStats.sourcingCount;
    if (key === 'zombie')   return sideStats.zombieCount;
    if (key === 'orders')   return sideStats.ordersCount;
    if (key === 'draft')    return sideStats.draftCount;
    if (key === 'oos')      return sideStats.oosCount;
    return 0;
  };

  return (
    <aside
      style={{
        width: 228,
        flexShrink: 0,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRight: '3px solid #F63B28',
        paddingBottom: 40,
      }}
    >
      {/* ── Brand header ── */}
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          background: '#F63B28',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 42, height: 42,
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.40)',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src="/kkotium-symbol-white.svg" alt="KKOTIUM" width={42} height={42} style={{ objectFit: "contain", width: "100%", height: "100%" }} /></div>
        <div style={{ lineHeight: 1.2 }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: "'Arial Black', Impact, sans-serif", letterSpacing: '-0.5px', margin: 0 }}>
            {gardenNav.brand.primary}
          </p>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#FFB3CE', letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0, marginTop: 2 }}>
            {gardenNav.brand.secondary}
          </p>
        </div>
      </Link>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {gardenNav.sections.map((section, si) => (
          <div key={section.key}>
            {si > 0 && <SectionLine />}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 12px',
                marginBottom: 4,
              }}
            >
              <SectionFlower />
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#F63B28',
                  letterSpacing: '0.02em',
                  margin: 0,
                }}
              >
                {section.label}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map((item) => {
                const active     = computeActive(item.href, pathname, tabQuery);
                const badgeCount = getBadgeCount(item.badgeKey);
                const sectionActive = isSectionActive(item, pathname, tabQuery);
                const hasChildren = !!item.children?.length;
                return (
                  <div key={item.key}>
                    <Link
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 12,
                        padding: '9px 12px',
                        fontSize: 14,
                        fontWeight: 500,
                        background: active ? '#F63B28' : 'transparent',
                        color: active ? '#fff' : '#3A3A3A',
                        textDecoration: 'none',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#FFF0F5'; (e.currentTarget as HTMLElement).style.color = '#F63B28'; } }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#3A3A3A'; } }}
                    >
                      <NavIcon iconKey={item.icon} active={active} />
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                          {item.ko}
                        </span>
                        {item.sub && (
                          <span style={{
                            fontSize: 10, fontWeight: 500, lineHeight: 1.1,
                            color: active ? 'rgba(255,255,255,0.75)' : '#B0A0A8',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {item.sub}
                          </span>
                        )}
                      </span>
                      {badgeCount > 0 && <NavBadge count={badgeCount} active={active} />}
                      {active && badgeCount === 0 && !hasChildren && (
                        <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.65)', marginLeft: 'auto' }} />
                      )}
                    </Link>

                    {/* Merged workspace sub-tabs — surface only when the section
                        is active (progressive disclosure, #233 §3B). */}
                    {hasChildren && sectionActive && (
                      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2, marginBottom: 4 }}>
                        {item.children!.map((child) => (
                          <SubTab
                            key={child.key}
                            child={child}
                            active={computeActive(child.href, pathname, tabQuery)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

// Suspense wrapper required because SidebarInner uses useSearchParams
// (Next.js 14: any client component using useSearchParams must be inside <Suspense>)
export default function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarInner />
    </Suspense>
  );
}
