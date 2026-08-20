// src/lib/policy/dropship-fitness.ts
// P0-4 (2026-08-20): 드롭십 적합도 가중치 — exclusion-rules.ts(취급 제외 3종:
// 식품/화장품/브랜드)와는 별개 모듈이다. exclusion-rules는 "차단"(제외), 이
// 모듈은 "감점"(점수 조정)만 한다 — 카테고리를 통째로 막지 않는다.
//
// 배경: 소싱 발굴이 자사 상품 씨앗 기반 연관확장(최대 1,200건)으로 바뀌면서,
// 확장 결과에 드롭십에 안 맞는(반품률 높음·사이즈 이슈·파손 위험) 품목이
// 섞인다. 의류/신발처럼 완전 차단할 근거는 없지만(팔리는 상품도 있음) 슬롯
// 선별 시 우선순위에서는 밀려야 한다.
//
// 가중치는 운영자 실측·직관 기준 추정치이며 네이버 공식 통계가 아니다.

const D1_FITNESS_WEIGHT: Record<string, number> = {
  '패션의류': 0.3,
  '패션잡화': 0.3, // 신발 포함 — 사이즈 반품 리스크
  '생활/건강': 0.9,
  '가구/인테리어': 0.9,
  '여가/생활편의': 0.9,
  '주방용품/식기': 0.85,
  '문구/오피스': 0.9,
  '반려동물': 0.8,
  '자동차용품': 0.75,
  '스포츠/레저': 0.6,
  '완구/취미': 0.7,
  '출산/육아': 0.5, // 안전검증·반품 리스크
  '디지털/가전': 0.6, // AS 부담
  // 식품/화장품/브랜드는 exclusion-rules.ts가 전면 제외 처리 — 여기 없어도
  // 이 모듈 호출 이전 단계에서 이미 걸러진다.
};

/** 가중치 미등재 D1의 기본값 — 차단은 아니되 중립보다 약간 낮게 잡는다
 *  (새 카테고리가 검증 없이 최상위 슬롯을 차지하지 않도록). */
const DEFAULT_FITNESS_WEIGHT = 0.6;

/** D1 카테고리명으로 드롭십 적합도 가중치(0~1)를 조회한다. 1에 가까울수록
 *  드롭십에 적합(재고 리스크 낮음·반품률 낮음·파손 위험 낮음). */
export function getDropshipFitness(d1?: string | null): number {
  if (!d1) return DEFAULT_FITNESS_WEIGHT;
  return D1_FITNESS_WEIGHT[d1] ?? DEFAULT_FITNESS_WEIGHT;
}

/** blueOceanScore(0~100)에 적합도 가중치를 곱해 슬롯 선별용 순위 점수를 만든다.
 *  원본 blueOceanScore는 그대로 두고(표시용), 정렬/선별에만 이 값을 쓴다. */
export function applyDropshipFitness(blueOceanScore: number, d1?: string | null): number {
  return blueOceanScore * getDropshipFitness(d1);
}
