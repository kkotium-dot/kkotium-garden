# 꽃틔움 미디어 수집기 v0.3.0

실무용 웹 미디어 수집 확장 프로그램입니다.

### 핵심 기능
- Chrome Side Panel 기반 작업 화면
- 이미지/영상 DOM 수집
- lazy-load / srcset / picture / video source / CSS background / 일부 network resource URL 수집
- 전체/이미지/영상 필터
- 선택 관리
- 선택 URL 복사
- JSON 저장
- 선택 항목 다운로드
- 다운로드 상태 표시
- 수집기 미주입 탭 자동 재주입 후 재시도
- 꽃틔움 로고 및 아이콘 적용

### 공식 API 근거
Chrome Side Panel API는 MV3 Chrome 114+에서 제공되며 `sidePanel` 권한과 `side_panel.default_path` 구성을 사용합니다. 다운로드는 `downloads` 권한과 `chrome.downloads.download()`를 사용합니다.
