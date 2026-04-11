# n8n 환경 설정 가이드

워크플로우 Import 후 필요한 Credential 및 설정 안내.

---

## 1. Airtable Credential

### 1-1. Personal Access Token 발급

1. Airtable 로그인 → 우측 상단 프로필 아이콘 → **Developer Hub**
2. **Personal Access Tokens** → **Create new token**
3. 설정:
   - Name: `n8n-csbot`
   - Scopes: `data.records:read`, `data.records:write`
   - Access: `SmartStore CSBot` 베이스 선택
4. **Create token** → 토큰 복사 (pat로 시작하는 문자열)

### 1-2. Base ID 확인

1. Airtable에서 `SmartStore CSBot` 베이스 열기
2. 브라우저 URL 확인: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. `appXXXXXXXXXXXXXX` 부분이 Base ID → 메모

### 1-3. n8n에 등록

1. n8n → 좌측 메뉴 **Credentials** → **Add Credential**
2. 검색: `Airtable Personal Access Token`
3. 입력:
   - **Personal Access Token**: 1-1에서 복사한 토큰
4. **Save** → 연결 테스트 성공 확인

### 1-4. 워크플로우에 적용

1. `Main CSBot` 워크플로우 열기
2. 아래 4개 노드 각각 클릭 → Credential 드롭다운에서 방금 등록한 Airtable 선택:
   - `Get Store Config`
   - `Get FAQs`
   - `Get Recent Conversations`
   - `Save Conversation`
3. 각 노드의 **Base** 필드에 1-2에서 확인한 Base ID 입력

---

## 2. Claude API Credential

### 2-1. API Key 확인

1. [Anthropic Console](https://console.anthropic.com/) 로그인
2. **API Keys** → 기존 키 복사 또는 **Create Key**
3. `sk-ant-`로 시작하는 키 복사

### 2-2. n8n에 등록

1. n8n → **Credentials** → **Add Credential**
2. 검색: `Header Auth`
3. 입력:
   - **Name** (credential 이름): `Claude API`
   - **Name** (header name): `x-api-key`
   - **Value**: 2-1에서 복사한 API Key
4. **Save**

### 2-3. 워크플로우에 적용

1. `Main CSBot` 워크플로우 → `Call Claude API` 노드 클릭
2. **Authentication** → `Header Auth` 선택
3. Credential 드롭다운에서 `Claude API` 선택

---

## 3. 워크플로우 Import

### 메인 워크플로우

1. n8n → **Workflows** → **Add Workflow** (또는 기존 워크플로우 목록에서 **Import from File**)
2. `main-csbot.json` 선택
3. Import 완료 후 위 1, 2번의 Credential 매핑 수행
4. 우측 상단 **Active** 토글 ON

### 테스트 트리거

1. 같은 방법으로 `test-trigger.json` Import
2. 별도 Credential 불요 (메인 워크플로우의 Webhook을 HTTP로 호출)
3. `Call CSBot Webhook` 노드의 URL이 `http://localhost:5678/webhook/csbot/message`인지 확인
   - Docker 네트워크 내부에서 호출 시: `http://n8n:5678/webhook/csbot/message`

---

## 4. 연결 테스트

### Airtable 연결 확인

1. `Main CSBot` 워크플로우 열기
2. `Get Store Config` 노드 클릭 → **Test step** 실행
3. 시드 데이터 (하루마루 생활용품) 레코드가 반환되면 성공

### Claude API 연결 확인

1. `Call Claude API` 노드 클릭
2. 아래 JSON을 Input으로 수동 설정하고 **Test step**:
   ```
   request_body: {"model":"claude-haiku-4-5-20251001","max_tokens":50,"messages":[{"role":"user","content":"테스트"}]}
   ```
3. `content[0].text`에 응답이 있으면 성공

### 통합 테스트

```bash
curl -X POST http://localhost:5678/webhook/csbot/message \
  -H "Content-Type: application/json" \
  -d '{"store_id":"1","session_id":"setup_test","channel":"web_widget","message":"배송 얼마나 걸려요?"}'
```

기대 응답: `{"response":"배송 안내드릴게요!...출고...영업일..."}`

---

## 5. 환경변수 요약

| 항목 | 값 형식 | 등록 위치 |
|------|---------|-----------|
| Airtable Personal Access Token | `patXXXXXXXX...` | n8n Credentials → Airtable Personal Access Token |
| Airtable Base ID | `appXXXXXXXX` | 각 Airtable 노드 → Base 필드 |
| Claude API Key | `sk-ant-XXXX...` | n8n Credentials → Header Auth |

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| Airtable 노드 `AUTHENTICATION_FAILED` | 토큰 만료 또는 scope 부족 | Developer Hub에서 토큰 재발급, scope 확인 |
| Airtable 노드 `TABLE_NOT_FOUND` | Base ID 오류 또는 테이블명 불일치 | URL에서 Base ID 재확인, 테이블명 대소문자 확인 |
| Claude API `401 Unauthorized` | API Key 오류 | Anthropic Console에서 키 재확인 |
| Claude API `429 Rate Limited` | 요청 초과 | 잠시 대기 후 재시도 |
| Webhook `404 Not Found` | 워크플로우 비활성 | Active 토글 ON 확인 |
| 테스트 트리거 `ECONNREFUSED` | 메인 워크플로우 미활성 또는 URL 불일치 | URL 확인, 메인 워크플로우 Active 확인 |
