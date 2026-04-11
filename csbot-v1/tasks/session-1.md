# Session 1: 환경 세팅
> tasks/session-1.md
> 목표: n8n Docker 실행 + Airtable 베이스 구축 + Claude API 연결 확인

---

## 전제 조건

| 항목 | 확인 |
|------|------|
| Docker Desktop 설치 | [ ] |
| Airtable 계정 | [ ] |
| Claude API 키 발급 | [ ] |
| 카카오 채널 개설 (선택, Session 4에서 사용) | [ ] |

---

## Task 1-1: n8n Docker 세팅

### 목표
로컬에서 n8n을 Docker로 실행하고 웹 UI 접속 확인

### 작업 내용

**1. `src/n8n-workflows/docker-compose.yml` 생성:**
```yaml
version: "3.8"

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=csbot1234
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=Asia/Seoul
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

**2. 실행:**
```bash
cd src/n8n-workflows
docker compose up -d
```

**3. 접속 확인:**
- URL: `http://localhost:5678`
- ID: `admin` / PW: `csbot1234`

### 완료 기준
- [ ] n8n 웹 UI 로그인 성공
- [ ] Workflows 메뉴 진입 확인

---

## Task 1-2: Airtable 베이스 생성

### 목표
`airtable-schema.md` 설계 기반으로 3개 테이블 생성

### 작업 내용

**1. Airtable에서 새 Base 생성**
- Base명: `SmartStore CSBot`

**2. Stores 테이블 필드 추가**

| 필드명 | 타입 | 설정 |
|--------|------|------|
| StoreName | Single line text | — |
| OwnerName | Single line text | — |
| KakaoChannelID | Single line text | — |
| ShippingCarrier | Single line text | — |
| ShippingDays | Number | Integer |
| ShipOutDays | Number | Integer |
| CutoffTime | Single line text | — |
| ReturnPolicy | Long text | — |
| ExchangePeriod | Number | Integer |
| ReturnPeriod | Number | Integer |
| ReturnShippingCost | Number | Integer |
| RefundDays | Number | Integer |
| BusinessHours | Single line text | — |
| BusinessDays | Single line text | — |
| HolidayInfo | Single line text | — |
| ResponseTime | Single line text | — |
| TrackingUrl | URL | — |
| ContactPhone | Phone number | — |
| JejuAvailable | Checkbox | — |
| JejuExtraCost | Number | Integer |
| OverseasAvailable | Checkbox | — |
| OverseasCountries | Single line text | — |
| TaxInvoiceAvailable | Checkbox | — |
| TaxInvoiceContact | Email | — |
| PaymentMethods | Long text | — |
| InstallmentInfo | Single line text | — |
| RestockInfo | Single line text | — |
| ProductDetailGuide | Long text | — |
| CustomNotes | Long text | — |
| IsActive | Checkbox | Default: checked |
| CreatedAt | Created time | — |

**3. FAQs 테이블 필드 추가**

| 필드명 | 타입 | 설정 |
|--------|------|------|
| StoreID | Link to another record | → Stores |
| Category | Single select | 옵션: 배송조회/배송소요일/교환/반품환불/주문취소/재입고/영업시간/결제/상품정보/배송지역/기타 |
| QuestionPatterns | Long text | — |
| AnswerTemplate | Long text | — |
| Variables | Long text | — |
| IsActive | Checkbox | Default: checked |
| Priority | Number | Integer |
| CreatedAt | Created time | — |
| UpdatedAt | Last modified time | — |

**4. Conversations 테이블 필드 추가**

| 필드명 | 타입 | 설정 |
|--------|------|------|
| StoreID | Link to another record | → Stores |
| SessionID | Single line text | — |
| Channel | Single select | 옵션: kakao / web_widget |
| CustomerMessage | Long text | — |
| BotResponse | Long text | — |
| MatchedFAQID | Link to another record | → FAQs |
| MatchedCategory | Single line text | — |
| WasFallback | Checkbox | — |
| ResponseTimeMs | Number | Integer |
| CreatedAt | Created time | — |

