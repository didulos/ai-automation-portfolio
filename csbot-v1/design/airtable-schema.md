# Airtable 스키마 설계
> design/airtable-schema.md
> 작성일: 2026-03-18

---

## 개요

| 테이블 | 역할 |
|--------|------|
| `Stores` | 셀러 스토어별 기본 정보 및 설정값 |
| `FAQs` | 스토어별 FAQ 패턴 및 응답 템플릿 |
| `Conversations` | 고객-봇 대화 로그 |

---

## 테이블 1: Stores

### 필드 정의

| 필드명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| `StoreID` | Auto Number | 스토어 고유 식별자 | PK, 자동 증가 |
| `StoreName` | Single Line Text | 스토어 이름 | 필수 |
| `OwnerName` | Single Line Text | 셀러 대표자명 | 필수 |
| `KakaoChannelID` | Single Line Text | 카카오톡 채널 ID | 챗봇 연동용 |
| `ShippingCarrier` | Single Line Text | 주 사용 택배사명 | 예: CJ대한통운 |
| `ShippingDays` | Number | 배송 소요 영업일 | 정수, 기본값 3 |
| `ShipOutDays` | Number | 출고 소요 영업일 | 정수, 기본값 1 |
| `CutoffTime` | Single Line Text | 당일 출고 마감 시간 | 예: 오후 2시 |
| `ReturnPolicy` | Long Text | 교환/반품 정책 전문 | 자유 텍스트 |
| `ExchangePeriod` | Number | 교환 가능 기간 (일) | 기본값 7 |
| `ReturnPeriod` | Number | 반품 가능 기간 (일) | 기본값 7 |
| `ReturnShippingCost` | Number | 단순 변심 반품 배송비 (원) | 기본값 3000 |
| `RefundDays` | Number | 환불 처리 소요 영업일 | 기본값 3 |
| `BusinessHours` | Single Line Text | 운영 시간 | 예: 09:00~18:00 |
| `BusinessDays` | Single Line Text | 운영 요일 | 예: 월~금 |
| `HolidayInfo` | Single Line Text | 휴무 안내 | 예: 주말·공휴일 휴무 |
| `ResponseTime` | Single Line Text | 평균 응답 시간 | 예: 2시간 |
| `TrackingUrl` | URL | 택배사 배송 조회 링크 | |
| `ContactPhone` | Phone Number | 고객센터 연락처 | |
| `JejuAvailable` | Checkbox | 제주/도서산간 배송 가능 여부 | |
| `JejuExtraCost` | Number | 제주/도서산간 추가 배송비 (원) | |
| `OverseasAvailable` | Checkbox | 해외 배송 가능 여부 | |
| `OverseasCountries` | Single Line Text | 해외 배송 가능 국가 목록 | 없으면 공백 |
| `TaxInvoiceAvailable` | Checkbox | 세금계산서 발행 가능 여부 | |
| `TaxInvoiceContact` | Email | 세금계산서 요청 이메일 | |
| `PaymentMethods` | Long Text | 결제 수단 목록 | 줄바꿈 구분 |
| `InstallmentInfo` | Single Line Text | 할부 안내 | 예: 2~12개월 무이자 |
| `RestockInfo` | Single Line Text | 재입고 예정 기본 안내 | 없으면 공백 |
| `ProductDetailGuide` | Long Text | 상품 상세 페이지 안내 문구 또는 링크 | |
| `CustomNotes` | Long Text | 기타 특이사항 | 자유 텍스트 |
| `IsActive` | Checkbox | 스토어 활성화 여부 | 기본값 true |
| `CreatedAt` | Created Time | 등록일시 | 자동 |

### 예시 데이터 (1행)

| 필드 | 값 |
|------|-----|
| StoreID | 1 |
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
| JejuAvailable | true |
| JejuExtraCost | 3000 |
| OverseasAvailable | false |
| OverseasCountries | — |
| TaxInvoiceAvailable | true |
| TaxInvoiceContact | tax@harumaru.co.kr |
| PaymentMethods | 신용카드 / 네이버페이 / 무통장입금 |
| InstallmentInfo | 5만원 이상 2~12개월 무이자 |
| RestockInfo | — |
| ProductDetailGuide | 상품 페이지 상세 설명을 참고해 주세요 |
| IsActive | true |
| CreatedAt | 2026-03-18T09:00:00 |

### 뷰(View) 제안

| 뷰 이름 | 타입 | 목적 |
|---------|------|------|
| `All Stores` | Grid | 전체 스토어 목록 관리 |
| `Active Stores` | Grid | IsActive=true 필터 — 운영 중인 스토어만 |
| `Store Config Card` | Gallery | 스토어별 설정 카드 형태로 한눈에 확인 |

---

## 테이블 2: FAQs

### 필드 정의

| 필드명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| `FAQID` | Auto Number | FAQ 고유 식별자 | PK, 자동 증가 |
| `StoreID` | Link to Stores | 연결된 스토어 | 다대일 관계 |
| `Category` | Single Select | 문의 카테고리 | 아래 옵션 참고 |
| `QuestionPatterns` | Long Text | 예상 질문 패턴 배열 (JSON) | Claude 의도 분류에 활용 |
| `AnswerTemplate` | Long Text | 변수 슬롯 포함 응답 텍스트 | `{{변수명}}` 형식 |
| `Variables` | Long Text | 필요한 변수 목록 (JSON) | Stores 테이블 필드명 참조 |
| `IsActive` | Checkbox | 활성화 여부 | 기본값 true |
| `Priority` | Number | 응답 우선순위 (낮을수록 우선) | 기본값 10 |
| `CreatedAt` | Created Time | 등록일시 | 자동 |
| `UpdatedAt` | Last Modified Time | 수정일시 | 자동 |

