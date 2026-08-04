# SEASON_CALENDAR_DATA — 시즌 캘린더 데이터 (2026~2028)

> 상태: 시점(2026-07-30)
> 한 줄 요약 — 소싱 엔진이 소비할 시즌 이벤트 데이터. Code가 TypeScript(`getSeasonContext` 확장)로 옮길 구조화 표.
> 출처: 브리프 `docs/handoff/P2_SEASON_CALENDAR_BRIEF.md` · 음력 환산 다중소스 교차검증(문서 말미 Sources).
> **제약**: 식품·화장품·브랜드 키워드 전면 배제(운영자 취급 제외 정책 PRD §5-2). 생활/주방/인테리어/디지털/계절가전 방향만.

## 0. 필드 정의 (브리프 §2-1)

| 필드 | 의미 |
|---|---|
| `id` | 영문 슬러그 |
| `label` | 한글 표기(화면 노출) |
| `type` | `solar`(양력 고정) / `lunar`(음력) / `range`(기간형) |
| `date` | solar=`{month,day}` · lunar=2026~2028 양력 환산 · range=시작~종료 |
| `leadTimeDays` | 소싱 시작 D-일수(발주·셀렉트·발행 준비 소요) |
| `peakWindowDays` | 판매 피크 구간(D-N ~ D-day) |
| `keywords` | DataLab 시드 키워드 |
| `categoryHints` | 네이버 카테고리 힌트(취급 제외군 미포함) |
| `note` | 셀러 실무 메모 |
| `confidence` | high / medium(근거 강도) |

## 1. 음력 명절 — 양력 환산 (정확도 최우선)

> 다중 소스 교차검증(Time.is·PublicHolidays·나무위키·superkts 음력변환). 전부 **high**.

| id | label | 음력 | 2026 | 2027 | 2028 | confidence |
|---|---|---|---|---|---|---|
| `seollal` | 설날 | 1.1 | **2026-02-17** | **2027-02-07** | **2028-01-27** | high |
| `chuseok` | 추석 | 8.15 | **2026-09-25** | **2027-09-15** | **2028-10-03** | high |

> 2028 추석이 10월인 것은 **윤5월(6/23~7/21)** 때문(정상). 2028 설날은 1월 하순(연초).

---

## 2. 이벤트 데이터 (24건 · 브리프 §3 전 범주 커버)

### 2-1. 음력 명절 (lunar) — 2건

```
id: seollal
label: 설날
type: lunar
date: { 2026: "2026-02-17", 2027: "2027-02-07", 2028: "2028-01-27" }
leadTimeDays: 45
peakWindowDays: 21
keywords: [놋그릇, 수저세트, 제수용품, 보자기, 다과접시, 손님용슬리퍼, 극세사담요, 실내화]
categoryHints: [생활/건강 > 주방용품, 생활/건강 > 생활잡화, 가구/인테리어 > 인테리어소품]
note: 소싱 마감·택배 물량 폭주. 선물은 식품세트가 아니라 주방·생활·집들이 방향. D-45 착수.
confidence: high
```
```
id: chuseok
label: 추석
type: lunar
date: { 2026: "2026-09-25", 2027: "2027-09-15", 2028: "2028-10-03" }
leadTimeDays: 45
peakWindowDays: 21
keywords: [놋그릇, 수저세트, 제수용품, 차례상용품, 보자기, 다과접시, 손님용슬리퍼, 수납트레이]
categoryHints: [생활/건강 > 주방용품, 생활/건강 > 생활잡화, 가구/인테리어 > 인테리어소품]
note: 최대 성수기. 2028은 10월 초(윤달). 선물=생활·주방 방향. 배송 마감 캘린더 필수.
confidence: high
```

### 2-2. 기념일 (solar 고정) — 7건

