# AI Automation Portfolio

n8n, Claude API, Qdrant, Obsidian 기반의 AI 자동화 프로젝트 모음입니다.

---

## 프로젝트

### 1. CS 상담 자동화 봇 (CSBot v1)
📁 `csbot-v1/`

네이버 스마트스토어 셀러 대상 고객 상담 자동 응답 시스템입니다.

- **기술 스택:** n8n, Claude API (Function Calling), Airtable, Docker (WSL2)
- **아키텍처:** 입력 → n8n 게이트웨이 → Claude API 추론 → 도구 계층 → DB → 응답/에스컬레이션
- n8n 워크플로우 JSON 9개, 카카오톡 채널 연동, 웹 위젯 포함
- Claude Code 활용 반복 빌드 세션으로 프로토타입 완성

### 2. Notion 메모 자동 분류 시스템 (memo_classifier)
📁 `memo-classifier/`

500개 이상의 비정형 메모를 15개 카테고리로 자동 분류하는 시스템입니다.

- **기술 스택:** Notion API, Claude API (Anthropic SDK), Python
- 카테고리별 30개 단위 번들링, 날짜 포함 제목 자동 생성
- `--dry-run` 미리보기 모드, `--interactive` 확인 모드 내장
- 분류 정확도 검증 및 반복 사용 가능한 파이프라인

### 3. AI 용어 지식 그래프 (Obsidian Knowledge Base)
📁 `obsidian-ai-knowledge-base/`

AI/ML 용어를 구조화된 마크다운으로 정리하고, 위키링크로 관계를 정의하는 지식 그래프입니다.

- **기술 스택:** Obsidian, Claude Haiku API, Smart Connections, Breadcrumbs, Dataview
- **56개 AI 용어** 정의 완료 (Embedding, RAG, Transformer, LLM 등)
- Text Generator + Claude Haiku API 연결 (CORS 에러 직접 트러블슈팅)
- 프롬프트 엔지니어링: 용어 입력 시 관련 개념 5개를 `[[위키링크]]`로 자동 생성
- Frontmatter 메타데이터 체계 설계 (category, status, related, up/down)

### 4. Docker RAG 파이프라인 (Qdrant)
📁 `qdrant-rag/`

Qdrant 벡터 DB를 활용한 로컬 RAG 검색 시스템입니다.

- **기술 스택:** Qdrant (Docker), SentenceTransformers, Python
- Docker Compose로 Qdrant 컨테이너 구축 (D드라이브 SSD 볼륨 마운트)
- 임베딩 파이프라인 (ingest.py) + 시맨틱 검색 (search.py)
- GPU/CPU 호환성 해결 (GTX 970 → CPU fallback), Qdrant API 버전 대응
- 교차 언어 검색 한계 분석 → OpenAI text-embedding-3-small 전환 방안 도출

### 5. n8n 워크플로우 실전 구축 (5개 패턴)
📁 `n8n-workflows/`

n8n 핵심 패턴을 실습한 워크플로우 모음입니다.

| 워크플로우 | 핵심 패턴 |
|-----------|----------|
| 텔레그램 날씨 알림 | Schedule Trigger, HTTP Request, Expression 문법 |
| Google Form 자동 응답 | Webhook Trigger, Test/Production URL 구분 |
| RSS 뉴스 필터링 봇 | IF 노드 조건 분기, 다중 아이템 처리 |
| Airtable 고객 DB 관리 | DB CRUD, IF 분기 후 병렬 처리 (긴급/일반) |
| 카카오 환율변화 브리핑 | Code Node, 카카오톡 API 연동, 데이터 가공 |

---

## 기술 스택 요약

| 영역 | 도구 |
|------|------|
| 자동화 플랫폼 | n8n (워크플로우 설계/구현), Airtable (DB 설계) |
| AI / LLM | Claude API (Function Calling, Haiku/Sonnet), 프롬프트 엔지니어링, RAG 아키텍처 |
| 개발 환경 | Claude Code, WSL2 Ubuntu, Docker, Git, Python, JavaScript |
| 벡터 DB / 검색 | Qdrant, SentenceTransformers, OpenAI Embeddings API |
| 지식 관리 | Obsidian (플러그인 기반 지식 그래프), Notion (API 연동) |

---

## 실행 환경

- CPU: Xeon E5-1660 v4 / RAM: 32GB / GPU: GTX 970
- OS: Windows 10 Pro + WSL2 Ubuntu
- Docker, n8n, Qdrant 로컬 운영

---

## 연락처

- GitHub: [@didulos](https://github.com/didulos)
