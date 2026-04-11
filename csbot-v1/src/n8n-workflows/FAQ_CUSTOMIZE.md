# FAQ 커스터마이징 가이드

> ArumDri CS봇 — 셀러 직접 수정 가이드
> 대상: Airtable FAQs 테이블을 직접 관리하는 스토어 운영자

---

## 1. Airtable FAQs 테이블 접속

1. [airtable.com](https://airtable.com) 로그인
2. **ArumDri CS봇** 베이스 선택
3. **FAQs** 테이블 클릭
4. `Active Only` 뷰 선택 (현재 활성화된 FAQ만 표시)

---

## 2. 기존 FAQ 수정

### 답변 내용 변경

| 필드 | 설명 | 예시 |
|------|------|------|
| `AnswerTemplate` | 봇이 실제로 답변할 텍스트 | 배송 안내 문구 수정 |
| `QuestionPatterns` | 이 FAQ로 연결될 고객 질문 패턴 목록 (JSON) | `["배송 언제 와요", "택배 조회"]` |
| `IsActive` | 체크 해제 시 이 FAQ 비활성화 (봇이 사용 안 함) | — |
| `Priority` | 숫자가 낮을수록 우선 적용 (기본값 1~10) | `1` |

### 수정 방법

1. FAQs 테이블에서 수정할 행 클릭
2. 레코드 상세 팝업에서 원하는 필드 클릭 후 편집
3. 자동 저장 — **별도 저장 버튼 없음**
4. 변경 즉시 CS봇에 반영됨 (n8n 재시작 불필요)

---

## 3. 새 FAQ 추가

### 단계별 방법

1. FAQs 테이블 하단 **`+ Add a record`** 클릭
2. 아래 필드를 채워 넣습니다:

| 필드 | 필수 | 작성 방법 |
|------|------|-----------|
| `StoreID` | ✅ | 내 스토어 레코드 링크 (Stores 테이블에서 선택) |
| `Category` | ✅ | 아래 카테고리 목록에서 선택 |
| `QuestionPatterns` | ✅ | JSON 배열 형식으로 작성 (아래 참고) |
| `AnswerTemplate` | ✅ | 봇 응답 텍스트 (아래 가이드 참고) |
| `Variables` | — | 사용한 변수 목록 JSON (참고용) |
| `IsActive` | — | 체크 = 활성화 (기본 체크) |
| `Priority` | — | 기존 FAQ와 겹치면 낮은 숫자 우선 |

### 카테고리 목록

| 카테고리 | 사용 상황 |
|----------|-----------|
| `배송조회` | 운송장 번호, 배송 현황 문의 |
| `배송소요일` | 며칠 걸리는지, 출고 일정 문의 |
| `교환` | 교환 신청, 교환 가능 여부 |
| `반품환불` | 반품 신청, 환불 처리 기간 |
| `주문취소` | 주문 취소 방법, 취소 가능 여부 |
| `재입고` | 품절 상품 입고 예정 문의 |
| `영업시간` | 운영 시간, 답변 가능 시간 |
| `결제` | 결제 수단, 세금계산서, 할부 |
| `상품정보` | 소재, 사이즈, 사용법 문의 |
| `배송지역` | 제주/도서산간, 해외 배송 가능 여부 |
| `기타` | 위 카테고리에 해당하지 않는 문의 |

---

## 4. 답변 템플릿 작성 가이드

### 기본 규칙

- 길이: **3문장 이내**로 간결하게 (Claude가 더 자세히 풀어줌)
- 말투: 존댓말 유지 (`~입니다`, `~해 주세요`)
- 이모지: 줄당 1개 이하 (과도한 이모지 지양)

### 줄바꿈

Airtable에서 줄바꿈은 `Enter` 키로 입력합니다.
봇 응답에서도 그대로 줄바꿈으로 표시됩니다.

---

## 5. 변수 사용법

AnswerTemplate 안에 `{{변수명}}` 형식으로 스토어 정보를 자동 삽입할 수 있습니다.
Claude가 답변 생성 시 Stores 테이블의 실제 값으로 치환합니다.

### 사용 가능한 변수 목록

| 변수 | Stores 필드 | 예시 값 |
|------|-------------|---------|
| `{{StoreName}}` | StoreName | 하루마루 생활용품 |
| `{{ShippingCarrier}}` | ShippingCarrier | CJ대한통운 |
| `{{ShippingDays}}` | ShippingDays | 3 |
| `{{ShipOutDays}}` | ShipOutDays | 1 |
| `{{CutoffTime}}` | CutoffTime | 오후 2시 |
| `{{ExchangePeriod}}` | ExchangePeriod | 7 |
| `{{ReturnPeriod}}` | ReturnPeriod | 7 |
| `{{ReturnShippingCost}}` | ReturnShippingCost | 3000 |
| `{{RefundDays}}` | RefundDays | 3 |
| `{{BusinessHours}}` | BusinessHours | 09:00~18:00 |
| `{{BusinessDays}}` | BusinessDays | 월~금 |
| `{{HolidayInfo}}` | HolidayInfo | 주말·공휴일 휴무 |
| `{{ResponseTime}}` | ResponseTime | 2시간 이내 |
| `{{ContactPhone}}` | ContactPhone | 010-1234-5678 |
| `{{PaymentMethods}}` | PaymentMethods | 신용카드 / 네이버페이 |
| `{{InstallmentInfo}}` | InstallmentInfo | 2~12개월 무이자 |
| `{{JejuExtraCost}}` | JejuExtraCost | 3000 |
| `{{RestockInfo}}` | RestockInfo | 다음 달 중순 예정 |

### 작성 예시

```
배송 안내드릴게요! 🚚

📅 출고: 결제 후 {{ShipOutDays}}영업일 이내
🏠 수령: 출고 후 {{ShippingDays}}영업일 내

※ {{CutoffTime}} 이전 결제 시 당일 출고됩니다.
```

---

## 6. QuestionPatterns 작성법

고객이 보낼 법한 질문 표현을 JSON 배열로 작성합니다.
Claude가 고객 메시지와 가장 유사한 FAQ를 찾는 데 사용합니다.

### 규칙

- **반드시 JSON 배열 형식** 사용: `["질문1", "질문2"]`
- 따옴표는 **큰따옴표(`"`)** 만 사용 (작은따옴표 사용 시 파싱 오류)
- 5~8개 패턴 권장 (너무 적으면 매칭률 하락)
- 실제 고객이 쓸 법한 구어체 표현 포함

### 좋은 예시

```json
["교환하고 싶어요", "교환 가능한가요", "사이즈 잘못 시켰어요",
 "색깔이 달라요", "상품이 불량이에요", "교환 신청 방법",
 "바꿔주세요", "다른 걸로 바꿀 수 있나요"]
```

### 나쁜 예시

```json
['교환', '반품']   ← 작은따옴표 사용 금지
["교환"]           ← 패턴이 너무 적음
```

---

## 7. FAQ 비활성화 / 삭제

| 방법 | 사용 상황 |
|------|-----------|
| `IsActive` 체크 해제 | 일시적으로 봇이 이 FAQ를 사용하지 않게 함 (데이터 보존) |
| 행 삭제 | 완전히 제거 (복구 불가 — 신중하게 사용) |

> 💡 **권장:** 삭제 대신 `IsActive` 체크 해제를 사용하세요.
> 나중에 다시 활성화하거나 수정해서 재사용할 수 있습니다.

---

## 8. 자주 하는 실수

| 실수 | 결과 | 해결 방법 |
|------|------|-----------|
| QuestionPatterns에 작은따옴표 사용 | FAQ 로드 오류 | 큰따옴표로 교체 |
| AnswerTemplate이 너무 길다 (10문장 이상) | 봇이 요약해서 출력 | 3문장 이내로 줄이기 |
| StoreID 링크 누락 | 해당 스토어 봇에서 FAQ 미노출 | Stores 테이블에서 올바른 스토어 연결 |
| 동일 Category에 Priority 동일 | 무작위 응답 선택 | Priority 값을 다르게 부여 |
