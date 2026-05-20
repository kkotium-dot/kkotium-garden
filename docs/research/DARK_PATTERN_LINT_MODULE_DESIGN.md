# 다크패턴 lint 모듈 설계서

> 생성일: 2026-05-19
> 작성: Claude Web (시니어 책임 영역)
> 목적: 2025-02-14 시행 + 2025-08-13 본 시행 다크패턴 6대 규제 대응
> 우선순위: 최우선 (법적 의무, Sprint 7-M2 Step 5 진입 전 필수)
> 분류: Sprint 7-M3 Pre-Step 5 / Dark Pattern Compliance

---

## TL;DR

- **법적 배경**: 2025-02-14 6대 금지 유형 시행, 2025-08-13 계도기간 종료, 2025-10-15 첫 과태료 1,050만원, 2025-10-24 「전자상거래 등에서의 소비자보호 지침」 개정.
- **꽃틔움 적용 범위**: 12 빌딩블록(B01~B12) 출력 직전 + 카피 생성 직후 + 가격/옵션 표시 + CTA 버튼 렌더링 4개 지점.
- **구현 비용**: 시니어 책임 영역에서 룰셋 설계 → Code CLI 구현 약 0.5일 → 모든 신규 자동화에 자동 적용.

---

## 1. 법적 근거 요약

### 1.1 다크패턴 6대 금지 유형 (전자상거래법 시행령 개정, 2025-02-14)

| # | 유형 | 정의 | 꽃틔움 발생 가능 지점 |
|---|---|---|---|
| 1 | 숨은갱신 | 정기결제·구독 시 갱신·증액·해지를 명확히 고지하지 않음 | (저위험) 꽃틔움은 단발 판매 중심 |
| 2 | 순차공개 가격책정 | 배송비·옵션비를 단계적으로 노출해 총액을 마지막에 알림 | **(고위험)** 옵션 가격, 배송비 표시 |
| 3 | 특정옵션 사전선택 | 기본 옵션을 자동 체크 상태로 두어 추가 비용 유도 | **(고위험)** 옵션 기본값 |
| 4 | 잘못된 계층구조 | 구매 버튼은 강조, 취소·반품 버튼은 작게/숨김 | **(고위험)** CTA 버튼 디자인 |
| 5 | 취소·탈퇴 방해 | 절차 복잡화, 정보 은폐, 단계 추가 | (중위험) 회원 기능 미정착 |
| 6 | 반복간섭 | 팝업·푸시로 반복 권유 | **(고위험)** 디스코드 알림, 재고 알림 |

### 1.2 과태료 실제 사례 (2025-10-15)

| 업체 | 위반 유형 | 과태료 |
|---|---|---|
| 쿠팡 | 와우멤버십 가격 인상 동의 유도 화면 (기만 화면 구성) | 250만원 |
| 콘텐츠웨이브 | 중도해지 정보 은폐 | 400만원 |
| NHN벅스 | 중도해지 정보 은폐 + 청약철회 정보 미고지 | 300만원 |
| 스포티파이 | 청약철회 정보 미고지 + 사이버몰 신원 표시 의무 위반 | 100만원 |
| **총** | | **1,050만원** |

### 1.3 2025-10-24 「전자상거래 등에서의 소비자보호 지침」 개정 핵심

- **"첫 화면" 정의 구체화**: 검색결과·카테고리별 목록·메인 페이지
- **총 결제 가능 비용 합계** 첫 화면 표시 의무 (배송비·옵션비·세금 모두 포함)
- 거부 불가능한 모든 비용을 사전 합산 노출

> **→ 꽃틔움 의미**: 상세페이지 첫 화면(First Fold)에 "이 상품을 사면 결제창에서 최종 얼마가 나오는가?"를 모두 표시해야 한다는 의미.

---

## 2. lint 발동 지점 매트릭스

빌딩블록 시스템에 다크패턴 lint를 어디서 어떻게 발동할지의 매트릭스.

