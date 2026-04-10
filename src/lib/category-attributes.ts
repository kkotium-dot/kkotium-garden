// src/lib/category-attributes.ts
// Category-specific required attribute guide for Naver Smart Store
// Based on Naver 2026 official attribute requirements by D1 category
// Used by: products/new (inline attribute guidance on category select)

export interface AttributeGuide {
  required: string[];   // must-fill attributes (SEO critical)
  recommended: string[]; // recommended for higher attribute score
  tip: string;           // Kkotti tip for this category
}

// Naver D1 category ID -> attribute guide mapping
// D1 IDs from NAVER_CATEGORIES_FULL top-level nodes
const CATEGORY_ATTRIBUTE_MAP: Record<string, AttributeGuide> = {
  // 가구/인테리어 (50000803)
  '50000803': {
    required: ['브랜드', '재질', '색상'],
    recommended: ['크기/사이즈', '무게', '원산지', '조립여부'],
    tip: '가구는 재질+색상+사이즈가 검색 필터의 핵심이에요. 꼭 채우세요!',
  },
  // 생활/건강 (50000806)
  '50000806': {
    required: ['브랜드', '재질', '원산지'],
    recommended: ['색상', '크기/사이즈', '인증정보'],
    tip: '생활용품은 원산지와 인증정보가 구매 신뢰도를 높여줘요.',
  },
  // 주방용품 (50000804)
  '50000804': {
    required: ['브랜드', '재질', '원산지'],
    recommended: ['색상', '크기/용량', '인증정보(KC)'],
    tip: '주방용품은 KC인증 표시가 있으면 신뢰도와 SEO 점수 모두 올라가요!',
  },
  // 패션의류 (50000001)
  '50000001': {
    required: ['브랜드', '색상', '소재'],
    recommended: ['사이즈', '원산지', '세탁방법'],
    tip: '옷은 소재+색상+사이즈 세트가 쇼핑 필터 노출의 기본이에요.',
  },
  // 패션잡화 (50000002)
  '50000002': {
    required: ['브랜드', '재질', '색상'],
    recommended: ['사이즈', '원산지'],
    tip: '잡화는 브랜드와 재질을 반드시 입력하세요. 필터 검색에서 자주 쓰여요.',
  },
  // 화장품/미용 (50000005)
  '50000005': {
    required: ['브랜드', '원산지', '피부타입'],
    recommended: ['용량', '성분', '사용기한'],
    tip: '화장품은 브랜드+원산지+피부타입이 SEO 핵심 속성이에요.',
  },
  // 디지털/가전 (50000009)
  '50000009': {
    required: ['브랜드', '모델명', '원산지'],
    recommended: ['색상', '크기', 'KC인증'],
    tip: '전자제품은 모델명을 정확히 입력하면 정확 검색 유입이 생겨요.',
  },
  // 스포츠/레저 (50000011)
  '50000011': {
    required: ['브랜드', '재질', '색상'],
    recommended: ['사이즈', '무게', '원산지'],
    tip: '스포츠 용품은 사이즈와 무게 정보가 구매 전환율을 높여요.',
  },
  // 출산/육아 (50000012)
  '50000012': {
    required: ['브랜드', '재질', '원산지', 'KC인증'],
    recommended: ['색상', '크기', '권장연령'],
    tip: '육아용품은 KC인증이 없으면 네이버 검색 노출에서 불이익을 받을 수 있어요!',
  },
  // 식품 (50000014)
  '50000014': {
    required: ['브랜드', '원산지', '중량'],
    recommended: ['알레르기정보', '보관방법', '유통기한'],
    tip: '식품은 원산지와 중량을 필수로 입력해야 판매 등록이 가능해요.',
  },
  // 반려동물 (50000020)
  '50000020': {
    required: ['브랜드', '재질', '원산지'],
    recommended: ['색상', '적용대상(견종/묘종)', '무게'],
    tip: '반려동물 용품은 적용 대상 동물/크기 명시가 전환율에 큰 영향을 줘요.',
  },
  // 문구/오피스 (50000026)
  '50000026': {
    required: ['브랜드', '재질'],
    recommended: ['색상', '크기', '원산지'],
    tip: '문구류는 색상 옵션과 크기 정보가 검색 필터에서 자주 쓰여요.',
  },
  // 완구/취미 (50000027)
  '50000027': {
    required: ['브랜드', '재질', '권장연령'],
    recommended: ['KC인증', '색상', '크기'],
    tip: '완구는 KC인증과 권장연령이 필수예요. 없으면 판매 제한될 수 있어요!',
  },
};

// Fallback guide for unknown/generic categories
const DEFAULT_GUIDE: AttributeGuide = {
  required: ['브랜드', '원산지'],
  recommended: ['재질', '색상', '크기/사이즈'],
  tip: '브랜드와 원산지는 모든 카테고리에서 SEO 점수에 영향을 줘요.',
};

// Map Naver category code (leaf) to D1 root for guide lookup
// Category codes are typically 8-digit numbers; D1 is the top-level
// We match by prefix since full category tree is in naver-categories-full.ts
export function getCategoryAttributeGuide(naverCategoryCode: string | null | undefined): AttributeGuide {
  if (!naverCategoryCode) return DEFAULT_GUIDE;

  // Direct match first (for D1 codes entered directly)
  if (CATEGORY_ATTRIBUTE_MAP[naverCategoryCode]) {
    return CATEGORY_ATTRIBUTE_MAP[naverCategoryCode];
  }

  // For leaf category codes, try to find D1 by known prefix patterns
  // Naver category structure: D1 (8 digits) -> D2 -> D3 -> D4
  // Most leaf codes share the first 8 digits with their D1 parent
  for (const [d1Code, guide] of Object.entries(CATEGORY_ATTRIBUTE_MAP)) {
    // Check if the category is under this D1 by string prefix match on known ranges
    if (naverCategoryCode.startsWith(d1Code.slice(0, 4))) {
      return guide;
    }
  }

  return DEFAULT_GUIDE;
}

// For direct D1 name-based lookup (used when D1 label is known from NAVER_CATEGORIES_FULL)
export function getCategoryAttributeGuideByD1Name(d1Name: string): AttributeGuide {
  const NAME_TO_D1: Record<string, string> = {
    '가구/인테리어': '50000803',
    '생활/건강': '50000806',
    '주방용품': '50000804',
    '패션의류': '50000001',
    '패션잡화': '50000002',
    '화장품/미용': '50000005',
    '디지털/가전': '50000009',
    '스포츠/레저': '50000011',
    '출산/육아': '50000012',
    '식품': '50000014',
    '반려동물': '50000020',
    '문구/오피스': '50000026',
    '완구/취미': '50000027',
  };

  const d1Code = NAME_TO_D1[d1Name];
  if (d1Code && CATEGORY_ATTRIBUTE_MAP[d1Code]) {
    return CATEGORY_ATTRIBUTE_MAP[d1Code];
  }
  return DEFAULT_GUIDE;
}

// Attribute field to Prisma column mapping
// Used to highlight which fields in 씨앗 심기 correspond to required attributes
export const ATTRIBUTE_FIELD_MAP: Record<string, string> = {
  '브랜드': 'naver_brand',
  '재질': 'naver_material',
  '색상': 'naver_color',
  '크기/사이즈': 'naver_size',
  '원산지': 'naver_origin',
  '세탁방법': 'naver_care_instructions',
};
