# 카카오 오픈빌더 챗봇 테스트 매뉴얼

## 사전 조건

1. **n8n 워크플로우 활성화**
   - Main CSBot: Active 상태
   - Kakao Channel Chatbot: Active 상태 (Published)

2. **ngrok 실행 중**
   - `ngrok http 5678` 실행 상태
   - URL 확인: `https://deidra-nondevelopmental-unoccidentally.ngrok-free.dev`

3. **카카오 오픈빌더 설정**
   - 스킬 URL: `https://{ngrok주소}/webhook/kakao`
   - 폴백 블록: 스킬 연결 + "스킬데이터 사용" 설정
   - 운영시간: 24시간 (00:00~24:00)
   - AI 챗봇: ON (Callback 승인 완료)
   - 카카오톡 채널: 연결됨

---

## 테스트 단계 (순서대로 진행)

### 1단계: Main CSBot 단독 테스트

Main CSBot이 정상 동작하는지 먼저 확인한다.

```bash
curl -X POST http://localhost:5678/webhook/csbot/message \
  -H "Content-Type: application/json" \
  -d '{"store_id": "1", "session_id": "test_1", "channel": "test", "message": "교환하고 싶어요"}'
```

**기대 결과:** JSON 응답에 `response` 필드가 있고, 교환 관련 안내가 포함됨.

**실패 시:** Main CSBot 워크플로우 확인. 이 단계가 통과해야 다음으로 진행.

---

### 2단계: 오픈빌더 스킬 서버 테스트

카카오 → n8n 연결을 확인한다.

1. 오픈빌더 → 스킬 → "CS봇 응답" 클릭
2. 하단 "스킬 서버로 전송" 클릭
3. 응답 미리보기 확인

**기대 결과 (Callback+Direct 분기 워크플로우):**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "AI 응답 내용..."
        }
      }
    ]
  }
}
```

**기대 결과 (Callback 전용 워크플로우):**
```json
{
  "response": {
    "useCallback": true
  }
}
```

**실패 시 확인:**
- ngrok 실행 여부
- 스킬 URL이 현재 ngrok 주소와 일치하는지
- n8n Executions 탭에서 에러 내용 확인

---

### 3단계: 오픈빌더 봇테스트

시나리오 → 폴백 블록 경로를 확인한다.

1. 오픈빌더 → 좌측 하단 "봇테스트" 클릭
2. "교환하고 싶어요" 입력
3. 응답 확인

**기대 결과:** AI가 생성한 교환 안내 응답

**"[trust]skill exec error" 팝업이 뜨면:**
- n8n Executions 탭에서 해당 실행의 에러 확인
- 스킬 서버 테스트(2단계)가 통과했는지 재확인
- 폴백 블록에서 "저장" → "배포" 다시 시도

**아무 응답이 없으면:**
- 폴백 블록에 스킬이 연결되어 있는지 확인
- "저장" 버튼 클릭 후 "배포" 했는지 확인
- 운영시간이 24시간인지 확인

---

### 4단계: curl로 카카오 포맷 테스트

카카오 스킬 요청 포맷으로 직접 호출한다.

```bash
curl -X POST https://{ngrok주소}/webhook/kakao \
  -H "Content-Type: application/json" \
  -d '{
    "intent": {"id": "test", "name": "test"},
    "userRequest": {
      "timezone": "Asia/Seoul",
      "utterance": "교환하고 싶어요",
      "user": {"id": "curl_test_1", "type": "botUserKey"}
    },
    "bot": {"id": "test", "name": "test"},
    "action": {"id": "test", "name": "test", "params": {}, "detailParams": {}}
  }'
```

**기대 결과 (Callback+Direct 분기 워크플로우):**
callbackUrl이 없으므로 Direct 분기 → 카카오 포맷 응답이 직접 반환됨.

---

### 5단계: 실제 카카오톡 테스트

최종 E2E 테스트.

1. 카카오톡 앱에서 채널 채팅방 열기
2. "교환하고 싶어요" 입력
3. 응답 대기 (Callback 패턴이므로 수 초 소요)

**기대 결과:** AI가 생성한 교환 안내 응답

**응답이 없으면:**
- n8n Executions에 기록이 있는지 확인
  - 기록 없음: 카카오 → n8n 연결 문제 (스킬 URL, 채널 연결, 배포 확인)
  - 기록 있음 + 에러: 에러 내용 확인
  - 기록 있음 + 성공: callbackUrl POST 실패 가능성 → Send to Callback URL 노드 확인

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| n8n에 기록 없음 | 카카오가 스킬 호출 안 함 | 폴백 블록 저장+배포, 채널 연결 확인 |
| Extract Data 에러 | callbackUrl 없음 (테스트 환경) | Callback+Direct 분기 워크플로우 사용 |
| [trust]skill exec error | 스킬 서버 응답 에러 | n8n Executions에서 에러 상세 확인 |
| 운영시간 안내만 나옴 | 운영시간 밖 | 운영시간 24시간으로 변경 후 배포 |
| useCallback:true만 반환 | 정상 (Callback 전용) | 실제 카카오톡에서 테스트 필요 |
| CSBot 타임아웃 | AI 처리 60초 초과 | Airtable/OpenRouter 연결 확인 |

## ngrok 주소 변경 시

ngrok을 재시작하면 주소가 바뀐다 (무료 플랜).

1. 새 ngrok 주소 확인
2. 오픈빌더 → 스킬 → URL 변경
3. 2단계부터 재테스트
