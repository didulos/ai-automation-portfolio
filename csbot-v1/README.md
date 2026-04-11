# ArumDri 스마트스토어 CS봇

스마트스토어 반복 CS 문의를 자동 처리하는 AI 챗봇.
n8n + Claude API + Airtable로 구성된 노코드 친화적 아키텍처.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| FAQ 자동 응답 | 배송·교환·반품·취소 등 반복 문의 자동 처리 |
| 스토어별 맞춤 응답 | 셀러 정보(배송사·교환기간 등)로 실시간 치환 |
| 폴백 처리 | 답변 불가 문의 → 셀러에게 이메일 알림 |
| 대화 이력 저장 | 모든 대화를 Airtable에 자동 기록 |
| 듀얼 채널 | 카카오톡 채널 챗봇 + 웹 채팅 위젯 |
| 5분 온보딩 | 폼 제출만으로 스토어 등록 + FAQ 10개 자동 생성 |

---

## 아키텍처

```
고객 (카카오톡 채널 / 웹 채팅 위젯)
        │
        ▼
   n8n Webhook
        │
        ├─ Airtable: 스토어 정보 조회
        ├─ Airtable: FAQ 조회
        ├─ Airtable: 최근 대화 이력 조회
        │
        ▼
   Claude API (claude-sonnet-4-6)
        │
        ▼
   응답 반환 + Airtable 대화 저장
        │
        └─ (폴백 시) 셀러 이메일 알림
```

### 워크플로우 구성

| 워크플로우 | 역할 |
|-----------|------|
| `main-csbot` | 핵심 CS 처리 엔진 (카카오/웹위젯 공용) |
| `web-widget` | 웹 채팅 위젯 요청 중계 |
| `kakao-channel` | 카카오 Callback 패턴 처리 |
| `onboarding-form` | 셀러 온보딩 폼 → Stores + FAQs 생성 |
| `onboarding-notify` | 새 스토어 등록 시 셀러 알림 |
| `onboarding-complete` | 온보딩 완료 페이지 |
| `test-all` | 자동 테스트 (15개 케이스) |

---

## 요구사항

