# 카카오 i오픈빌더 챗봇 설정 가이드

> ArumDri 스마트스토어 CS봇 — 카카오톡 채널 연동
> 작성일: 2026-03-21

---

## 전제 조건

| 항목 | 상태 |
|------|------|
| 카카오 비즈니스 채널 | 개설 완료 |
| n8n 가동 중 | localhost:5678 |
| Main CSBot 워크플로우 | Import + Credential 매핑 완료 |
| Kakao Channel Chatbot 워크플로우 | Import 완료 |
| ngrok | 무료 도메인 연결 완료 |

---

## 1단계: n8n 워크플로우 Import

### 1-1. kakao-channel.json Import

1. n8n 웹 UI (http://localhost:5678) → Workflows → Import from File
2. `src/n8n-workflows/kakao-channel.json` 선택
3. Import 후 "Kakao Channel Chatbot" 워크플로우 확인

### 1-2. 워크플로우 활성화

- Main CSBot 워크플로우: **Active** 상태여야 함
- Kakao Channel Chatbot 워크플로우: **Active** 상태로 전환

### 1-3. Webhook URL 확인

| 환경 | URL |
|------|-----|
| 로컬 테스트 | `http://localhost:5678/webhook-test/kakao` |
| 로컬 운영 | `http://localhost:5678/webhook/kakao` |
| 외부 (ngrok) | `https://deidra-nondevelopmental-unoccidentally.ngrok-free.dev/webhook/kakao` |

> **카카오 i오픈빌더에는 ngrok URL을 등록합니다.**

---

## 2단계: 카카오 i오픈빌더 설정

### 2-1. i오픈빌더 접속

1. https://i.kakao.com 접속
2. 카카오 계정 로그인
3. "봇 만들기" 또는 기존 봇 선택

### 2-2. 봇 생성 (처음인 경우)

1. 좌측 메뉴 → "봇 만들기" 클릭
2. 봇 이름: `하루마루 CS봇` (원하는 이름)
3. 봇 설명 입력
4. 생성 완료

### 2-3. 스킬(Skill) 등록

1. 좌측 메뉴 → **스킬** 클릭
2. "생성" 버튼 클릭
3. 스킬 정보 입력:
   - **스킬명**: `CS봇 응답`
   - **설명**: `고객 문의를 n8n CS봇으로 전달하여 자동 응답`
   - **URL**: `https://deidra-nondevelopmental-unoccidentally.ngrok-free.dev/webhook/kakao`
4. "저장" 클릭

### 2-4. 스킬 테스트 (i오픈빌더 내)

1. 스킬 목록에서 방금 만든 `CS봇 응답` 클릭
2. 하단 "스킬 테스트" 영역
3. 요청 본문에 아래 JSON 입력:

```json
{
  "intent": { "id": "test", "name": "test" },
  "userRequest": {
    "timezone": "Asia/Seoul",
    "utterance": "배송 얼마나 걸려요?",
    "user": { "id": "test_user_1", "type": "botUserKey" }
  },
  "bot": { "id": "test_bot", "name": "test" }
}
```

4. "테스트" 클릭
5. 응답에 `version: "2.0"`, `simpleText.text`에 배송 안내 메시지가 있으면 성공

### 2-5. 시나리오에 스킬 연결

**모든 메시지를 CS봇으로 보내는 방법 (폴백 블록 활용):**

1. 좌측 메뉴 → **시나리오** 클릭
2. **폴백 블록** 클릭 (기본 제공, 매칭되지 않는 모든 발화를 처리)
3. "봇 응답" 영역에서 **스킬데이터 사용** 선택
4. 스킬 선택: `CS봇 응답`
5. "저장" 클릭

> **폴백 블록에 스킬을 연결하면, 사용자가 보내는 모든 메시지가 n8n CS봇으로 전달됩니다.**
> 특정 키워드에만 반응하게 하려면 별도 블록을 만들어 스킬을 연결하면 됩니다.

### 2-6. 카카오톡 채널 연결

1. 좌측 메뉴 → **설정** → **카카오톡 채널 연결**
2. 운영 중인 카카오 비즈니스 채널 선택
3. 연결 완료

---

## 3단계: 배포

1. 좌측 메뉴 → **배포**
2. "배포" 버튼 클릭
3. 배포 완료 후 카카오톡에서 해당 채널에 메시지를 보내면 CS봇이 응답

> **주의**: 배포하지 않으면 실제 카카오톡에서 봇이 동작하지 않습니다.
> i오픈빌더 내 "봇 테스트"는 배포 없이도 동작합니다.

---

## 4단계: 테스트

### 방법 1: i오픈빌더 봇 테스트

- i오픈빌더 우측 하단 "봇 테스트" 버튼
- 메시지 입력하여 응답 확인

### 방법 2: curl로 직접 테스트

```bash
curl -X POST https://deidra-nondevelopmental-unoccidentally.ngrok-free.dev/webhook/kakao \
  -H "Content-Type: application/json" \
  -d '{
    "intent": {"id": "test", "name": "test"},
    "userRequest": {
      "timezone": "Asia/Seoul",
      "utterance": "교환하고 싶어요",
      "user": {"id": "curl_test_1", "type": "botUserKey"}
    },
    "bot": {"id": "test", "name": "test"}
  }'
```

기대 응답:
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "교환은 수령 후 7일 이내, 미사용·미개봉 상태에서 가능합니다..."
        }
      }
    ]
  }
}
```

### 방법 3: n8n 테스트 워크플로우

1. `test-kakao.json` Import
2. Manual 실행 → 11개 테스트 케이스 자동 수행
3. Test Summary 노드에서 Pass Rate 확인

### 방법 4: 실제 카카오톡에서 테스트

1. 배포 완료 후
2. 카카오톡에서 해당 채널 검색 → 채팅
3. 메시지 전송 → 봇 응답 확인

---

## 트러블슈팅

### 1. 스킬 테스트에서 "타임아웃" 오류

**원인**: Claude API 응답이 5초를 초과

**해결**:
- n8n → Main CSBot → Call Claude API 노드의 타임아웃을 줄여본다 (현재 10초 → 5초)
- Claude API가 느린 경우는 일시적 — 재시도
- 지속적이면 모델을 `claude-haiku-4-5-20251001`로 변경 (더 빠름)

**향후 개선**: 카카오 AI 챗봇 콜백 기능 활용
- 5초 초과 시 콜백 URL로 비동기 응답 가능
- 봇 마스터가 챗봇 > 설정 > AI 챗봇 관리에서 신청 (승인 1~2영업일)
- 콜백 URL은 1분간 유효, 1회 사용 가능

### 2. 스킬 URL 연결 실패

**확인 사항**:
- ngrok이 실행 중인지 확인
- n8n이 실행 중인지 확인
- Kakao Channel Chatbot 워크플로우가 **Active** 상태인지 확인
- URL이 정확한지 확인: `/webhook/kakao` (뒤에 슬래시 없이)

### 3. ngrok 관련 주의사항

- **ngrok 무료 도메인**: 세션 재시작해도 URL 유지됨 (고정 도메인)
- **ngrok-skip-browser-warning**: 무료 플랜에서 브라우저 접속 시 경고 페이지가 뜰 수 있지만, API 호출(POST)에는 영향 없음
- ngrok 프로세스가 종료되면 외부 접근 불가 → 항상 실행 상태 유지

### 4. "응답 형식이 올바르지 않습니다" 오류

**원인**: 카카오 스킬 응답 JSON 포맷 불일치

**확인**:
- `version`이 `"2.0"` (문자열)인지
- `template.outputs`가 배열인지
- `simpleText.text`가 문자열인지
- n8n에서 Kakao Channel Chatbot 워크플로우 실행 로그 확인

### 5. 봇이 응답하지 않음

**확인 순서**:
1. i오픈빌더에서 봇이 **배포** 되었는지
2. 시나리오의 폴백 블록에 스킬이 연결되었는지
3. n8n 워크플로우 실행 로그에 요청이 들어오는지
4. Main CSBot 워크플로우가 Active인지
5. Airtable credential이 정상인지

### 6. 카카오 응답이 잘리는 경우

- 카카오 simpleText는 최대 1,000자 제한
- Claude 응답이 길면 잘릴 수 있음 → system prompt에서 "3문장 이내"로 제한하고 있으므로 보통 문제 없음
- 만약 발생하면 Format Kakao Response 노드에서 1,000자 슬라이싱 추가

---

## 카카오 스킬 API 레퍼런스

### 스킬 요청 구조 (카카오 → n8n)

```json
{
  "intent": {
    "id": "스킬_intent_id",
    "name": "스킬_이름"
  },
  "userRequest": {
    "timezone": "Asia/Seoul",
    "params": {},
    "block": {
      "id": "블록_id",
      "name": "폴백 블록"
    },
    "utterance": "고객이 보낸 메시지",
    "lang": null,
    "user": {
      "id": "사용자_고유_id",
      "type": "botUserKey",
      "properties": {}
    }
  },
  "bot": {
    "id": "봇_id",
    "name": "봇_이름"
  },
  "action": {
    "name": "스킬_액션_이름",
    "clientExtra": null,
    "params": {},
    "id": "액션_id",
    "detailParams": {}
  }
}
```

### 스킬 응답 구조 (n8n → 카카오)

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "봇 응답 텍스트 (최대 1,000자)"
        }
      }
    ]
  }
}
```

### 제약 사항

| 항목 | 제한 |
|------|------|
| 스킬 응답 타임아웃 | **5초** (고정, 조정 불가) |
| simpleText 최대 길이 | 1,000자 |
| outputs 최대 개수 | 3개 |
| quickReplies 최대 개수 | 10개 |
| version | `"2.0"` 고정 |

### 공식 문서 링크

- [스킬 만들기](https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/make_skill)
- [응답 타입별 JSON 포맷](https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/answer_json_format)
- [AI 챗봇 콜백 개발 가이드](https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/ai_chatbot_callback_guide)
- [블록에 스킬 적용하기](https://i.kakao.com/docs/skill-block)
