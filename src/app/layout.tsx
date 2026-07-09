import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// #132 brand DISPLAY font — Cafe24 Ssurround (free for commercial use, Cafe24
// official). Self-hosted via next/font/local for Vercel reliability (no CDN
// runtime dependency) + automatic CLS-safe fallback metrics. Exposes the
// `--font-brand` CSS variable (the Tailwind `display` token reads it). BODY/
// DATA stay Pretendard — this face is applied to titles/headings only.
// NOTE: the variable is `--font-brand`, NOT `--font-display`: the latter is
// already owned by the published detail-page preset renderer (Noto Serif KR,
// globals.css). Reusing it would regress published product detail pages.
const cafe24Ssurround = localFont({
  src: "./fonts/Cafe24Ssurround.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-brand",
  fallback: ["Pretendard", "-apple-system", "sans-serif"],
});
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import ToastProvider from "@/components/providers/ToastProvider";

export const metadata: Metadata = {
  title: "꽃틔움 가든 - 상품 관리 시스템",
  description: "네이버 스마트스토어 상품 관리 및 AI 최적화 시스템",
};

// Phase 2-MOBILE-1: enable mobile viewport so the layout follows the device
// width instead of defaulting to a desktop fallback. maximumScale=5 keeps
// the page zoom-friendly per WCAG 1.4.4.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the pre-paint script sets data-decor / data-palette
    // on <html> before hydration (from localStorage) — intended theme-flash pattern.
    <html lang="ko" className={cafe24Ssurround.variable} suppressHydrationWarning>
      <head>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Noto Serif KR = concept-preset display font (--font-display). Used by
            the detail-page preset renderer only; body stays Pretendard. */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600&display=swap" rel="stylesheet" />
        {/* DASHBOARD-SHELL Phase 2 — Claude Design concept faces (docs §2).
            Caprasimo/Black Han Sans = display (titles/KPI numbers), Gowun Dodum
            = body (가독). Loaded via the same Google Fonts <link> pattern the
            shell already uses; consumed through --font-pop-display / --font-read. */}
        <link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Black+Han+Sans&family=Gowun+Dodum&display=swap" rel="stylesheet" />
        {/* Phase 3 (#217): apply saved view prefs (장식강도 / 팔레트) BEFORE first
            paint so a non-default choice does not flash. Defaults (calm / brand)
            leave the attributes unset = CSS default. See ShellControls.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var e=document.documentElement,d=localStorage.getItem('kk-decor'),p=localStorage.getItem('kk-palette');if(d&&d!=='calm')e.setAttribute('data-decor',d);if(p&&p!=='brand')e.setAttribute('data-palette',p);}catch(_){}})();",
          }}
        />
      </head>
      <body
        className="font-pretendard antialiased"
        style={{
          // DASHBOARD-SHELL Phase 2b (#220/#221): Gowun Dodum body (가독) + brand
          // pink-wash canvas (structure stays pink-red — no 3rd structural color).
          fontFamily: 'var(--font-read)',
          background:
            'radial-gradient(1100px 760px at 12% -8%, var(--brand-pink-soft), transparent 60%),' +
            'var(--brand-pink-wash)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        }}
      >
        <ToastProvider />

        {/* Phase 2-MOBILE-1: Sidebar hidden under lg (≤1023px), MobileTabBar
            shown instead. Desktop layout unchanged.
            S2-A (#141): the shell tree is bounded to the viewport (h-screen +
            overflow:hidden) so <main> becomes the single scroll container.
            This lets fixed-viewport workspaces (the atelier) flex-fill with
            height:100% instead of a calc(100vh - 매직넘버) — no magic number to
            drift when the header/footer height changes. Normal pages still
            scroll inside <main>. Footer (SD-01) untouched. */}
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <div className="hidden lg:flex">
            <Sidebar />
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <Header />
            <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'transparent', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div
                className="px-4 lg:px-8 pt-6 pb-20 lg:pb-8"
                style={{ flex: 1, minWidth: 0 }}
              >
                {children}
              </div>
              {/* ── Appreciation footer — always at true bottom regardless of content height ── */}
              <footer style={{
                background: '#e8527a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 24px',
                gap: 12,
                minHeight: 32,
                marginTop: 'auto',
                position: 'relative',
                flexShrink: 0,
              }}>
                <div style={{ position: 'absolute', top: -14, left: 0, right: 0, lineHeight: 0, pointerEvents: 'none' }}>
                  <svg viewBox="0 0 1440 14" xmlns="http://www.w3.org/2000/svg"
                    style={{ display: 'block', width: '100%', height: 14 }} preserveAspectRatio="none">
                    <path d="M0,7 C60,0 120,14 180,7 C240,0 300,14 360,7 C420,0 480,14 540,7 C600,0 660,14 720,7 C780,0 840,14 900,7 C960,0 1020,14 1080,7 C1140,0 1200,14 1260,7 C1320,0 1380,14 1440,7 L1440,14 L0,14 Z"
                      fill="#e8527a" />
                  </svg>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>✿</span>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0,
                  direction: 'rtl', letterSpacing: '0.01em' }}>
                  شكراً لحبيبي ياسر على مساعدتي في تطوير تطبيقي الأول
                </p>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>✿</span>
              </footer>
            </main>
          </div>
        </div>
        {/* Phase 2-MOBILE-1: fixed bottom tab bar — only renders under lg. */}
        <MobileTabBar />
      </body>
    </html>
  );
}
