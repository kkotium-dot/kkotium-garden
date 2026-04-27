// src/components/dashboard/ReviewGrowthWidget.tsx
// E-2A: Review growth tracker + 9-item operations checklist
// Target: 20-25% review writing rate
// Stages: 1 (0-10), 2 (11-50), 3 (51+)
// Naver review API not supported (GitHub #1582) — manual review count only

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare, Star, TrendingUp, Target, RefreshCw,
  CheckCircle2, Circle, Edit3, Save, ExternalLink, Info, Zap,
} from 'lucide-react';

interface ReviewData {
  totalConfirmed: number;
  monthConfirmed: number;
  deliveredCount: number;
  manualReviewCount: number;
  writingRate: number;
  targetRate: number;
  stage: { stage: number; label: string; nextGoal: number };
  checklist: Record<string, boolean>;
  checkedCount: number;
  totalChecklistItems: number;
  kakaoChannel: { id: string; name: string; email: string; publicUrl: string };
  autoDetected: string[];
  lastUpdated: string | null;
}

const CHECKLIST_ITEMS: Array<{ key: string; label: string; hint: string; phase: string }> = [
  { key: 'reviewReward',      label: '리뷰 적립금 설정',           hint: '텍스트 500원 + 포토 1,000원 권장 (E-2C 가이드)',     phase: '필수' },
  { key: 'insertCard',        label: '인서트 카드 동봉',           hint: '꼬띠 캐릭터 + 카카오 QR + 적립금 안내 카드',           phase: '필수' },
  { key: 'talktalkAutoreply', label: '톡톡 자동응답 12시간 설정',  hint: '2025.4 기준 강화 — 굿서비스 점수 직결',               phase: '필수' },
  { key: 'alimtalkConnected', label: '알림톡 자동발송 연동',       hint: '월 50건+ 시 솔라피 연동 (E-13B)',                     phase: '확장' },
  { key: 'returnCare',        label: '반품안심케어 가입',           hint: '건당 50~650원 → 매출 +13.6% (E-4 자동 감지)',        phase: '필수' },
  { key: 'monthReviewGuide',  label: '한달 사용 리뷰 안내',         hint: 'D+28~32 알림 → 동일 주문 리뷰 2건 확보',               phase: '확장' },
  { key: 'aitemsRecommend',   label: 'AiTEMS 추천 ON',             hint: '스토어관리 → 무제한 개인화 노출 (전체 클릭 약 10%)',  phase: '필수' },
  { key: 'bestReviewTop3',    label: '베스트 리뷰 3개+ 큐레이션',    hint: '상세페이지 상단 노출 → 전환율 상승',                    phase: '성장' },
  { key: 'kakaoQrExposure',   label: '카카오 채널 QR 노출',         hint: '인서트/상세페이지 → 무료 친구 자산 적립 (자동 감지)',  phase: '필수' },
];

