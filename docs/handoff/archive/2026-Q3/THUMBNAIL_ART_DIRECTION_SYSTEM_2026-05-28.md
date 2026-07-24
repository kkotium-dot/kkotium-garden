# 썸네일 아트디렉션 시스템 — conceptTone 기반 팔레트 + 프리미엄 크래프트

> **상태**: SPEC (Code Phase G8-ENGINE-Q1 "Quick Win" 구현 대기)
> **작성**: 2026-05-28 Desktop turn (G8-ENGINE 디자인 품질 개선 — 대표 지적 "썸네일 퀄리티 부족" 대응)
> **baseline**: eb72b9e (G8-ENGINE 엔진 [CLOSED], origin/main, Vercel READY)
> **성격**: 엔진(배관)은 완성. 본 문서는 렌더러 크래프트(물) 품질 스펙 — fallback/auto 기본 출력을 프리미엄 베이스라인으로 격상.

---

## 0. 배경 — 왜 이 작업인가

G8-ENGINE 엔진 빌드(eb72b9e) 후 production 썸네일이 이전보다 차별화됐으나 **디자인 품질이 여전히 낮음**(대표 지적). 진단 결과 근본 원인 2가지:

1. **렌더러 크래프트 부재**: 단색 fill 배경 + 공중부양(접지 그림자 0) + 기본 폰트 = "AI 템플릿" 인상 -> 전환율 저해.
2. **톤이 진단과 불일치**: 팔레트가 conceptTone을 무시. 아이스트레이 실측 conceptTone=`warm`인데 임의 쿨톤 적용 시 상품 정체성 불일치.

핵심 통찰: **썸네일 품질의 80%는 배경 + 접지. 그리고 톤은 디자이너 직관이 아니라 conceptTone(진단)이 결정해야 함.**

실측 근거 (Diagnosis 테이블, productId=cmpp62yje00015xup5h8pgwx0):
```json
{"genre":"minimal","context":"daily","persona":"senior","colorMood":"warm",
 "photoStyle":"detail","productType":"single","emotionalTone":"friendly","pricePosition":"budget"}
```

---

## 1. conceptTone -> 팔레트 결정기 (엔진 로직)

신규 모듈 제안: `src/lib/automation/thumbnail-art-direction.ts`

### 1-A. 팔레트 프리셋 (colorMood 축 기반)

| 프리셋 | colorMood 트리거 | top(벽) | floor(바닥) | accent | 용도 |
|---|---|---|---|---|---|
| WARM | warm | (244,238,230) | (252,248,242) | (214,150,90) | 주방/푸드/일상 친근 |
| COOL | cool | (236,240,244) | (250,251,253) | (120,160,190) | 청결/테크/프레시 |
| VIVID | vivid | (250,240,244) | (255,250,252) | #E62310 | 강소구/이벤트 |
| PASTEL | pastel/soft | (252,246,249) | (255,252,254) | #FFCCEA | 베이비/뷰티/젠틀 |

미지 colorMood -> WARM 기본 폴백(가장 안전한 범용).

### 1-B. 보조 축 모듈레이션

| 축 | 값 | 합성 파라미터 변화 |
|---|---|---|
| pricePosition | budget | 밝은 스윕, 스포트라이트↑, 친근 |
| pricePosition | premium/luxury | 저채도 스윕, 대비↑, 여백↑, 드라마틱 스포트라이트 |
| emotionalTone | friendly | 부드러운 스포트라이트(strength ~40) |
| emotionalTone | premium/elegant | 집중 스포트라이트 + 엣지 비네팅 |
| persona | senior | 타이포 스케일 +15%, 고대비 텍스트 |
| genre | minimal | 제품 스케일 축소(여백↑) |

### 1-C. 결정 함수 시그니처

```
pickArtDirection(conceptTone) -> {
  palette: {top, floor, accent, spotlight},
  productScale: number,
  typeScale: number,
  vignette: boolean
}
```
conceptTone 없으면(진단 미실행) productType/category 기반 휴리스틱 폴백.

---

## 2. 프리미엄 크래프트 레시피 (전 변형 공통, Sharp 구현)

현 thumbnail-generator.ts의 4 renderer가 아래 파이프라인을 공유하도록 리팩터:

1. **사이클로라마 스윕 배경**: 단색 fill 폐기. 벽(top)->바닥(floor) seamless 그라데이션, horizon ~0.62. (단색 대비 깊이 확보)
2. **소프트 스포트라이트**: 제품 뒤 radial 화이트 글로우(GaussianBlur ~120). 시선 집중.
3. **접지 2겹**: 캐스트 그림자(넓고 흐림, blur ~26) + 컨택트 그림자(좁고 진함, blur ~10). 공중부양 해소 = 무게감.
4. **바닥 반사**: 제품 상하반전 + 상단 강/하단 소멸 alpha fade(~60 max). 스튜디오 프리미엄 시그널.
5. **타이포 위계** (텍스트 변형만): 키커(소·트래킹·accent색) -> 헤드라인(대·INK·2줄 타이트) -> 서브(reg·그레이) + accent rule. **Pretendard 번들 필수**(현 데모는 Noto 대체, Pretendard 시 +5% 정교).
6. **안전영역 그리드**: 좌우 패딩 ~80px, 텍스트 안전영역 상단 정렬.

### 2-A. 네이버 정책 게이트 (절대)

