# 스마트스토어 CS봇 MVP — Claude Code 세션 프롬프트 (v2)

> v2: 세션 1-2 실행 결과 반영, 세션 3부터 업데이트
> 스택: n8n + Airtable + Claude API
> 채널: 카카오톡 채널 + 웹 채팅 위젯
> ngrok 도메인: deidra-nondevelopmental-unoccidentally.ngrok-free.dev

---

## 세션 1-2 실행 결과 요약 (참고용)

- n8n: localhost:5678 Docker 가동 중
- main-csbot.json: Import 완료 (Main CSBot 워크플로우)
- Airtable Base ID: appI7k8fYw6FrO1cq
- Airtable Stores Record ID: recI8FHs7R9chPrZI (하루마루 생활용품)
- FAQs: PRD 10개 시나리오 전부 투입 완료
- Airtable/Claude API credential: n8n에 등록 완료
- 메인 워크플로우 Webhook: POST /webhook/csbot/message
- ngrok: 무료 도메인 연결 완료

---

## 세션 3 — 카카오톡 채널 연동 (Day 4)

### Claude Code 프롬프트

```
smartstore-csbot 프로젝트를 이어서 진행한다.
requirements/, design/, tasks/session-2.md를 먼저 읽어라.

이번 세션 목표: 카카오톡 채널 챗봇 연동 완성

## 환경 정보 (세션 1-2 결과)
- n8n: localhost:5678 가동 중
- main-csbot.json: Import 완료 → POST /webhook/csbot/message
- ngrok 도메인: deidra-nondevelopmental-unoccidentally.ngrok-free.dev
- Airtable Base ID: appI7k8fYw6FrO1cq
- Store Record ID: recI8FHs7R9chPrZI (하루마루 생활용품, StoreID=1)

## 배경 (내 기존 경험)
- 카카오 OAuth 경험 있음 (환율 알림 봇에서 사용)
- this.helpers.httpRequest() 사용법 알고 있음
- Unicode 메시지 슬라이싱 이슈 해결 경험 있음
- Form Urlencoded body type 사용 경험 있음

## 작업 1: 카카오 챗봇 연동 n8n 워크플로우

src/n8n-workflows/kakao-channel.json (generate 스크립트도 함께 생성)

### 아키텍처:
별도 워크플로우에서 HTTP Request로 메인 CS봇 웹훅을 호출하는 구조.
메인 워크플로우는 수정하지 않는다.

### 플로우 (5노드):

1. **Webhook 노드** — POST /webhook/kakao
   - 카카오 i오픈빌더 스킬(skill) API 포맷으로 수신
   - 수신 데이터 구조:
     {
       "intent": { "id": "...", "name": "..." },
       "userRequest": {
         "timezone": "Asia/Seoul",
         "utterance": "배송 얼마나 걸려요?",
         "user": { "id": "abc123", "type": "botUserKey" }
       },
       "bot": { "id": "...", "name": "..." }
     }

2. **Code 노드 (Normalize Kakao Request)**
   - userRequest.utterance → message
   - userRequest.user.id → session_id (접두어 "kakao_" 추가)
   - store_id: "1" (MVP 단일 스토어 하드코딩)
   - channel: "kakao"
   - 변환 결과: { store_id: "1", session_id: "kakao_abc123", channel: "kakao", message: "배송 얼마나 걸려요?" }

3. **HTTP Request 노드** — 메인 CS봇 웹훅 호출
   - POST http://localhost:5678/webhook/csbot/message
   - Content-Type: application/json
   - Body: 2번 노드의 변환 결과
   - 타임아웃: 8초 (카카오 5초 제한 고려, 여유분 포함)

4. **Code 노드 (Format Kakao Response)**
   - 메인 웹훅 응답의 response 필드를 카카오 스킬 응답 포맷으로 변환
   - simpleText 사용 (MVP에서는 텍스트 응답만)
   - 에러/타임아웃 시 폴백 메시지
   - 응답 포맷:
     {
       "version": "2.0",
       "template": {
         "outputs": [{ "simpleText": { "text": "봇 응답 텍스트" } }]
       }
     }

5. **Respond to Webhook 노드** — 카카오 포맷 JSON 반환

### 에러 핸들링:
- HTTP Request 타임아웃/에러 → 카카오 포맷의 폴백 메시지 반환
  "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 문의해 주세요."
- 카카오 스킬 서버는 5초 타임아웃이므로, Claude API가 느리면 타임아웃 발생 가능
  → MVP에서는 단순 타임아웃 메시지로 처리
  → 향후 개선: 카카오 비동기 응답(callbackUrl) 패턴

### 테스트:
- n8n에서 직접 테스트: Manual 실행 또는 curl로 카카오 스킬 요청 시뮬레이션
- curl 예시:
  curl -X POST http://localhost:5678/webhook-test/kakao \
    -H "Content-Type: application/json" \
    -d '{
      "intent": {"id": "test", "name": "test"},
      "userRequest": {"utterance": "배송 얼마나 걸려요?", "user": {"id": "test_user_1"}},
      "bot": {"id": "test_bot"}
    }'

## 작업 2: 카카오 i오픈빌더 설정 가이드

src/kakao/KAKAO_SETUP.md

다음 내용을 포함:
1. 카카오 i오픈빌더 접속 및 봇 생성 방법
2. 스킬(Skill) 등록 방법
   - 스킬 URL: https://deidra-nondevelopmental-unoccidentally.ngrok-free.dev/webhook/kakao
3. 시나리오(Scenario) 설정 방법
   - 폴백 블록에 스킬 연결 (모든 메시지를 봇으로 전달)
4. 테스트 방법 (i오픈빌더 봇 테스트 기능)
5. 배포(Deploy) 방법
6. 트러블슈팅
   - ngrok 무료 도메인 주의사항 (헤더에 ngrok-skip-browser-warning 필요할 수 있음)
   - 5초 타임아웃 대응
   - 스킬 응답 포맷 오류 확인 방법

## 작업 3: 카카오 스킬 요청 시뮬레이션용 테스트 워크플로우

src/n8n-workflows/test-kakao.json (generate 스크립트도 함께 생성)

- Manual Trigger → 테스트 메시지 배열 순회
- 각 메시지를 카카오 스킬 요청 포맷으로 감싸서 kakao-channel 웹훅에 POST
- 응답의 카카오 포맷 검증 (version: "2.0", template.outputs 존재 확인)
- 결과 요약 출력

tasks/session-3.md에 완료 체크리스트 작성.
```

