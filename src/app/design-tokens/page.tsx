// Design tokens preview — v6 Retro Pop Garden Fantasy catalog.
// Dev-only route, intentionally not linked in Sidebar. Visit
// /design-tokens to verify token rendering before migrating real screens.

"use client";

import {
  ScallopCard,
  StickerBadge,
  PopButton,
} from "@/components/shell";
import { Sprout, Sparkles, Search, ShoppingCart } from "lucide-react";

const SWATCHES: { name: string; varName: string; hex: string }[] = [
  { name: "cream-50", varName: "--gp-cream-50", hex: "#FAF8F3" },
  { name: "cream-100", varName: "--gp-cream-100", hex: "#F5F1E8" },
  { name: "red-500", varName: "--gp-red-500", hex: "#E62310" },
  { name: "red-600", varName: "--gp-red-600", hex: "#C41A0B" },
  { name: "pink-50", varName: "--gp-pink-50", hex: "#FFF5F8" },
  { name: "pink-100", varName: "--gp-pink-100", hex: "#FFE0EC" },
  { name: "pink-200", varName: "--gp-pink-200", hex: "#FFCCEA" },
  { name: "pink-300", varName: "--gp-pink-300", hex: "#FFB3CE" },
  { name: "green-100", varName: "--gp-green-100", hex: "#B5E0AC" },
  { name: "green-500", varName: "--gp-green-500", hex: "#4CAF50" },
  { name: "ink-900", varName: "--gp-ink-900", hex: "#1A1A1A" },
  { name: "ink-500", varName: "--gp-ink-500", hex: "#6B6B6B" },
];

