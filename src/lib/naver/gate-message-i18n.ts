// src/lib/naver/gate-message-i18n.ts
// ============================================================================
// validateForRegistration(product-builder.ts)의 errors/warnings는 로그·API
// error 필드 등 코드 소비처가 많아 원문(영어)을 그대로 유지한다(#240 "stable,
// self-describing" 선례와 동일 이유 — 바꾸면 그 소비처들이 갈라진다). 하지만
// 셀러가 직접 읽는 화면(발행 전 검수·일괄 등록 결과 등)에서는 표시 직전에만
// 번역한다. 화면이 여러 곳이라 단일 함수로 공유(#62) — 각 화면이 제 나름대로
// 번역하면 같은 사유가 화면마다 다르게 보인다.
//
// 미확인 패턴은 원문 그대로 보여준다(숨기면 다음 발견 기회를 잃는다 — #317
// "발견 즉시 고친다"의 반대편 안전판: 모르는 케이스를 임의로 지어내 번역하지
// 않는다).
// ============================================================================

export function translateGateMessage(msg: string): string {
  if (msg.startsWith('Product name is required')) return '상품명이 필요해요 (최소 5자)';
  if (msg.startsWith('Valid Naver leaf category code required')) {
    const m = msg.match(/got "([^"]*)"/);
    return `네이버 카테고리 코드가 올바르지 않아요 (현재 "${m?.[1] ?? ''}" — 8자리 숫자 필요, 예: 50000963)`;
  }
  if (msg.startsWith('Representative image is required')) return '대표 이미지가 필요해요';
  if (msg.startsWith('Sale price must be greater than 0')) return '판매가는 0보다 커야 해요';
  if (msg.startsWith('Naver address IDs not synced')) return '네이버 출고지·반품지 주소가 동기화되지 않았어요 (주소록 동기화를 먼저 실행하세요)';
  {
    const m = msg.match(/^Upload readiness too low: (\d+)% \((\w)\) — (.*)$/);
    if (m) return `업로드 준비도가 낮아요: ${m[1]}% (${m[2]}등급) — ${m[3]}`;
  }
  {
    const m = msg.match(/^Upload readiness is C grade \((\d+)%\) — consider improving: (.*)$/);
    if (m) return `업로드 준비도가 C등급이에요 (${m[1]}%) — 개선 권장: ${m[2]}`;
  }
  if (msg.startsWith('Origin code (originCode) is required')) return '원산지 코드가 필요해요 — 추측 입력은 법적 위험이 있어 비워둘 수 없어요';
  if (msg.startsWith('Origin code invalid')) return msg.replace('Origin code invalid:', '원산지 코드가 올바르지 않아요:');
  {
    const m = msg.match(/^Origin code "([^"]*)" auto-healed to "([^"]*)"/);
    if (m) return `원산지 코드 "${m[1]}" → "${m[2]}"로 자동 보정됐어요 — 저장 시 반영돼요`;
  }
  if (msg.startsWith('Origin mismatch:')) return msg.replace('Origin mismatch:', '원산지 정보 불일치:');
  return msg;
}

/** errors 배열 전체를 한글화해 join까지 해주는 편의 함수(화면 소비처 공통). */
export function translateGateMessages(msgs: string[], sep = '; '): string {
  return msgs.map(translateGateMessage).join(sep);
}
