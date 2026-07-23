// src/lib/products/surfaceRules.ts
// ============================================================================
// Surface registry + action permission matrix — SINGLE authority for "which
// screen shows what, under which condition" (작업3, 2026-07-23).
// Authority doc: docs/design/SURFACE_RULES.md (v2) + LIFECYCLE_BRIDGE_V2 §6-9.
//
// This module does not introduce new runtime behavior on its own — it is the
// judgment layer that SURFACE_RULES.md §7 step 5 says screens should
// eventually consume. Today it exists so the forbidden-combination tests
// (T-05/T-08/T-11/T-12/T-13/T-16~T-20) have a single set of pure functions to
// check against, instead of each screen re-deriving its own rule (#295).
//
// PURE (no I/O, no prisma) — importable from client components.
// ============================================================================

import { deriveLifecycleState, isPublishedLifecycleState, type LifecycleState, type LifecycleInput } from './lifecycle';
import { decideDisposition, type DispositionAction, type DispositionInput } from './disposition';

// ── 1. Surface registry (SURFACE_RULES.md §2) ──────────────────────────────

export type SurfaceKind = 'storage' | 'queue';

export interface SurfaceDef {
  id: string;
  label: string;
  route: string;
  kind: SurfaceKind;
}

/**
 * 보관함(storage) = 위치 축(발행여부로 정확히 한 곳에만 존재, #296).
 * 작업 큐(queue) = 조건 축(발행 전용 — disposition.ts:129 게이트 내장, §1).
 */
export const SURFACES: SurfaceDef[] = [
  { id: 'warehouse_unpublished', label: '꿀통 창고(정원 창고)', route: '/products?tab=draft', kind: 'storage' },
  { id: 'warehouse_published',   label: '꽃밭 돌보기',          route: '/products',            kind: 'storage' },
  { id: 'disposition_queue',     label: '처분 결정 대기함',      route: '/products/out-of-stock', kind: 'queue' },
  { id: 'reactivation_queue',    label: '좀비 부활소',           route: '/products/reactivation', kind: 'queue' },
  { id: 'dashboard_todo',        label: '대시보드 할일',         route: '/dashboard',            kind: 'queue' },
];

/**
 * T-19 근거 함수: 작업 큐(queue)는 발행 전용이다. 미발행 상품(DRAFT_INCOMPLETE /
 * READY_UNPUBLISHED)은 어떤 queue surface에도 노출되면 안 된다.
 */
export function isQueueEligible(state: LifecycleState): boolean {
  return isPublishedLifecycleState(state);
}

// ── 2. Action permission matrix (SURFACE_RULES.md §5, T-05/T-18) ──────────

/**
 * DELETE 허용 여부. T-05(수정판): "hasSalesAssets=true면 DELETE 금지" —
 * v1의 "발행 트랙 전면 금지"는 과잉이었다(SOURCE_GONE_DELETABLE은 발행
 * 트랙이어도 자산이 없으면 삭제 안전, rev66 자산보호 정책).
 */
export function isDeleteAllowed(hasSalesAssets: boolean): boolean {
  return !hasSalesAssets;
}

/**
 * SOURCE_GONE_RESOURCE(공급처 단절 + 판매자산 O) 상태에서 삭제 버튼은
 * 노출조차 되면 안 된다(T-18: HIDDEN, 노출은 되는데 막기만 하는 게 아니다).
 */
export function isDeleteVisible(state: LifecycleState): boolean {
  if (state === 'SOURCE_GONE_RESOURCE') return false;
  return true;
}

/** 상태(state)별로 노출 가능한 처방(action) 후보 — 배지=state, 버튼=action 축 분리(§4). */
const STATE_ALLOWED_ACTIONS: Record<LifecycleState, DispositionAction[]> = {
  DRAFT_INCOMPLETE:      [],
  READY_UNPUBLISHED:     [],
  SOURCE_GONE_RESOURCE:  ['RESOURCE'],
  SOURCE_GONE_DELETABLE: ['DELETE_SAFE'],
  SUSPENDED:             ['NONE'],
  OUT_OF_STOCK:          ['MARK_OUT_OF_STOCK', 'NONE'],
  ON_SALE:               ['NONE'],
};

/**
 * T-11(주 액션 유일성) 지원 함수: 이 상태에서 나올 수 있는 액션 후보 목록.
 * decideDisposition은 항상 정확히 하나의 action을 반환하므로(함수 시그니처
 * 자체가 단일값), 이 목록은 "그 하나가 허용된 집합 안에 있는가"를 검증하는
 * 용도다 — 화면이 이 밖의 액션을 임의로 만들어내면 이탈(#295)이다.
 */
export function allowedActionsFor(state: LifecycleState): DispositionAction[] {
  return STATE_ALLOWED_ACTIONS[state];
}

/**
 * T-20 근거 함수: 배지가 "공급처 단절"(SOURCE_GONE_*)인데 주 액션이 발행 계열
 * 문구("등록 완료"/"이어서 작성"/"새 생명 부여" 등 미발행·부활 전용 CTA)로
 * 나오면 안 된다 — 이번 F1 모순(재활성화 필요 ↔ 부활소 0건)의 재발 방지 축.
 */
const PUBLISH_TRACK_ONLY_LABELS = ['등록 완료', '이어서 작성', '발행하러 가기'];
const REACTIVATION_ONLY_LABELS = ['새 생명 부여'];

export function isPrimaryLabelAllowed(state: LifecycleState, label: string): boolean {
  const isSourceGone = state === 'SOURCE_GONE_RESOURCE' || state === 'SOURCE_GONE_DELETABLE';
  if (!isSourceGone) return true;
  if (PUBLISH_TRACK_ONLY_LABELS.includes(label)) return false;
  // 공급처 단절은 되살리기(새 생명 부여) 대상이 아니다 — 대체소싱/삭제가 답이다.
  if (REACTIVATION_ONLY_LABELS.includes(label)) return false;
  return true;
}

// ── 3. Total-function coverage (T-12) ──────────────────────────────────────

export const ALL_LIFECYCLE_STATES: LifecycleState[] = [
  'DRAFT_INCOMPLETE',
  'READY_UNPUBLISHED',
  'SOURCE_GONE_RESOURCE',
  'SOURCE_GONE_DELETABLE',
  'SUSPENDED',
  'OUT_OF_STOCK',
  'ON_SALE',
];

/** T-08/T-12 지원: STATE_ALLOWED_ACTIONS가 7종 전부를 빠짐없이 커버하는지. */
export function hasFullStateCoverage(): boolean {
  return ALL_LIFECYCLE_STATES.every((s) => s in STATE_ALLOWED_ACTIONS);
}

export type { LifecycleState, DispositionAction, LifecycleInput, DispositionInput };
export { deriveLifecycleState, isPublishedLifecycleState, decideDisposition };
