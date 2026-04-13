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

// ─── 꽃·식물 카테고리 코드 (네이버 실제 코드) ─────────────────
export const FLOWER_CATEGORY_CODES = [
  // 꽃/화환
  { code: '50004716', label: '꽃/화환 > 꽃다발' },
  { code: '50004717', label: '꽃/화환 > 꽃바구니' },
  { code: '50004718', label: '꽃/화환 > 화환' },
  { code: '50004719', label: '꽃/화환 > 조화/인조꽃' },
  { code: '50004720', label: '꽃/화환 > 프리저브드플라워' },
  { code: '50004721', label: '꽃/화환 > 드라이플라워' },
  // 식물
  { code: '50003307', label: '식물 > 관엽식물' },
  { code: '50003308', label: '식물 > 다육식물/선인장' },
  { code: '50003310', label: '식물 > 공기정화식물' },
  { code: '50003312', label: '식물 > 허브' },
  // 원예용품
  { code: '50004901', label: '원예용품 > 포장재/리본' },
  { code: '50004902', label: '원예용품 > 화분/용기' },
  { code: '50004903', label: '원예용품 > 원예토/비료' },
];

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

// ─── 배송비 유형 ─────────────────────────────────────────────
export const SHIPPING_FEE_TYPES = [
  { code: '무료',       label: '무료배송' },
  { code: '유료',       label: '유료배송 (항상 부과)' },
  { code: '조건부무료', label: '조건부 무료 (일정금액 이상 무료)' },
  { code: '수량별',     label: '수량별 부과' },
  { code: '구간별',     label: '구간별 차등' },
];

// ─── 부가세 유형 ─────────────────────────────────────────────
export const TAX_TYPES = [
  { code: '과세', label: '과세 (부가세 10%)' },
  { code: '면세', label: '면세' },
  { code: '영세', label: '영세율' },
];

// ─── 상품 상태 ───────────────────────────────────────────────
export const PRODUCT_STATUSES = [
  { code: '신상품',   label: '신상품' },
  { code: '중고',     label: '중고' },
  { code: '재고상품', label: '재고상품' },
];

// ─── 배송비 결제방식 ─────────────────────────────────────────
export const SHIPPING_PAY_TYPES = [
  { code: '선결제', label: '선결제' },
  { code: '착불',   label: '착불' },
  { code: '선결제또는착불', label: '선결제 또는 착불' },
];

// ─── 기본 설정값 (꽃틔움 기본) ────────────────────────────────
export const KKOTIUM_DEFAULTS = {
  originCode:           '200037',  // China (import)
  categoryCode:         '50004716', // 꽃다발
  courierCode:          'CJGLS',    // CJ대한통운
  shippingFeeType:      '조건부무료',
  shippingFee:          3000,
  freeShippingMin:      30000,
  returnShippingFee:    6000,
  exchangeShippingFee:  6000,
  jeju:                 5000,
  island:               5000,
  taxType:              '과세',
  productStatus:        '신상품',
  minorPurchase:        'Y',
  shippingMethod:       '택배배송',
  shippingPayType:      '선결제',
  brand:                '꽃틔움',
  asPhone:              '고객센터 문의',
  asGuide:              '평일 10:00~18:00 문의 가능합니다.',
  shippingFrom:         '서울특별시',
  returnAddress:        '서울특별시',
  exchangeAddress:      '서울특별시',
};
