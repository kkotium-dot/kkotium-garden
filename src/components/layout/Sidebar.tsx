'use client';
// Sidebar — KKOTIUM v10 (SWR realtime, 2026-05-03 옵션 C)
// - 5 badges (sourcing/zombie/orders/draft/oos) backed by useSWR
// - 60s refreshInterval + revalidateOnFocus for live updates

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
  Package, PackagePlus, RefreshCw,
  Search, Layers, Store, Truck,
  KeyRound, FileText, ShoppingCart,
  ChevronRight, MessageCircle, CreditCard,
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

// Nav item type extended with optional badge key
interface NavItem {
  href: string;
  label: string;
  iconKey: string;
  badgeKey?: 'sourcing' | 'zombie' | 'orders' | 'draft' | 'oos';
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'GARDEN',
    items: [{ href: '/dashboard', label: '정원 일지', iconKey: 'fountain' }],
  },
  {
    label: 'HUNT',
    items: [
      { href: '/crawl', label: '꿀통 사냥터', iconKey: 'layers', badgeKey: 'sourcing' },
    ],
  },
  {
    label: 'PLANT',
    items: [
      { href: '/products/new', label: '씨앗 심기', iconKey: 'packageplus' },
    ],
  },
  {
    label: 'TEND',
    items: [
      { href: '/products',              label: '정원 창고',   iconKey: 'shoppingbag', badgeKey: 'draft' },
      { href: '/naver-seo',             label: '검색 조련사', iconKey: 'search' },
      { href: '/products/reactivation', label: '좀비 부활소', iconKey: 'refreshcw', badgeKey: 'zombie' },
    ],
  },
  {
    label: 'ORDERS',
    items: [
      { href: '/orders', label: '주문 관리', iconKey: 'shoppingcart', badgeKey: 'orders' },
    ],
  },
  {
    label: 'OPS',
    items: [
      { href: '/ops/insert-card', label: '인서트 카드', iconKey: 'creditcard' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { href: '/settings/suppliers',       label: '거래처 명단',   iconKey: 'store' },
      { href: '/settings/shipping',       label: '배송 레시피',   iconKey: 'truck' },
      { href: '/settings/supplier-login', label: '공급사 열쇠방', iconKey: 'keyround' },
      { href: '/settings/kakao',          label: '카카오 채널',   iconKey: 'messagecircle' },
      { href: '/naver-settings',          label: '네이버 기본값', iconKey: 'filetext' },
    ],
  },
];

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
  const fill = active ? '#e62310' : '#F8DCE5';
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
      <FlowerSVG fill="#e62310" size={14} />
    </div>
  );
}

function NavIcon({ iconKey, active }: { iconKey: string; active: boolean }) {
  const color = active ? '#fff' : '#c0687a';
  const size = 15;
  let icon;
  switch (iconKey) {
    case 'fountain':    icon = <FountainIcon size={size} color={color} />; break;
    case 'shoppingbag': icon = <ShoppingBagIcon size={size} color={color} />; break;
    case 'packageplus': icon = <PackagePlus size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'refreshcw':   icon = <RefreshCw   size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'search':      icon = <Search      size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'layers':      icon = <Layers      size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'store':       icon = <Store       size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'truck':       icon = <Truck       size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'keyround':    icon = <KeyRound    size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'filetext':    icon = <FileText    size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'shoppingcart': icon = <ShoppingCart size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'messagecircle': icon = <MessageCircle size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    case 'creditcard':   icon = <CreditCard   size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />; break;
    default:            icon = <Search      size={size} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />;
  }
  return <FlowerIconBox active={active}>{icon}</FlowerIconBox>;
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
      background: active ? 'rgba(255,255,255,0.25)' : '#e62310',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

// SWR fetcher — returns parsed JSON from the dashboard stats API
const statsFetcher = (url: string) => fetch(url).then(r => r.json());

export default function Sidebar() {
  const pathname = usePathname();

  // SWR with 60s polling + revalidate on focus (탭 전환·창 복귀 시 즉시 갱신)
  // — replaces single-shot useEffect/useState pattern (옵션 C, 2026-05-03)
  const { data: statsResp } = useSWR(
    '/api/dashboard/stats?period=all',
    statsFetcher,
    {
      refreshInterval: 60_000,    // poll every 60s
      revalidateOnFocus: true,    // refetch when user switches back to the tab
      dedupingInterval: 10_000,   // suppress duplicate fetches within 10s
      keepPreviousData: true,     // avoid badge flicker on revalidation
    },
  );

  const sideStats = statsResp?.success && statsResp?.data?.summary
    ? {
        sourcingCount: statsResp.data.summary.sourcingCount       ?? 0,
        zombieCount:   statsResp.data.summary.zombieCount         ?? 0,
        ordersCount:   statsResp.data.summary.todayOrderCount     ?? 0,
        draftCount:    statsResp.data.summary.draftProducts       ?? 0,
        oosCount:      statsResp.data.summary.outOfStockProducts  ?? 0,
      }
    : null;

  const getBadgeCount = (key: NavItem['badgeKey']): number => {
    if (!sideStats) return 0;
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
        borderRight: '3px solid #e62310',
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
          background: '#e62310',
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
            KKOTIUM
          </p>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#FFB3CE', letterSpacing: '0.28em', textTransform: 'uppercase', margin: 0, marginTop: 2 }}>
            GARDEN
          </p>
        </div>
      </Link>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {NAV.map((section, si) => (
          <div key={section.label}>
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
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#e62310',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontFamily: "'Arial Black', Impact, sans-serif",
                  margin: 0,
                }}
              >
                {section.label}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map(({ href, label, iconKey, badgeKey }) => {
                const active     = pathname === href;
                const badgeCount = badgeKey ? getBadgeCount(badgeKey) : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderRadius: 12,
                      padding: '10px 12px',
                      fontSize: 14,
                      fontWeight: 500,
                      background: active ? '#e62310' : 'transparent',
                      color: active ? '#fff' : '#3A3A3A',
                      textDecoration: 'none',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#FFF0F5'; (e.currentTarget as HTMLElement).style.color = '#e62310'; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#3A3A3A'; } }}
                  >
                    <NavIcon iconKey={iconKey} active={active} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    {badgeCount > 0 && <NavBadge count={badgeCount} active={active} />}
                    {active && badgeCount === 0 && <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.65)', marginLeft: 'auto' }} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Today stats section removed per P3-A — KPI data visible on dashboard ── */}
    </aside>
  );
}