```
id: valentine        label: 발렌타인데이   type: solar  date: {month:2, day:14}
leadTimeDays: 30  peakWindowDays: 10
keywords: [선물상자, 선물박스, 포장지, 리본, 무드등, 캔들홀더, 커플잔]
categoryHints: [생활/건강 > 생활잡화, 가구/인테리어 > 인테리어소품]
note: 초콜릿(식품) 제외 — 포장·소품·감성 인테리어 방향. confidence: high
```
```
id: whiteday         label: 화이트데이     type: solar  date: {month:3, day:14}
leadTimeDays: 30  peakWindowDays: 10
keywords: [선물상자, 기프트박스, 포장지, 무드조명, 디퓨저스틱, 커플잔]
categoryHints: [생활/건강 > 생활잡화, 가구/인테리어 > 인테리어소품]
note: 사탕(식품) 제외 — 포장·소품 방향. confidence: high
```
```
id: children_day     label: 어린이날       type: solar  date: {month:5, day:5}
leadTimeDays: 35  peakWindowDays: 14
keywords: [장난감, 완구, 놀이매트, 자전거, 킥보드, 튜브, 물안경, 정리함]
categoryHints: [출산/육아 > 완구/매트, 스포츠/레저 > 자전거/킥보드]
note: 완구·야외놀이 수요. D-35 착수(가정의달 물량 겹침). confidence: high
```
```
id: parents_day      label: 어버이날       type: solar  date: {month:5, day:8}
leadTimeDays: 35  peakWindowDays: 14
keywords: [안마기, 지압매트, 무릎담요, 방석, 효도라디오, 돋보기, 목안마기]
categoryHints: [생활/건강 > 건강관리용품, 생활/건강 > 생활잡화]
note: 카네이션(생화)·건기식(식품) 제외 — 생활·건강가전 방향. confidence: high
```
```
id: teachers_day     label: 스승의날       type: solar  date: {month:5, day:15}
leadTimeDays: 25  peakWindowDays: 7
keywords: [선물상자, 텀블러, 문구세트, 데스크정리대, 화병, 미니화분]
categoryHints: [생활/건강 > 생활잡화, 가구/인테리어 > 인테리어소품]
note: 소규모·실용 소품. 가정의달 후반. confidence: high
```
```
id: pepero           label: 빼빼로데이     type: solar  date: {month:11, day:11}
leadTimeDays: 25  peakWindowDays: 7
keywords: [선물상자, 포장박스, 리본, 캔들, 무드등]
categoryHints: [생활/건강 > 생활잡화]
note: 과자(식품) 제외 — 포장·소품만. 광군제와 동일자. confidence: high
```
```
id: christmas        label: 크리스마스     type: solar  date: {month:12, day:25}
leadTimeDays: 55  peakWindowDays: 21
keywords: [크리스마스트리, 오너먼트, 무드조명, 가랜드, 리스, 파티풍선, 선물상자]
categoryHints: [가구/인테리어 > 인테리어소품, 생활/건강 > 생활잡화]
note: 최장 리드타임. 트리·조명은 D-55 소싱. 재고 소진 빠름. confidence: high
```

### 2-3. 생활 주기 (range 기간형) — 7건