---

## 세션 4 — 웹 채팅 위젯 (Day 5–6)

### Claude Code 프롬프트

```
smartstore-csbot 프로젝트를 이어서 진행한다.
design/architecture.md와 tasks/session-3.md를 먼저 읽어라.

이번 세션 목표: 스마트스토어에 임베드 가능한 웹 채팅 위젯 완성

## 환경 정보
- 메인 CS봇 웹훅: POST /webhook/csbot/message
- ngrok 도메인: deidra-nondevelopmental-unoccidentally.ngrok-free.dev
- Store ID: 1 (하루마루 생활용품)

## 브랜드 가이드
- 메인 컬러: 딥포레스트그린 (#2D5016)
- 액센트 컬러: 웜오렌지 (#E8781A)
- 폰트: Noto Sans KR
- 톤: 따뜻하고 신뢰감 있는 동네 전문가

## 작업 1: 채팅 위젯 HTML/CSS/JS

src/widget/chat-widget.html — 단일 파일, 외부 의존성 없음

### 기능:
- 우하단 플로팅 챗 버튼 (ArumDri 로고 또는 채팅 아이콘)
- 클릭하면 채팅 창 열림/닫힘 (토글)
- 메시지 입력 → n8n 웹훅으로 전송 → 응답 수신 → 표시
- 타이핑 인디케이터 (봇 응답 대기 중 "..." 애니메이션)
- 모바일 반응형 (작은 화면에서 풀스크린 채팅)
- 로컬 스토리지에 session_id 저장 (새로고침해도 대화 유지)
- 대화 시작 시 환영 메시지 자동 표시

### 웹훅 호출 방식:
메인 CS봇 웹훅을 직접 호출한다 (별도 중간 워크플로우 없음).
- POST /webhook/csbot/message
- Body: { store_id: "1", session_id: "widget_xxx", channel: "web_widget", message: "..." }
- CORS: n8n Webhook 노드의 기본 CORS 설정 활용
  (n8n은 Respond to Webhook 모드에서 기본적으로 CORS를 허용)

### 디자인:
- 채팅 헤더: 딥포레스트그린 배경, 흰 텍스트 "{StoreName} 고객센터"
- 전송 버튼: 웜오렌지
- 봇 메시지: 연한 그린 배경 말풍선
- 고객 메시지: 연한 그레이 배경 말풍선, 우측 정렬
- 깔끔하고 모던한 디자인, 그림자 효과

### 설정 가능한 변수:
- WEBHOOK_URL (n8n 웹훅 주소, 기본값: ngrok 도메인)
- STORE_ID (기본값: "1")
- STORE_NAME (기본값: "하루마루 생활용품")
- WELCOME_MESSAGE

## 작업 2: 임베드 스니펫

src/widget/embed-snippet.html
- 스마트스토어 운영자가 복사해서 붙일 수 있는 최소 코드
- <script> 태그 하나로 위젯 로드
- 설정값을 data-* 속성으로 전달

## 작업 3: CORS 및 연동 테스트

웹위젯은 메인 CS봇 웹훅을 직접 호출하므로 별도 워크플로우가 필요 없다.
대신 CORS 동작을 확인하는 테스트를 수행:
- 로컬에서 chat-widget.html을 브라우저로 열고 메시지 전송
- 개발자 도구에서 CORS 에러 없이 응답이 오는지 확인
- CORS 문제 발생 시 해결 방법을 문서화

tasks/session-4.md에 완료 체크리스트 작성.
```

