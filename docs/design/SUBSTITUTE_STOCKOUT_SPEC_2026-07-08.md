# SUBSTITUTE — 품절 대체상품 관리 + 자동대응 (2026-07-08)

Authoring: DESKTOP. 구현=Code. 권위: 본 문서 + PL-5a(drift/OUTOFSTOCK 감지) + OPERATOR_SYSTEM_BLUEPRINT(C-9) + SEED(씨앗심기) 워크플로우. 원칙 #55/#56/#181/#190. **비게이트·읽기전용+앱측 입력**(네이버 쓰기 0).
전제 실측: Product에 대체상품/재고 전용 컬럼·SEED 테이블 없음 → greenfield.

================================================================
## 0. 목적
================================================================
씨앗심기의 "품절 시 대체상품" 정보를 **구조화 저장 → 씨앗심기+상품연동 양쪽 입력·관리 → 연동상품 품절(OUTOFSTOCK) 감지 시 관제탑에 자동 표출**. 단순 메모가 아닌 "품절 안전망"(#56 개입점).

================================================================
## 1. 데이터 모델 (additive·Desktop ALTER 선행)
================================================================
Product에 `substitute_info jsonb` 추가(Desktop이 Supabase ALTER·검증 → Code schema 동기화·#181). 구조:
```json
{
  "hasSubstitute": true,
  "substituteProductId": "cmp...",        // 앱 내 대체 상품(옵션·있으면 체인)
  "substituteName": "대체상품명",
  "substituteNote": "품절 시 이걸로 전환",
  "sourcingUrl": "https://domeggook.com/...",  // 도매매 재소싱 링크
  "sourcingCode": "도매매 상품번호",
  "lowStockThreshold": 5                   // 재고 임계 경보(옵션)
}
```
- 유연 저장(앱상품 참조 OR 텍스트 정보 OR 소싱링크 혼용).

================================================================
## 2. 입력 지점 (양쪽·앱측)
================================================================
1. **씨앗심기(SEED)**: 기존 대체상품 입력 UI를 substitute_info에 persist(현재 저장 안 됨 → 연결).
2. **상품연동(/products/link)**: 연동상품 diff 패널(존3)에 "대체상품 정보" 섹션 추가 → 조회·입력·수정.
- 공통 컴포넌트 `SubstituteEditor`(product-agnostic·#55) 양쪽 재사용.

================================================================
## 3. 자동대응 (핵심 가치·비게이트)
================================================================
- **OUTOFSTOCK 감지**: PL-5a drift-scan/status pull이 이미 네이버 statusType를 가져옴 → OUTOFSTOCK이면 트리거.
- **C-9 개입 카드(#190)**: `substitute_ready` intervention → 관제탑에 "품절 감지 — 대체상품: {substituteName}" + 정보(노트·소싱링크) + 액션(대체상품 발행 준비/재소싱 열기). idle-gating(긴급 우선). hasSubstitute=false면 "대체상품 미등록 — 등록 권장" 약한 넛지.
- **재고 임계 경보**: 네이버 pull 재고 ≤ lowStockThreshold → "품절 임박 N개" 사전 경보(품절 전).

================================================================
## 4. 구현 순서 (비게이트 우선)
================================================================
1. substitute_info ALTER(Desktop) + schema 동기화(Code).
2. product-link.ts substitute read/write 헬퍼(guarded).
3. SubstituteEditor 컴포넌트 + /products/link 존3 섹션 + SEED 연결.
4. C-9 substitute_ready + 재고임계 intervention(control-tower-engine·asset-jobs-matrix 주입·PL-5a sync_drift 패턴 미러).
5. linked API에 substitute_info 반환.

================================================================
## 5. 검증
================================================================
- Code 로컬: substitute 입력→persist→조회 라운드트립·OUTOFSTOCK mock 시 C-9 카드·tsc0/build0.
- Desktop prod: 명화에 대체정보 입력→저장 확인 · (명화가 OUTOFSTOCK 아니라) 다른 방법으로 substitute_ready 카드 로직 확인 · 재고임계 경보.

================================================================
## 작업 유의사항/원칙 (신규)
================================================================
- **#210** 대체상품 정보는 **품절 감지 시 자동 표출되는 개입점**으로 설계(단순 메모 금지)·#56. OUTOFSTOCK은 기존 pull(PL-5a) 재사용·신규 폴링 없음.
- substitute_info는 product-agnostic·씨앗심기/상품연동 공통 컴포넌트로(단건 아닌 시스템·#55).
- 비게이트(네이버 쓰기 0) — 대체상품 "발행"은 별도 발행 GO.