```
id: new_semester_spring  label: 신학기(봄)   type: range  date: {start:{month:2,day:20}, end:{month:3,day:10}}
leadTimeDays: 30  peakWindowDays: 20
keywords: [수납박스, 데스크정리대, 서랍정리함, 정리함, 필통, 라벨스티커, 스탠드조명]
categoryHints: [생활/건강 > 수납/정리, 가구/인테리어 > 학생·사무용가구]
note: 개학 전 정리·데스크 세팅 수요. confidence: high
```
```
id: new_semester_fall    label: 신학기(가을) type: range  date: {start:{month:8,day:20}, end:{month:9,day:5}}
leadTimeDays: 30  peakWindowDays: 16
keywords: [수납박스, 서랍정리함, 데스크정리대, 스탠드조명, 정리함]
categoryHints: [생활/건강 > 수납/정리, 가구/인테리어 > 학생·사무용가구]
note: 2학기 준비. 봄보다 규모 작음. confidence: medium (가을 신학기 수요는 봄 대비 낮음 — 통념 기반)
```
```
id: moving_spring        label: 이사철(봄)   type: range  date: {start:{month:2,day:15}, end:{month:4,day:15}}
leadTimeDays: 30  peakWindowDays: 45
keywords: [이삿짐박스, 디퓨저, 수납박스, 커튼, 러그, 스탠드조명, 밀대, 정리함]
categoryHints: [가구/인테리어 > 인테리어소품, 생활/건강 > 수납/정리]
note: 봄 이사 성수기. 집들이 선물+정리 동시 수요. confidence: high
```
```
id: moving_fall          label: 이사철(가을) type: range  date: {start:{month:9,day:15}, end:{month:11,day:15}}
leadTimeDays: 30  peakWindowDays: 45
keywords: [이삿짐박스, 디퓨저, 수납박스, 커튼, 러그, 스탠드조명, 밀대]
categoryHints: [가구/인테리어 > 인테리어소품, 생활/건강 > 수납/정리]
note: 가을 이사철. 봄과 유사 규모. confidence: high
```
```
id: kimjang              label: 김장철       type: range  date: {start:{month:11,day:1}, end:{month:12,day:10}}
leadTimeDays: 35  peakWindowDays: 30
keywords: [김치통, 김장매트, 대야, 고무장갑, 앞치마, 저장용기, 수납트레이]
categoryHints: [생활/건강 > 주방용품, 생활/건강 > 생활잡화]
note: 김치(식품) 아님 — 김장 도구·저장용기·주방용품만. confidence: high
```
```
id: rainy_season         label: 장마         type: range  date: {start:{month:6,day:20}, end:{month:7,day:25}}
leadTimeDays: 30  peakWindowDays: 30
keywords: [제습기, 제습제, 우산, 우비, 방수커버, 빨래건조대, 곰팡이제거제, 신발건조기]
categoryHints: [생활/건강 > 생활잡화, 디지털/가전 > 계절가전]
note: 제습·건조 수요 급증. confidence: high
```
```
id: heatwave             label: 혹서기       type: range  date: {start:{month:7,day:1}, end:{month:8,day:20}}
leadTimeDays: 35  peakWindowDays: 45
keywords: [선풍기, 서큘레이터, 손선풍기, 쿨매트, 아이스박스, 냉감침구, 아쿠아슈즈]
categoryHints: [디지털/가전 > 계절가전, 생활/건강 > 침구/커튼]
note: 여름가전 핵심. D-35 소싱(재고 조기 소진). confidence: high
```

### 2-4. 계절 전환 (range) — 4건

```
id: spring_cleaning      label: 봄맞이 대청소 type: range  date: {start:{month:3,day:1}, end:{month:4,day:10}}
leadTimeDays: 25  peakWindowDays: 40
keywords: [극세사걸레, 청소솔, 수납박스, 정리함, 밀대, 청소도구, 살균스프레이]
categoryHints: [생활/건강 > 청소용품, 생활/건강 > 수납/정리]
note: 환절기 정리·청소. confidence: high
```
```
id: winter_appliance     label: 겨울가전     type: range  date: {start:{month:11,day:1}, end:{month:12,day:31}}
leadTimeDays: 40  peakWindowDays: 60
keywords: [가습기, 전기요, 전기장판, 온풍기, 히터, 손난로, 수면양말, 극세사담요]
categoryHints: [디지털/가전 > 계절가전, 생활/건강 > 침구/커튼]
note: 겨울가전 소싱 D-40. 혹한기와 연속. confidence: high
```
```
id: cold_wave            label: 혹한기       type: range  date: {start:{month:12,day:15}, end:{month:2,day:10}}
leadTimeDays: 40  peakWindowDays: 57
keywords: [온수매트, 전기요, 극세사담요, 수면양말, 기모레깅스, 단열시트, 문풍지, 뽁뽁이]
categoryHints: [디지털/가전 > 계절가전, 생활/건강 > 생활잡화]
note: 연말~연초 걸침. 단열·난방 동시. confidence: high
```
```
id: camping_season       label: 캠핑 시즌    type: range  date: {start:{month:4,day:1}, end:{month:6,day:15}}
leadTimeDays: 35  peakWindowDays: 75
keywords: [캠핑랜턴, 폴딩박스, 캠핑의자, 아이스박스, 캠핑테이블, 화로대, 캠핑매트, 타프]
categoryHints: [스포츠/레저 > 캠핑용품]
note: 봄~초여름 캠핑 성수기(가을 재점화 별도 고려 가능). confidence: high
```

### 2-5. 쇼핑 이벤트 (solar) — 2건

