# 세션 4 체크리스트 — 웹 채팅 위젯

> 목표: 스마트스토어에 임베드 가능한 웹 채팅 위젯 완성
> 완료일: 2026-03-28

---

## 완료 항목

- [x] **작업 1: 채팅 위젯 HTML/CSS/JS** — `src/widget/chat-widget.html`
  - [x] 우하단 플로팅 채팅 버튼 (딥포레스트그린 #2D5016)
  - [x] 클릭 시 채팅 창 열림/닫힘 토글 (스프링 애니메이션)
  - [x] 메시지 전송 → n8n 웹훅 POST → 응답 수신 → 표시
  - [x] 타이핑 인디케이터 (3도트 바운스 애니메이션)
  - [x] 모바일 반응형: 480px 이하 풀스크린 채팅
  - [x] localStorage에 sessionId 저장 (새로고침 후에도 대화 유지)
  - [x] 위젯 최초 열 때 환영 메시지 자동 표시 (1회만)
  - [x] 브랜드 컬러 적용 (헤더 그린, 전송버튼 웜오렌지, 봇말풍선 연한 그린)
  - [x] 미읽음 배지 UI (웜오렌지 원형)
  - [x] 설정 변수 분리: WEBHOOK_URL, STORE_ID, STORE_NAME, WELCOME_MESSAGE
  - [x] 접근성: aria-label, aria-expanded, role="dialog", aria-live 적용
  - [x] Noto Sans KR 폰트 (Google Fonts)
  - [x] 외부 JS 라이브러리 의존성 없음 (Vanilla JS)

- [x] **작업 2: 임베드 스니펫** — `src/widget/embed-snippet.html`
  - [x] data-* 속성으로 설정값 전달 (webhook-url, store-id, store-name, welcome-message)
  - [x] CSS/JS 모두 인라인 (스마트스토어 하단 스크립트에 그대로 붙여넣기 가능)
  - [x] 사용 방법 주석 포함 (5단계 안내)

- [x] **작업 3: 위젯 ↔ n8n 연동 워크플로우** — `src/n8n-workflows/web-widget.json`
  - [x] Webhook: POST `/webhook/widget`
  - [x] Code: 요청 검증 및 정규화 (message, session_id, store_id 추출)
  - [x] HTTP Request: Main CSBot 웹훅 호출 (`/webhook/csbot/message`)
  - [x] Code: 위젯 응답 포맷 변환 (`{ message, session_id, timestamp }`)
  - [x] Error 분기: CSBot 호출 실패 시 폴백 응답 반환
  - [x] Respond to Webhook: CORS 헤더 포함 (`Access-Control-Allow-Origin: *`) — POST 응답 헤더
  - [x] OPTIONS 프리플라이트 처리: n8n Webhook은 OPTIONS 미지원 → 인프라 레벨 처리 필요
    - 방법 A: n8n 환경변수 `N8N_CORS_ORIGIN=*` (권장)
    - 방법 B: Nginx `if ($request_method = OPTIONS) { return 204; }` + CORS 헤더
  - [x] 위젯 JS: CORS 오류 시 콘솔에 명확한 에러 메시지 출력
  - [x] Sticky Note: OPTIONS 처리 방법 A/B 명시 (필수 설정으로 표시)
  - [x] generate-web-widget.js 스크립트로 재생성 가능

---

## 다음 단계 (세션 5)

1. n8n에서 `web-widget.json` Import 후 활성화
2. `chat-widget.html`의 `WEBHOOK_URL`을 실제 n8n URL로 변경
3. 브라우저에서 `chat-widget.html` 열어 위젯 동작 확인
4. CORS 오류 발생 시 n8n 환경변수에 `N8N_CORS_ORIGIN=*` 추가

---

## 파일 목록

| 파일 | 설명 |
|------|------|
| `src/widget/chat-widget.html` | 단독 실행 가능한 위젯 데모 페이지 |
| `src/widget/embed-snippet.html` | 스마트스토어 임베드용 최소 코드 |
| `src/n8n-workflows/web-widget.json` | n8n Import용 위젯 워크플로우 |
| `src/n8n-workflows/generate-web-widget.js` | 워크플로우 재생성 스크립트 |
