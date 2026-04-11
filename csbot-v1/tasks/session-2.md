# Session 2: n8n 코어 워크플로우 완성
> tasks/session-2.md
> 목표: n8n 메인 CS봇 워크플로우 JSON 생성 및 Import 테스트

---

## 산출물

| 파일 | 설명 |
|------|------|
| `src/n8n-workflows/main-csbot.json` | n8n Import용 메인 워크플로우 JSON (12노드) |
| `src/n8n-workflows/generate-workflow.js` | 메인 워크플로우 JSON 생성 스크립트 |
| `src/n8n-workflows/test-trigger.json` | 테스트 트리거 워크플로우 JSON (5노드 + 1 Sticky Note, 11케이스) |
| `src/n8n-workflows/generate-test-trigger.js` | 테스트 트리거 JSON 생성 스크립트 |
| `src/n8n-workflows/ENV_SETUP.md` | Credential 등록 및 환경 설정 가이드 |

---

## 워크플로우 노드 구조 (11노드 + 1 Sticky Note)

```
Receive Message (Webhook POST /csbot/message)
  → Get Store Config (Airtable: Stores)
    → Store Exists? (IF)
      ├─ TRUE → Get FAQs (Airtable: FAQs)
      │    → Get Recent Conversations (Airtable: Conversations, 최근 5건)
      │      → Build Prompt (Code: system_prompt + user_message 조립)
      │        → Call Claude API (HTTP Request: claude-sonnet-4-20250514)
      │          → Parse Response (Code: 응답 파싱 + 폴백 감지)
      │            → Save Conversation (Airtable: Conversations INSERT)
      │              → Send Response (Respond to Webhook)
      └─ FALSE → Send Error Response ("서비스 설정 중입니다")
```

---

## Import 후 필수 설정

### 1. Airtable Credential 매핑
- 모든 Airtable 노드 (4개)에서 Credential 재연결
- Base ID 변경: `YOUR_AIRTABLE_BASE_ID` → 실제 `appXXXXXX`

### 2. Claude API Credential 매핑
- `Call Claude API` 노드에서 Header Auth 재연결
- Header Name: `x-api-key`
- Header Value: `sk-ant-...`

### 3. 테스트
```bash
curl -X POST http://localhost:5678/webhook/csbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "1",
    "session_id": "test_001",
    "channel": "web_widget",
    "message": "배송 얼마나 걸려요?"
  }'
```

---

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 스토어 미존재 | IF 노드 분기 → "서비스 설정 중입니다" 응답 |
| Claude API 타임아웃 (10초) | onError: continueRegularOutput → Parse Response에서 폴백 메시지 |
| Airtable 조회 실패 | onError: continueRegularOutput → 빈 데이터로 계속 |
| Airtable 저장 실패 | onError: continueRegularOutput → 응답은 정상 반환 |

---

## 코드 수정 시

```bash
# generate-workflow.js 수정 후:
cd src/n8n-workflows
node generate-workflow.js
# → main-csbot.json 재생성
# → n8n에서 기존 워크플로우 삭제 후 재Import
```

---

## Session 2 완료 체크리스트

### 작업 1: 메인 CS봇 워크플로우 JSON 생성
- [x] `generate-workflow.js` 생성 스크립트 작성
- [x] `main-csbot.json` 생성 및 JSON 유효성 검증
- [x] 11개 워크플로우 노드 + 1 Sticky Note (총 12)
- [x] 노드 연결(connections) 정상 확인 (9개 소스 노드)
- [x] Code 노드 jsCode 인코딩 정상 확인
  - [x] Build Prompt: `return [{` 배열 리턴, `$()` 노드 참조
  - [x] Parse Response: `$input.item.json` 접근, 폴백 감지 로직
- [x] 에러 핸들링: Store Exists? IF 분기, Claude 타임아웃 10초, onError 설정

### 작업 2: 테스트 트리거 워크플로우
- [x] `generate-test-trigger.js` 생성 스크립트 작성
- [x] `test-trigger.json` 생성 및 JSON 유효성 검증
- [x] PRD 10개 시나리오 테스트 메시지 (S01~S10)
- [x] 폴백 테스트 1건 (F01)
- [x] 키워드 기반 PASS/FAIL 자동 판정
- [x] Summary 노드: 전체 Pass Rate 집계 (목표 90%)

### 작업 3: 환경변수 설정 가이드
- [x] `ENV_SETUP.md` 작성
- [x] Airtable PAT 발급 → n8n 등록 절차
- [x] Claude API Key → Header Auth 등록 절차
- [x] 워크플로우 Import 절차 (메인 → 테스트 순서)
- [x] 연결 테스트 방법 (Airtable / Claude / 통합 curl)
- [x] 트러블슈팅 가이드 (6개 케이스)

---

## 다음 세션 예고

**Session 3**: n8n Import + 실제 연동 테스트
- Airtable FAQs 시드 데이터 추가 (기존 3행 → 10행, 나머지 7개 시나리오 추가)
- main-csbot.json Import → Credential 매핑
- test-trigger.json으로 11건 통합 테스트 (S01~S10 + F01 폴백)
- Pass Rate 90% 달성 확인 → 프롬프트/FAQ 튜닝