---

## 세션 5 — 고객 온보딩 자동화 (Day 7)

### Claude Code 프롬프트

```
smartstore-csbot 프로젝트를 이어서 진행한다.
design/airtable-schema.md를 먼저 읽어라.

이번 세션 목표: 새 스토어 고객을 5분 안에 온보딩할 수 있는 자동화 파이프라인

## 환경 정보
- Airtable Base ID: appI7k8fYw6FrO1cq
- 기존 시드 스크립트: src/scripts/setup-airtable.js (테이블 생성 + 시드 데이터 참고용)
- 메인 CS봇 웹훅: POST /webhook/csbot/message
- 카카오 웹훅: POST /webhook/kakao

## 작업 1: 온보딩 폼 워크플로우

src/n8n-workflows/onboarding-form.json

### 플로우:

1. **n8n Form Trigger** — 스토어 정보 입력 폼
   - 필드: 스토어명, 대표자명, 배송업체(선택), 평균 배송일,
     교환/반품 정책(텍스트), 영업시간, 연락처, 특이사항
   - 폼 제목: "ArumDri CS봇 — 스토어 정보 등록"
   - 브랜드 컬러 적용

2. **Airtable 노드** — Stores 테이블에 새 스토어 생성

3. **Code 노드** — 범용 FAQ 템플릿 10개에 스토어 변수 자동 치환
   - PRD의 시나리오 10개 기반
   - 변수 슬롯 ({{배송업체}}, {{배송일}} 등) → 실제 값 치환

4. **Airtable 노드 (반복)** — FAQs 테이블에 10개 FAQ 일괄 생성

5. **Respond to Webhook** — 완료 메시지 + 테스트 방법 안내

### 결과:
폼 하나 작성 → Airtable에 스토어 + FAQ 10개 자동 생성
→ 즉시 CS봇 작동 (단, MVP는 store_id "1" 하드코딩이므로 멀티스토어 지원은 후속 작업)

## 작업 2: FAQ 커스터마이징 가이드

src/n8n-workflows/FAQ_CUSTOMIZE.md
- 고객(셀러)이 Airtable에서 직접 FAQ 수정하는 방법
- 새 FAQ 추가 방법
- 답변 템플릿 작성 가이드 (변수 사용법)

## 작업 3: 온보딩 체크리스트 자동 알림

src/n8n-workflows/onboarding-notify.json
- 새 스토어 등록 시 → 나(ArumDri)에게 텔레그램/이메일 알림
- 알림 내용: 스토어명, 등록 시간, 바로 Airtable 링크

tasks/session-5.md에 완료 체크리스트 작성.
```

