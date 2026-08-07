// src/lib/category-mismatch-dict.ts
// 트랙③ 1단계 — 카테고리 전환 한정어 사전 (범용, 특정 상품 하드코딩 아님 #55)
// 설계: docs/design/KEYWORD_CATEGORY_PRECISION_2026-08-05.md §4-4
// 근거: docs/design/KOREAN_ECOMMERCE_CATEGORY_SIGNAL_RESEARCH_2026-08-07.md §4
//
// "청소기" 같은 소싱 키워드로 도매 매칭 시 "귀청소기·어항청소기·차량용청소기"처럼
// 실제로는 다른 카테고리(뷰티/반려동물/자동차용품)로 전환된 상품이 섞여 들어온다.
// 이 사전은 그 전환을 시사하는 한정어(수식어)를 6개 축으로 구조화한 것 —
// accessoryRisk(wholesale-matcher.ts)와 같은 관리 방식.

export type MismatchAxis =
  | 'bodyPart'
  | 'animal'
  | 'placeVehicle'
  | 'targetDevice'
  | 'ageUser'
  | 'miniature';

// 축별 카테고리 전환 한정어(블랙리스트). 축 설명은 설계 §4-4 표 참조:
// A.신체부위→뷰티/위생소품, B.동물→반려동물/관상어용품, C.장소/이동수단→자동차용품 등,
// D.대상기기/사물→부품·전용액세서리, E.연령/사용자→출산육아/시니어용품, F.소재/형태축소어→완구/취미.
export const CATEGORY_MISMATCH_DICT: Record<MismatchAxis, string[]> = {
  bodyPart: ['귀', '코', '입', '눈', '손', '발', '두피', '얼굴', '치아', '이', '혀', '배꼽', '발톱', '손톱', '겨드랑이'],
  animal: ['강아지', '개', '애견', '고양이', '반려', '펫', '반려동물', '애묘', '반려견', '어항', '수족관', '수조', '관상어'],
  placeVehicle: ['차량용', '자동차', '세차', '캠핑용', '낚시용', '욕실용', '주방용', '사무용', '실외용', '야외용', '텐트용'],
  targetDevice: ['휴대폰', '스마트폰', '노트북', '카메라', '안경', '키보드', '신발', '자전거'],
  ageUser: ['유아', '아기', '신생아', '아동', '어린이', '시니어', '노인', '임산부'],
  miniature: ['미니어처', '모형', '장난감', '완구', '피규어', '인형용'],
};

// 정상 하위속성(브랜드·방식·타입어) — 카테고리 전환 신호가 아니다.
// 블랙리스트 한정어와 겹치면 이 화이트리스트가 항상 우선한다(설계 §5).
export const WHITELIST_MODIFIERS: string[] = ['무선', '유선', '스틱', '핸디', '진공', '로봇', '침구', '차이슨'];

// head noun(키워드)별 추가 화이트리스트 — 특정 키워드에서만 정상인 수식어를
// 여기에 확장한다(운영자 오탐 신고 누적 시 완화 조건, 설계 §4-1). 초기엔 비어있음.
export const HEAD_NOUN_WHITELIST: Record<string, string[]> = {};