| 발동 지점 | 입력 | 검사 룰 | 위반 시 동작 |
|---|---|---|---|
| **GroqCopywriter 직후** | 생성된 카피 문자열 | 금지어 + 강조 패턴 | 재생성 또는 셀러 경고 |
| **빌딩블록 렌더 직전** | 빌딩블록 HTML/data | 계층구조 + 옵션 사전선택 | 자동 수정 + 셀러 알림 |
| **가격/옵션 표시 직전** | salePrice + shipping + options | 순차공개 가격책정 | 첫 화면 총액 표시 강제 |
| **CTA 버튼 렌더 직전** | 구매 + 취소 + 반품 버튼 set | 잘못된 계층구조 | 시각 비중 자동 균등화 |
| **알림 발송 직전** | Discord 알림 / 푸시 | 반복간섭 | 1세션 1회 제한 + 빈도 카운터 |

---

## 3. 6대 룰 상세 구현 설계

### 룰 1 — 숨은갱신 검사 (저위험)

```typescript
function checkHiddenRenewal(productData: ProductInput): LintResult {
  // 정기결제/구독 옵션 존재 여부
  if (productData.hasRecurringPayment) {
    return {
      pass: false,
      violations: ['recurring_payment_disclosure_missing'],
      autoFix: 'inject_renewal_consent_ui'
    };
  }
  return { pass: true };
}
```

**현재 꽃틔움**: 정기결제 옵션 미사용 → 자동 통과. 향후 도입 시 활성화.

### 룰 2 — 순차공개 가격책정 (고위험 ⚠️)

```typescript
function checkPriceTransparency(productData: ProductInput): LintResult {
  const violations: string[] = [];
  
  // First fold 영역에 모든 비용 합계가 표시되어 있는가
  const firstFoldText = productData.firstFoldText;
  const totalCost = productData.salePrice + productData.shippingFee + productData.optionMaxExtra;
  
  if (!firstFoldText.includes(String(totalCost))) {
    violations.push('total_cost_not_shown_in_first_fold');
  }
  
  // 배송비가 첫 화면에 명시되어 있는가
  if (productData.shippingFee > 0 && !firstFoldText.match(/배송비|무료배송/)) {
    violations.push('shipping_fee_hidden');
  }
  
  // 옵션 추가금이 옵션 선택 전에 미리 표시되어 있는가
  if (productData.optionMaxExtra > 0 && !productData.optionsShowExtraInListing) {
    violations.push('option_extra_revealed_too_late');
  }
  
  return {
    pass: violations.length === 0,
    violations,
    autoFix: 'inject_total_cost_badge_in_first_fold'
  };
}
```

**자동 수정**: 첫 화면 우상단에 "결제 예상: 총 ₩XX,XXX (배송비 포함)" 배지 자동 주입.

### 룰 3 — 특정옵션 사전선택 (고위험 ⚠️)

```typescript
function checkOptionDefaults(productData: ProductInput): LintResult {
  const violations: string[] = [];
  
  // 추가비용이 발생하는 옵션이 자동 체크 상태인가
  productData.options.forEach((option) => {
    if (option.extraPrice > 0 && option.defaultSelected) {
      violations.push(`option_${option.id}_auto_selected_with_extra_cost`);
    }
  });
  
  return {
    pass: violations.length === 0,
    violations,
    autoFix: 'unselect_paid_options_by_default'
  };
}
```

**자동 수정**: 추가비용 옵션은 모두 unchecked 상태로 강제.

### 룰 4 — 잘못된 계층구조 (고위험 ⚠️)

```typescript
function checkButtonHierarchy(buttons: ButtonSet): LintResult {
  const violations: string[] = [];
  
  const buyButton = buttons.find(b => b.role === 'primary_purchase');
  const cancelButton = buttons.find(b => b.role === 'cancel_refund_info');
  
  if (!cancelButton) {
    violations.push('cancel_refund_button_missing');
  } else {
    // 시각 비중 비교: 크기·색상·위치
    const buyWeight = computeVisualWeight(buyButton);
    const cancelWeight = computeVisualWeight(cancelButton);
    
    // 구매 버튼이 취소 버튼보다 시각 비중 3배 이상이면 위반
    if (buyWeight / cancelWeight > 3) {
      violations.push('cancel_button_visually_suppressed');
    }
    
    // 취소 버튼이 화면 하단 푸터 깊은 곳에 묻혀있으면 위반
    if (cancelButton.position.scrollDepth > 0.9) {
      violations.push('cancel_button_hidden_in_footer');
    }
  }
  
  return {
    pass: violations.length === 0,
    violations,
    autoFix: 'normalize_button_visual_weight'
  };
}
```