---

## 세션 6 — 테스트 & 데모 준비 (Day 8–9)

### Claude Code 프롬프트

```
smartstore-csbot 프로젝트를 이어서 진행한다.
모든 requirements/, design/, tasks/ 문서를 먼저 읽어라.

이번 세션 목표: 전체 시스템 테스트 + 고객 시연 준비

## 환경 정보
- 메인 CS봇: POST /webhook/csbot/message
- 카카오 채널: POST /webhook/kakao (kakao-channel.json)
- 웹 위젯: src/widget/chat-widget.html (메인 웹훅 직접 호출)
- ngrok: deidra-nondevelopmental-unoccidentally.ngrok-free.dev

## 작업 1: 통합 테스트 워크플로우

src/n8n-workflows/test-all.json

### 테스트 시나리오 (10개 FAQ + 5개 엣지케이스):
- FAQ 10개: 각 시나리오당 대표 메시지 1개씩
- 엣지케이스:
  1. FAQ에 없는 질문 ("이 제품 성분이 뭐에요?")
  2. 인사/잡담 ("안녕하세요~")
  3. 짧은 메시지 ("배송")
  4. 긴 메시지 (100자 이상 불만 메시지)
  5. 연속 질문 ("교환하려면요? 기간은요? 택배비는요?")

### 테스트 채널:
- 메인 웹훅 직접 호출 (기본)
- 카카오 웹훅 호출 (카카오 스킬 요청 포맷으로 감싸서)

### 테스트 플로우:
1. Manual Trigger → 테스트 케이스 배열 순회
2. 각 케이스: 메인 웹훅 + 카카오 웹훅 호출 → 응답 수집
3. 검증: 메인 응답 텍스트 존재, 카카오 응답 포맷 정상 (version: "2.0")
4. 결과 집계: 정확 응답 / 폴백 / 에러 비율
5. Airtable에 테스트 결과 기록

## 작업 2: 데모 시나리오 스크립트

requirements/demo-script.md

3개 시나리오 (고객에게 시연할 때 사용):

### 시나리오 A: "기본 CS 응답"
1. "주문한 지 3일 됐는데 배송이 아직인데요"
2. 봇 응답 확인
3. "그럼 교환은 어떻게 해요?"
4. 봇 응답 확인 (대화 문맥 유지 확인)

### 시나리오 B: "봇이 모르는 질문 처리"
1. "이 제품 OO 성분 들어있나요?"
2. 봇 → "담당자에게 전달" 응답 확인
3. 셀러에게 알림 가는 것 확인

### 시나리오 C: "5분 온보딩"
1. 온보딩 폼 열기
2. 스토어 정보 입력 (라이브로)
3. 즉시 봇 테스트 → 해당 스토어 정보로 응답 확인

## 작업 3: 케이스 스터디 초안

requirements/case-study-draft.md

마크다운으로 작성:
- 제목: "스마트스토어 CS 문의 80%를 자동 처리한 방법"
- 구조: 문제 → 솔루션 → 결과 → 다음 단계
- 결과는 테스트 데이터 기반 (실 고객 데이터는 Phase 1 완료 후 업데이트)
- Gpters, n8n Korea LinkedIn 게시용 톤

## 작업 4: 전체 프로젝트 README

README.md (프로젝트 루트)
- 프로젝트 소개
- 아키텍처 다이어그램
- 설치/설정 방법
- 빠른 시작 가이드 (온보딩 폼 → 테스트)
- 폴더 구조 설명

tasks/session-6.md에 완료 체크리스트 작성.
```

---

## 세션 운영 체크리스트

### 매 세션 시작 전
- [ ] 이전 세션 tasks/ 체크리스트 리뷰
- [ ] requirements/PRD.md 컨텍스트로 전달

### 매 세션 종료 시
- [ ] tasks/session-N.md 체크리스트 업데이트
- [ ] 다음 세션 프롬프트 미리 확인
