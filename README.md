# 🌸 KKOTIUM Garden (꽃틔움 가든)

네이버 스마트스토어 완전 자동화 + AI 분석 + 도매꾹 크롤링 시스템

## 🚀 빠른 시작

### 1단계: 프로젝트 설정

```bash
# 프로젝트 폴더 생성
mkdir kkotium-garden
cd kkotium-garden

# 모든 파일을 이 폴더에 복사

# 패키지 설치
npm install

# Prisma 초기화
npx prisma generate
```

### 2단계: 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일을 열어 실제 값 입력:
- DATABASE_URL: Supabase PostgreSQL URL
- PERPLEXITY_API_KEY: Perplexity Pro API 키
- 나머지 필수 키들

### 3단계: 데이터베이스 설정

```bash
# Prisma 폴더 생성
mkdir prisma
mv schema.prisma prisma/

# DB Push
npx prisma db push

# DB Studio 확인 (선택)
npx prisma studio
```

### 4단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 📦 주요 기능 (23개)

✅ 네이버 스마트스토어 직접 연동
✅ 도매꾹 자동 크롤러
✅ 번들배송 자동 코드
✅ 상품 코드 체계 (SKU + VendorCode)
✅ Perplexity AI 분석 (상품명, 키워드, 점수)
✅ 경쟁사 가격 모니터링
✅ 일괄 작업 시스템
✅ 대체 상품 관리
✅ 옵션 가격/재고 관리
✅ 엑셀 일괄 등록/내보내기
✅ 판매 실적 + 손익 분석
✅ 이미지 자동 최적화
✅ 상태 자동 전환
✅ 알림 시스템
✅ 검색 엔진 강화
✅ 게이미피케이션 (레벨 1-25, 배지 12개)

## 🎨 디자인 특징

- 🌊 물결 테두리 (Scalloped Border)
- 🌸 꽃띠 캐릭터 (표정 변화)
- 🎨 파스텔 핑크 계열
- ✨ Bloom 애니메이션

## 💰 월 운영 비용

- Perplexity Pro: $20
- 나머지 모두 무료 (Vercel, Supabase, Sharp, Recharts)

## 📝 다음 단계

사용자님이 위 4단계 실행 후, 
다음 컴포넌트 파일들을 생성하겠습니다!
