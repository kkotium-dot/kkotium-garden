// src/lib/naver/unit-price-policy.ts
// 네이버 단위가격 표시 필수 카테고리 판별 (§4-A · 2026-04-29 시행).
// 권위 = NAVER_STORE_OPERATIONS_UPDATE_2026-07-09 §4-A + 산업통상자원부 「단위가격표시
// 명령제」 (별표1 대상품목). 등록/수정 대상 카테고리인데 단위가격 필드가 없으면
// 네이버 API가 4-29 이후로 등록/수정 거부하므로 앱단 gate로 사전 차단.
//
// 판별 정책 (D1 + D2 서브셋 매칭):
//   1) D1 == '식품'                                   → 전 서브카테고리 필수
//   2) D1 == '화장품/미용'                            → 전 서브카테고리 필수
//   3) D1 == '생활/건강' AND D2 in {세제,청소,화장지,
//      제지,기저귀,생리용품,휴지,욕실용품,주방잡화}  → 필수
//   4) 그 외                                          → 필수 아님(권장)
//
// 상세 대상 목록은 정책 변동성 큼 — Desktop이 정기 재검토 (작업원칙 #231).

import { NAVER_CATEGORIES_FULL } from './naver-categories-full';

// D1 전면 대상 (D1만 매칭되면 필수)
const MANDATORY_D1: ReadonlySet<string> = new Set([
  '식품',
  '화장품/미용',
]);

// D1='생활/건강' 하위 세제·위생 계열 D2 (부분 대상)
const MANDATORY_LIFE_HEALTH_D2: ReadonlySet<string> = new Set([
  '세제/세척용품',
  '세제',
  '청소용품',
  '화장지/티슈',
  '기저귀',
  '생리대',
  '생리용품',
  '욕실용품',
  '주방잡화',
]);

export type UnitPriceEligibility = 'mandatory' | 'optional' | 'unknown';

export interface UnitPricePolicyResult {
  eligibility: UnitPriceEligibility;
  d1: string;
  d2: string;
  reason: string;
}

/** naverCategoryCode(8자리)로 단위가격 대상 여부 판별. */
export function classifyUnitPricePolicy(naverCategoryCode: string | null | undefined): UnitPricePolicyResult {
  const code = (naverCategoryCode ?? '').trim();
  if (!/^\d{6,10}$/.test(code)) {
    return { eligibility: 'unknown', d1: '', d2: '', reason: 'invalid or missing naverCategoryCode' };
  }
  const cat = NAVER_CATEGORIES_FULL.find(c => c.code === code);
  if (!cat) {
    return { eligibility: 'unknown', d1: '', d2: '', reason: `category code ${code} not found in local table` };
  }
  if (MANDATORY_D1.has(cat.d1)) {
    return { eligibility: 'mandatory', d1: cat.d1, d2: cat.d2, reason: `D1='${cat.d1}' — 전 하위 카테고리 필수` };
  }
  if (cat.d1 === '생활/건강' && MANDATORY_LIFE_HEALTH_D2.has(cat.d2)) {
    return { eligibility: 'mandatory', d1: cat.d1, d2: cat.d2, reason: `D1='생활/건강' + D2='${cat.d2}' — 세제/위생 계열 필수` };
  }
  return { eligibility: 'optional', d1: cat.d1, d2: cat.d2, reason: '필수 대상 아님' };
}

// 표시 단위 코드 — 네이버 v2 payload용. 초기 셋(정책 변동 시 확장).
// 실제 v2 스펙 상수명은 Desktop이 실 register 시 검증 (§4-A spec 확인).
export const UNIT_INDICATION_UNITS: readonly string[] = [
  'g', 'kg', 'ml', 'L', '매', '개', '입', '장', '정',
];

export interface UnitPriceFields {
  unitPriceYn: boolean;
  unitTotalCapacity: number | null;
  unitCapacity: number | null;
  unitIndicationUnit: string | null;
}

/**
 * DB 4필드가 payload로 나갈 준비가 되어 있는지 검증.
 * mandatory 카테고리인데 필드 미충족이면 발행 차단(§4-A).
 */
export function validateUnitPriceFields(
  policy: UnitPricePolicyResult,
  fields: UnitPriceFields,
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (policy.eligibility === 'mandatory') {
    if (!fields.unitPriceYn) {
      errors.push(`단위가격 표시 대상 카테고리(${policy.d1}${policy.d2 ? ' > ' + policy.d2 : ''})입니다 — 단위가격 사용(Y) 필수`);
    } else {
      if (fields.unitTotalCapacity == null || !(fields.unitTotalCapacity > 0)) {
        errors.push('단위가격 필수 — 총량(unitTotalCapacity) 값을 0 이상으로 입력하세요');
      }
      if (fields.unitCapacity == null || !(fields.unitCapacity > 0)) {
        errors.push('단위가격 필수 — 단위 기준량(unitCapacity) 값을 0 이상으로 입력하세요');
      }
      if (!fields.unitIndicationUnit || !fields.unitIndicationUnit.trim()) {
        errors.push('단위가격 필수 — 표시 단위(indicationUnit, 예: g / ml / 개)를 입력하세요');
      }
    }
  } else if (policy.eligibility === 'optional' && fields.unitPriceYn) {
    // 옵션 카테고리인데 사용(Y) 이면 필드 완결성만 warn.
    if (
      !(fields.unitTotalCapacity && fields.unitTotalCapacity > 0) ||
      !(fields.unitCapacity && fields.unitCapacity > 0) ||
      !fields.unitIndicationUnit
    ) {
      warnings.push('단위가격 사용(Y) 이지만 4필드 중 일부가 비어 있음 — 네이버가 거부할 수 있음');
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