```
id: black_friday         label: 블랙프라이데이 type: solar  date: {month:11, day:28}
leadTimeDays: 40  peakWindowDays: 10
keywords: [물티슈, 종량제봉투, 수납박스, 밀폐용기, 무드등, 지퍼백]
categoryHints: [생활/건강 > 생활잡화, 가구/인테리어 > 인테리어소품]
note: 11월 4째주 금요일(연도별 날짜 변동 — 2026=11/27, 2027=11/26). D-day는 근사값, confidence: medium (요일 기준이라 매년 계산 필요).
confidence: medium
```
```
id: gwangun_11_11        label: 광군제(11.11) type: solar  date: {month:11, day:11}
leadTimeDays: 35  peakWindowDays: 7
keywords: [물티슈, 수납박스, 밀폐용기, 도마, 수세미]
categoryHints: [생활/건강 > 생활잡화]
note: 중국 최대 쇼핑절(국내 직구·특가 연동). 빼빼로데이와 동일자. confidence: medium (국내 취급 영향도 통념 기반)
```

### 2-6. 국내 쇼핑 페스타 (range) — 2건

```
id: korea_sale_festa     label: 코리아세일페스타 type: range  date: {start:{month:11,day:1}, end:{month:11,day:15}}
leadTimeDays: 40  peakWindowDays: 15
keywords: [물티슈, 종량제봉투, 수납박스, 밀폐용기, 도마, 서큘레이터]
categoryHints: [생활/건강 > 생활잡화, 디지털/가전 > 계절가전]
note: 정부 주도 쇼핑행사. 날짜 매년 변동 → 11월 상순 근사. confidence: medium (연도별 공식일정 확인 필요).
confidence: medium
```
```
id: year_end_gift        label: 연말 선물시즌 type: range  date: {start:{month:12,day:1}, end:{month:12,day:24}}
leadTimeDays: 40  peakWindowDays: 24
keywords: [선물상자, 기프트박스, 무드등, 무드조명, 파티풍선, 다이어리, 캘린더]
categoryHints: [생활/건강 > 생활잡화, 가구/인테리어 > 인테리어소품]
note: 크리스마스 리드업. 문구(다이어리/캘린더) 수요. confidence: high
```

---

## 3. 요약 — 이벤트 24건 (목표 20+ 충족)

| 범주 | 건수 | id |
|---|---|---|
| 음력 명절 | 2 | seollal, chuseok |
| 기념일 | 7 | valentine, whiteday, children_day, parents_day, teachers_day, pepero, christmas |
| 생활 주기 | 7 | new_semester_spring/fall, moving_spring/fall, kimjang, rainy_season, heatwave |
| 계절 전환 | 4 | spring_cleaning, winter_appliance, cold_wave, camping_season |
| 쇼핑 이벤트 | 2 | black_friday, gwangun_11_11 |
| 쇼핑 페스타 | 2 | korea_sale_festa, year_end_gift |
| **합계** | **24** | |

## 4. confidence 표기 근거 (medium 5건)

| id | medium 사유 |
|---|---|
| new_semester_fall | 가을 신학기 수요는 봄 대비 낮음(통념 기반, 실측 트렌드 미확보) |
| black_friday | 11월 4째주 금요일 — 매년 날짜 계산 필요(2026=11/27 추정) |
| gwangun_11_11 | 국내 취급 영향도가 통념 기반(직구 특가 연동) |
| korea_sale_festa | 정부 행사라 연도별 공식일정 변동 |
| (명절·기타 high) | 음력 환산은 다중소스 교차검증 완료 |

## 5. 취급 제외 준수 (식품·화장품·브랜드 0건)

- 발렌타인/화이트데이/빼빼로 → **초콜릿·사탕·과자(식품) 배제**, 포장·소품만.
- 어버이날 → **카네이션 생화·건강기능식품 배제**, 생활·건강가전만.
- 명절 → **식품 선물세트 배제**, 주방·생활·집들이 방향.
- 김장철 → **김치(식품) 배제**, 김장 도구·저장용기만.
- 브랜드·화장품 키워드 0건.

---

## Sources (음력 환산 교차검증)
- [Time.is 2028 달력](https://time.is/ko/calendar/2028/South_Korea)
- [PublicHolidays.co.kr 추석 2026·2027·2028](https://publicholidays.co.kr/ko/chuseok/)
- [나무위키 설날](https://namu.wiki/w/%EC%84%A4%EB%82%A0) · [나무위키 추석](https://namu.wiki/w/%EC%B6%94%EC%84%9D)
- [superkts 음력→양력 변환](https://superkts.com/cal/lunar_solar/)
