# 꽃틔움 가든 — AI 제품 교체/합성 반자동 루프 + Adobe 전 기능 활용 + 앱 통합 설계

> **작성**: 2026-06-06 (Desktop turn, 연구 산출물 #49 직접 저장)
> **상위 문서**: KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md (asset_jobs 상태머신 + 컨셉 조합 엔진 + 3중 누락방지)
> **목적**: AI 생성 이미지에서 "상상의 제품"을 "실제 판매 제품"으로 바꾸는 반자동 루프를 전체 시스템으로 설계. 상품 한 건이 아닌 수백 개 범용.
> **대표 확정 원칙**: 이미지 생성은 면책/크레딧 불문 최고 품질 모델 / 각 프로그램·기능 장점 최대 활용(적재적소) / 브라우저는 대표가 로그인 환경 열어두면 AI가 반자동 이어받기 / 병행 누락 0.

---

## 0. TL;DR (핵심 3줄)

1. **1차 방식 = B안("제품 고정, 배경 생성").** Firefly가 만든 "상상의 디퓨저"를 교체하는 게 아니라, **실제 제품 누끼를 고정**하고 배경/무드만 AI로 생성해 합성한다. 명화 라벨 유리병처럼 라벨·텍스트·형태 보존이 전환율과 직결되는 제품은 재생성(채우기) 시 라벨이 왜곡된다(Adobe·Google 공식 문서 + Claid/Photoroom 업계 일치).
2. **도구 적재적소**: 배경 생성=Firefly 웹(Nano Banana Pro) 반자동 / 누끼·합성·빛 정합=Photoshop(Harmonize) / 마감·브랜드·대량변형=Adobe Express(Bulk Create) / 규격화=Sharp 서버.
3. **앱 통합**: asset_jobs에 product_swap 계열 job_type + reference 자산 추적 + awaiting_human 핸드오프 상태 추가. "사람이 브라우저 열면 AI가 이어받기"를 pause→handoff→resume 패턴으로.

---

## 1. 1차 방식 결정 — "제품 고정, 배경 생성"(B안)

### 왜 B안인가 (교체가 아니라 합성)
- **전환율 ↔ 반품의 양면**: 고품질 이미지 시 신발 +17%·핸드백 +25% 판매(Cornell Tech eBay 분석), 전문 사진 전환율 +33%(Shopify). 그러나 소비자 71%가 "실물이 사진과 달라" 반품 경험(Salsify), 2024 미국 반품률 16.9%. → **라벨을 왜곡하는 AI 합성은 전환을 올리려다 반품·클레임을 키우는 자충수.**
- **Adobe Photoshop 공식**: reference 생성형 채우기는 "Place into(배경 보존하며 객체 추가)" vs "Swap(영역 객체 교체)" 두 의도 제공. 둘 다 선택 영역을 "재생성"하므로 라벨 픽셀 보존 미보장.
- **Google Nano Banana Pro**: 최대 14장 병합·인물 5명 일관성 유지하나, "다중 소스 병합 시 미세 디테일 흐려짐 / 1K에서 작은 텍스트 뭉개짐 / reference 과편집" 한계 문서화. arXiv 합성 연구도 "전경 텍스트 보존 실패 / 작은 배치 박스에서 디테일 손실" 명시.
- **전자상거래 AI 사진 업계 일치**: Claid "제품에 텍스트 있으면 AI Backgrounds로 패키징 디테일 보존하라". Macks AI "세그멘테이션·마스킹으로 제품을 격리하면 AI는 배경·장면·조명만 수정 → 지오메트리·색상·소재 보존".

**결론: 명화 라벨 유리병 디퓨저는 "실제 제품 누끼 → 배경 AI 생성 → 레이어 합성 → 빛 정합"의 B안. Firefly의 상상 디퓨저는 버린다.**

### B안 단계별 실행
1. **제품 누끼 확보**: 도매매 원본/직접촬영에서 분리. 펜툴 패스→레이어 마스크(각진 병·라벨), Feather 0.3px. 원본 배경거리 충분할수록 경계 깨끗.
2. **무드 배경 생성(제품 없이)**: Firefly 웹 Nano Banana Pro로 우드톤/화이트/차량 배경 1:1. 제품 자리는 비운 "빈 무대". 프롬프트는 환경·조명·맥락만(제품 묘사 X).
3. **합성**: Photoshop에서 누끼를 배경 위 레이어 배치. 크기·원근·접지 조정.
4. **빛·그림자 정합(가장 중요)**: Photoshop Harmonize로 광원·색온도 자동 정합 + 접지 그림자(Perspective Distort) + Dodge/Burn. "스티커처럼 떠 보이는" 합성 실패 방지.
5. **검수**: 100% 확대 라벨 가독성·경계 확인, 모바일 1080px 미리보기.

---

## 2. Adobe Express 전 기능 활용 매핑

Express는 "소재 가공"이 아니라 **"최종 마감·브랜드·대량 변형"**에서 가치 최대.

| 기능 | 활용 |
|---|---|
| 브랜드 키트 + Apply Brand | 로고·#E62310·#FAF8F3·Pretendard·꼬띠 1클릭 적용 |
| Bulk Create(일괄 생성) | CSV 변수화(전경=제품누끼/배경=무드/텍스트=상품명) → 수백 개 변형. **대량 반복의 핵심 엔진** |
| 생성형 채우기/Expand | 1:1 → 9:16 스토리·세로 상세컷 확장 |
| 템플릿 + Text to Template | 상세페이지 섹션·SNS 레이아웃 |
| AI Assistant(2025 베타) | 프롬프트 일괄 수정 + 수동 편집 병행 |
| 리사이즈 | 멀티 플랫폼 규격 |
| 목업(4500+) | 디바이스/제품 목업 |
| 배경 제거 | 누끼 보조(정밀은 Photoshop 우위) |

**역할 분담**: Firefly=생성 / Photoshop=정밀 합성·누끼·빛 정합 / Express=브랜드 마감·대량변형·리사이즈. "Open in Express", "Open in Photoshop" 핸드오프 공식 지원.

---

## 3. 도구 오케스트레이션 Decision Matrix

| 단계 | 최적 도구 | 사람/AI 분담 |
|---|---|---|
| 도매매 원본 수집 | 앱 | AI 수집 + 사람 승인 |
| 제품 누끼 | Photoshop(정밀)/MCP image_remove_background(자동) | AI 우선, 복잡 경계는 사람 |
| 무드 배경 생성 | Firefly 웹 + Nano Banana Pro | 사람 로그인·업로드 / AI 프롬프트·생성·선택 반자동 |
| 제품 합성 | Photoshop(레이어 우선, reference fill 보조) | AI 제안 + 사람 검수 |
| 빛·그림자 정합 | Photoshop Harmonize | AI 자동 + 사람 미세조정 |
| 최종 마감/브랜드 | Adobe Express(Brand Kit, Bulk Create) | AI 일괄 + 사람 승인 |
| 네이버 규격화 | Sharp(서버) | 완전 자동 |
| 발행 | 앱 → 스마트스토어 | AI 준비 + 사람 최종 클릭(비가역) |

---

## 4. 브라우저 반자동화 Human-in-the-Loop 분담

Claude in Chrome(베타): 로그인 세션 위 조작 가능하나 느리고 프롬프트 인젝션 잔여 위험 11.2%(Anthropic 공식). 비가역·민감 작업 부적합.

**사람 담당(비가역·고위험·봇차단)**: 로그인/MFA, CAPTCHA, 로컬 파일 업로드, 다운로드 확인, 결제·발행 비가역 클릭, 최종 품질 승인.
**AI 담당(반복·저위험)**: 프롬프트 입력, 생성 클릭, 변형 선택, 내비게이션, 상태 폴링, 로그 읽기.

**핸드오프 패턴(detect→deliver→resume)**: ① AI가 인증벽·업로드 지점 감지→일시정지 ② 앱이 "지금 이 작업 하세요" 알림(딥링크/Live View) ③ 사람 해결 ④ AI가 DOM·이벤트 폴링으로 완료 감지→재개. "높은 핸드오프 비율은 실패가 아니라 자기 한계를 아는 견고한 시스템의 신호".

**파일 입출력**: Firefly "Open in Express/Copy image" 공유. 다운로드는 공유 폴더(raw/→needs_review/→approved/)를 상태머신처럼 → 사람이 approved/로 옮기면 AI가 watch해 다음 단계.

---

## 5. 네이버 정책 가드 & 전환율 (2024-10-28 강화)

**대표이미지 금지(위반=제재·클린 프로그램)**: 외곽라인·도형·인위적 마크, 텍스트·워터마크(배송/정보/원산지/AS/KC), 상품명에 없는 다른 상품 합성, 과보정. **권장: 정면 + 흰/단색 배경.**

**AI 합성 가드(꽃틔움)**:
- 대표이미지(썸네일): 흰/단색 배경 + 제품 정면 누끼. **AI 라이프스타일 합성컷은 대표이미지 금지**(소품 과다·실물 오인 위험). 라벨 또렷이.
- 추가이미지: 다양한 각도·색상/사이즈. "한 이미지=한 상품정보".
- 상세이미지/라이프스타일 합성컷: 우드톤·차량 무드는 **상세페이지(가로 860px)** 연출에 활용(텍스트·연출 자유). 모바일 75~80% → 최소 860px.
- 실제 제품 비율·색상 왜곡 금지(과보정 + 반품 리스크).

**규격**: 1:1, 최소 1000px(권장 1300px+), sRGB, JPEG q70~85, 대표 300~800KB, 상세 가로 860px.

---

## 6. asset_jobs 상태머신 확장 설계

- **신규 job_type**: product_cutout(누끼), mood_bg_generate(배경, 브라우저 반자동), product_composite(합성), harmonize(빛 정합), express_finalize(마감), naver_normalize(규격화). 통칭 product_swap 계열.
- **reference 자산 추적**: 각 job에 reference_asset_ids[](제품 누끼/무드 배경/브랜드 키트) + source_product_id + concept_combo_id. AssetReference 조인 테이블(종류: product_cutout/mood_bg/brand_kit/generated_candidate).
- **상태 확장**: queued→running→awaiting_human(업로드/승인 대기)→human_done→running→review→approved/rejected→published. awaiting_human이 브라우저 핸드오프 트리거.
- **3중 누락방지 계승**: (a) 단계 산출물 파일 존재 검증 (b) concept 조합(우드/화이트/차량) 누락 체크 (c) 발행 전 필수 이미지(대표1+추가2) 충족.

---

## 7. 워크플로우 UI 설계

- 상품 선택 → 컨셉 조합 제안 카드 → 단계 타임라인(누끼→배경→합성→마감→발행) 상태 배지.
- awaiting_human → 카드가 "지금 Firefly에서 이 작업 하세요" CTA + 브라우저 딥링크 + 업로드 체크리스트.
- 합성 결과 before/after 비교 슬라이더(라벨 가독성·경계 체크). 거부 시 rejected→재시도(프롬프트/참조 교체, 시드 변경).
- Supabase Realtime으로 job 상태 실시간 반영.

---

## 8. 구현 로드맵

**1단계(즉시, 1~2주)** 수동 파일럿 B안 검증
- 상품 5개로 누끼→Firefly 배경→Photoshop 합성+Harmonize→Express 마감→Sharp 규격화 전 과정 손으로. 라벨 왜곡 0 확인.
- 벤치마크: 라벨 가독성 100% 확대 통과율 ≥95%, 대표이미지는 흰배경 누끼만.

**2단계(1개월)** asset_jobs 확장 + 반자동 루프
- product_swap job_type·reference 추적·awaiting_human 상태 구현. Supabase Realtime.
- Claude in Chrome 핸드오프: 업로드/CAPTCHA만 사람.
- 벤치마크: 상품 1건당 사람 개입 ≤3분, 자동 단계 누락 0.

**3단계(2~3개월)** 대량화
- Express Bulk Create로 수백 개 마감·변형 일괄. CSV 변수화.
- 벤치마크: 주당 처리 수, 네이버 제재 0, 상세컷 도입 전후 전환율 A/B.

**방향 전환 트리거**:
- 라벨 왜곡 클레임 → 레이어 합성 전면화.
- 네이버 제재 1건 → 대표이미지 AI 합성 즉시 중단, 흰배경 누끼 회귀.
- Nano Banana 다운샘플 라벨 흐림 반복 → 4K 출력/고해상 reference 또는 Photoshop 합성 우회.
- 반품률 상승 → 상세컷 연출 강도 ↓, 실물 정합 우선.

---

## 9. 작업 유의사항 (영구 + 본 트랙)

- **B안 원칙**: 실제 제품은 누끼로 고정, AI는 배경만. 라벨·형태 왜곡 0.
- **대표이미지 = 흰배경 누끼만**(네이버 정책). 라이프스타일 합성컷은 상세페이지에만.
- **이미지 생성 = 최고 품질 모델**(면책/크레딧 불문, 대표 확정). 단 판매 이미지 상업적 사용권은 발행 전 확인.
- **브라우저 반자동**: 대표가 로그인 환경 열어두면 AI 이어받기. 업로드/CAPTCHA/비가역 클릭은 사람.
- **비가역 0(#46)**: 네이버 PUT/POST는 대표 명시 승인 없이 0.
- **각 프로그램 장점 최대 활용**(대표 확정): Firefly=생성, Photoshop=정밀합성, Express=마감·대량, Claude Design=시안·관제탑.

---

## 10. 한계 / 재확인

- 모델·도구 사양 빠르게 변동(Nano Banana Pro 가격/해상도, Express 기능, Claude in Chrome 정책).
- 전환율 수치는 출처 특성 상이(Shopify 자체/Cornell eBay/MS 이메일) → 자사 A/B 재검증.
- Claude in Chrome 베타 잔여 공격 11.2% → 비가역 작업은 사람.
- 네이버 알고리즘 비공개 → 발행 전 최신 공지 확인.
- 파트너 모델은 프롬프트·참조가 외부 전송 → 상업 사용권 발행 전 확인. Firefly 네이티브가 상대적으로 명확.
- B안 근거의 Claid/Photoroom은 벤더지만, 원칙은 Adobe 공식 + arXiv와 교차검증돼 신뢰 가능.
