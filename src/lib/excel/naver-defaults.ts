// Kkotium default values for Naver SmartStore Excel export
// Colors verified against ExcelSaveTemplate_250311.xlsx (Office theme colors with tint 0.8)
import type { SupplierDefaults, SectionDef } from './naverExcel.types';

export const KKOTIUM_DEFAULTS: SupplierDefaults = {
  brand: 'kkotium-supplier',
  manufacturer: 'kkotium-supplier',
  originCode: '0200037',
  importer: 'kkotium-supplier',
  multipleOrigin: 'N',
  minorPurchase: 'Y',
  deliveryMethod: '택배, 소포, 등기',
  courierCode: 'CH1',
  deliveryFeeType: '유료',
  basicDeliveryFee: 3000,
  deliveryPayType: '선결제',
  returnFee: 3000,
  exchangeFee: 6000,
  noticeTemplateCode: '2976841',
  asPhone: '010-3227-4805',
  asGuide:
    '[평일] 10:00~18:00\n전화상담이 어려운 경우 카카오채널 \'@꽃티움\'으로 문의 주시면 빠른 답변 드리겠습니다',
  discountValue: 30,
  discountUnit: '%',
  textReviewPoint: 50,
  photoReviewPoint: 100,
  monthTextReviewPoint: 50,
  monthPhotoReviewPoint: 100,
  alarmReviewPoint: 100,
  installmentMonths: 3,
  reviewVisible: 'Y',
  alarmOnlyCustomer: 'N',
};

// Localised display strings kept separate
export const KKOTIUM_DISPLAY = {
  brand: '꽃티움(협력사)',
  manufacturer: '꽃티움(협력사)',
  importer: '꽃티움(협력사)',
  deliveryMethod: '택배, 소포, 등기',
  deliveryFeeType: '유료',
  deliveryPayType: '선결제',
  asGuide:
    '[평일] 오전 10:00~오후 18:00\n전화상담이 어려운 경우 카카오채널 \'@꽃티움\'으로 문의 주세요',
};

