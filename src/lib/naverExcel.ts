import * as XLSX from 'xlsx';

export interface NaverProductData {
  sellerProductCode: string;
  categoryId: string;
  productName: string;
  price: number;
  stock: number;
  taxType: string;
  optionType: string;
  optionNames: string;
  optionValues: string;
  optionPrices: string;
  optionStocks: string;
  directInputOption: string;
  mainImage: string;
  additionalImages: string;
  description: string;
  brand: string;
  manufacturer: string;
  originCode: string;
  importer: string;
  multipleOrigin: string;
  minorPurchase: string;
  deliveryMethod: string;
  courierCode: string;
  deliveryFeeType: string;
  basicDeliveryFee: number;
  deliveryPayType: string;
  conditionalFreeAmount: number;
  returnFee: number;
  exchangeFee: number;
  noticeTemplateCode: string;
  asTemplateCode: string;
  asPhone: string;
  asGuide: string;
  discountValue: number;
  discountUnit: string;
  textReviewPoint: number;
  photoReviewPoint: number;
  monthTextReviewPoint: number;
  monthPhotoReviewPoint: number;
  alarmReviewPoint: number;
  installmentMonths: number;
  reviewVisible: string;
  alarmOnlyCustomer: string;
}

export const KKOTIUM_DEFAULTS = {
  brand: '꽃틔움(협력사)',
  manufacturer: '꽃틔움(협력사)',
  originCode: '0200037',
  importer: '꽃틔움(협력사)',
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
  asTemplateCode: '',
  asPhone: '010-3227-4805',
  asGuide: '[평일] 오전10:00~오후06:00\n전화상담이 어려운 경우 카카오채널 \'@꽃틔움\'으로 문의 주시면 빠른 답변 드리겠습니다 😊',
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

export function generateNaverExcel(products: NaverProductData[]): void {
  const header1 = [
    '상품 기본정보','','','','','','','','','','','','','','','','','','','',
    '상품 주요정보','','','','','','','','',
    '배송정보','','','','','','','','','','','','','','',
    '상품정보제공고시','','','','',
    'A/S, 특이사항','','','',
    '할인/혜택정보','','','','','','','','','','','','','','','',
    '기타 정보','','','','','',
  ];
  const header2 = [
    '판매자 상품코드','카테고리코드','상품명','상품상태','판매가','부가세','재고수량',
    '옵션형태','옵션명','옵션값','옵션가','옵션 재고수량','직접입력 옵션',
    '추가상품명','추가상품값','추가상품가','추가상품 재고수량',
    '대표이미지','추가이미지','상세설명',
    '브랜드','제조사','제조일자','유효일자','원산지코드','수입사','복수원산지여부','원산지 직접입력','미성년자 구매',
    '배송비 템플릿코드','배송방법','택배사코드','배송비유형','기본배송비','배송비 결제방식',
    '조건부무료-상품판매가 합계','수량별부과-수량','구간별-2구간수량','구간별-3구간수량',
    '구간별-3구간배송비','구간별-추가배송비','반품배송비','교환배송비','지역별 차등 배송비','별도설치비',
    '상품정보제공고시 템플릿코드','상품정보제공고시 품명','상품정보제공고시 모델명',
    '상품정보제공고시 인증허가사항','상품정보제공고시 제조자',
    'A/S 템플릿코드','A/S 전화번호','A/S 안내','판매자특이사항',
    '즉시할인 값(기본할인)','즉시할인 단위(기본할인)','모바일 즉시할인 값','모바일 즉시할인 단위',
    '복수구매할인 조건 값','복수구매할인 조건 단위','복수구매할인 값','복수구매할인 단위',
    '상품구매시 포인트 지급 값','상품구매시 포인트 지급 단위',
    '텍스트리뷰 작성시 지급 포인트','포토/동영상 리뷰 작성시 지급 포인트',
    '한달사용 텍스트리뷰 작성시 지급 포인트','한달사용 포토/동영상리뷰 작성시 지급 포인트',
    '알림받기동의 고객 리뷰 작성 시 지급 포인트','무이자 할부 개월',
    '사은품','판매자바코드','구매평 노출여부','구매평 비노출사유','알림받기 동의 고객 전용 여부',
  ];
  const rows = products.map(p => [
    p.sellerProductCode, p.categoryId, p.productName, '신상품',
    p.price, p.taxType, p.stock,
    p.optionType, p.optionNames, p.optionValues, p.optionPrices, p.optionStocks, p.directInputOption,
    '','','','',
    p.mainImage, p.additionalImages, p.description,
    p.brand, p.manufacturer, '','',
    p.originCode, p.importer, p.multipleOrigin, '', p.minorPurchase,
    '', p.deliveryMethod, p.courierCode, p.deliveryFeeType,
    p.basicDeliveryFee, p.deliveryPayType,
    p.conditionalFreeAmount || '', '','','','','',
    p.returnFee, p.exchangeFee, '', 'N',
    p.noticeTemplateCode, '','','','',
    p.asTemplateCode, p.asPhone, p.asGuide, '',
    p.discountValue, p.discountUnit, '','',
    '','','','','','',
    p.textReviewPoint, p.photoReviewPoint,
    p.monthTextReviewPoint, p.monthPhotoReviewPoint,
    p.alarmReviewPoint, p.installmentMonths,
    '','', p.reviewVisible, '', p.alarmOnlyCustomer,
  ]);
  const wsData = [header1, header2, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '일괄등록');
  const ts = new Date().toISOString().slice(0,10).replace(/-/g,'');
  XLSX.writeFile(wb, `naver_upload_${ts}.xlsx`);
}