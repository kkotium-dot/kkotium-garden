// 금액을 한국 원화 형식으로 변환
export function formatKRW(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0원';
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

// 숫자를 콤마 형식으로 변환
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return num.toLocaleString('ko-KR');
}

// 퍼센트 포맷
export function formatPercent(percent: number | null | undefined, decimals: number = 1): string {
  if (percent === null || percent === undefined || isNaN(percent)) {
    return '0%';
  }
  return `${percent.toFixed(decimals)}%`;
}

// 마진 계산
export function calculateMargin(
  supplierPrice: number,
  salePrice: number,
  shippingCost: number = 3000,
  naverFeeRate: number = 0.058
): {
  cost: number;
  fee: number;
  profit: number;
  margin: number;
} {
  const cost = supplierPrice + shippingCost;
  const fee = salePrice * naverFeeRate;
  const profit = salePrice - cost - fee;
  const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

  return { cost, fee, profit, margin };
}

// 권장 판매가 계산
export function calculateRecommendedPrice(
  supplierPrice: number,
  targetMargin: number = 30,
  shippingCost: number = 3000,
  naverFeeRate: number = 0.058
): number {
  // 목표 마진율을 기준으로 역산
  const cost = supplierPrice + shippingCost;
  const recommendedPrice = cost / (1 - targetMargin / 100 - naverFeeRate);

  // 100원 단위로 반올림
  return Math.ceil(recommendedPrice / 100) * 100;
}

// ============================================
// 추가 유틸리티 함수 (날짜/시간)
// ============================================

/**
 * 날짜를 한국 형식으로 변환
 * @param date - Date 객체 또는 문자열
 * @returns 포맷된 문자열 (예: "2026년 1월 14일")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * 날짜와 시간을 한국 형식으로 변환
 * @param date - Date 객체 또는 문자열
 * @returns 포맷된 문자열 (예: "2026. 1. 14. 오전 11:58")
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(d);
}

/**
 * 상대 시간 계산 (예: "3시간 전")
 * @param date - Date 객체 또는 문자열
 * @returns 포맷된 문자열
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}