// ─────────────────────────────────────────────────────────────────────────────
// Section header definitions — verified against ExcelSaveTemplate_250311.xlsx
// Colors: Office theme colors with tint ~0.8 applied
// theme4=Accent1(4472C4), theme5=Accent2(ED7D31), theme6=Accent3(A9D18E),
// theme7=Accent4(FFC000), theme8=Accent5(5B9BD5), theme9=Accent6(70AD47)
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_DEFS: SectionDef[] = [
  // col 1~20  상품 기본정보  (theme7/FFC000 + tint0.8 = FFF2CB)
  { label: '상품 기본정보',   colSpan: 25, argb: 'FFFFF2CB' }, // +5 new cols
  // col 21~29 상품 주요정보  (theme9/70AD47 + tint0.8 = E2EEDA)
  { label: '상품 주요정보',   colSpan: 9,  argb: 'FFE2EEDA' },
  // col 30~45 배송정보       (theme5/ED7D31 + tint0.8 = FBE4D5)
  { label: '배송정보',               colSpan: 16, argb: 'FFFBE4D5' },
  // col 46~50 상품정보제공고시 (theme8/5B9BD5 + tint0.8 = DEEAF6)
  { label: '상품정보제공고시', colSpan: 5, argb: 'FFDEEAF6' },
  // col 51~54 A/S, 특이사항  (theme6/A9D18E + tint0.8 = EDF5E8)
  { label: 'A/S, 특이사항',         colSpan: 4,  argb: 'FFEDF5E8' },
  // col 55~71 할인/혜택정보   (theme4/4472C4 + tint0.8 = D9E2F3)
  { label: '할인/혜택정보',  colSpan: 17, argb: 'FFD9E2F3' },
  // col 72~88 기타 정보      (theme4/4472C4 + tint0.8 = D9E2F3) — same theme
  { label: '기타 정보',              colSpan: 17, argb: 'FFD9E2F3' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Column header labels (Row 2) — 88 columns, exact match to official template
// Labels with \n are multi-line (wrapText required)
// ─────────────────────────────────────────────────────────────────────────────
export const COLUMN_LABELS: string[] = [
  // ── 상품 기본정보 (col 1~25) — 5 new cols inserted after 판매가 ───────────────
  '판매자 상품코드',
  '카테고리코드',
  '상품명',
  '상품상태',
  '판매가',
  '단위가격 사용여부',      // NEW col 6
  '표시용량',               // NEW col 7
  '표시단위',               // NEW col 8
  '총용량',                 // NEW col 9
  '부가세',                 // col 10 (was 6)
  '관부가세',               // NEW col 11
  '재고수량',
  '옵션형태',
  '옵션명',
  '옵션값',
  '옵션가',
  '옵션 재고수량',
  '직접입력 옵션',
  '추가상품명',
  '추가상품값',
  '추가상품가',
  '추가상품 재고수량',
  '대표이미지',
  '추가이미지',
  '상세설명',
  // ── 상품 주요정보 (col 21~29) ────────────────────────────────────────────
  '브랜드',
  '제조사',
  '제조일자',
  '유효일자',
  '원산지코드',
  '수입사',
  '복수원산지여부',
  '원산지 직접입력',
  '미성년자 구매',
  // ── 배송정보 (col 30~45) ─────────────────────────────────────────────────
  '배송비 템플릿코드',
  '배송방법',
  '택배사코드',
  '배송비유형',
  '기본배송비',
  '배송비 결제방식',
  '조건부무료-\n상품판매가 합계',
  '수량별부과-수량',
  '구간별-\n2구간수량',
  '구간별-\n3구간수량',
  '구간별-\n3구간배송비',
  '구간별-\n추가배송비',
  '반품배송비',
  '교환배송비',
  '지역별 차등 배송비',
  '별도설치비',
  // ── 상품정보제공고시 (col 46~50) ─────────────────────────────────────────
  '상품정보제공고시 템플릿코드',
  '상품정보제공고시\n품명',
  '상품정보제공고시\n모델명',
  '상품정보제공고시\n인증허가사항',
  '상품정보제공고시\n제조자',
  // ── A/S, 특이사항 (col 51~54) ────────────────────────────────────────────
  'A/S 템플릿코드',
  'A/S 전화번호',
  'A/S 안내',
  '판매자특이사항',
  // ── 할인/혜택정보 (col 55~71) ────────────────────────────────────────────
  '즉시할인 값\n(기본할인)',
  '즉시할인 단위\n(기본할인)',
  '모바일\n즉시할인 값',
  '모바일\n즉시할인 단위',
  '복수구매할인\n조건 값',
  '복수구매할인\n조건 단위',
  '복수구매할인\n값',
  '복수구매할인\n단위',
  '상품구매시 포인트\n지급 값',
  '상품구매시 포인트\n지급 단위',
  '텍스트리뷰 작성시\n지급 포인트',
  '포토/동영상 리뷰 작성시\n지급 포인트',
  '한달사용 텍스트리뷰\n작성시 지급 포인트',
  '한달사용\n포토/동영상리뷰 작성시 지급 포인트',
  '알림받기동의 고객 리뷰 작성 시 지급 포인트',
  '무이자\n할부 개월',
  '사은품',
  // ── 기타 정보 (col 72~88) ────────────────────────────────────────────────
  '판매자바코드',
  '구매평 노출여부',
  '구매평\n비노출사유',
  '알림받기 동의 고객 전용 여부',
  'ISBN',
  'ISSN',
  '독립출판',
  '출간일',
  '출판사',
  '글작가',
  '그림작가',
  '번역자명',
  '문화비 소득공제',
  '사이즈\n상품군',
  '사이즈\n사이즈명',
  '사이즈\n상세 사이즈',
  '사이즈 \n모델명',
];

// Column-level required markers for Row 3
// Values extracted directly from ExcelSaveTemplate_20260309.xlsx
export const COLUMN_REQUIRED: string[] = [
  '비필수',      // col  1: 판매자 상품코드
  '필수',        // col  2: 카테고리코드
  '필수',        // col  3: 상품명
  '비필수',      // col  4: 상품상태
  '필수',        // col  5: 판매가
  '비필수',      // col  6: 단위가격 사용여부
  '조건부필수',  // col  7: 표시용량
  '조건부필수',  // col  8: 표시단위
  '조건부필수',  // col  9: 총용량
  '비필수',      // col 10: 부가세
  '조건부필수',  // col 11: 관부가세
  '필수',        // col 12: 재고수량
  '비필수',      // col 13: 옵션형태
  '조건부필수',  // col 14: 옵션명
  '조건부필수',  // col 15: 옵션값
  '비필수',      // col 16: 옵션가
  '조건부필수',  // col 17: 옵션 재고수량
  '비필수',      // col 18: 직접입력 옵션
  '비필수',      // col 19: 추가상품명
  '조건부 필수', // col 20: 추가상품값
  '비필수',      // col 21: 추가상품가
  '비필수',      // col 22: 추가상품 재고수량
  '필수',        // col 23: 대표이미지
  '비필수',      // col 24: 추가이미지
  '필수',        // col 25: 상세설명
  '비필수',      // col 26: 브랜드
  '비필수',      // col 27: 제조사
  '비필수',      // col 28: 제조일자
  '비필수',      // col 29: 유효일자
  '필수',        // col 30: 원산지코드
  '조건부필수',  // col 31: 수입사
  '비필수',      // col 32: 복수원산지여부
  '조건부필수',  // col 33: 원산지 직접입력
  '비필수',      // col 34: 미성년자 구매
  '비필수',      // col 35: 배송비 템플릿코드
  '비필수',      // col 36: 배송방법
  '조건부필수',  // col 37: 택배사코드
  '조건부필수',  // col 38: 배송비유형
  '조건부필수',  // col 39: 기본배송비
  '조건부필수',  // col 40: 배송비 결제방식
  '조건부필수',  // col 41: 조건부무료-상품판매가 합계
  '조건부필수',  // col 42: 수량별부과-수량
  '조건부필수',  // col 43: 구간별-2구간수량
  '비필수',      // col 44: 구간별-3구간수량
  '비필수',      // col 45: 구간별-3구간배송비
  '조건부필수',  // col 46: 구간별-추가배송비
  '조건부필수',  // col 47: 반품배송비
  '조건부필수',  // col 48: 교환배송비
  '비필수',      // col 49: 지역별 차등 배송비
  '비필수',      // col 50: 별도설치비
  '비필수',      // col 51: 상품정보제공고시 템플릿코드
  '비필수',      // col 52: 상품정보제공고시 품명
  '비필수',      // col 53: 상품정보제공고시 모델명
  '비필수',      // col 54: 상품정보제공고시 인증허가사항
  '비필수',      // col 55: 상품정보제공고시 제조자
  '비필수',      // col 56: A/S 템플릿코드
  '조건부필수',  // col 57: A/S 전화번호
  '조건부필수',  // col 58: A/S 안내
  '비필수',      // col 59: 판매자특이사항
  '비필수',      // col 60: 즉시할인 값(기본할인)
  '조건부 필수', // col 61: 즉시할인 단위(기본할인)
  '비필수',      // col 62: 모바일 즉시할인 값
  '조건부 필수', // col 63: 모바일 즉시할인 단위
  '비필수',      // col 64: 복수구매할인 조건 값
  '조건부 필수', // col 65: 복수구매할인 조건 단위
  '조건부 필수', // col 66: 복수구매할인 값
  '조건부 필수', // col 67: 복수구매할인 단위
  '비필수',      // col 68: 상품구매시 포인트 지급 값
  '조건부 필수', // col 69: 상품구매시 포인트 지급 단위
  '비필수',      // col 70: 텍스트리뷰 작성시 지급 포인트
  '비필수',      // col 71: 포토/동영상 리뷰 작성시 지급 포인트
  '비필수',      // col 72: 한달사용 텍스트리뷰 작성시 지급 포인트
  '비필수',      // col 73: 한달사용 포토/동영상리뷰 작성시 지급 포인트
  '비필수',      // col 74: 알림받기동의 고객 리뷰 작성 시 지급 포인트
  '비필수',      // col 75: 무이자 할부 개월
  '비필수',      // col 76: 사은품
  '비필수',      // col 77: 판매자바코드
  '비필수',      // col 78: 구매평 노출여부
  '조건부필수',  // col 79: 구매평 비노출사유
  '비필수',      // col 80: 알림받기 동의 고객 전용 여부
  '조건부필수',  // col 81: ISBN
  '비필수',      // col 82: ISSN
  '조건부필수',  // col 83: 독립출판
  '조건부필수',  // col 84: 출간일
  '조건부필수',  // col 85: 출판사
  '조건부필수',  // col 86: 글작가
  '비필수',      // col 87: 그림작가
  '비필수',      // col 88: 번역자명
  '조건부필수',  // col 89: 문화비 소득공제
  '조건부 필수', // col 90: 사이즈 상품군
  '조건부 필수', // col 91: 사이즈 사이즈명
  '조건부 필수', // col 92: 사이즈 상세 사이즈
  '비필수',      // col 93: 사이즈 모델명
];

// Mobile discount columns (col57~58) use a different color (theme1/black + tint0.5 = gray)
export const MOBILE_DISCOUNT_ARGB = 'FFD9D9D9';
