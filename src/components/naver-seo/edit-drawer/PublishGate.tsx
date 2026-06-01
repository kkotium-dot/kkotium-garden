// PublishGate — surface the existing publish-readiness endpoint inside the
// drawer so sellers see *why* a product can or can't ship without leaving
// the edit context. Per Phase 2-A-3 scope rule: NO API creation. Consumes
// GET /api/products/:id/publish-readiness which already returns the
// fields(19) / authenticity / naverPayload(7) verdicts.
//
// ★비가역 0 — the Publish PopButton at the bottom of the gate is a UX gate
// only. Clicking opens a *confirmation* preview; it does NOT call the Naver
// commerce API. Real publish remains a separate, explicitly user-triggered
// action.

import { useEffect, useState, useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Send, Loader2 } from "lucide-react";
import { PopButton, ScallopCard, StickerBadge } from "@/components/shell";
import { seoDrawerCopy } from "@/lib/i18n/seo-drawer";
import type { PublishReadinessResult } from "@/lib/automation/publish-readiness";
import ImageGuide from "./ImageGuide";

export interface PublishGateProps {
  productId: string;
  /** Used by ImageGuide to recommend N more images for +M points. */
  imageCount?: number;
  imageScore?: number;
  /** Trigger when the user clicks the "Publish" PopButton. Parent should
   *  open a confirmation modal (no Naver API call per #46 / SOP rule). */
  onPublishIntent?: () => void;
  /** External refresh signal — increment to re-fetch readiness after save. */
  refreshKey?: number;
}

type GateState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; result: PublishReadinessResult };

// Friendly Korean labels for the 19 field checks. Keys must exactly match
// PublishReadinessResult.fields keys. Kept here so the i18n JSON doesn't
// have to duplicate the schema; the labels are short technical descriptors.
const FIELD_LABELS_KO: Record<string, string> = {
  seoTitle: "SEO 제목",
  naver_title: "네이버 발행 상품명",
  naver_keywords: "네이버 키워드",
  naver_description: "네이버 짧은 설명",
  keywords: "키워드 배열",
  targetKeywords: "타겟 키워드",
  golden_keyword_score: "골든 점수",
  detail_image_url: "상세 이미지",
  main_image_url: "대표 이미지",
  optionName: "옵션명",
  hasOptions: "옵션 사용",
  options: "옵션 데이터",
  shipping_template_id: "배송 템플릿",
  carrier_code: "택배사 코드",
  sku: "SKU",
  brand: "브랜드",
  naverCategoryCode: "네이버 카테고리",
  originCode: "원산지 코드",
  margin: "마진",
};

const PAYLOAD_LABELS_KO: Record<string, string> = {
  naver_origin: "원산지",
  naver_manufacturer: "제조사",
  naver_as_info: "A/S 안내",
  naver_tax_type: "과세 구분",
  naver_delivery_info: "배송 안내",
  naver_exchange_info: "교환 안내",
  naver_refund_info: "환불 안내",
};

interface AxisSummary {
  key: string;
  label: string;
  passed: number;
  total: number;
  ok: boolean;
  detail: ReadonlyArray<{ key: string; label: string; ok: boolean }>;
}

function buildAxes(result: PublishReadinessResult): AxisSummary[] {
  const c = seoDrawerCopy.publish;
  const fieldEntries = Object.entries(result.fields);
  const payloadEntries = Object.entries(result.naverPayload);
  const fieldsPassed = fieldEntries.filter(([, v]) => v).length;
  const payloadPassed = payloadEntries.filter(([, v]) => v).length;
  const statusOk = result.status === "DRAFT" && result.naverProductId === null;
  return [
    {
      key: "fields",
      label: c.axisFields,
      passed: fieldsPassed,
      total: fieldEntries.length,
      ok: result.fieldsAllSet,
      detail: fieldEntries.map(([k, v]) => ({
        key: k,
        label: FIELD_LABELS_KO[k] ?? k,
        ok: v,
      })),
    },
    {
      key: "authentic",
      label: c.axisAuthentic,
      passed: result.authentic ? 1 : 0,
      total: 1,
      ok: result.authentic,
      detail: result.authenticityViolations.map((v, i) => ({
        key: `${v.field}-${i}`,
        label: `${v.field}: ${v.type} — ${v.evidence.slice(0, 30)}`,
        ok: false,
      })),
    },
    {
      key: "payload",
      label: c.axisPayload,
      passed: payloadPassed,
      total: payloadEntries.length,
      ok: result.naverPayloadComplete,
      detail: payloadEntries.map(([k, v]) => ({
        key: k,
        label: PAYLOAD_LABELS_KO[k] ?? k,
        ok: v,
      })),
    },
    {
      key: "status",
      label: c.axisStatus,
      passed: statusOk ? 1 : 0,
      total: 1,
      ok: statusOk,
      detail: [
        {
          key: "draft",
          label: statusOk ? c.statusDraftReady : c.statusAlreadyPublished,
          ok: statusOk,
        },
      ],
    },
  ];
}

function CompletenessRing({
  percent,
  ready,
}: {
  percent: number;
  ready: boolean;
}) {
  const r = 30;
  const C = 2 * Math.PI * r;
  const dash = (percent / 100) * C;
  const color = ready ? "var(--gp-green-500)" : percent >= 60 ? "var(--gp-pink-400)" : "var(--gp-red-500)";
  return (
    <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--gp-pink-100)" strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dasharray 0.3s ease, stroke 0.2s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontWeight: 800,
          color: "var(--gp-ink-900)",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {percent}
        </span>
        <span style={{ fontSize: 10, color: "var(--gp-ink-500)" }}>/100</span>
      </div>
    </div>
  );
}

