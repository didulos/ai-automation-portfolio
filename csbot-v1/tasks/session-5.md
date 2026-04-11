# 세션 5 체크리스트 — 고객 온보딩 자동화

> 목표: 새 스토어 고객을 5분 안에 온보딩할 수 있는 자동화 파이프라인
> 완료일: 2026-03-29

---

## 완료 항목

- [x] **작업 1: 온보딩 폼 워크플로우** — `src/n8n-workflows/onboarding-form.json`

  **노드 구성 (5개):**
  - [x] Form Trigger (typeVersion **2.5** — 최신 버전으로 업그레이드)
    - 폼 제목: "ArumDri CS봇 — 스토어 정보 등록"
    - 필드 8개: 스토어명, 대표자명, 배송업체(드롭다운 6종), 평균 배송일, 교환/반품 정책, 영업시간, 연락처, 특이사항
    - 각 필드에 `fieldName` 명시 (v2.4+에서 output key = fieldName)
    - `responseMode: "lastNode"` ("Workflow Finishes") — Airtable 생성 완료 후 리다이렉트
    - `respondWith: "redirect"` → `http://localhost:5678/webhook/onboarding-complete`
  - [x] Airtable: Create Store
    - 폼 필드 참조를 `fieldName` 기준으로 수정 (`$json['storeName']` 등)
    - 폼 8개 필드 + 기본값 16개 = 총 24개 필드 매핑
    - `mappingMode: "defineBelow"` + schema 명시
  - [x] Code: Generate FAQs
    - `runOnceForAllItems` 모드 → 10개 아이템 배열 반환
    - 카테고리: 배송조회, 배송소요일, 교환, 반품환불, 주문취소, 재입고, 영업시간, 결제, 상품정보, 배송지역
    - 폼 `fieldName` 기준으로 값 참조 (`form['storeName']` 등)
  - [x] Airtable: Create FAQ (10회 반복, FAQs 테이블 일괄 생성)
    - StoreID: 링크드 레코드 배열 (`[store.id]`)

  **결과:** 폼 제출 1회 → Stores 1건 + FAQs 10건 자동 생성 → 완료 페이지로 리다이렉트

  **주요 수정 이력:**
  - `responseMode: "responseNode"` → v2.2+에서 UI에 존재하지 않음 (제거됨)
  - `Show Completion Page` (respondToWebhook) 노드 삭제 — Form Trigger 워크플로우에서 Respond to Webhook 노드 사용 불가
  - typeVersion 2.2 → 2.5 업그레이드 (fieldName 지원, 최신 respondWithOptions 구조)
  - 필드 output key: label 텍스트 → fieldName (v2.4+ 변경사항)

---

- [x] **작업 2: FAQ 커스터마이징 가이드** — `src/n8n-workflows/FAQ_CUSTOMIZE.md`
  - [x] 기존 FAQ 수정 방법 (필드별 설명)
  - [x] 새 FAQ 추가 단계별 방법 + 카테고리 11종 목록
  - [x] 답변 템플릿 작성 가이드 (3문장 이내, 말투, 줄바꿈)
  - [x] 변수 사용법 (`{{변수명}}`) + 사용 가능 변수 18개 목록 + 예시
  - [x] QuestionPatterns JSON 작성 규칙 + 좋은/나쁜 예시
  - [x] FAQ 비활성화/삭제 방법
  - [x] 자주 하는 실수 8가지

---

- [x] **작업 3: 온보딩 알림** — `src/n8n-workflows/onboarding-notify.json`
  - [x] Webhook 트리거 (POST `/webhook/onboarding-notify`)
  - [x] Telegram 알림: 스토어명, 등록 시간, FAQ 개수, Airtable 링크 (HTML 파싱)
  - [x] Email 알림: 브랜드 컬러 HTML 메일 (Airtable 바로가기 버튼 포함)
  - [x] 순차 실행: Telegram → Email → Respond OK (병렬 연결 시 Respond OK 이중 실행 에러 방지)
  - [x] 두 노드 모두 `onError: continueRegularOutput` (한 쪽 실패해도 나머지 발송)
  - [x] Sticky Note: onboarding-form 연결 방법 + payload 예시 명시

---

- [x] **작업 4: 온보딩 완료 페이지** — `src/n8n-workflows/onboarding-complete.json`
  - [x] Webhook (GET `/webhook/onboarding-complete`)
  - [x] 브랜드 컬러 HTML 완료 페이지 (Respond to Webhook)
    - #2D5016 헤더, #E8781A 배지
    - "다음 단계" 안내 포함
  - [x] onboarding-form의 리다이렉트 대상

---

## Import 순서

1. `onboarding-complete.json` → Active
2. `onboarding-form.json` → Active
3. `onboarding-notify.json` → Active (Telegram/Email credential 설정 후)

## Import 후 설정

| 항목 | 내용 |
|------|------|
| Airtable Credential | `Create Store`, `Create FAQ` 노드에서 재연결 |
| Base ID | `YOUR_AIRTABLE_BASE_ID` → 실제 값으로 변경 |
| Redirect URL | `http://localhost:5678/webhook/onboarding-complete` → production 도메인으로 변경 |
| Telegram Credential | `Notify via Telegram` 노드 + chatId 변경 |
| Email Credential | `Notify via Email` 노드 + fromEmail/toEmail 변경 |
| 폼 URL | Active 후 `https://YOUR_N8N/form/onboarding-form-webhook` |

---

## 파일

| 파일 | 설명 |
|------|------|
| `src/n8n-workflows/onboarding-form.json` | n8n Import용 |
| `src/n8n-workflows/generate-onboarding-form.js` | 재생성 스크립트 |
| `src/n8n-workflows/FAQ_CUSTOMIZE.md` | 셀러 FAQ 수정 가이드 |
| `src/n8n-workflows/onboarding-notify.json` | n8n Import용 알림 워크플로우 |
| `src/n8n-workflows/generate-onboarding-notify.js` | 재생성 스크립트 |
| `src/n8n-workflows/onboarding-complete.json` | n8n Import용 완료 페이지 워크플로우 |
| `src/n8n-workflows/generate-onboarding-complete.js` | 재생성 스크립트 |

---

## 미완료 / 나중에

- [ ] 완료 페이지 HTML 고도화 (현재 기본 브랜딩, 추후 개선)
- [ ] onboarding-notify: onboarding-form 워크플로우와 실제 연결 (Create FAQ 뒤에 HTTP Request 노드 추가)
