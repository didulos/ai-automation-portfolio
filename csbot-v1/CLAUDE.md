# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

스마트스토어 셀러용 CS 자동화 봇. **n8n(워크플로우) + Claude API(AI 응답) + Airtable(데이터)** 3계층 구조.

고객 문의 → n8n Webhook → Airtable에서 스토어 정보·FAQ 조회 → Claude API로 답변 생성 → 응답 반환 + 대화 저장

채널: 카카오톡 채널(Callback 패턴) + 웹 채팅 위젯(CORS POST)

---

## 주요 커맨드

```bash
# Airtable 테이블 생성 + 시드 데이터 투입 (초기 1회)
node src/scripts/setup-airtable.js

# 시드 데이터만 재투입
node src/scripts/seed-airtable.js

# 웹 채팅 위젯 로컬 서버 (http://localhost:8080/chat-widget.html)
python3 -m http.server 8080 --directory src/widget

# 봇 엔드포인트 직접 테스트
curl -X POST http://localhost:5678/webhook/csbot/message \
  -H "Content-Type: application/json" \
  -d '{"store_id":"1","session_id":"test_001","channel":"web_widget","message":"배송 얼마나 걸려요?"}'

# n8n 워크플로우 JSON 재생성 (변경 후 n8n UI에서 재Import 필요)
node src/n8n-workflows/generate-workflow.js
```

---

## 아키텍처

### 워크플로우 의존 관계

```
main-csbot          ← 핵심. 모든 CS 처리 담당
    ↑ HTTP POST
web-widget          ← 웹 위젯 → main-csbot 중계
kakao-channel       ← 카카오 Callback → main-csbot 중계

onboarding-form     ← 폼 제출 → Stores 생성 → FAQs 10개 생성
onboarding-notify   ← 독립 webhook. onboarding-form 완료 후 알림 발송
onboarding-complete ← GET webhook. 온보딩 완료 HTML 페이지 반환

test-all            ← main-csbot에 15개 케이스 순차 호출
```

### Airtable 스키마 요약

- **Stores**: 스토어별 설정 (배송사·교환기간·영업시간 등). `StoreID`는 Auto Number (API 생성 불가 — UI에서 수동 추가 필요)
- **FAQs**: 스토어별 FAQ. `StoreID`(linked), `QuestionPatterns`(JSON 문자열), `AnswerTemplate`, `IsActive`
- **Conversations**: 대화 이력. `WasFallback`(boolean), `ResponseTimeMs`

### main-csbot 처리 흐름

```
Receive Message
  → Get Store Config (filterByFormula: {StoreID}=store_id)
  → Store Exists? (IF notEmpty)
  → Get FAQs (IsActive=TRUE)
  → Get Recent Conversations (최근 5턴)
  → Build Prompt (Code: store_info + faq_data + history 조립)
  → Call Claude API (HTTP Request, timeout 60s)
  → Parse Response (Code: WasFallback 감지, 카테고리 추출)
  → Save Conversation (Airtable)
  → Send Response (Respond to Webhook)
```

### n8n 워크플로우 수정 우선순위

1. **n8n UI에서 직접 수정** — 노드 옵션 1~2개 변경은 항상 UI 먼저
2. `.json` 파일 업데이트 — 기록 보존용으로 병행
3. **재Import는 최후 수단** — Credential 재연결, 노드 위치 초기화 발생

---

## n8n Workflow JSON 생성 규칙

n8n 워크플로우 JSON을 생성할 때 반드시 `references/n8n-golden/` 폴더의 실제 작동 워크플로우를 참조하여 동일한 노드 구조를 따를 것.
추측으로 JSON 구조를 만들지 말고, 골든 레퍼런스의 실제 구조를 복제할 것.

### 골든 레퍼런스 파일
- `references/n8n-golden/Airtable 고객 DB 자동 관리.json` — Webhook, Set, Airtable, IF(equals), Telegram, Email 노드 포함
- `references/n8n-golden/RSS 뉴스 필터링 bot.json` — Schedule Trigger, RSS, IF(다중 OR contains), Telegram 노드 포함
- `references/n8n-golden/Google Form 자동응답 (1).json` — Webhook, Set, Email 노드 포함
- `references/n8n-golden/Main CSBot - working IF notEmpty.json` — IF(notEmpty), Airtable search, Code, HTTP Request, Respond to Webhook 포함

### n8n 버전 기준
- n8n v2.10+ 기준으로 생성
- 노드 typeVersion은 골든 레퍼런스의 버전을 따를 것

### IF 노드 (typeVersion 2.3)
**가장 자주 깨지는 노드. 반드시 골든 레퍼런스 구조를 정확히 따를 것.**

```json
{
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict",
        "version": 3
      },
      "conditions": [
        {
          "id": "고유-uuid-값",
          "leftValue": "={{ $json.fields['필드명'] }}",
          "rightValue": "비교값",
          "operator": {
            "type": "string",
            "operation": "equals",
            "name": "filter.operator.equals"
          }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.3
}
```

