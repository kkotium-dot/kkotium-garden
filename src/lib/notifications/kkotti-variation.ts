// src/lib/notifications/kkotti-variation.ts
// ============================================================================
// 꼬띠 문구 변주 엔진 (작업원칙 #262/#264 준수, KKOTTI_PERSONA_VOICE_GUIDE 정합).
//
// 문제: discord-strings.ko.json의 꼬띠 한마디가 고정 문자열 1개씩이라 매일
// 100% 동일한 메시지가 나감(운영자 스크린샷 확인). 선례
// src/lib/products/kkotti-zombie-voice.ts가 좀비 "사유"별로 문구를 나눠 이미
// 상황별 분기(1층)를 보여줬다 — 이 파일은 그 방식을 프로젝트 전체 알림으로
// 확장하며 나머지 2개 층(날짜/요일/계절, 회전)을 더한다.
//
// 3층 변주:
//   1층 상황별 분기 — 건수/마진상태/긴급도. discord-builder.ts가 이미 하는 일
//       (예: kkotti_negative/kkotti_danger/kkotti_safe, kkotti_one/kkotti_many)
//       을 이어가며, discord-strings.ko.json의 각 kkotti_* 필드를 후보 배열로
//       바꿔 이 파일의 pickVariant()가 상황별 분기 "안"에서 다시 회전시킨다.
//   2층 날짜/요일/계절 — seasonalGreeting()이 월요일/금요일/계절 인사를 붙인다.
//       매번 붙이면 또 정형화되므로 확률적으로만 붙인다(요일 seed 기반).
//   3층 회전 — pickVariant()가 (알림 종류 + 상황 키)별 seed로 후보 3~5개를
//       날짜 seed로 순환시켜, 같은 알림도 후보 개수만큼의 날 간격으로만 반복.
//
// PURE (no I/O) — date는 인자로 주입(테스트/tsx 검증 용이), 기본값은 오늘.
// ============================================================================

/** 문자열을 0 이상의 32bit 정수 해시로 — 후보 배열의 순환 오프셋을 결정한다. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 1970-01-01부터의 날짜 일수 (로컬 자정 기준) — 요일/회전의 기준 seed. */
function daysSinceEpoch(date: Date): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local.getTime() / 86_400_000);
}

/**
 * 상황별 후보 배열에서 하나를 고른다. (알림 종류+상황) 문자열을 시드에 섞어
 * 같은 날이라도 알림마다 다른 오프셋에서 시작하게 한다 — 이렇게 하지 않으면
 * 모든 채널이 "오늘의 0번 문구"로 한꺼번에 똑같아 보일 수 있다.
 *
 * 후보가 N개면 같은 문구는 N일에 한 번만 반복된다(요청: "5일에 1번만 반복").
 */
export function pickVariant<T>(candidates: readonly T[], seedKey: string, date: Date = new Date()): T {
  if (candidates.length === 0) throw new Error('pickVariant: candidates must be non-empty');
  if (candidates.length === 1) return candidates[0];
  const idx = (daysSinceEpoch(date) + hashString(seedKey)) % candidates.length;
  return candidates[idx];
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 기상청 통상 구분(3-5봄/6-8여름/9-11가을/12-2겨울) — 시즌 키워드와는 별개로,
 *  인사말 톤에만 쓰는 가벼운 4계절 구분이다. */
export function seasonOf(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

const SEASON_WORD: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

// 요일별 인사 후보 — 월요일/금요일만 붙인다(매일 붙이면 또 고정 문구가 됨).
// 화~목은 계절 인사만 가끔, 주말엔 정기 알림이 안 나가므로 다루지 않는다.
const MONDAY_GREETINGS = ['월요일부터 힘내봐유! 🌱', '한 주 시작이에유, 화이팅!', '월요일이지만 꽃틔움은 쉬지 않아유 🌷'];
const FRIDAY_GREETINGS = ['불금이에유, 오늘만 마무리해봐유! ✨', '한 주 마무리 잘하고 계셔유~', '금요일까지 달려주셨네유, 고생하셨어유 🌷'];
const SEASON_GREETINGS: Record<Season, string[]> = {
  spring: ['봄이라 그런가 손님도 많아지는 것 같아유 🌸', '봄 시즌 상품 챙기기 딱 좋은 날이에유!'],
  summer: ['더운데도 정원 잘 돌보고 계시네유! ☀️', '여름엔 배송 지연도 잘 챙겨야 해유~'],
  autumn: ['가을 타는 계절이지만 매출은 안 타야죠! 🍂', '선선해진 날씨만큼 정원도 잘 돌봐줘유'],
  winter: ['겨울에도 정원은 자라고 있어유 ❄️', '연말 준비도 슬슬 챙겨봐유~'],
};

/**
 * 2층: 날짜/요일/계절 인사 한 조각(뒤에 덧붙일 접미사, 없으면 빈 문자열).
 * 확률적으로만 등장하도록 seedKey를 섞어 "요일마다 100% 붙는" 새 고정 패턴을
 * 만들지 않는다 — 대략 40% 정도의 알림에만 붙는다(5개 중 2개 슬롯).
 *
 * urgent=true면 아무것도 붙이지 않는다 (2026-07-15 Desktop 검증에서 발견):
 * 좀비/품절 같은 급한 알림에 "여름엔 배송 지연도 잘 챙겨야 해유~" 같은 한가한
 * 계절 인사가 붙으면 문맥이 깨진다. 위기 상황에서 카우걸 꼬띠가 급하게 말하다가
 * 갑자기 날씨 얘기를 하는 꼴 — 페르소나 가이드의 모드 분기와도 충돌한다.
 * 인사는 정원사🌷 모드(평온한 알림)에서만 쓴다.
 */
export function seasonalGreeting(seedKey: string, date: Date = new Date(), urgent = false): string {
  if (urgent) return '';

  const dow = date.getDay(); // 0=일 ... 1=월 ... 5=금
  const pool: string[] =
    dow === 1 ? MONDAY_GREETINGS
    : dow === 5 ? FRIDAY_GREETINGS
    : SEASON_GREETINGS[seasonOf(date)];

  // 5칸 중 앞 2칸에 걸릴 때만 인사를 붙인다(등장 빈도 조절).
  const slot = (daysSinceEpoch(date) + hashString(seedKey)) % 5;
  if (slot >= 2) return '';
  return ` ${pickVariant(pool, seedKey, date)}`;
}

/**
 * 위기 알림 판별 — 카우걸🤠 모드로 나가는 알림에는 계절 인사를 붙이지 않는다.
 * seedKey(알림 종류 식별자)로 판단하므로 호출부가 따로 플래그를 넘길 필요 없다.
 */
export function isUrgentAlert(seedKey: string): boolean {
  return /zombie|stock|price|scoreDrop|margin/i.test(seedKey);
}

/** SEASON_WORD를 노출용으로 쓰고 싶을 때(디버그/검증 스크립트용). */
export function seasonWord(date: Date = new Date()): string {
  return SEASON_WORD[seasonOf(date)];
}