function AxisRow({ axis }: { axis: AxisSummary }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = axis.ok ? CheckCircle2 : axis.passed > 0 ? AlertTriangle : XCircle;
  const tone: "green" | "pink" | "red" = axis.ok
    ? "green"
    : axis.passed > 0
      ? "pink"
      : "red";
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          background: "transparent",
          border: "1.5px solid var(--color-border)",
          borderRadius: 10,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Icon
          size={18}
          color={
            tone === "green"
              ? "var(--gp-green-500)"
              : tone === "pink"
                ? "var(--gp-pink-400)"
                : "var(--gp-red-500)"
          }
          strokeWidth={2.5}
        />
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{axis.label}</span>
        <StickerBadge tone={tone} size="sm">
          {axis.passed}/{axis.total}
        </StickerBadge>
      </button>
      {expanded && axis.detail.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: "6px 0 0",
            padding: "4px 0 4px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {axis.detail.map((d) => (
            <li
              key={d.key}
              style={{
                fontSize: 12,
                color: d.ok ? "var(--gp-ink-500)" : "var(--gp-red-600)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                wordBreak: "keep-all",
              }}
            >
              {d.ok ? (
                <CheckCircle2 size={11} color="var(--gp-green-500)" strokeWidth={2.5} />
              ) : (
                <XCircle size={11} color="var(--gp-red-500)" strokeWidth={2.5} />
              )}
              <span>{d.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PublishGate({
  productId,
  imageCount,
  imageScore,
  onPublishIntent,
  refreshKey = 0,
}: PublishGateProps) {
  const c = seoDrawerCopy.publish;
  const [state, setState] = useState<GateState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/products/${productId}/publish-readiness`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || json?.ok === false) {
          setState({
            kind: "error",
            message: json?.error ?? `HTTP ${res.status}`,
          });
        } else {
          setState({ kind: "ok", result: json as PublishReadinessResult });
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "network",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, refreshKey]);

  const axes = useMemo(
    () => (state.kind === "ok" ? buildAxes(state.result) : []),
    [state],
  );

  const { percent, ready } = useMemo(() => {
    if (state.kind !== "ok") return { percent: 0, ready: false };
    const total = axes.reduce((s, a) => s + a.total, 0);
    const passed = axes.reduce((s, a) => s + a.passed, 0);
    return {
      percent: total === 0 ? 0 : Math.round((passed / total) * 100),
      ready: state.result.publishReady,
    };
  }, [state, axes]);

  if (state.kind === "loading") {
    return (
      <ScallopCard scallop style={{ padding: 18 }}>
        <Header />
        <p style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gp-ink-500)", margin: 0 }}>
          <Loader2 size={14} className="animate-spin" /> {c.loading}
        </p>
      </ScallopCard>
    );
  }

  if (state.kind === "error") {
    return (
      <ScallopCard scallop style={{ padding: 18 }}>
        <Header />
        <p style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gp-red-600)", margin: 0 }}>
          <XCircle size={14} /> {c.error} — {state.message.slice(0, 80)}
        </p>
      </ScallopCard>
    );
  }

  return (
    <ScallopCard scallop tone="subtle" style={{ padding: 18 }}>
      <Header />

      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <CompletenessRing percent={percent} ready={ready} />
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              color: ready ? "var(--gp-green-700)" : "var(--gp-ink-900)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {ready ? c.summaryReady : c.summaryBlocked}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--gp-ink-500)",
              wordBreak: "keep-all",
            }}
          >
            {ready ? c.summaryReadyHint : c.summaryBlockedHint}
          </p>
        </div>
      </div>

      {/* Axis checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {axes.map((a) => (
          <AxisRow key={a.key} axis={a} />
        ))}
      </div>

      {/* Image guide */}
      {typeof imageCount === "number" && (
        <ImageGuide imageCount={imageCount} imageScore={imageScore} />
      )}

      {/* Publish PopButton — intentionally never calls Naver directly */}
      <div
        style={{
          marginTop: 14,
          padding: "12px",
          borderRadius: 10,
          background: "var(--color-surface)",
          border: "1px dashed var(--color-border-strong)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <PopButton
          variant="primary"
          onClick={onPublishIntent}
          disabled={!ready}
          type="button"
          leftIcon={<Send size={14} />}
        >
          {ready ? c.publishBtn : c.publishBtnBlocked}
        </PopButton>
        <span
          style={{
            fontSize: 11,
            color: "var(--gp-ink-500)",
            flex: 1,
            wordBreak: "keep-all",
            lineHeight: 1.5,
          }}
        >
          {c.publishCaveat}
        </span>
      </div>
    </ScallopCard>
  );
}

function Header() {
  const c = seoDrawerCopy.publish;
  return (
    <header style={{ marginBottom: 12 }}>
      <p
        className="gp-label-serif-italic"
        style={{ fontSize: 11, color: "var(--gp-red-500)", margin: 0 }}
      >
        publish gate
      </p>
      <h3
        className="gp-h3"
        style={{
          margin: "2px 0 0",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ShieldCheck size={14} color="var(--gp-red-500)" strokeWidth={2.5} />
        {c.title}
      </h3>
    </header>
  );
}