**notEmpty (값 존재 여부 확인) — `Main CSBot - working IF notEmpty.json`에서 추출:**
```json
{
  "conditions": [
    {
      "id": "고유-uuid-값",
      "leftValue": "={{ $json.id }}",
      "rightValue": "",
      "operator": {
        "type": "string",
        "operation": "notEmpty",
        "singleValue": true
      }
    }
  ]
}
```

핵심 규칙:
- `typeVersion`: 2.3 (2가 아님)
- `options`에 `typeValidation: "strict"`, `version: 3` 필수
- **operator 구조는 operation별로 다름 — 반드시 골든 레퍼런스에서 복사:**
  - `equals`: `{ type, operation, name: "filter.operator.equals" }`
  - `contains`: `{ type, operation }` (name 없음)
  - `notEmpty`: `{ type, operation: "notEmpty", singleValue: true }` (name 없음, singleValue 필수)
- **절대 operator 필드를 추측하지 말 것.** 골든 레퍼런스에 없는 operation을 써야 하면 n8n UI에서 직접 만들고 Export하여 구조를 확인할 것
- `conditions[].id`는 UUID 형식
- 다중 조건: `combinator`를 `"or"` 또는 `"and"`로 설정
- connections: `main[0]` = true 분기, `main[1]` = false 분기

### Set/Edit Fields 노드 (typeVersion 3.4)
```json
{
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "고유-uuid",
          "name": "필드명",
          "value": "={{ $json.body.name }}",
          "type": "string"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4
}
```

### Webhook 노드 (typeVersion 2.1)
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "endpoint-path",
    "options": {}
  },
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2.1
}
```
- responseMode를 사용할 경우: `"responseMode": "responseNode"` 추가

### Airtable 노드 (typeVersion 2.1)
- `mappingMode: "defineBelow"`를 사용하고 `value`와 `schema`를 명시적으로 정의
- `mappingMode: "autoMapInputData"` 사용 시 입력 필드가 Airtable 컬럼명과 정확히 일치해야 함 (없는 필드가 있으면 "Unknown field name" 에러)
- **날짜 데이터 주의**: Airtable `Date` 타입 필드는 `YYYY-MM-DD` 형식만 허용. ISO datetime(`2026-03-29T12:20:07.613Z`) 전송 시 "cannot accept the provided value" 에러. 해결책: Airtable 필드를 `Single line text`로 바꾸거나, 값을 `.substring(0, 10)`으로 날짜만 추출

### Code 노드 (typeVersion 2)
- `"Run Once for Each Item"` 모드: `return { key: value }` 형식만 사용
  - `return [{ json: { ... } }]` 사용 금지 — "A 'json' property isn't an object" 에러 발생
- `"Run Once for All Items"` 모드: `return [{ json: { ... } }]` 형식 사용

### HTTP Request 노드 (typeVersion 4.2)
- body를 JSON 문자열로 보낼 때: `specifyBody: "string"`, `body: "={{ $json.request_body }}"`
- body를 JSON 객체로 보낼 때: `specifyBody: "json"`, `jsonBody: "={{ JSON.stringify($json) }}"`

### Respond to Webhook 노드 (typeVersion 1.1)
- JSON 응답: `respondWith: "json"`, `responseBody: "={{ $json }}"`
- Text 응답: `respondWith: "text"`, `responseBody: "={{ JSON.stringify({...}) }}"`

### 워크플로우 settings
```json
{
  "executionOrder": "v1",
  "binaryMode": "separate",
  "availableInMCP": false
}
```

### connections 구조
```json
{
  "노드이름": {
    "main": [
      [{ "node": "다음노드", "type": "main", "index": 0 }]
    ]
  }
}
```
- IF 노드: `main[0]` = true, `main[1]` = false
- false 분기가 비어있을 때: `main[1]`에 빈 배열 `[]`

### Expression 문법
- 기본: `={{ $json.fieldName }}`
- 한글/특수문자 필드: `={{ $json['필드명'] }}`
- 하이픈 포함: `={{ $json["field-with-dash"] }}`
- Airtable 출력 필드 접근: `={{ $json.fields['필드명'] }}`
- **filterByFormula 안에서 다른 노드 참조 시**: 작은따옴표 충돌 방지를 위해 전체를 expression으로 구성
  - 올바름: `={{ "{FieldName}='" + $('Node Name').first().json.body.value + "'" }}`
  - 깨짐: `{FieldName}='{{ $('Node Name').first().json.body.value }}'` (작은따옴표 충돌)

### 흔한 실수 방지
- position 좌표 겹침 → 200px 이상 간격 유지
- credentials는 placeholder로 포함 (import 후 수동 재연결 필요 안내)
- generate 스크립트 수정 후 반드시 n8n UI에서 재Import 필요 안내
- 노드 id는 UUID 형식 사용
