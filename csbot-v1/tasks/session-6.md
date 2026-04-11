# 세션 6 체크리스트 — 전체 시스템 테스트 + 고객 시연 준비

> 목표: 자동 테스트 완성 + 고객에게 보여줄 데모/문서 자료 완성
> 완료일: 2026-03-30

---

## 완료 항목

- [x] **작업 1: 자동 테스트 워크플로우** — `src/n8n-workflows/test-all.json`
  - 테스트 케이스 15개 (FAQ 10 + 엣지케이스 5)
  - Call CSBot specifyBody "string" → "json" 수정으로 FAQMatched 0→12 달성
  - Airtable TestResults 저장 정상화 (Mapping Column Mode auto→manual 리프레시)

- [x] **작업 2: 데모 시나리오 스크립트** — `requirements/demo-script.md`
  - 시나리오 A: "기본 CS 응답" — "주문한 지 3일 됐는데 배송이 아직인데요" → "그럼 교환은 어떻게 해요?" (대화 문맥 유지 확인)
  - 시나리오 B: "봇이 모르는 질문 처리" — "이 제품 OO 성분 들어있나요?" → 폴백 + 셀러 알림
  - 시나리오 C: "5분 온보딩" — 온보딩 폼 → Airtable 확인 → 봇 테스트
  - 데모 환경 체크리스트 포함

- [x] **작업 3: 케이스 스터디 초안** — `requirements/case-study-draft.md`
  - 제목: "스마트스토어 CS 문의 80%를 자동 처리한 방법"
  - 구조: 문제 → 솔루션 → 결과 → 다음 단계
  - 결과 수치: 테스트 기반 (FAQ 80% 자동응답, 응답 3초, 온보딩 5분)
  - Gpters / n8n Korea LinkedIn 게시용 톤

- [x] **작업 4: 프로젝트 README** — `README.md`
  - 프로젝트 소개 + 기능 표
  - 아키텍처 다이어그램 (텍스트)
  - 설치/설정 방법 (4단계)
  - 빠른 시작 가이드 (온보딩 폼 → 웹 위젯 → curl → 자동 테스트)
  - 폴더 구조 설명
  - 트러블슈팅 표

---

## 세션 중 발견 및 처리한 이슈

- **Web Widget Handler 타임아웃**: Call CSBot 노드 Timeout 12000 → 30000 변경 필요
  - n8n UI에서 직접 수정 (web-widget.json도 업데이트 완료)
- **폴백 이메일 알림 미구현**: main-csbot에 IF WasFallback? + Email Send 노드 추가 필요
  - n8n UI에서 Save Conversation 뒤에 IF + Email 노드 추가 안내 완료
- **StoreID 컬럼 없음**: Airtable Auto Number는 API 생성 불가 → MVP 단일 스토어에서는 무관

---

## 미완료 (다음 세션 이후)

- [ ] 폴백 이메일 알림 n8n UI에서 구현 (IF WasFallback? → Email Send)
- [ ] case-study-draft.md → 실 고객 데이터로 수치 업데이트 (Phase 1 완료 후)
- [ ] 완료 페이지 HTML 고도화
- [ ] 실제 카카오톡 연결 문제 (n8n에 기록 없음) 원인 재조사