**Category 옵션:**
`배송조회` / `배송소요일` / `교환` / `반품환불` / `주문취소` / `재입고` / `영업시간` / `결제` / `상품정보` / `배송지역` / `기타`

### 예시 데이터 (1행)

| 필드 | 값 |
|------|-----|
| FAQID | 1 |
| StoreID | → 하루마루 생활용품 |
| Category | 배송소요일 |
| QuestionPatterns | `["주문하면 며칠 만에 와요", "배송 얼마나 걸려요", "언제 받을 수 있어요", "배송 기간", "배송 일정"]` |
| AnswerTemplate | `배송 안내드릴게요! 🚚\n\n📅 출고 기준: 결제 완료 후 {{ship_out_days}}영업일 이내 출고\n🏠 수령 기준: 출고 후 {{delivery_days}}영업일 내 수령\n\n※ {{cutoff_time}} 이전 결제 건은 당일 출고 처리됩니다.` |
| Variables | `["ShipOutDays", "ShippingDays", "CutoffTime"]` |
| IsActive | true |
| Priority | 1 |
| CreatedAt | 2026-03-18T09:00:00 |

### 뷰(View) 제안

| 뷰 이름 | 타입 | 목적 |
|---------|------|------|
| `All FAQs` | Grid | 전체 FAQ 목록 관리 |
| `By Category` | Grid | Category 기준 그룹화 — 카테고리별 현황 파악 |
| `Active Only` | Grid | IsActive=true 필터 — 실제 사용 중인 FAQ |
| `Priority Order` | Grid | Priority 오름차순 정렬 — 응답 우선순위 확인 |
| `By Store` | Grid | StoreID 기준 그룹화 — 스토어별 FAQ 관리 |

---

## 테이블 3: Conversations

### 필드 정의

| 필드명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| `ConversationID` | Auto Number | 대화 로그 고유 식별자 | PK, 자동 증가 |
| `StoreID` | Link to Stores | 연결된 스토어 | 다대일 관계 |
| `SessionID` | Single Line Text | 채팅 세션 식별자 | 동일 고객 대화 묶음 |
| `Channel` | Single Select | 유입 채널 | `kakao` / `web_widget` |
| `CustomerMessage` | Long Text | 고객이 보낸 메시지 원문 | |
| `BotResponse` | Long Text | 봇이 보낸 응답 텍스트 | |
| `MatchedFAQID` | Link to FAQs | 매칭된 FAQ (nullable) | 폴백 시 비움 |
| `MatchedCategory` | Single Line Text | 매칭된 카테고리명 | 빠른 조회용 역정규화 |
| `WasFallback` | Checkbox | 폴백 응답 여부 | true = 매칭 실패 |
| `ResponseTimeMs` | Number | 응답 소요 시간 (ms) | 성능 모니터링용 |
| `CreatedAt` | Created Time | 대화 발생 일시 | 자동 |

**Channel 옵션:** `kakao` / `web_widget`

### 예시 데이터 (1행)

| 필드 | 값 |
|------|-----|
| ConversationID | 42 |
| StoreID | → 하루마루 생활용품 |
| SessionID | kakao_U1a2b3c4_20260318 |
| Channel | kakao |
| CustomerMessage | 오늘 주문하면 이번 주 안에 받을 수 있나요? |
| BotResponse | 배송 안내드릴게요! 🚚\n\n📅 출고 기준: 결제 완료 후 1영업일 이내 출고\n🏠 수령 기준: 출고 후 3영업일 내 수령 |
| MatchedFAQID | → FAQID 1 (배송소요일) |
| MatchedCategory | 배송소요일 |
| WasFallback | false |
| ResponseTimeMs | 1840 |
| CreatedAt | 2026-03-18T14:23:11 |

### 뷰(View) 제안

| 뷰 이름 | 타입 | 목적 |
|---------|------|------|
| `All Conversations` | Grid | 전체 대화 로그 (최신순) |
| `Fallbacks Only` | Grid | WasFallback=true 필터 — 미처리 문의 및 FAQ 보완 힌트 |
| `Today` | Grid | CreatedAt = 오늘 필터 — 당일 대화 모니터링 |
| `By Channel` | Grid | Channel 기준 그룹화 — 채널별 유입량 비교 |
| `Slow Responses` | Grid | ResponseTimeMs > 5000 필터 — 성능 이슈 탐지 |
| `Session View` | Grid | SessionID 기준 그룹화 — 세션별 대화 흐름 확인 |

---

## 테이블 관계 요약

```
Stores (1) ──< FAQs (N)
Stores (1) ──< Conversations (N)
FAQs   (1) ──< Conversations (N)  [nullable: 폴백 시 비움]
```

---

## Airtable 무료 티어 제약 체크

| 항목 | 무료 티어 한도 | 예상 사용량 | 여유 |
|------|--------------|------------|------|
| 레코드 수 | 1,000건/베이스 | Conversations 주 ~200건 | 약 5주치 |
| API 호출 | 1,000회/분 | n8n 트리거 기준 충분 | 여유 |
| 첨부파일 | 1GB | 미사용 | — |

> **운영 전략**: Conversations 테이블은 월 1회 오래된 로그를 CSV 내보내기 후 삭제하여 레코드 수 관리
