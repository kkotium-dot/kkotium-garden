// src/lib/naver/codes.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 스마트스토어 공식 코드 레퍼런스 (출처 파일 기반)
// 원산지코드.xlsx / 택배사코드.xlsx / 카테고리번호.xlsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── 원산지 코드 (네이버 스마트스토어 전체 기준) ─────────────
// importer: true = 수입산 계열 → 수입사 필드 필수
export interface OriginCode {
  code: string;
  label: string;
  importer?: boolean;
}

export const ORIGIN_CODES: OriginCode[] = [
  // Special
  { code: '0', label: '기타 / 해당없음' },
  { code: '3', label: '상세설명에 표시' },
  { code: '4', label: '직접입력' },
  { code: '5', label: '원산지 표기 의무대상 아님' },
  // --- 국내산 > 시도 ---
  { code: '0200009', label: '국내산 > 서울특별시' },
  { code: '0200002', label: '국내산 > 경기도' },
  { code: '0200011', label: '국내산 > 인천광역시' },
  { code: '0200001', label: '국내산 > 강원도' },
  { code: '0200016', label: '국내산 > 충청북도' },
  { code: '0200015', label: '국내산 > 충청남도' },
  { code: '0200013', label: '국내산 > 전라북도' },
  { code: '0200012', label: '국내산 > 전라남도' },
  { code: '0200004', label: '국내산 > 경상북도' },
  { code: '0200003', label: '국내산 > 경상남도' },
  { code: '0200014', label: '국내산 > 제주특별자치도' },
  { code: '0200008', label: '국내산 > 부산광역시' },
  { code: '0200006', label: '국내산 > 대구광역시' },
  { code: '0200007', label: '국내산 > 대전광역시' },
  { code: '0200005', label: '국내산 > 광주광역시' },
  { code: '0200010', label: '국내산 > 울산광역시' },
  { code: '0200017', label: '국내산 > 세종특별자치시' },
  // --- 수입산 > 아시아 ---
  { code: '0200037', label: '수입산 > 중국', importer: true },
  { code: '0200036', label: '수입산 > 일본', importer: true },
  { code: '0200025', label: '수입산 > 베트남', importer: true },
  { code: '0200044', label: '수입산 > 태국', importer: true },
  { code: '0200034', label: '수입산 > 인도네시아', importer: true },
  { code: '0200048', label: '수입산 > 필리핀', importer: true },
  { code: '0200008', label: '수입산 > 말레이시아', importer: true },
  { code: '0200021', label: '수입산 > 싱가포르', importer: true },
  { code: '0200033', label: '수입산 > 인도', importer: true },
  { code: '0200040', label: '수입산 > 캄보디아', importer: true },
  { code: '0200004', label: '수입산 > 라오스', importer: true },
  { code: '0200011', label: '수입산 > 미얀마', importer: true },
  { code: '0200001', label: '수입산 > 네팔', importer: true },
  { code: '0200019', label: '수입산 > 스리랑카', importer: true },
  { code: '0200047', label: '수입산 > 파키스탄', importer: true },
  { code: '0200049', label: '수입산 > 홍콩', importer: true },
  { code: '0200002', label: '수입산 > 대만', importer: true },
  // --- 수입산 > 유럽 ---
  { code: '0201002', label: '수입산 > 네덜란드', importer: true },
  { code: '0201005', label: '수입산 > 독일', importer: true },
  { code: '0201046', label: '수입산 > 프랑스', importer: true },
  { code: '0201035', label: '수입산 > 영국', importer: true },
  { code: '0201025', label: '수입산 > 스페인', importer: true },
  { code: '0201038', label: '수입산 > 이탈리아', importer: true },
  { code: '0201023', label: '수입산 > 스웨덴', importer: true },
  { code: '0201024', label: '수입산 > 스위스', importer: true },
  { code: '0201036', label: '수입산 > 오스트리아', importer: true },
  { code: '0201017', label: '수입산 > 벨기에', importer: true },
  { code: '0201003', label: '수입산 > 노르웨이', importer: true },
  { code: '0201004', label: '수입산 > 덴마크', importer: true },
  { code: '0201047', label: '수입산 > 핀란드', importer: true },
  { code: '0201045', label: '수입산 > 폴란드', importer: true },
  { code: '0201007', label: '수입산 > 러시아', importer: true },
  { code: '0201040', label: '수입산 > 체코', importer: true },
  { code: '0201048', label: '수입산 > 헝가리', importer: true },
  { code: '0201042', label: '수입산 > 터키', importer: true },
  { code: '0201044', label: '수입산 > 포르투갈', importer: true },
  { code: '0201000', label: '수입산 > 그리스', importer: true },
  { code: '0201034', label: '수입산 > 에스토니아', importer: true },
  { code: '0201029', label: '수입산 > 아일랜드', importer: true },
  { code: '0201028', label: '수입산 > 아이슬란드', importer: true },
  // --- 수입산 > 아메리카 ---
  { code: '0204000', label: '수입산 > 미국', importer: true },
  { code: '0204006', label: '수입산 > 캐나다', importer: true },
  { code: '0205031', label: '수입산 > 콜롬비아', importer: true },
  { code: '0205024', label: '수입산 > 에콰도르', importer: true },
  { code: '0205015', label: '수입산 > 브라질', importer: true },
  { code: '0205020', label: '수입산 > 아르헨티나', importer: true },
  { code: '0205029', label: '수입산 > 칠레', importer: true },
  { code: '0205036', label: '수입산 > 페루', importer: true },
  { code: '0205007', label: '수입산 > 멕시코', importer: true },
  { code: '0205027', label: '수입산 > 우루과이', importer: true },
  // --- 수입산 > 아프리카 ---
  { code: '0202049', label: '수입산 > 케냐', importer: true },
  { code: '0202036', label: '수입산 > 에티오피아', importer: true },
  { code: '0202008', label: '수입산 > 남아프리카공화국', importer: true },
  { code: '0202007', label: '수입산 > 나이지리아', importer: true },
  { code: '0202039', label: '수입산 > 이집트', importer: true },
  { code: '0202017', label: '수입산 > 모로코', importer: true },
  { code: '0202055', label: '수입산 > 탄자니아', importer: true },
  // --- 수입산 > 오세아니아 ---
  { code: '0203024', label: '수입산 > 호주', importer: true },
  { code: '0203003', label: '수입산 > 뉴질랜드', importer: true },
];

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
  originCode:           '0200037',  // 서울
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
