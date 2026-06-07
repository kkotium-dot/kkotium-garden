# HANDOFF — 엑셀 5건 수술 검증 + F4 오진단 정정 (2026-06-02 Desktop)

> 권위 문서. Code commit 0873b6a (엑셀 매핑 5건 수술) 의 Desktop 독립 검증 결과.
> 결론: 4건(F1·F2·F3·F5) 완벽 통과. **F4는 "버그 아님" — Code의 데이터 부재 진단이 틀렸고, 실제로는 정상 동작.**
> 코드 변경 0 (검증 turn). 비가역 0 / 허위 0 (#46).

---

## 1. 검증 방법

- POST /api/naver/excel {"productIds":["cmp3afb450001gng5468w0qpc"]} 재호출 → 9737B (Code 보고와 동일).
- openpyxl 셀 단위 단정 (production 독립 재다운로드, Code xlsx 미신뢰).
- route.ts + naverExcelJS.ts 코드 정독 (Filesystem MCP) — bash 디스크 마운트 끊김으로 MCP read 경유.
- shipping_templates + Product naver_refund_info 실측 (Supabase MCP).

## 2. 5건 셀 단위 단정 결과

| Fix | 셀 | 값 | 판정 |
|---|---|---|---|
| F1 옵션 | [12~16] | 조합형 / 형태 / 정사각·직사각 / 0,0 / 9999,9999 | 통과 |
| F2 제조사 | [26] | 유통 꽃틔움 | 통과 (이전 "도매매 공급사" 정정) |
| F3 상품명 | [2] | 집들이선물 달항아리 도어벨... (naver_title) | 통과 |
| F4 반품/교환 | [46][47] | 공란 | **버그 아님 — 아래 3 참조** |
| F5 정보고시 | [51][54] | 꽃틔움 / 유통 꽃틔움 | 통과 |

## 3. F4 오진단 정정 (#44 stale fact — Code 보고 2건 틀림)

### Code 보고
- "DB shipping_template.return/exchangeFee NULL + naver_refund/exchange_info에 추출 가능 숫자 부재"
- "Desktop이 Supabase에 7500 명시 입력 시 즉시 채워짐"

### Desktop 실측 진실
| 검증 | 실측 |
|---|---|
| shipping_templates(cmmlalkq60007121qth9i8xtz) return_fee / exchange_fee | **7500 / 7500 (둘 다 존재)** |
| naver_refund_info | "반품 왕복비 **7,500원** 부담..." → SQL 정규식 재현 시 "7500" 추출됨 |
| naver_template_no | 2976914 |

→ Code 보고 "DB 미입력"은 사실과 정반대. 데이터는 처음부터 존재.

### F4가 빈칸인 진짜 원인 (코드 단정)
- naverExcelJS.ts `buildDataRow` 47/48행: F4 수술 정상 (route fee 출력하도록 고침).
- 그러나 그 아래 데이터 렌더 루프의 `isDisabled` 가드:
  ```
  isShippingField = [...,'반품배송비','교환배송비'].includes(label)
  isDisabled = !!deliveryTemplateCode && isShippingField
  if (isDisabled) cell.value = ''   // 템플릿 연결 시 무조건 빈칸 덮어씀
  ```
- 달항아리는 템플릿(2976914) 연결 → 항상 isDisabled → 47/48 빈칸.

### 결론: 이것은 정상 동작 (네이버 정책 정합)
- 네이버 일괄등록: 배송템플릿 연결 시 반품/교환비는 **템플릿이 SoT**, 엑셀 개별칸은 비움이 정석.
- 템플릿 2976914에 반품 7500 / 교환 7500 내장 → 발행 시 정상 적용.
- 엑셀 [46][47] 공란 = 결함 아님. **추가 데이터 입력 불필요** (입력해도 isDisabled가 또 지움).
- F4 빌더 가드 수술(47/48행 명시 fee 출력)은 "템플릿 미연결 상품"엔 유효 — 회귀 아님, 보존.

## 4. 잔여 (발행 차단 아님)

- 정보고시 모델명(productInfoModel=NULL) → 엑셀 [53] 공란. 도어벨류 "해당없음" 관행, 템플릿 2976841 자동 보완 여부 발행 시 확인. 차단 수준 아님.
- options[].name longform → 발행 가능(임의 문자열 허용), UX 단축은 선택.

## 5. 최종 발행 준비 상태

| 항목 | 상태 |
|---|---|
| publishReady 4축 | GREEN |
| 카테고리 50000963 / 원산지 0200037 | 공식표 정합 |
| 이미지 실접근 360KB | OK |
| 엑셀 88칸 (F1·F2·F3·F5) | 통과 |
| 엑셀 F4 반품/교환비 | 템플릿 2976914 내장으로 정상 적용 |

→ **기술적 발행 차단 요소 0. 대표 명시 승인 후 발행 가능.**

## 6. 절대준수
비가역 0 (네이버 register 금지, DRAFT 유지) / 허위 0 #46 / Prisma 싱글톤 / SD-01 footer 미접촉
