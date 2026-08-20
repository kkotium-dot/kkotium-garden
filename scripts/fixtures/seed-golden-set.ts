// scripts/fixtures/seed-golden-set.ts
//
// P0-6 (2026-08-20, Desktop 지침): 씨앗 headword 추출 로직(seed-keywords.ts
// candidateHeadwordsFromName / extractNouns) 회귀 검증용 합성 테스트 셋.
//
// 왜 필요한가: 결함2 재발 시 실측 DB(현재 12개 상품, 전부 가습기·디퓨저·
// 무드등 계열)만으로는 다른 카테고리(의류·펫·자동차 등)에서 새는 수식어를
// 못 잡는다 — 단건 수습을 반복하게 된다. 이 골든셋은 실 DB와 무관하게
// 8개 카테고리(주방·수납·펫·욕실·의류·자동차·문구·리빙)를 커버해 순수
// 함수 테스트로 회귀를 잡는다(DB·API 불필요).
//
// 공용 자산 — seed-keywords.ts 전용이 아니다. identity-extractor·향후 P2
// 상품명 SEO 스코어러도 이 골든셋을 재사용한다. 모듈별 사본 금지(Desktop 지침).
//
// 상품명은 실제 도매매/네이버 스마트스토어 상품명 어투를 따른다(임의 축약 금지).
// 각 케이스는 "수식어* + 헤드워드 + (스펙접미사)*" 구조를 따른다 — 헤드워드
// 뒤에 또 다른 상품 유형 명사(동의어)를 중복 배치하지 않는다. 실제 도매 리스팅도
// 헤드워드 하나를 정하고 그 앞에 수식어를, 뒤에는 스펙(사이즈/색상/겸용 등)을
// 붙이는 구조가 압도적으로 흔하다 — 두 개의 서로 다른 상품유형 명사를 나란히
// 쓰는 것은 오히려 예외적 SEO 어뷰징 케이스라 골든셋 기본 문형에서 제외했다.

export interface SeedGoldenCase {
  category: string;
  productName: string;
  /** 기대 headword — "이 상품이 무엇인지"를 가장 직접 나타내는 단일 검색어. */
  expected: string;
}