**자동 수정**: 취소/반품 안내 버튼을 구매 버튼과 동일한 섹션, 동일한 폰트 크기로 자동 렌더링.

### 룰 5 — 취소·탈퇴 방해 (중위험)

```typescript
function checkCancellationAccess(siteMap: SiteMapMeta): LintResult {
  const violations: string[] = [];
  
  // 회원탈퇴 페이지 도달 클릭 수
  if (siteMap.withdrawalClickDepth > 3) {
    violations.push('withdrawal_too_deep');
  }
  
  // 환불 안내 페이지가 상품 페이지에서 1클릭 내 접근 가능한가
  if (!siteMap.refundAccessibleFromProduct) {
    violations.push('refund_info_inaccessible');
  }
  
  return {
    pass: violations.length === 0,
    violations,
    autoFix: 'flatten_cancellation_path'
  };
}
```

**현재 꽃틔움**: 회원 기능 미정착. 향후 회원 페이지 추가 시 활성화.

### 룰 6 — 반복간섭 (고위험 ⚠️)

```typescript
function checkNotificationFrequency(notification: NotificationEvent): LintResult {
  const violations: string[] = [];
  
  // 같은 세션 내 같은 종류 알림 횟수
  const sessionCount = getSessionNotificationCount(notification.userId, notification.kind);
  
  if (sessionCount >= 1) {
    violations.push(`notification_${notification.kind}_repeated_in_session`);
  }
  
  // 24시간 내 동일 알림 횟수 (디스코드 채널별)
  const dailyCount = getDailyNotificationCount(notification.channelId, notification.kind);
  
  if (dailyCount >= 3) {
    violations.push(`notification_${notification.kind}_daily_limit_exceeded`);
  }
  
  return {
    pass: violations.length === 0,
    violations,
    autoFix: 'throttle_notification'
  };
}
```

**자동 수정**: 1세션 1회 + 일일 3회 제한. 초과 시 알림 자동 큐잉.

---

## 4. 통합 lint 엔진

```typescript
// src/lib/compliance/dark-pattern-lint.ts

export type LintViolation = {
  rule: string;
  severity: 'low' | 'medium' | 'high';
  autoFix?: string;
  sellerMessage: string;
};

export type LintResult = {
  pass: boolean;
  violations: LintViolation[];
};

export function lintBuildingBlock(
  blockType: 'B01' | 'B02' | /* ... */,
  data: BuildingBlockData
): LintResult {
  const checks = [
    checkHiddenRenewal,
    checkPriceTransparency,
    checkOptionDefaults,
    checkButtonHierarchy,
    checkCancellationAccess,
    // 룰 6은 알림 발송 직전 별도 호출
  ];
  
  const allViolations = checks.flatMap(check => check(data).violations);
  
  return {
    pass: allViolations.length === 0,
    violations: allViolations.map(v => ({
      rule: v,
      severity: classifySeverity(v),
      autoFix: getAutoFix(v),
      sellerMessage: getSellerFriendlyMessage(v)
    }))
  };
}
```

### 셀러 친화 메시지 변환

| 룰 ID | 셀러 메시지 (한글) |
|---|---|
| `total_cost_not_shown_in_first_fold` | "첫 화면에 총 결제 예상액(배송비 포함)을 표시해 주세요. 안 하면 과태료 위험!" |
| `option_X_auto_selected_with_extra_cost` | "추가 비용이 있는 옵션은 자동 선택 상태로 두면 안 돼요. 자동으로 해제했습니다." |
| `cancel_button_visually_suppressed` | "취소·반품 안내 버튼이 구매 버튼에 비해 너무 작아요. 동등하게 키웠습니다." |
| `notification_X_daily_limit_exceeded` | "같은 알림이 너무 자주 발송돼요. 자동으로 큐잉했습니다." |

---

## 5. Sprint 7-M2 Step 5와의 통합

### Step 5 자동화 흐름 안에서 lint 발동 지점

