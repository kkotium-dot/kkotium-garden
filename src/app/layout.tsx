import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import ToastProvider from "@/components/providers/ToastProvider";

export const metadata: Metadata = {
  title: "꽃티움가든 - 상품 관리 시스템",
  description: "네이버 스마트스토어 상품 관리 및 AI 최적화 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className="font-pretendard antialiased"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 50%, #fff0f5 75%, #ffd6e8 100%)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        }}
      >
        <ToastProvider />

        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header />
            <main style={{ flex: 1, overflowY: 'auto', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px 32px', paddingBottom: 32, flex: 1 }}>
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
      </body>
    </html>
  );
}