export default function DesignTokensPage() {
  return (
    <div
      style={{
        padding: "var(--space-8)",
        background: "var(--color-bg)",
        minHeight: "100vh",
        color: "var(--color-text)",
      }}
    >
      <header style={{ marginBottom: "var(--space-8)" }}>
        <p
          className="gp-label-serif-italic"
          style={{ fontSize: 13, color: "var(--gp-red-500)", margin: 0 }}
        >
          kkotium garden / design tokens
        </p>
        <h1 className="gp-display" style={{ margin: "4px 0 0", color: "var(--gp-ink-900)" }}>
          Retro Pop Garden Fantasy v6
        </h1>
        <p className="gp-caption" style={{ marginTop: 6 }}>
          크림 #FAF8F3 / 레드 #E62310 / 핑크 파스텔 / 정원 그린 · 스캘롭 + 스티커 토큰
        </p>
      </header>

      {/* Swatches */}
      <section style={{ marginBottom: "var(--space-12)" }}>
        <h2 className="gp-h2" style={{ marginBottom: "var(--space-4)" }}>
          Palette
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {SWATCHES.map((s) => (
            <div
              key={s.name}
              className="gp-card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div
                style={{
                  height: 72,
                  background: `var(${s.varName})`,
                  borderBottom: "1px solid var(--color-border)",
                }}
              />
              <div style={{ padding: "10px 12px" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{s.name}</p>
                <p
                  className="gp-caption"
                  style={{ margin: "2px 0 0", fontFamily: "monospace" }}
                >
                  {s.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cards */}
      <section style={{ marginBottom: "var(--space-12)" }}>
        <h2 className="gp-h2" style={{ marginBottom: "var(--space-4)" }}>
          Cards — flat + scallop variants
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          <ScallopCard>
            <p className="gp-label-serif-italic" style={{ margin: 0, fontSize: 12, color: "var(--gp-red-500)" }}>
              garden card / default
            </p>
            <h3 className="gp-h3" style={{ margin: "6px 0 8px" }}>오늘의 정원</h3>
            <p className="gp-body" style={{ margin: 0, color: "var(--color-text-muted)" }}>
              평범한 카드 — 흰 표면, 핑크 보더, 12px 반경.
            </p>
          </ScallopCard>

          <ScallopCard scallop>
            <p className="gp-label-serif-italic" style={{ margin: 0, fontSize: 12, color: "var(--gp-red-500)" }}>
              garden card / scallop
            </p>
            <h3 className="gp-h3" style={{ margin: "6px 0 8px" }}>물결 카드</h3>
            <p className="gp-body" style={{ margin: 0, color: "var(--color-text-muted)" }}>
              상단 스캘롭 엣지 — 레트로 팝 무드. 직사각 단조로움 해소.
            </p>
          </ScallopCard>

          <ScallopCard tone="subtle">
            <p className="gp-label-serif-italic" style={{ margin: 0, fontSize: 12, color: "var(--gp-red-500)" }}>
              garden card / subtle
            </p>
            <h3 className="gp-h3" style={{ margin: "6px 0 8px" }}>핑크 표면 카드</h3>
            <p className="gp-body" style={{ margin: 0, color: "var(--color-text-muted)" }}>
              연한 핑크 표면 — 빈상태 / 보조 정보용.
            </p>
          </ScallopCard>
        </div>
      </section>

      {/* Sticker badges */}
      <section style={{ marginBottom: "var(--space-12)" }}>
        <h2 className="gp-h2" style={{ marginBottom: "var(--space-4)" }}>
          Sticker badges — 아날로그 레트로
        </h2>
        <ScallopCard>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <StickerBadge tone="pink">신상 가산 D+3</StickerBadge>
            <StickerBadge tone="red">발행 차단</StickerBadge>
            <StickerBadge tone="green">SEO 100점</StickerBadge>
            <StickerBadge tone="ink">DRAFT</StickerBadge>
            <StickerBadge tone="pink" size="sm">12</StickerBadge>
            <StickerBadge tone="red" size="sm">99+</StickerBadge>
          </div>
        </ScallopCard>
      </section>

      {/* Buttons */}
      <section style={{ marginBottom: "var(--space-12)" }}>
        <h2 className="gp-h2" style={{ marginBottom: "var(--space-4)" }}>
          Pop buttons — 행동 10% 액센트
        </h2>
        <ScallopCard>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <PopButton leftIcon={<Sparkles size={16} />}>네이버 발행</PopButton>
            <PopButton variant="secondary" leftIcon={<Search size={16} />}>
              씨앗 심기
            </PopButton>
            <PopButton variant="secondary" leftIcon={<ShoppingCart size={16} />}>
              주문 보기
            </PopButton>
          </div>
        </ScallopCard>
      </section>

      {/* Typography */}
      <section style={{ marginBottom: "var(--space-12)" }}>
        <h2 className="gp-h2" style={{ marginBottom: "var(--space-4)" }}>
          Typography — Pretendard + serif italic
        </h2>
        <ScallopCard>
          <p className="gp-display" style={{ margin: 0 }}>Display 32 · 꽃틔움 가든</p>
          <p className="gp-h1" style={{ margin: "8px 0 0" }}>H1 24 · 오늘 흘러든 물</p>
          <p className="gp-h2" style={{ margin: "8px 0 0" }}>H2 20 · 화단 일지</p>
          <p className="gp-h3" style={{ margin: "8px 0 0" }}>H3 16 · 카드 제목</p>
          <p className="gp-body" style={{ margin: "8px 0 0" }}>Body 14 · 본문 텍스트는 한글 word-break keep-all 적용으로 어절 단위 줄바꿈.</p>
          <p className="gp-caption" style={{ margin: "8px 0 0" }}>Caption 12 · 보조 설명</p>
          <p
            className="gp-label-serif-italic"
            style={{ margin: "12px 0 0", fontSize: 18, color: "var(--gp-red-500)" }}
          >
            italic serif label · garden · atelier · sprout
          </p>
        </ScallopCard>
      </section>

      {/* Scallop divider */}
      <section style={{ marginBottom: "var(--space-12)" }}>
        <h2 className="gp-h2" style={{ marginBottom: "var(--space-4)" }}>
          Scallop divider
        </h2>
        <ScallopCard>
          <p className="gp-body" style={{ margin: 0 }}>섹션 위쪽</p>
          <div className="gp-scallop-divider" style={{ margin: "16px 0" }} aria-hidden />
          <p className="gp-body" style={{ margin: 0 }}>섹션 아래쪽</p>
        </ScallopCard>
      </section>

      {/* Mascot slot preview */}
      <section>
        <h2 className="gp-h2" style={{ marginBottom: "var(--space-4)" }}>
          Mascot slot (꼬띠 placeholder)
        </h2>
        <ScallopCard scallop tone="subtle">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              className="gp-sticker"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--gp-pink-100)",
              }}
            >
              <Sprout size={28} color="var(--gp-red-500)" strokeWidth={2.25} />
            </span>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>꼬띠 튤립 마스코트</p>
              <p className="gp-caption" style={{ margin: "2px 0 0" }}>
                Claude Design 커넥터 정상화 시 최종 일러스트로 교체 — mascot prop slot.
              </p>
            </div>
          </div>
        </ScallopCard>
      </section>
    </div>
  );
}