- **clean 변형 = 대표이미지 = 텍스트/워터마크 0** (네이버 대표이미지 정책). 무텍스트 프리미엄 스튜디오만.
- price/badge/lifestyle = 추가이미지 -> 텍스트 허용.

---

## 3. 변형별 매핑 (4변형)

| 변형 | 배경 | 텍스트 | 비고 |
|---|---|---|---|
| clean | 팔레트 스윕 + 스포트라이트 + 접지 + 반사 | **없음** | 대표이미지 후보 |
| price | 동일 스윕 | 가격(accent pill, 둥근 14px) | 추가이미지 |
| badge | 동일 스윕 | 카테고리 칩 | 추가이미지 |
| lifestyle | backdropUrl(Storage 씬) 있으면 우선, 없으면 팔레트 스윕 | 헤드라인 위계 | resolver backdrop 연동 |

---

## 4. Real Win 연계 (천장 — 별도 트랙)

본 Quick Win은 **fallback/auto 베이스라인**을 프리미엄으로 격상. 진짜 실사급 천장은:
- 대표가 Firefly 웹에서 라이프스타일 씬 배경 생성(B 레이어) -> Storage `product-assets/{id}/backdrop-{skeletonId}.png` 적재 -> resolver가 auto-cache로 소비 -> lifestyle 변형이 실사 씬.
- Quick Win 팔레트 스윕은 그 배경이 없을 때의 우아한 폴백.

---

## 5. Code 붙여넣기 메시지 (새 Claude Code 세션)

```
꽃틔움 가든 Code. Phase G8-ENGINE-Q1 썸네일 아트디렉션 품질 격상.
[STEP 0] CLAUDE.md 자동 + PROGRESS.md 헤더 + TASK_BRIDGE §3 ACTIVE +
  docs/handoff/THUMBNAIL_ART_DIRECTION_SYSTEM_2026-05-28.md 정독.
[베이스라인] eb72b9e (origin/main, Vercel READY, G8-ENGINE 엔진 [CLOSED]).
[근거] 현 썸네일 디자인 품질 부족(대표 지적). 근본: 렌더러 단색fill+공중부양+톤이 conceptTone 무시.
  Desktop 실증: 아이스트레이 conceptTone.colorMood=warm인데 임의 쿨톤 적용은 불일치.
  데이터 기반 warm 팔레트가 정합 확인(육안).
[SCOPE] (의존성 순서):
  1. src/lib/automation/thumbnail-art-direction.ts 신규 — pickArtDirection(conceptTone)
     -> {palette(top/floor/accent/spotlight), productScale, typeScale, vignette}.
     팔레트 프리셋 4종(WARM/COOL/VIVID/PASTEL, colorMood 트리거) + 보조축 모듈레이션
     (pricePosition/emotionalTone/persona/genre). conceptTone 없으면 productType 휴리스틱.
  2. thumbnail-generator.ts 4 renderer 공통 크래프트 파이프라인 리팩터:
     사이클로라마 스윕(단색fill 폐기) + 소프트 스포트라이트 + 접지 2겹(캐스트+컨택트)
     + 바닥 반사 + 타이포 위계. art-direction 출력 소비.
  3. route가 Diagnosis.conceptTone 조회 -> pickArtDirection -> generator 전달.
     (이미 skeletonId matchSkeleton 산출 중이므로 conceptTone도 동일 경로로)
  4. Pretendard 폰트 번들 -> SVG/Sharp 텍스트에 적용(현 Noto 대체분 교체).
  5. clean 변형 텍스트 0 게이트 확인(네이버 대표이미지 정책).
  각 단계 TSC 0 + build 0 + verify-vercel-deploy.sh --wait exit 0.
[검증] production POST /api/thumbnail/<icetray>:
  - 4변형 200 + errors 0
  - clean 변형 텍스트 0
  - conceptTone=warm 반영(웜 팔레트) 확인
  - assetSource/lowResolution 회귀 0
[절대준수] 한글 literal / 이모지 금지(Lucide) / 영어 주석 / 한글 리터럴 타입 금지 /
  heredoc 금지(#26) / 거짓 라벨 금지(#46) / new PrismaClient 금지(prisma 싱글톤) /
  외부 이미지 API 런타임 0(#38) / Sharp 무거운 합성 서버측(maxDuration) /
  Production=Vercel only / SD-01 보존 / 비가역 0.
[통과 후] Desktop E2E 육안 재검증 -> Real Win(Firefly 씬 배경 Storage 적재) 트랙.
```

---

## 6. 작업 유의사항 (이번 turn + 영구)

- **#46 거짓 라벨 금지**: "디자인 좋아짐"을 추측이 아닌 conceptTone 정합 + 육안으로만 단정. 본 turn 제 첫 데모(쿨톤)가 진단(warm)과 불일치했던 것을 정직하게 정정.
- **데이터 우선 디자인**: 톤/팔레트는 디자이너 직관이 아니라 conceptTone(Diagnosis) 파생. 직관은 크래프트 레시피(그림자/반사/위계)에만 적용.
- **네이버 정책**: clean 변형(대표이미지) 텍스트/워터마크 절대 0.
- **#38 외부 이미지 API 런타임 0**: 팔레트 스윕은 Sharp 로컬 합성. Firefly 씬은 Storage 사전 적재본만.
- **Pretendard**: 브랜드 폰트. 컨테이너 데모는 Noto 대체(한계 명시). 엔진은 Pretendard 번들.
- **SD-01**: studio 아랍어 footer 영구 보존. 비가역 0(네이버 미발행).
