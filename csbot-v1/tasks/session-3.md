# Session 3: 카카오톡 채널 챗봇 연동
> tasks/session-3.md
> 목표: 카카오 i오픈빌더 스킬 연동용 n8n 워크플로우 완성

---

## 산출물

| 파일 | 설명 |
|------|------|
| `src/n8n-workflows/kakao-channel.json` | 카카오 채널 챗봇 워크플로우 JSON (5노드 + 1 Sticky Note) |
| `src/n8n-workflows/generate-kakao-channel.js` | 카카오 워크플로우 JSON 생성 스크립트 |
| `src/n8n-workflows/test-kakao.json` | 카카오 테스트 워크플로우 JSON (5노드 + 1 Sticky Note, 11케이스) |
| `src/n8n-workflows/generate-test-kakao.js` | 카카오 테스트 JSON 생성 스크립트 |
| `src/kakao/KAKAO_SETUP.md` | 카카오 i오픈빌더 설정 가이드 |
| `src/scripts/setup-airtable.js` | Airtable 테이블 생성 + 시드 데이터 투입 스크립트 |

---

## 아키텍처

```
카카오 i오픈빌더 스킬 요청
  → [Kakao Channel Chatbot 워크플로우]
    → Receive Kakao Request (Webhook POST /kakao)
      → Normalize Kakao Request (Code: 표준 포맷 변환)
        → Call Main CSBot (HTTP Request: localhost:5678/webhook/csbot/message)
          → Format Kakao Response (Code: 카카오 응답 포맷)
            → Send Kakao Response (Respond to Webhook)
```

메인 CS봇 워크플로우(main-csbot.json)는 수정 없이 HTTP Request로 호출.

---

## Session 3 완료 체크리스트

### 사전 작업: Airtable 셋업
- [x] `setup-airtable.js` 스크립트 작성
- [x] Stores, FAQs, Conversations 테이블 API로 생성
- [x] Stores 시드 데이터 1건 투입 (하루마루 생활용품)
- [x] FAQs 시드 데이터 10건 투입 (PRD S01~S10 전체)

### 작업 1: 카카오 챗봇 연동 워크플로우
- [x] `generate-kakao-channel.js` 생성 스크립트 작성
- [x] `kakao-channel.json` 생성 및 JSON 유효성 검증
- [x] 5개 워크플로우 노드 + 1 Sticky Note
- [x] Normalize Kakao Request: utterance → message, user.id → session_id
- [x] Call Main CSBot: HTTP Request, 타임아웃 8초, onError 처리
- [x] Format Kakao Response: version 2.0, simpleText 포맷, 에러 폴백
- [ ] n8n Import 및 수동 테스트
- [ ] curl로 카카오 스킬 요청 시뮬레이션 테스트

### 작업 2: 카카오 설정 가이드
- [x] `KAKAO_SETUP.md` 작성
- [x] i오픈빌더 봇 생성 절차
- [x] 스킬 등록 방법 (URL 포함)
- [x] 폴백 블록에 스킬 연결 방법
- [x] 테스트 방법 4가지 (i오픈빌더, curl, n8n, 카카오톡)
- [x] 트러블슈팅 6개 케이스
- [x] 카카오 스킬 API 레퍼런스 (요청/응답 JSON 구조)

### 작업 3: 카카오 테스트 워크플로우
- [x] `generate-test-kakao.js` 생성 스크립트 작성
- [x] `test-kakao.json` 생성 및 JSON 유효성 검증
- [x] 11개 테스트 케이스 (S01~S10 + F01 폴백)
- [x] 카카오 응답 포맷 검증 (version, template.outputs)
- [x] 키워드 기반 PASS/FAIL 판정
- [x] Test Summary: 전체 Pass Rate 집계
- [ ] n8n Import 및 테스트 실행
- [ ] Pass Rate 90% 달성 확인

---

## n8n Import 후 수동 테스트 절차

### 1. 워크플로우 Import
```
1. kakao-channel.json Import → "Kakao Channel Chatbot"
2. test-kakao.json Import → "Test Kakao Channel"
3. Main CSBot 워크플로우 Active 확인
```

### 2. curl 테스트
```bash
curl -X POST http://localhost:5678/webhook-test/kakao \
  -H "Content-Type: application/json" \
  -d '{
    "intent": {"id": "test", "name": "test"},
    "userRequest": {
      "timezone": "Asia/Seoul",
      "utterance": "배송 얼마나 걸려요?",
      "user": {"id": "test_user_1", "type": "botUserKey"}
    },
    "bot": {"id": "test", "name": "test"}
  }'
```

### 3. 테스트 워크플로우 실행
- Test Kakao Channel → Manual 실행
- Test Summary 노드에서 Pass Rate 확인

---

## 다음 세션 예고

**Session 4**: 웹 채팅 위젯
- 스마트스토어 임베드용 HTML/CSS/JS 위젯
- 메인 CS봇 웹훅 직접 호출 (별도 워크플로우 불필요)
- 브랜드 컬러 적용 (딥포레스트그린 #2D5016, 웜오렌지 #E8781A)
