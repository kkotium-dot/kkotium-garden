// src/lib/products/kkotti-zombie-voice.ts
// ============================================================================
// 꼬띠 좀비 보이스 (작업원칙 #264 — 운영자 아이디어: "좀비가 된 이유를 꼬띠가
// 말해준다"). 좀비 판정 사유에 맞춰 꼬띠 한마디를 고른다.
//
// SHARED — /products(꽃밭 돌보기 목록 배지)와 /products/link(연동 상세 패널)가
// 같은 문구를 쓰도록 여기 한 곳에만 둔다. 화면마다 다른 말을 하면 같은 캐릭터로
// 안 느껴진다(#55 전상품 범용·#62 프로젝트 전체 확장).
//
// 보이스 모드 (KKOTTI_PERSONA_VOICE_GUIDE):
//   - 정원사🌷 (까꿍💖) — 긍정/평온한 상황
//   - 카우걸🤠 (빵야➰ / 이랴➰) — 위기/즉시 대응이 필요한 상황
// 좀비 = 위기 상황이므로 카우걸 모드, 건강한 상품 = 정원사 모드.
//
// 사유별로 다른 문구를 골라 "매일 같은 말만 하는 자동응답기"가 되지 않게 한다.
// ============================================================================

export interface KkottiVoiceInput {
  isZombie: boolean;
  tier: 'grow' | 'defend' | 'demote';
  zombieReason: string | null;
}

/** 좀비 사유에 맞는 꼬띠 한마디 (카우걸 모드 — 위기 대응). */
export function kkottiZombieLine(zombieReason: string | null): string {
  const r = zombieReason ?? '';
  if (r.includes('품절')) return '빵야➰ 품절이라 손님이 그냥 돌아가유! 대체상품 넣어주어유 🧟';
  if (r.includes('역마진')) return '이랴➰ 팔수록 손해에유! 가격부터 손봐주어유 💸';
  if (r.includes('마진')) return '이랴➰ 마진이 위험해유! 가격이나 공급가 한 번 봐주어유 💸';
  if (r.includes('이미지')) return '빵야➰ 사진이 부실해서 손님이 안 눌러유! 꽃단장 가야해유 📸';
  if (r.includes('상품명') || r.includes('SEO') || r.includes('키워드')) return '이랴➰ 검색에 안 걸려유! 상품명 손보면 살아나유 🔍';
  if (r.includes('판매중지') || r.includes('중지')) return '빵야➰ 멈춰있는 아이에유! 살릴지 정리할지 정해주어유 🧟';
  if (r.includes('트렌드') || r.includes('시즌')) return '이랴➰ 시즌이 지났어유! 키워드 바꾸면 다시 뜰 수 있어유 🍂';
  return '빵야➰ 이 아이 지금 손보면 아직 살릴 수 있어유! 🧟';
}

/** 건강한 상품용 꼬띠 한마디 (정원사 모드 — 평온). */
export function kkottiHealthyLine(tier: 'grow' | 'defend' | 'demote'): string {
  return tier === 'grow'
    ? '까꿍💖 이 아이는 잘 크고 있어유 🌱'
    : '까꿍💖 아직 괜찮지만 가끔 들여다봐주어유 🌷';
}

/** 상황에 맞는 꼬띠 한마디를 하나 고른다. */
export function kkottiLine(input: KkottiVoiceInput): string {
  return input.isZombie ? kkottiZombieLine(input.zombieReason) : kkottiHealthyLine(input.tier);
}
