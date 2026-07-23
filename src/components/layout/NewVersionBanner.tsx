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
//
// ── 양성 동작 검증 보강 (2026-07-24, #310 미검증 해소) ─────────────────────
// #310 실사고: "다른 버전일 때 실제로 뜨는가"를 fetch 가로채기 + 이벤트 강제
// 발생으로 검증하려다 60초 스로틀·ref 타이밍 때문에 실패인지 방법 부적합인지
// 구분 못 했다. 그래서 데이터를 조작하지 않는 안전한 디버그 경로를 둔다:
// URL에 ?forceVersionCheck=1이 있으면 (1) 스로틀을 건너뛰어 즉시 재조회하고
// (2) 실제 초기/현재 SHA와 비교 결과를 화면에 그대로 노출한다. 가짜 SHA를
// 주입하지 않으므로 파라미터가 있어도 실제로 버전이 다르지 않으면 "동일"만
// 보여준다 — 오탐을 만드는 게 아니라 "체크가 실제로 실행됐는지"를 보이게 할
// 뿐이다. 파라미터가 없으면 기존 동작과 완전히 동일(디버그 텍스트 없음).
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

function isForceCheckRequested(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('forceVersionCheck');
}

export default function NewVersionBanner() {
  const [staleSha, setStaleSha] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ initial: string | null; latest: string | null } | null>(null);
  const initialSha = useRef<string | null>(null);
  const lastCheckedAt = useRef(0);
  const dismissed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const forceCheck = isForceCheckRequested();

    const check = async (skipThrottle = false) => {
      if (!skipThrottle) {
        if (document.visibilityState !== 'visible') return;
        if (dismissed.current) return;
        const now = Date.now();
        if (now - lastCheckedAt.current < MIN_CHECK_INTERVAL_MS) return;
        lastCheckedAt.current = now;
      }

      // 로컬 dev(sha=null)에서는 배너를 절대 띄우지 않는다 — null끼리 비교하면
      // 매번 오탐이 된다. 단, forceCheck 디버그 표시는 "비교불가" 상태 자체를
      // 보여줘야 하므로 여기서 끊지 않고 계속 진행한다.
      const latest = initialSha.current ? await fetchSha() : null;
      if (cancelled) return;
      if (forceCheck) setDebugInfo({ initial: initialSha.current, latest });
      if (initialSha.current && latest && latest !== initialSha.current) {
        setStaleSha(latest);
      }
    };

    fetchSha().then((sha) => {
      if (cancelled) return;
      initialSha.current = sha;
      // 강제 모드에서는 마운트 즉시 한 번 비교 결과를 보여준다 — 탭 포커스
      // 전환·60초 대기 없이 "체크가 실행됐는지"를 바로 확인할 수 있게.
      if (forceCheck) check(true);
    });

    // forceCheck는 매 탭 포커스 복귀마다도 스로틀을 건너뛴다 — 배포 직후
    // 60초를 기다리지 않고 알트탭만 반복해도 바로 재확인할 수 있게.
    const handler = () => check(forceCheck);
    document.addEventListener('visibilitychange', handler);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', handler); };
  }, []);

  return (
    <>
      {debugInfo && (
        <div
          style={{
            position: 'fixed', bottom: 8, right: 8, zIndex: 101,
            padding: '6px 10px', borderRadius: 8, fontSize: 11, fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.75)', color: '#fff', lineHeight: 1.5,
          }}
        >
          forceVersionCheck — 초기: {debugInfo.initial?.slice(0, 7) ?? 'null'} / 현재: {debugInfo.latest?.slice(0, 7) ?? 'null'} /{' '}
          {debugInfo.initial && debugInfo.latest
            ? debugInfo.initial === debugInfo.latest ? '동일(배너 없음이 정상)' : '다름(배너 떠야 정상)'
            : '비교불가(dev sha=null)'}
        </div>
      )}
      {staleSha && (
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
      )}
    </>
  );
}