**5. 뷰(View) 추가**

Conversations 테이블:
- `Fallbacks Only` — Filter: WasFallback = checked
- `Today` — Filter: CreatedAt = today

FAQs 테이블:
- `By Category` — Group by: Category
- `Priority Order` — Sort: Priority ascending

### 완료 기준
- [ ] Stores 테이블 필드 전체 생성
- [ ] FAQs 테이블 필드 전체 생성
- [ ] Conversations 테이블 필드 전체 생성
- [ ] 3개 테이블 간 링크 필드 연결 확인

---

## Task 1-3: 시드 데이터 입력

### 목표
테스트용 셀러 1개 + FAQ 3개 입력

### Stores 시드 데이터 (1행)

| 필드 | 값 |
|------|-----|
| StoreName | 하루마루 생활용품 |
| OwnerName | 김민지 |
| KakaoChannelID | @harumaru_shop |
| ShippingCarrier | CJ대한통운 |
| ShippingDays | 3 |
| ShipOutDays | 1 |
| CutoffTime | 오후 2시 |
| ExchangePeriod | 7 |
| ReturnPeriod | 7 |
| ReturnShippingCost | 3000 |
| RefundDays | 3 |
| BusinessHours | 09:00~18:00 |
| BusinessDays | 월~금 |
| HolidayInfo | 주말·공휴일 휴무 |
| ResponseTime | 2시간 이내 |
| TrackingUrl | https://www.cjlogistics.com/ko/tool/parcel/tracking |
| ContactPhone | 010-1234-5678 |
| JejuAvailable | ✓ |
| JejuExtraCost | 3000 |
| OverseasAvailable | ☐ |
| OverseasCountries | (공백) |
| TaxInvoiceAvailable | ✓ |
| TaxInvoiceContact | tax@harumaru.co.kr |
| PaymentMethods | 신용카드 / 네이버페이 / 무통장입금 |
| InstallmentInfo | 5만원 이상 2~12개월 무이자 |
| RestockInfo | (공백) |
| ProductDetailGuide | 상품 페이지 상세 설명을 참고해 주세요 |
| IsActive | ✓ |

### FAQs 시드 데이터 (3행)

**FAQ 1 — 배송소요일**
```
Category: 배송소요일
Priority: 1
QuestionPatterns:
["주문하면 며칠 만에 와요", "배송 얼마나 걸려요", "언제 받을 수 있어요", "배송 기간", "배송 일정"]

AnswerTemplate:
배송 안내드릴게요! 🚚

결제 완료 후 {{ShipOutDays}}영업일 이내 출고되며, 출고 후 {{ShippingDays}}영업일 내 수령 가능합니다.
※ {{CutoffTime}} 이전 결제 건은 당일 출고 처리됩니다. (주말·공휴일 제외)

Variables:
["ShipOutDays", "ShippingDays", "CutoffTime"]
```

**FAQ 2 — 교환**
```
Category: 교환
Priority: 2
QuestionPatterns:
["사이즈 교환 가능한가요", "교환하고 싶어요", "상품이 불량이에요", "색깔이 달라요", "교환 기간"]

AnswerTemplate:
교환은 수령 후 {{ExchangePeriod}}일 이내, 미사용·미개봉 상태에서 가능합니다.
주문번호와 교환 사유를 알려주시면 빠르게 안내드리겠습니다.

Variables:
["ExchangePeriod"]
```

**FAQ 3 — 영업시간**
```
Category: 영업시간
Priority: 3
QuestionPatterns:
["고객센터 운영시간", "몇 시까지 운영해요", "주말 상담 가능한가요", "언제 답변 받을 수 있어요"]

AnswerTemplate:
{{StoreName}} 운영시간은 {{BusinessHours}}, {{BusinessDays}}입니다.
{{HolidayInfo}}이며, 운영시간 외 문의는 {{ResponseTime}} 이내 순차 답변드리고 있습니다.

Variables:
["StoreName", "BusinessHours", "BusinessDays", "HolidayInfo", "ResponseTime"]
```