export const SEED_GOLDEN_SET: SeedGoldenCase[] = [
  // ── 주방 ──────────────────────────────────────────────────────────────
  { category: '주방', productName: '스테인리스 3중바닥 논스틱 프라이팬 인덕션겸용', expected: '프라이팬' },
  { category: '주방', productName: '실리콘 논슬립 냄비받침 대형 사이즈', expected: '냄비받침' },
  { category: '주방', productName: '휴대용 미니 전기포트 여행용', expected: '전기포트' },
  { category: '주방', productName: '다용도 스텐 채반 대형 사이즈', expected: '채반' },
  { category: '주방', productName: '논스틱 코팅 대용량 인덕션겸용 웍팬', expected: '웍팬' },
  { category: '주방', productName: '유리 밀폐용기 반찬통 대용량', expected: '반찬통' },

  // ── 수납 ──────────────────────────────────────────────────────────────
  { category: '수납', productName: '원목 자석식 접이식 신발장 슬림형', expected: '신발장' },
  { category: '수납', productName: '다용도 철제 5단 조립식 선반', expected: '선반' },
  { category: '수납', productName: '패브릭 접이식 대용량 정리함', expected: '정리함' },
  { category: '수납', productName: '슬라이드 서랍형 차량용 트렁크정리함', expected: '트렁크정리함' },
  { category: '수납', productName: '벽걸이형 스텐레스 슬림 우산꽂이', expected: '우산꽂이' },
  { category: '수납', productName: '접이식 대용량 이불수납백 압축형', expected: '이불수납백' },

  // ── 펫 ────────────────────────────────────────────────────────────────
  { category: '펫', productName: '프리미엄 실리콘 논슬립 강아지밥그릇 2단형', expected: '강아지밥그릇' },
  { category: '펫', productName: '대형 고양이 강아지 공용 자동급식기', expected: '자동급식기' },
  { category: '펫', productName: '탈부착 세척 용이 대형 고양이화장실', expected: '고양이화장실' },
  { category: '펫', productName: '휴대용 소형견용 강아지 이동가방', expected: '이동가방' },
  { category: '펫', productName: '저소음 무선 휴대용 미니 강아지털드라이기', expected: '강아지털드라이기' },
  { category: '펫', productName: '방수 대형 강아지 배변패드', expected: '배변패드' },

  // ── 욕실 ──────────────────────────────────────────────────────────────
  { category: '욕실', productName: '규조토 논슬립 빠른건조 욕실매트', expected: '욕실매트' },
  { category: '욕실', productName: '벽걸이형 흡착식 스텐레스 칫솔꽂이', expected: '칫솔꽂이' },
  { category: '욕실', productName: '스텐레스 절수형 이온필터 샤워헤드 교체용', expected: '샤워헤드' },
  { category: '욕실', productName: '무타공 접착식 스텐레스 수건걸이', expected: '수건걸이' },
  { category: '욕실', productName: '다용도 미끄럼방지 심플 변기커버', expected: '변기커버' },
  { category: '욕실', productName: '휴대용 여행용 실리콘 비누케이스', expected: '비누케이스' },

  // ── 의류 ──────────────────────────────────────────────────────────────
  { category: '의류', productName: '기모 오버핏 스트릿 후드티', expected: '후드티' },
  { category: '의류', productName: '보들보들 극세사 롱기장 수면잠옷', expected: '수면잠옷' },
  { category: '의류', productName: '기본형 브이넥 얇은 니트가디건', expected: '니트가디건' },
  { category: '의류', productName: '고탄력 절개 여성 요가레깅스', expected: '요가레깅스' },
  { category: '의류', productName: '방한 방풍 극세사 겨울 수면양말', expected: '수면양말' },
  { category: '의류', productName: '심플 데일리 인조가죽 미니 크로스백', expected: '크로스백' },

  // ── 자동차 ────────────────────────────────────────────────────────────
  { category: '자동차', productName: '차량용 무선 자동클램프 휴대폰거치대', expected: '휴대폰거치대' },
  { category: '자동차', productName: '접이식 차량용 걸이형 방수 미니쓰레기통', expected: '미니쓰레기통' },
  { category: '자동차', productName: '차량용 접이식 대용량 방수 트렁크정리함', expected: '트렁크정리함' },
  { category: '자동차', productName: '차량용 고속충전 거치대겸용 무선충전기', expected: '무선충전기' },
  { category: '자동차', productName: '차량용 지속형 은은한 향 방향제', expected: '방향제' },
  { category: '자동차', productName: '차량용 메모리폼 여행용 목쿠션', expected: '목쿠션' },

  // ── 문구 ──────────────────────────────────────────────────────────────
  { category: '문구', productName: '대용량 철제 사무용 클립보드', expected: '클립보드' },
  { category: '문구', productName: '심플 데스크 다용도 펜꽂이', expected: '펜꽂이' },
  { category: '문구', productName: '휴대용 미니 소형 학생용 스테이플러', expected: '스테이플러' },
  { category: '문구', productName: '접착식 벽걸이 자석형 화이트보드', expected: '화이트보드' },
  { category: '문구', productName: '무선링 A5 심플 데일리 스프링노트', expected: '스프링노트' },
  { category: '문구', productName: '탁상용 대형 데스크 심플 캘린더', expected: '캘린더' },

  // ── 리빙 ──────────────────────────────────────────────────────────────
  { category: '리빙', productName: '디자인 복 개업선물 인테리어소품 달항아리', expected: '달항아리' },
  { category: '리빙', productName: 'LED 침실 터치식 충전식 무드등', expected: '무드등' },
  { category: '리빙', productName: '북유럽 감성 원목 미니 협탁', expected: '협탁' },
  { category: '리빙', productName: '패브릭 신축성 사계절 소파커버', expected: '소파커버' },
  { category: '리빙', productName: '암막 방한 완자형 거실 침실용 커튼', expected: '커튼' },
  { category: '리빙', productName: '초음파 무드등겸용 휴대용 미니가습기', expected: '미니가습기' },
];
