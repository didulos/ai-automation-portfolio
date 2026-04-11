# 메모 분류기 (Memo Classifier)

Notion 페이지에 뒤섞여 있는 메모들을 Claude AI로 자동 분류하여
"글들 정리" DB에 저장하고, 원본에 처리 완료(✅) 표시를 합니다.

## 작동 원리

```
Notion 페이지 (집에 사갈것들)
    │
    ▼ 1. Notion API로 블록 읽기
메모 파싱 (번호별 분리)
    │
    ▼ 2. Claude Haiku로 분류
카테고리 + 만료 판단 + 요약
    │
    ▼ 3. Notion API로 DB 저장
글들 정리 DB에 페이지 생성
    │
    ▼ 4. 원본에 ✅ 표시
안심하고 삭제 가능
```

## 설치

```bash
# 1. 패키지 설치
pip install anthropic requests python-dotenv --break-system-packages

# 2. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 입력
```

## Notion Integration 설정 (중요!)

1. https://www.notion.so/my-integrations 에서 새 Integration 생성
2. Internal integration 선택
3. 이름 입력 (예: "메모 분류기")
4. Capabilities: Read content, Update content, Insert content 모두 체크
5. 생성된 API 키를 .env에 복사

**페이지/DB 연결:**
6. "집에 사갈것들" 페이지 → 우측 상단 ⋯ → 연결 → 방금 만든 Integration 선택
7. "글들 정리" DB 페이지 → 같은 방법으로 Integration 연결

이 단계를 빠뜨리면 API가 페이지에 접근할 수 없습니다!

## 사용법

```bash
# 미리보기 (실제 저장하지 않음) - 먼저 이걸로 확인!
python memo_classifier.py --dry-run

# 실제 실행
python memo_classifier.py

# 특정 페이지 처리
python memo_classifier.py --page-id 다른페이지ID

# 만료된 메모도 DB에 저장하기
python memo_classifier.py --include-expired
```

## 카테고리 목록 (12개)

| 카테고리 | 분류 기준 |
|----------|-----------|
| To Do list | 단순한 할 일, 행동 지시 |
| AI 비즈니스 | AI 사업 전략, 수익화 |
| AI 관련 글들 | AI 도구 학습, 기술 탐구 |
| AI와 대화 | AI와의 대화 내용, 백업 |
| 회사일 | 직장 업무, 상가 관리 |
| 집안일 | 장보기, 생활용품, 집 관리 |
| 인문적 노트 | 철학적 성찰, 감정, 사회 비판 |
| 잡글 | 기타 잡다한 메모 |
| 각종 정보 | 유용한 정보, 링크 |
| 개인 활동 알아두면 좋은것 | 건강, 병원, 자기계발 |
| 영단어 및 IT 용어 | 용어 정리 |
| Notion 공부 | Notion 사용법 |

## 비용 추정

- Claude Haiku 사용 (가장 저렴한 모델)
- 283개 메모 기준: 약 25개씩 12배치 = 12회 API 호출
- 예상 비용: $0.05 미만 (약 70원)

## 파일 구조

```
memo_classifier/
├── memo_classifier.py   # 메인 스크립트
├── .env.example          # 환경변수 템플릿
├── .env                  # 실제 API 키 (직접 생성)
└── README.md             # 이 파일
```

## 주의사항

- **반드시 --dry-run으로 먼저 확인하세요**
- ✅ 표시된 메모는 다음 실행 시 자동으로 건너뜁니다
- Notion API rate limit: 초당 3회 제한 (스크립트에서 자동 조절)
- 한 메모당 최대 300자까지만 Claude에 전달 (토큰 절약)
- 원문은 DB 페이지 본문에 전체 저장됩니다
