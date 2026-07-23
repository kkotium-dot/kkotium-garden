'use client';
// src/components/layout/NewVersionBanner.tsx
// ============================================================================
// 작업1 (#308) — 배포 SHA가 바뀌었는데 브라우저가 구버전을 렌더하면 운영자가
// "미반영"으로 오판한다(2026-07-23 실사고: Desktop이 F1/F2 수정을 직접 확인하고도
// 강제 새로고침 전까지는 구버전을 봤다). 새 버전 배포를 감지해 새로고침을
// 유도해 이 오판을 구조적으로 막는다.
//
// 감지: 최초 로드 시 캡처한 SHA와 /api/version 재조회 SHA를 비교.
// 트리거: setInterval 폴링이 아니라 탭 포커스 복귀(visibilitychange) 시에만
// 체크 — #72 정신(불필요한 자동발사 타이머 금지) 준수. 탭을 오래 열어둔
// 운영자가 다시 돌아왔을 때 딱 필요한 순간에만 확인한다. 최소 60초 간격으로
// 스로틀(짧은 탭 전환 반복에도 과호출 방지).
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

const MIN_CHECK_INTERVAL_MS = 60_000;

async function fetchSha(): Promise<string | null> {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.sha === 'string' ? data.sha : null;
  } catch {
    return null; // best-effort — 네트워크 문제로 배너 오탐 만들지 않는다
  }
}

export default function NewVersionBanner() {
  const [staleSha, setStaleSha] = useState<string | null>(null);
  const initialSha = useRef<string | null>(null);
  const lastCheckedAt = useRef(0);
  const dismissed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchSha().then((sha) => { if (!cancelled) initialSha.current = sha; });

    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      if (dismissed.current) return;
      const now = Date.now();
      if (now - lastCheckedAt.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheckedAt.current = now;

      // 로컬 dev(sha=null)에서는 절대 비교하지 않는다 — null끼리 배너를 띄우면
      // 매번 오탐이 된다. 프로덕션(VERCEL_GIT_COMMIT_SHA 존재)에서만 동작.
      if (!initialSha.current) return;
      const latest = await fetchSha();
      if (!cancelled && latest && latest !== initialSha.current) {
        setStaleSha(latest);
      }
    };

    document.addEventListener('visibilitychange', check);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', check); };
  }, []);

  if (!staleSha) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '10px 16px', background: '#1A1A1A', color: '#fff', fontSize: 13,
      }}
    >
      <RefreshCw size={14} />
      <span>새 버전이 준비됐어요 — 지금 화면은 배포 전 상태일 수 있어요.</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '4px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12,
          background: '#F63B28', color: '#fff', border: 'none', cursor: 'pointer',
        }}
      >
        새로고침
      </button>
      <button
        onClick={() => { dismissed.current = true; setStaleSha(null); }}
        aria-label="닫기"
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