### 완료 기준
- [ ] Stores 시드 1행 입력
- [ ] FAQs 시드 3행 입력 + StoreID 링크 연결 확인

---

## Task 1-4: Airtable API 키 발급 및 n8n 연결

### 목표
n8n에서 Airtable을 API로 조회할 수 있는 상태 만들기

### 작업 내용

**1. Airtable Personal Access Token 발급**
- Airtable → 우측 상단 아이콘 → Developer Hub → Personal Access Tokens → Create token
- Scopes: `data.records:read`, `data.records:write`
- Access: `SmartStore CSBot` 베이스 선택

**2. Airtable Base ID 확인**
- Airtable 베이스 URL: `https://airtable.com/appXXXXXXXX/...`
- `appXXXXXXXX` 부분이 Base ID → 메모해둘 것

**3. n8n Credential 등록**
- n8n → 상단 메뉴 → Credentials → Add Credential
- Type: `Airtable Token API`
- API Token: 발급받은 Personal Access Token

**4. 연결 테스트**
- 테스트용 워크플로우 생성 → Airtable 노드 추가
- Operation: `Get All`, Base ID, Table: `Stores`
- 실행 후 시드 데이터 1행 반환 확인

### 완료 기준
- [ ] Personal Access Token 발급
- [ ] Base ID 메모
- [ ] n8n Credential 등록
- [ ] Airtable 노드로 Stores 테이블 조회 성공

---

## Task 1-5: Claude API 키 n8n 등록

### 목표
n8n HTTP Request 노드로 Claude API 호출 가능 상태 만들기

### 작업 내용

**1. Anthropic API 키 확인**
- Anthropic Console → API Keys → 기존 키 복사 또는 신규 발급

**2. n8n Credential 등록**
- n8n → Credentials → Add Credential
- Type: `Header Auth`
- Name: `Claude API`
- Name (header): `x-api-key`
- Value: `sk-ant-...`

**3. 연결 테스트**
HTTP Request 노드 설정:
```
Method: POST
URL: https://api.anthropic.com/v1/messages
Authentication: Header Auth → Claude API
Headers:
  anthropic-version: 2023-06-01
  content-type: application/json
Body (JSON):
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 50,
  "messages": [{"role": "user", "content": "안녕하세요, 테스트입니다."}]
}
```

> 테스트는 claude-haiku-4-5 사용 (저렴), 실제 운영은 claude-sonnet-4-6

**4. 응답 확인**
```json
{
  "content": [{"type": "text", "text": "안녕하세요!..."}]
}
```
`content[0].text` 존재 확인

### 완료 기준
- [ ] n8n Credential 등록 (Header Auth)
- [ ] HTTP Request 노드에서 Claude API 호출 성공
- [ ] 응답 JSON에서 `content[0].text` 확인

---

## Session 1 최종 체크리스트

| Task | 완료 |
|------|------|
| 1-1: n8n Docker 실행 + UI 접속 | [ ] |
| 1-2: Airtable 3개 테이블 생성 | [ ] |
| 1-3: 시드 데이터 입력 (Stores 1행, FAQs 3행) | [ ] |
| 1-4: Airtable API → n8n 연결 + 조회 테스트 | [ ] |
| 1-5: Claude API → n8n 연결 + 호출 테스트 | [ ] |

**Session 1 완료 시 상태:**
> n8n이 Airtable 데이터를 읽고, Claude API를 호출할 수 있는 인프라 기반 완성

---

## 다음 세션 예고

**Session 2**: n8n 핵심 워크플로우 구축
- Webhook 수신 → 페이로드 정규화 → Airtable 조회 → 프롬프트 조립 → Claude 호출 → 응답 반환 → 로그 저장
- 채널 분기 없이 단일 흐름으로 먼저 동작 검증 후 카카오/웹위젯 분기 추가