```
[1. P-Filter 진단]
    ↓
[2. 9축 진단]
    ↓
[3. L1/L2/L3/L4 등급 결정]
    ↓
[4. 빌딩블록 생성]
    ↓
[5. Groq 카피 생성]
    ↓
  ★ [5.5 다크패턴 lint — 카피 검사] ← 신규
    ↓
[6. 5섹션 합성]
    ↓
  ★ [6.5 다크패턴 lint — 빌딩블록 데이터 검사] ← 신규
    ↓
[7. 최종 상세페이지]
    ↓
  ★ [7.5 다크패턴 lint — 최종 출력 검사] ← 신규
    ↓
[8. (선택) Naver Commerce API 등록]
```

### 위반 시 처리 정책

| 심각도 | 처리 |
|---|---|
| Low | 셀러에 알림만 표시, 자동 진행 |
| Medium | 자동 수정 + 셀러에 결과 알림 |
| **High** | **자동 진행 차단** + 셀러 명시 승인 필요 |

---

## 6. Sprint 7-M3 (Pre-Step 5) 실행 계획

### 작업 분량
- 시니어 책임 (Web 세션): 룰셋 설계 완료 (이 문서)
- Code CLI: 0.5일

### Code CLI 작업 범위
1. `src/lib/compliance/dark-pattern-lint.ts` 신규 생성 — 6개 함수 + 통합 엔진
2. `src/lib/compliance/seller-messages.ko.json` 신규 생성 — 셀러 친화 한글 메시지
3. 기존 `groq-copywriter.ts` 후처리에 lint 호출 결합
4. 새 테이블 `dark_pattern_lint_logs` (Supabase MCP apply_migration) — 위반 이력 추적
5. TSC + build + commit + push

### 검증 패턴
- 더미 상품 4개 (각 유형별 위반 케이스) → lint 호출 → 6개 룰 모두 발동 검증
- B+C 격리 패턴 재사용 (Sprint 7-M2 Step 4에서 검증됨)

---

## 7. 한계와 주의사항

1. **판례 미축적**: 2025-10-15 첫 처분 외 추가 판례 부족. 룰 임계값은 보수적으로 설정 후 판례 누적 시 조정.
2. **자동 lint는 완벽하지 않음**: 본 룰셋이 모든 위반을 잡아내지는 못함. 셀러가 최종 책임자라는 disclaimer 함께 표시.
3. **카피 다크패턴**: Groq 생성 카피의 다크패턴 검사는 키워드 매칭 위주 → 의도 파악 부족. 향후 LLM 분류기로 보강 가능.
4. **CTA 시각 비중 측정**: HTML 렌더링 후 픽셀 측정이 정확하지만 비용 큼 → 1차에는 CSS 속성 비교로 단순화.
5. **다크패턴 외 규제**: 식품·화장품·의료기기 등 카테고리별 별도 표시 의무 존재. 본 모듈은 일반 다크패턴만 다룸.

---

## 부록 — 빌딩블록별 lint 적용 매트릭스

| 빌딩블록 | 적용 룰 | 비고 |
|---|---|---|
| B01 헤더 | 룰 4 (계층구조) | CTA 버튼 시각 비중 |
| B02 페인포인트 | 룰 2 (가격 투명성) | 첫 화면 총액 표시 |
| B03 USP | 없음 | 표시 항목 |
| B04 라이프스타일 | 없음 | 이미지 항목 |
| B05 신뢰 (인증·후기) | 없음 | 표시 항목 |
| B06 상세 사양 | 룰 3 (옵션 사전선택) | 옵션 기본값 |
| B07 사용 시나리오 | 없음 | 표시 항목 |
| B08 가격·옵션 | **룰 2 + 룰 3** | 핵심 검사 영역 |
| B09 신뢰 FAQ | 룰 5 (취소·탈퇴 방해) | 환불·반품 안내 접근성 |
| B10 후기 | 없음 | 표시 항목 |
| B11 배송 안내 | **룰 2** | 배송비 사전 명시 |
| B12 CTA | **룰 4** | 구매·취소 버튼 균형 |

핵심 검사 영역: B01, B08, B11, B12.