- [n8n](https://n8n.io/) (셀프호스팅 권장, v2.10+)
- [Airtable](https://airtable.com/) 계정 (무료 티어 가능)
- [Anthropic API Key](https://console.anthropic.com/) (Claude API)
- Node.js 18+ (초기 셋업 스크립트 실행용)

---

## 설치 및 설정

### 1단계: Airtable 베이스 구성

```bash
# 환경변수 설정
cp .env.example .env
# .env에 AIRTABLE_API_KEY, AIRTABLE_BASE_ID 입력

# 테이블 생성 + 시드 데이터 투입
node src/scripts/setup-airtable.js
```

스크립트 실행 후 Airtable에 `Stores`, `FAQs`, `Conversations` 테이블이 생성됩니다.

### 2단계: n8n Credential 등록

n8n → Credentials에서 아래 두 개를 등록합니다.

**Airtable Personal Access Token**
1. [Airtable Developer Hub](https://airtable.com/create/tokens) → 토큰 발급 (scope: `data.records:read/write`)
2. n8n → Add Credential → `Airtable Personal Access Token` → 토큰 입력

**Claude API (Header Auth)**
1. [Anthropic Console](https://console.anthropic.com/) → API Key 복사
2. n8n → Add Credential → `Header Auth`
   - Name: `x-api-key`
   - Value: `sk-ant-...`

> 상세 내용: `src/n8n-workflows/ENV_SETUP.md`

### 3단계: n8n 워크플로우 Import

아래 순서로 Import합니다.

```
src/n8n-workflows/
├── main-csbot.json          ← 1번째 (핵심)
├── web-widget.json          ← 2번째
├── onboarding-form.json     ← 3번째
├── onboarding-notify.json   ← 4번째
└── onboarding-complete.json ← 5번째
```

Import 후 각 워크플로우에서:
- Airtable 노드: Credential + Base ID 재연결
- `Call Claude API` 노드: Header Auth Credential 연결
- 워크플로우 **Active** 토글 ON

### 4단계: 환경변수 (CORS)

웹 위젯의 cross-origin 요청을 허용하려면 n8n 실행 환경에 아래 환경변수를 추가합니다.

```env
N8N_CORS_ORIGIN=*
```

Docker Compose 사용 시 `docker-compose.yml`의 `environment` 섹션에 추가 후 재시작.

---

## 빠른 시작 가이드

### 온보딩 폼으로 스토어 등록

1. n8n에서 `Onboarding Form` 워크플로우 Active 확인
2. 브라우저에서 접속:
   ```
   http://localhost:5678/form/onboarding
   ```
3. 스토어 정보 입력 후 제출
4. Airtable `Stores` 테이블에 레코드 생성 + `FAQs` 10개 자동 생성 확인

### 웹 위젯 테스트

```bash
# 로컬 서버 실행
python3 -m http.server 8080 --directory src/widget

# 브라우저에서 열기
# http://localhost:8080/chat-widget.html
```

채팅창에 "배송 얼마나 걸려요?" 입력 → 봇 응답 확인

### curl 직접 테스트

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

### 자동 테스트 (15개 케이스)

1. n8n에서 `Test All` 워크플로우 Import + Active
2. 워크플로우 수동 실행 (Test 버튼)
3. Airtable `TestResults` 테이블에서 결과 확인

---

## 폴더 구조

```
smartstore-csbot/
│
├── README.md                        # 이 파일
├── CLAUDE.md                        # n8n JSON 생성 규칙 (AI 협업용)
│
├── src/
│   ├── n8n-workflows/               # n8n 워크플로우 JSON + 생성 스크립트
│   │   ├── main-csbot.json          # 핵심 CS봇 워크플로우
│   │   ├── web-widget.json          # 웹 위젯 핸들러
│   │   ├── kakao-channel.json       # 카카오 채널 핸들러
│   │   ├── onboarding-form.json     # 온보딩 폼
│   │   ├── onboarding-notify.json   # 온보딩 알림
│   │   ├── onboarding-complete.json # 온보딩 완료 페이지
│   │   ├── test-all.json            # 자동 테스트
│   │   ├── ENV_SETUP.md             # Credential 설정 상세 가이드
│   │   └── FAQ_CUSTOMIZE.md        # FAQ 수정 가이드
│   │
│   ├── widget/                      # 웹 채팅 위젯
│   │   ├── chat-widget.html         # 위젯 본체 (스탠드얼론)
│   │   └── embed-snippet.html       # 스마트스토어 임베드용 스니펫
│   │
│   └── scripts/                     # 초기 셋업 스크립트
│       ├── setup-airtable.js        # Airtable 테이블 생성
│       └── seed-airtable.js         # 시드 데이터 투입
│
├── design/                          # 설계 문서
│   ├── architecture.md              # 시스템 아키텍처
│   ├── airtable-schema.md           # Airtable 스키마 정의
│   └── system-prompt.md             # Claude 시스템 프롬프트
│
├── requirements/                    # 요구사항 / 비즈니스 문서
│   ├── PRD.md                       # 제품 요구사항 (시나리오 10개)
│   ├── demo-script.md               # 고객 데모 스크립트
│   └── case-study-draft.md          # 케이스 스터디 초안
│
├── references/
│   └── n8n-golden/                  # 골든 레퍼런스 워크플로우 (n8n JSON 구조 기준)
│
└── tasks/                           # 세션별 작업 체크리스트
```

---

## FAQ 커스터마이징

> 상세 가이드: `src/n8n-workflows/FAQ_CUSTOMIZE.md`

Airtable `FAQs` 테이블에서 `AnswerTemplate` 컬럼 텍스트만 수정하면 즉시 반영됩니다. 재배포나 코드 수정 불필요.

---

## 트러블슈팅

| 증상 | 확인 사항 |
|------|---------|
| 봇이 응답 없음 | `Main CSBot` 워크플로우 Active 여부 |
| "일시적 오류" 응답 | n8n Executions에서 에러 노드 확인 |
| 웹 위젯 CORS 오류 | `N8N_CORS_ORIGIN=*` 환경변수 설정 후 재시작 |
| 응답 느림 (타임아웃) | `Web Widget Handler` → `Call CSBot` 노드 Timeout 값 확인 (30000 권장) |
| Airtable 저장 안 됨 | Credential 재연결, Base ID 확인 |

> 카카오톡 채널 연동: `src/kakao/KAKAO_SETUP.md`
