export interface NaverCategory {
  categoryId: string;
  depth1: string;
  depth2: string;
  depth3: string;
  depth4: string;
}

export const NAVER_CATEGORIES: NaverCategory[] = [
  // 가구/인테리어 - 거실가구
  { categoryId:'50001310', depth1:'가구/인테리어', depth2:'거실가구', depth3:'TV거실장', depth4:'' },
  { categoryId:'50003242', depth1:'가구/인테리어', depth2:'거실가구', depth3:'소파', depth4:'가죽소파' },
  { categoryId:'50003245', depth1:'가구/인테리어', depth2:'거실가구', depth3:'소파', depth4:'리클라이너소파' },
  { categoryId:'50003247', depth1:'가구/인테리어', depth2:'거실가구', depth3:'소파', depth4:'소파베드' },
  { categoryId:'50003243', depth1:'가구/인테리어', depth2:'거실가구', depth3:'소파', depth4:'인조가죽소파' },
  { categoryId:'50003244', depth1:'가구/인테리어', depth2:'거실가구', depth3:'소파', depth4:'패브릭소파' },
  { categoryId:'50003250', depth1:'가구/인테리어', depth2:'거실가구', depth3:'소파', depth4:'빈백' },
  { categoryId:'50001311', depth1:'가구/인테리어', depth2:'거실가구', depth3:'장식장', depth4:'' },
  { categoryId:'50003251', depth1:'가구/인테리어', depth2:'거실가구', depth3:'테이블', depth4:'거실테이블' },
  { categoryId:'50003253', depth1:'가구/인테리어', depth2:'거실가구', depth3:'테이블', depth4:'사이드테이블' },
  { categoryId:'50003254', depth1:'가구/인테리어', depth2:'거실가구', depth3:'테이블', depth4:'접이식테이블' },
  // 침실가구
  { categoryId:'50020639', depth1:'가구/인테리어', depth2:'침실가구', depth3:'침대', depth4:'일반침대' },
  { categoryId:'50003219', depth1:'가구/인테리어', depth2:'침실가구', depth3:'침대', depth4:'돌침대' },
  { categoryId:'50003215', depth1:'가구/인테리어', depth2:'침실가구', depth3:'침대', depth4:'침대프레임' },
  { categoryId:'50018859', depth1:'가구/인테리어', depth2:'침실가구', depth3:'매트리스', depth4:'' },
  { categoryId:'50007189', depth1:'가구/인테리어', depth2:'침실가구', depth3:'서랍장', depth4:'' },
  { categoryId:'50001307', depth1:'가구/인테리어', depth2:'침실가구', depth3:'협탁', depth4:'' },
  { categoryId:'50003232', depth1:'가구/인테리어', depth2:'침실가구', depth3:'화장대', depth4:'일반화장대' },
  { categoryId:'50003227', depth1:'가구/인테리어', depth2:'침실가구', depth3:'장롱/붙박이장', depth4:'옷장' },
  { categoryId:'50003231', depth1:'가구/인테리어', depth2:'침실가구', depth3:'장롱/붙박이장', depth4:'드레스룸' },
  { categoryId:'50003237', depth1:'가구/인테리어', depth2:'침실가구', depth3:'거울', depth4:'벽걸이거울' },
  { categoryId:'50003238', depth1:'가구/인테리어', depth2:'침실가구', depth3:'거울', depth4:'전신거울' },
  { categoryId:'50003239', depth1:'가구/인테리어', depth2:'침실가구', depth3:'거울', depth4:'탁상거울' },
  { categoryId:'50003240', depth1:'가구/인테리어', depth2:'침실가구', depth3:'거울', depth4:'손거울' },
  // 침구단품
  { categoryId:'50000970', depth1:'가구/인테리어', depth2:'침구단품', depth3:'차렵이불', depth4:'' },
  { categoryId:'50000972', depth1:'가구/인테리어', depth2:'침구단품', depth3:'이불커버', depth4:'' },
  { categoryId:'50000973', depth1:'가구/인테리어', depth2:'침구단품', depth3:'담요', depth4:'' },
  { categoryId:'50000974', depth1:'가구/인테리어', depth2:'침구단품', depth3:'무릎담요', depth4:'' },
  { categoryId:'50000971', depth1:'가구/인테리어', depth2:'침구단품', depth3:'홑이불', depth4:'' },
  { categoryId:'50003480', depth1:'가구/인테리어', depth2:'침구단품', depth3:'패드', depth4:'더블/퀸/킹패드' },
  { categoryId:'50003479', depth1:'가구/인테리어', depth2:'침구단품', depth3:'패드', depth4:'싱글/슈퍼싱글패드' },
  { categoryId:'50000976', depth1:'가구/인테리어', depth2:'침구단품', depth3:'기타침구단품', depth4:'' },
  // 침구세트/베개/솜류
  { categoryId:'50003493', depth1:'가구/인테리어', depth2:'침구세트', depth3:'이불베개세트', depth4:'더블/퀸이불베개세트' },
  { categoryId:'50003491', depth1:'가구/인테리어', depth2:'침구세트', depth3:'이불베개세트', depth4:'싱글이불베개세트' },
  { categoryId:'50016880', depth1:'가구/인테리어', depth2:'베개', depth3:'계절베개', depth4:'' },
  { categoryId:'50016741', depth1:'가구/인테리어', depth2:'베개', depth3:'라텍스베개', depth4:'' },
  { categoryId:'50016900', depth1:'가구/인테리어', depth2:'베개', depth3:'메모리폼베개', depth4:'' },
  { categoryId:'50016920', depth1:'가구/인테리어', depth2:'베개', depth3:'베개커버', depth4:'' },
  { categoryId:'50016940', depth1:'가구/인테리어', depth2:'베개', depth3:'베개커버세트', depth4:'' },
  { categoryId:'50000979', depth1:'가구/인테리어', depth2:'솜류', depth3:'쿠션솜', depth4:'' },
  { categoryId:'50000980', depth1:'가구/인테리어', depth2:'솜류', depth3:'방석솜', depth4:'' },
  { categoryId:'50003501', depth1:'가구/인테리어', depth2:'솜류', depth3:'베개솜/속통', depth4:'일반베개솜' },
  // 수납가구/서재사무
  { categoryId:'50001320', depth1:'가구/인테리어', depth2:'수납가구', depth3:'수납장', depth4:'' },
  { categoryId:'50001321', depth1:'가구/인테리어', depth2:'수납가구', depth3:'선반', depth4:'' },
  { categoryId:'50001326', depth1:'가구/인테리어', depth2:'수납가구', depth3:'신발장', depth4:'' },
  { categoryId:'50001319', depth1:'가구/인테리어', depth2:'수납가구', depth3:'행거', depth4:'' },
  { categoryId:'50001325', depth1:'가구/인테리어', depth2:'수납가구', depth3:'CD/DVD장', depth4:'' },
  { categoryId:'50003296', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'사무/교구용가구', depth4:'사무용책상' },
  { categoryId:'50003299', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'사무/교구용가구', depth4:'사무용의자' },
  { categoryId:'50003298', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'사무/교구용가구', depth4:'사무용소파' },
  { categoryId:'50003304', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'사무/교구용가구', depth4:'교구용가구/소품' },
  { categoryId:'50003264', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'의자', depth4:'일반의자' },
  { categoryId:'50003266', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'의자', depth4:'스툴' },
  { categoryId:'50001346', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'책장', depth4:'' },
  { categoryId:'50001347', depth1:'가구/인테리어', depth2:'서재/사무용가구', depth3:'책꽂이', depth4:'' },
  // 홈데코
  { categoryId:'50003642', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'일반방석' },
  { categoryId:'50003643', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'계절방석' },
  { categoryId:'50003644', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'기능성방석' },
  { categoryId:'50003646', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'일반쿠션' },
  { categoryId:'50003647', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'기능성쿠션' },
  { categoryId:'50003648', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'등쿠션' },
  { categoryId:'50003650', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'헤드쿠션' },
  { categoryId:'50003654', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'쿠션커버' },
  { categoryId:'50003655', depth1:'가구/인테리어', depth2:'홈데코', depth3:'쿠션/방석', depth4:'쿠션/방석커버세트' },
  { categoryId:'50003522', depth1:'가구/인테리어', depth2:'홈데코', depth3:'주방데코', depth4:'식탁보' },
  { categoryId:'50003524', depth1:'가구/인테리어', depth2:'홈데코', depth3:'주방데코', depth4:'식탁매트' },
  { categoryId:'50003517', depth1:'가구/인테리어', depth2:'홈데코', depth3:'커버류', depth4:'소파커버/패드' },
  // 카페트/러그/커튼
  { categoryId:'50000981', depth1:'가구/인테리어', depth2:'카페트/러그', depth3:'러그', depth4:'' },
  { categoryId:'50000982', depth1:'가구/인테리어', depth2:'카페트/러그', depth3:'발매트', depth4:'' },
  { categoryId:'50003514', depth1:'가구/인테리어', depth2:'커튼/블라인드', depth3:'커튼', depth4:'거실용커튼' },
  { categoryId:'50003515', depth1:'가구/인테리어', depth2:'커튼/블라인드', depth3:'커튼', depth4:'창문용커튼' },
  { categoryId:'50000859', depth1:'가구/인테리어', depth2:'커튼/블라인드', depth3:'블라인드', depth4:'' },
  { categoryId:'50000857', depth1:'가구/인테리어', depth2:'커튼/블라인드', depth3:'로만셰이드', depth4:'' },
  // 인테리어소품/DIY
  { categoryId:'50003334', depth1:'가구/인테리어', depth2:'인테리어소품', depth3:'조명', depth4:'거실조명' },
  { categoryId:'50003343', depth1:'가구/인테리어', depth2:'인테리어소품', depth3:'시계', depth4:'벽시계' },
  { categoryId:'50003347', depth1:'가구/인테리어', depth2:'인테리어소품', depth3:'액자', depth4:'벽걸이액자' },
  { categoryId:'50003355', depth1:'가구/인테리어', depth2:'인테리어소품', depth3:'아로마/캔들용품', depth4:'아로마램프/오일' },
  { categoryId:'50001071', depth1:'가구/인테리어', depth2:'인테리어소품', depth3:'화병', depth4:'' },
  { categoryId:'50001066', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'데코스티커', depth4:'' },
  { categoryId:'50001060', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'목재', depth4:'' },
  { categoryId:'50003315', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'바닥재', depth4:'마루' },
  { categoryId:'50003321', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'바닥재', depth4:'기타바닥재' },
  { categoryId:'50003307', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'가구부속품', depth4:'가구다리' },
  { categoryId:'50003308', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'가구부속품', depth4:'가구바퀴' },
  { categoryId:'50003309', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'가구부속품', depth4:'경첩/꺽쇠/자석철물류' },
  { categoryId:'50003314', depth1:'가구/인테리어', depth2:'DIY자재/용품', depth3:'가구부속품', depth4:'기타가구부속품' },
  // 패션잡화
  { categoryId:'50000909', depth1:'패션잡화', depth2:'가방', depth3:'크로스백', depth4:'' },
  { categoryId:'50000910', depth1:'패션잡화', depth2:'가방', depth3:'에코백', depth4:'' },
  { categoryId:'50000911', depth1:'패션잡화', depth2:'가방', depth3:'토트백', depth4:'' },
  { categoryId:'50000912', depth1:'패션잡화', depth2:'가방', depth3:'숄더백', depth4:'' },
  { categoryId:'50000900', depth1:'패션잡화', depth2:'양말', depth3:'여성양말', depth4:'중목/장목양말' },
  { categoryId:'50000901', depth1:'패션잡화', depth2:'양말', depth3:'여성양말', depth4:'발목양말' },
  { categoryId:'50000902', depth1:'패션잡화', depth2:'양말', depth3:'여성양말', depth4:'덧신/패드양말' },
  { categoryId:'50000903', depth1:'패션잡화', depth2:'양말', depth3:'남성양말', depth4:'중목/장목양말' },
  { categoryId:'50000904', depth1:'패션잡화', depth2:'양말', depth3:'아동양말', depth4:'' },
  { categoryId:'50000906', depth1:'패션잡화', depth2:'패션소품', depth3:'머플러', depth4:'' },
  { categoryId:'50000907', depth1:'패션잡화', depth2:'패션소품', depth3:'장갑', depth4:'' },
  { categoryId:'50000908', depth1:'패션잡화', depth2:'패션소품', depth3:'모자', depth4:'' },
  // 패션의류
  { categoryId:'50000800', depth1:'패션의류', depth2:'여성의류', depth3:'원피스', depth4:'' },
  { categoryId:'50000801', depth1:'패션의류', depth2:'여성의류', depth3:'블라우스/셔츠', depth4:'' },
  { categoryId:'50000802', depth1:'패션의류', depth2:'여성의류', depth3:'레깅스', depth4:'' },
  { categoryId:'50000803', depth1:'패션의류', depth2:'여성의류', depth3:'티셔츠', depth4:'' },
  { categoryId:'50000804', depth1:'패션의류', depth2:'여성의류', depth3:'니트/스웨터', depth4:'' },
  { categoryId:'50000805', depth1:'패션의류', depth2:'여성의류', depth3:'자켓/점퍼', depth4:'' },
  { categoryId:'50000806', depth1:'패션의류', depth2:'여성의류', depth3:'코트', depth4:'' },
  { categoryId:'50000807', depth1:'패션의류', depth2:'여성의류', depth3:'바지', depth4:'' },
  { categoryId:'50000808', depth1:'패션의류', depth2:'여성의류', depth3:'스커트', depth4:'' },
  { categoryId:'50000810', depth1:'패션의류', depth2:'남성의류', depth3:'티셔츠', depth4:'' },
  { categoryId:'50000811', depth1:'패션의류', depth2:'남성의류', depth3:'셔츠', depth4:'' },
  { categoryId:'50000812', depth1:'패션의류', depth2:'남성의류', depth3:'바지', depth4:'' },
];
export function getDepth1List(): string[] {
  return [...new Set(NAVER_CATEGORIES.map(c => c.depth1))];
}
export function getDepth2List(d1: string): string[] {
  return [...new Set(NAVER_CATEGORIES.filter(c => c.depth1 === d1).map(c => c.depth2))];
}
export function getDepth3List(d1: string, d2: string): string[] {
  return [...new Set(NAVER_CATEGORIES.filter(c => c.depth1 === d1 && c.depth2 === d2).map(c => c.depth3))];
}
export function getDepth4List(d1: string, d2: string, d3: string): string[] {
  return NAVER_CATEGORIES
    .filter(c => c.depth1 === d1 && c.depth2 === d2 && c.depth3 === d3 && c.depth4 !== '')
    .map(c => c.depth4);
}
export function getCategoryId(d1: string, d2: string, d3: string, d4: string): string {
  const found = NAVER_CATEGORIES.find(c =>
    c.depth1 === d1 && c.depth2 === d2 && c.depth3 === d3 && c.depth4 === d4
  );
  return found?.categoryId || '';
}

