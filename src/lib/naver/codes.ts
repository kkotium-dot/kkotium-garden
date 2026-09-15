// src/lib/naver/codes.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 스마트스토어 공식 코드 레퍼런스 (출처 파일 기반)
// 원산지코드.xlsx / 택배사코드.xlsx / 카테고리번호.xlsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── 원산지 코드 (네이버 스마트스토어 전체 518건 — XLS 원본 코드 기준) ──
// importer: true = 수입산 계열 (code >= 200000) → 수입사 필드 필수
import { NAVER_ORIGIN_CODES } from './naver-origin-codes';

export interface OriginCode {
  code: string;
  label: string;
  importer?: boolean;
}

// Map from XLS raw data (518 entries) to OriginCode interface
export const ORIGIN_CODES: OriginCode[] = NAVER_ORIGIN_CODES.map((o) => ({
  code: o.code,
  label: o.name,
  importer: Number(o.code) >= 200000 ? true : undefined,
}));

// ─── 택배사 코드 (출처: 택배사코드.xlsx 주요 코드) ─────────────
export const COURIER_CODES = [
  { code: 'CJGLS',   label: 'CJ대한통운' },
  { code: 'HANJIN',  label: '한진택배' },
  { code: 'LOTTE',   label: '롯데택배' },
  { code: 'LOGEN',   label: '로젠택배' },
  { code: 'EPOST',   label: '우체국택배' },
  { code: 'KGB',     label: 'KGB택배' },
  { code: 'HYUNDAI', label: '현대택배' },
  { code: 'DAESIN',  label: '대신택배' },
  { code: 'ILYANG',  label: '일양로지스' },
  { code: 'HDEXP',   label: 'HDexp' },
  { code: 'DIRECT',  label: '직접배송' },
];

// NAVER_ENUM_FIX_2026-09-15 — 이 파일의 4개 enum 상수(SHIPPING_FEE_TYPES,
// TAX_TYPES, PRODUCT_STATUSES, SHIPPING_PAY_TYPES) 전부, 실제 네이버 공식
// 일괄등록 엑셀 템플릿(대표님 제공 ExcelSaveTemplate_20260324.xlsx, "일괄등록"
// 시트 5행 = 네이버가 명시한 공식 입력 규격)과 1:1 대조하여 확정.
// 이전 값들은 "조건부무료"(공백누락)/"과세"(상품 접미 누락)/"중고","재고상품"
// (네이버 규격에 존재하지 않는 값) 등 실제 업로드 실패·오분류를 유발하는
// 문자열 불일치가 있었다(원본메모+v.02 지적, 실제 파일로 재확인 완료).
// code 값은 엑셀 셀에 그대로 들어가는 문자열이라 네이버 문서 원문과 완전히
// 동일해야 한다 — 임의 축약·공백 제거 금지.

// ─── 배송비 유형 (네이버 규격: 무료/조건부 무료/유료/수량별/구간별) ──────
export const SHIPPING_FEE_TYPES = [
  { code: '무료',        label: '무료배송' },
  { code: '유료',        label: '유료배송 (항상 부과)' },
  { code: '조건부 무료', label: '조건부 무료 (일정금액 이상 무료)' },
  { code: '수량별',      label: '수량별 부과' },
  { code: '구간별',      label: '구간별 차등' },
];

// ─── 부가세 유형 (네이버 규격: 과세상품/면세상품/영세상품) ──────────────
export const TAX_TYPES = [
  { code: '과세상품', label: '과세상품 (부가세 10%)' },
  { code: '면세상품', label: '면세상품' },
  { code: '영세상품', label: '영세상품' },
];

// ─── 상품 상태 (네이버 규격: 신상품/중고상품 — 2종만 존재, "재고상품" 없음) ─
export const PRODUCT_STATUSES = [
  { code: '신상품',   label: '신상품' },
  { code: '중고상품', label: '중고상품' },
];

// ─── 배송비 결제방식 (네이버 규격: 착불/선결제/착불 또는 선결제) ────────
export const SHIPPING_PAY_TYPES = [
  { code: '선결제',         label: '선결제' },
  { code: '착불',           label: '착불' },
  { code: '착불 또는 선결제', label: '착불 또는 선결제' },
];

// ─── 기본 설정값 (꽃틔움 기본) ────────────────────────────────
export const KKOTIUM_DEFAULTS = {
  // 2026-06-05 — MUST keep the leading zero. '0200037' is the canonical Naver
  // origin area code for 중국 (see 원산지코드.xls). The earlier '200037' had its
  // leading zero stripped and caused register 400 'originAreaCode NotValid'.
  originCode:           '0200037', // China (import) — 2026-09-03: 상품 생성 라우트(POST
  // /api/products)는 더 이상 이 값을 기본값으로 안 씀(originCode 미입력 시 필드 생략,
  // Prisma 스키마 기본값 '0001'=미선택 센티널 적용). 이 상수 자체는 naverExcelJS.ts의
  // `?? d.originCode` 널리시 폴백용으로 남아있으나 DB originCode가 실질적으로 null이
  // 되는 경로가 없어 그 폴백은 사실상 도달 불가.
  courierCode:          'CJGLS',    // CJ대한통운
  shippingFeeType:      '조건부 무료',
  shippingFee:          3000,
  freeShippingMin:      30000,
  returnShippingFee:    6000,
  exchangeShippingFee:  6000,
  jeju:                 5000,
  island:               5000,
  taxType:              '과세상품',
  productStatus:        '신상품',
  minorPurchase:        'Y',
  shippingMethod:       '택배배송',
  shippingPayType:      '선결제',  // valid as-is (matches SHIPPING_PAY_TYPES)
  brand:                '꽃틔움',
  asPhone:              '고객센터 문의',
  asGuide:              '평일 10:00~18:00 문의 가능합니다.',
  shippingFrom:         '서울특별시',
  returnAddress:        '서울특별시',
  exchangeAddress:      '서울특별시',
};