export default function ReviewGrowthWidget() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCount, setEditingCount] = useState(false);
  const [reviewInput, setReviewInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/review-growth');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setReviewInput(String(json.data.manualReviewCount));
      }
    } catch (e) {
      console.error('[ReviewGrowth] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveReviewCount = async () => {
    const n = parseInt(reviewInput, 10);
    if (isNaN(n) || n < 0) return;
    setSaving(true);
    try {
      await fetch('/api/review-growth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualReviewCount: n }),
      });
      await loadData();
      setEditingCount(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = async (key: string, current: boolean) => {
    if (!data) return;
    if (data.autoDetected.includes(key)) return; // auto-detected items not togglable
    const next = { ...data.checklist, [key]: !current };
    setData({ ...data, checklist: next, checkedCount: Object.values(next).filter(Boolean).length });
    try {
      await fetch('/api/review-growth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewChecklist: next }),
      });
    } catch {
      // revert on error
      loadData();
    }
  };

  if (loading || !data) {
    return (
      <div className="kk-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={14} className="animate-spin" style={{ color: '#FFB3CE' }} />
          <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>리뷰 데이터 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Rate color
  const rateOk = data.writingRate >= 20;
  const rateColor = rateOk ? '#16a34a' : data.writingRate >= 10 ? '#f59e0b' : '#e62310';
  const stageColor = data.stage.stage === 3 ? '#16a34a' : data.stage.stage === 2 ? '#2563eb' : '#FF6B8A';
  const stageBg = data.stage.stage === 3 ? '#dcfce7' : data.stage.stage === 2 ? '#dbeafe' : '#FFE5EE';

  return (
    <div className="kk-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={14} style={{ color: '#FF6B8A' }} fill="#FF6B8A" />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>리뷰 성장 트래커</p>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: stageBg, color: stageColor, fontWeight: 700 }}>
            {data.stage.label} (다음 목표 {data.stage.nextGoal}개)
          </span>
        </div>
        <button onClick={loadData} style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#B0A0A8' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* 3 KPI cards */}
      <div style={{ padding: '14px 20px 10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {/* Confirmed orders */}
        <div style={{ padding: '12px 10px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <CheckCircle2 size={11} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb' }}>구매확정</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#1d4ed8', margin: 0, lineHeight: 1 }}>{data.totalConfirmed}</p>
          <p style={{ fontSize: 10, color: '#2563eb', margin: '3px 0 0', opacity: 0.7 }}>이번 달 {data.monthConfirmed}건</p>
        </div>

        {/* Manual reviews — editable */}
        <div style={{ padding: '12px 10px', borderRadius: 12, background: '#FFE5EE', border: '1px solid #FFB3CE', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <Star size={11} style={{ color: '#FF6B8A' }} fill="#FF6B8A" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#FF6B8A' }}>리뷰 수</span>
          </div>
          {editingCount ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="number"
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveReviewCount(); if (e.key === 'Escape') setEditingCount(false); }}
                autoFocus
                style={{ width: 56, padding: '4px 6px', fontSize: 16, fontWeight: 900, color: '#FF6B8A', textAlign: 'center', border: '1.5px solid #FFB3CE', borderRadius: 6, outline: 'none' }}
              />
              <button onClick={saveReviewCount} disabled={saving} style={{ padding: 4, borderRadius: 6, background: '#FF6B8A', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Save size={11} />
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#FF6B8A', margin: 0, lineHeight: 1 }}>{data.manualReviewCount}</p>
              <button
                onClick={() => { setEditingCount(true); setReviewInput(String(data.manualReviewCount)); }}
                style={{ position: 'absolute', top: 6, right: 6, padding: 2, background: 'transparent', border: 'none', cursor: 'pointer', color: '#FF6B8A', display: 'flex', alignItems: 'center' }}
                title="리뷰 수 수정 (네이버 리뷰 API 미지원으로 직접 입력)"
              >
                <Edit3 size={10} />
              </button>
              <p style={{ fontSize: 10, color: '#FF6B8A', margin: '3px 0 0', opacity: 0.7 }}>직접 입력</p>
            </>
          )}
        </div>

        {/* Writing rate */}
        <div style={{ padding: '12px 10px', borderRadius: 12, background: rateOk ? '#f0fdf4' : '#fff7ed', border: `1px solid ${rateOk ? '#86efac' : '#fed7aa'}`, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <Target size={11} style={{ color: rateColor }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: rateColor }}>작성률</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, color: rateColor, margin: 0, lineHeight: 1 }}>{data.writingRate}<span style={{ fontSize: 12 }}>%</span></p>
          <p style={{ fontSize: 10, color: rateColor, margin: '3px 0 0', opacity: 0.7 }}>목표 20~25%</p>
        </div>
      </div>

      {/* Progress bar towards next stage */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: '#666', fontWeight: 700 }}>
            <TrendingUp size={11} style={{ display: 'inline', verticalAlign: 'middle', color: stageColor, marginRight: 4 }} />
            다음 단계까지
          </span>
          <span style={{ fontSize: 11, color: stageColor, fontWeight: 700 }}>
            {data.manualReviewCount} / {data.stage.nextGoal}
          </span>
        </div>
        <div style={{ height: 8, background: '#F8DCE5', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (data.manualReviewCount / data.stage.nextGoal) * 100)}%`,
            background: `linear-gradient(90deg, ${stageColor} 0%, ${stageColor}cc 100%)`,
            borderRadius: 99,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Kakao channel chip — single source of truth */}
      {data.kakaoChannel.id && (
        <div style={{ padding: '0 20px 12px' }}>
          <a
            href={data.kakaoChannel.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 99,
              background: '#FFEB00', border: '1px solid #FCD200',
              fontSize: 11, fontWeight: 700, color: '#3A1D1D',
              textDecoration: 'none',
            }}
          >
            <Zap size={11} fill="#3A1D1D" />
            카카오 채널: {data.kakaoChannel.name}
            <ExternalLink size={10} />
          </a>
          <span style={{ fontSize: 10, color: '#B0A0A8', marginLeft: 8 }}>
            친구 자산 = 무료 마케팅 풀
          </span>
        </div>
      )}

      {/* Checklist */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #F8DCE5', background: '#FFFAFB' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={12} style={{ color: '#e62310' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>운영 체크리스트</span>
            <span style={{ fontSize: 11, color: '#B0A0A8' }}>9개 중 {data.checkedCount}개 완료</span>
          </div>
          <div style={{
            padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 800,
            background: data.checkedCount >= 7 ? '#dcfce7' : data.checkedCount >= 4 ? '#fef3c7' : '#fef2f2',
            color: data.checkedCount >= 7 ? '#15803d' : data.checkedCount >= 4 ? '#b45309' : '#dc2626',
          }}>
            {Math.round((data.checkedCount / data.totalChecklistItems) * 100)}%
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {CHECKLIST_ITEMS.map((item) => {
            const checked = data.checklist[item.key] ?? false;
            const isAuto = data.autoDetected.includes(item.key);
            const phaseColor = item.phase === '필수' ? '#e62310' : item.phase === '확장' ? '#2563eb' : '#7c3aed';
            return (
              <button
                key={item.key}
                onClick={() => toggleChecklist(item.key, checked)}
                disabled={isAuto}
                title={isAuto ? `${item.hint} — 자동 감지` : item.hint}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '9px 11px', borderRadius: 10,
                  background: checked ? '#f0fdf4' : '#fff',
                  border: `1px solid ${checked ? '#86efac' : '#F8DCE5'}`,
                  cursor: isAuto ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: isAuto ? 0.85 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {checked ? (
                  <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <Circle size={14} style={{ color: '#D4B0BC', flexShrink: 0, marginTop: 1 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: checked ? '#15803d' : '#1A1A1A', lineHeight: 1.3 }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: `${phaseColor}15`, color: phaseColor, fontWeight: 800 }}>
                      {item.phase}
                    </span>
                    {isAuto && (
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }}>
                        자동
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: '#888', margin: 0, lineHeight: 1.35 }}>{item.hint}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div style={{ marginTop: 11, padding: '8px 11px', background: '#fff', borderRadius: 8, border: '1px dashed #F8DCE5', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <Info size={11} style={{ color: '#B0A0A8', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 10, color: '#888', margin: 0, lineHeight: 1.5 }}>
            네이버 커머스 API는 리뷰 데이터를 제공하지 않습니다 (GitHub #1582). 스마트스토어 리뷰관리 페이지에서 수동으로 카운트해주세요.
            반품안심케어/카카오 QR 항목은 자동 감지됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