export interface CategorySearchResult {
  categoryId: string;
  depth1: string;
  depth2: string;
  depth3: string;
  depth4: string;
  // full breadcrumb for display
  breadcrumb: string;
  // relevance score for sorting
  score: number;
}

export function searchCategories(query: string, limit = 20): CategorySearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/);

  const results: CategorySearchResult[] = NAVER_CATEGORIES.map(c => {
    const parts = [c.depth1, c.depth2, c.depth3, c.depth4].filter(Boolean);
    const breadcrumb = parts.join(' > ');
    const haystack = breadcrumb.toLowerCase();

    let score = 0;

    // Exact full match: highest priority
    if (haystack === q) score += 100;

    // Leaf node (depth3 or depth4) exact match: very high
    const leaf = (c.depth4 || c.depth3).toLowerCase();
    if (leaf === q) score += 80;
    else if (leaf.startsWith(q)) score += 60;
    else if (leaf.includes(q)) score += 40;

    // All terms present anywhere
    const allMatch = terms.every(t => haystack.includes(t));
    if (allMatch && score === 0) score += 20;

    // Partial: any term matches
    terms.forEach(t => {
      if (haystack.includes(t)) score += 5;
    });

    return { ...c, breadcrumb, score };
  }).filter(r => r.score > 0);

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function getCategoryById(id: string): NaverCategory | undefined {
  return NAVER_CATEGORIES.find(c => c.categoryId === id);
}