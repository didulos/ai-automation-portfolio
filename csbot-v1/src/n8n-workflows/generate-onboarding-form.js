/**
 * generate-onboarding-form.js
 * 온보딩 폼 워크플로우 생성 스크립트
 * 실행: node generate-onboarding-form.js
 */

const fs   = require('fs');
const path = require('path');

// ============================================================
// Code 노드: Generate FAQ Items
// ============================================================
const generateFaqsCode = `
// 폼 입력값 수집 (fieldName 기준, typeVersion 2.4+)
const form  = $('Onboarding Form').first().json;
const store = $('Create Store').first().json;

const storeRecordId   = store.id;
const storeName       = form['storeName']       || '';
const shippingCarrier = form['shippingCarrier'] || '택배사';
const shippingDays    = form['shippingDays']    || 3;
const shipOutDays     = 1;   // 기본값
const cutoffTime      = '오후 2시';
const exchangePeriod  = 7;
const returnPeriod    = 7;
const returnCost      = 3000;
const refundDays      = 3;
const businessHours   = form['businessHours']  || '09:00~18:00';
const businessDays    = '월~금';
const holidayInfo     = '주말·공휴일 휴무';
const responseTime    = '2시간 이내';
const paymentMethods  = '신용카드 / 네이버페이 / 무통장입금';
const instInfo        = '5만원 이상 2~12개월 무이자';
const taxAvailable    = false;
const jejuAvailable   = true;
const jejuCost        = 3000;
const overseasAvail   = false;

// ── FAQ 10개 템플릿 ──────────────────────────────────────────
const faqs = [

  // S01. 배송 조회
  {
    StoreID:          [storeRecordId],
    Category:         '배송조회',
    QuestionPatterns: JSON.stringify([
      '주문 언제 와요', '택배 운송장 번호 알려주세요',
      '주문한 지 3일 됐는데 아직 안 왔어요', '배송 조회', '배송 상태 확인'
    ]),
    AnswerTemplate:
      '안녕하세요! ' + storeName + ' 입니다 😊\\n\\n' +
      '배송 조회는 아래 방법으로 확인하실 수 있어요:\\n\\n' +
      '📦 배송사: ' + shippingCarrier + '\\n' +
      '🔗 배송사 앱 또는 홈페이지에서 운송장 번호로 조회해 주세요.\\n\\n' +
      '운송장 번호는 출고 후 발송되는 카카오 알림톡에서 확인하실 수 있어요.\\n' +
      '추가 문의는 언제든 말씀해 주세요!',
    Variables:  JSON.stringify(['StoreName', 'ShippingCarrier', 'TrackingUrl']),
    IsActive:   true,
    Priority:   1
  },

  // S02. 배송 소요일
  {
    StoreID:          [storeRecordId],
    Category:         '배송소요일',
    QuestionPatterns: JSON.stringify([
      '주문하면 며칠 만에 와요', '오늘 주문하면 이번 주 안에 받을 수 있나요',
      '배송 얼마나 걸려요', '배송 기간', '언제 받을 수 있어요'
    ]),
    AnswerTemplate:
      '배송 안내드릴게요! 🚚\\n\\n' +
      '📅 출고 기준: 결제 완료 후 ' + shipOutDays + '영업일 이내 출고\\n' +
      '🏠 수령 기준: 출고 후 ' + shippingDays + '영업일 내 수령\\n\\n' +
      '※ ' + cutoffTime + ' 이전 결제 건은 당일 출고 처리됩니다.\\n' +
      '※ 주말·공휴일 제외\\n\\n' +
      '궁금한 점 있으시면 편하게 문의해 주세요!',
    Variables:  JSON.stringify(['ShipOutDays', 'ShippingDays', 'CutoffTime']),
    IsActive:   true,
    Priority:   2
  },

  // S03. 교환 요청
  {
    StoreID:          [storeRecordId],
    Category:         '교환',
    QuestionPatterns: JSON.stringify([
      '사이즈를 잘못 주문했어요 교환 가능한가요', '상품이 불량인데 교환해 주세요',
      '색깔이 사진이랑 달라요 바꿀 수 있나요', '교환 신청', '교환 방법'
    ]),
    AnswerTemplate:
      '교환 문의 주셨군요!\\n\\n' +
      storeName + ' 교환 정책이에요:\\n' +
      '📅 교환 가능 기간: 수령 후 ' + exchangePeriod + '일 이내\\n' +
      '✅ 교환 가능: 상품 불량, 오배송, 미사용·미개봉 상태\\n' +
      '❌ 교환 불가: 사용 후 단순 변심, 고객 부주의 훼손\\n\\n' +
      '교환을 원하시면 아래 정보를 보내주세요:\\n' +
      '1. 주문번호\\n2. 교환 사유\\n3. 원하시는 옵션 (사이즈/색상 등)\\n\\n' +
      '확인 후 빠르게 안내드릴게요!',
    Variables:  JSON.stringify(['StoreName', 'ExchangePeriod']),
    IsActive:   true,
    Priority:   3
  },

  // S04. 반품/환불
  {
    StoreID:          [storeRecordId],
    Category:         '반품환불',
    QuestionPatterns: JSON.stringify([
      '마음에 안 들어서 반품하고 싶어요', '환불은 어떻게 신청해요',
      '불량품 받았는데 전액 환불 가능한가요', '반품 신청', '환불 처리'
    ]),
    AnswerTemplate:
      '반품/환불 안내드릴게요.\\n\\n' +
      '📅 반품 가능 기간: 수령 후 ' + returnPeriod + '일 이내\\n' +
      '🚚 반품 배송비:\\n' +
      '  - 단순 변심: ' + returnCost + '원 (고객 부담)\\n' +
      '  - 상품 불량·오배송: 무료 (판매자 부담)\\n\\n' +
      '반품 신청 방법:\\n' +
      '네이버 앱 → 주문 내역 → 반품 신청\\n\\n' +
      '환불은 반품 상품 확인 후 ' + refundDays + '영업일 이내 처리됩니다.',
    Variables:  JSON.stringify(['ReturnPeriod', 'ReturnShippingCost', 'RefundDays']),
    IsActive:   true,
    Priority:   4
  },

  // S05. 주문 취소
  {
    StoreID:          [storeRecordId],
    Category:         '주문취소',
    QuestionPatterns: JSON.stringify([
      '방금 주문했는데 취소할 수 있나요', '아직 발송 전이면 취소해 주세요',
      '주문 취소 어떻게 해요', '취소 신청', '주문 취소 방법'
    ]),
    AnswerTemplate:
      '주문 취소 안내드릴게요!\\n\\n' +
      '출고 전이라면 직접 취소 가능해요:\\n' +
      '👉 네이버 앱 → 주문 내역 → 취소 신청\\n\\n' +
      '⚠️ 이미 출고된 경우 취소가 불가하며,\\n' +
      '배송 완료 후 반품으로 진행해 주셔야 해요.\\n\\n' +
      '취소 후 환불은 결제 수단에 따라 ' + refundDays + '영업일 내 처리됩니다.\\n' +
      '취소가 안 되신다면 주문번호를 알려주시면 확인해 드릴게요!',
    Variables:  JSON.stringify(['RefundDays']),
    IsActive:   true,
    Priority:   5
  },

  // S06. 재입고
  {
    StoreID:          [storeRecordId],
    Category:         '재입고',
    QuestionPatterns: JSON.stringify([
      '품절인데 언제 다시 들어오나요', 'L 사이즈 재입고 예정 있나요',
      '재입고 알림 신청할 수 있나요', '품절 언제 풀려요', '재고 언제 생겨요'
    ]),
    AnswerTemplate:
      '재입고 문의 주셨군요!\\n\\n' +
      '현재 해당 상품은 일시 품절 상태예요 😢\\n\\n' +
      '재입고 알림은 상품 페이지에서 신청하실 수 있어요:\\n' +
      '👉 상품 페이지 → [재입고 알림 신청] 버튼\\n\\n' +
      '재입고 확정 시 알림톡으로 바로 안내드릴게요.',
    Variables:  JSON.stringify(['RestockInfo']),
    IsActive:   true,
    Priority:   6
  },

  // S07. 영업시간
  {
    StoreID:          [storeRecordId],
    Category:         '영업시간',
    QuestionPatterns: JSON.stringify([
      '고객센터 몇 시까지 운영해요', '지금 문의하면 언제 답변 받을 수 있어요',
      '주말에도 상담 가능한가요', '영업시간', '운영시간'
    ]),
    AnswerTemplate:
      storeName + ' 운영 안내예요 🕐\\n\\n' +
      '⏰ 운영시간: ' + businessHours + '\\n' +
      '📅 운영일: ' + businessDays + '\\n' +
      '🚫 휴무일: ' + holidayInfo + '\\n\\n' +
      '운영시간 외 문의는 순차적으로 답변드리고 있어요.\\n' +
      '보통 ' + responseTime + ' 이내 확인 후 연락드립니다!',
    Variables:  JSON.stringify(['StoreName', 'BusinessHours', 'BusinessDays', 'HolidayInfo', 'ResponseTime']),
    IsActive:   true,
    Priority:   7
  },

  // S08. 결제/세금계산서
  {
    StoreID:          [storeRecordId],
    Category:         '결제',
    QuestionPatterns: JSON.stringify([
      '무통장 입금 계좌 알려주세요', '세금계산서 발행 가능한가요',
      '카드 할부 몇 개월까지 돼요', '결제 수단', '계좌번호'
    ]),
    AnswerTemplate:
      '결제 관련 안내드릴게요 💳\\n\\n' +
      '사용 가능한 결제 수단:\\n' + paymentMethods + '\\n\\n' +
      (taxAvailable
        ? '📄 세금계산서 발행 가능합니다.\\n   구매 후 담당자에게 사업자등록증과 함께 요청해 주세요.'
        : '📄 세금계산서 발행은 현재 지원하지 않습니다.') + '\\n\\n' +
      '카드 무이자 할부: ' + instInfo,
    Variables:  JSON.stringify(['PaymentMethods', 'TaxInvoiceAvailable', 'TaxInvoiceContact', 'InstallmentInfo']),
    IsActive:   true,
    Priority:   8
  },

  // S09. 상품 정보
  {
    StoreID:          [storeRecordId],
    Category:         '상품정보',
    QuestionPatterns: JSON.stringify([
      '이 제품 소재가 뭔가요', '사이즈 가이드 알려주세요',
      '세탁은 어떻게 해야 해요', '상품 상세', '제품 정보'
    ]),
    AnswerTemplate:
      '상품 정보 안내드릴게요! 📋\\n\\n' +
      '자세한 정보는 상품 상세 페이지에서 확인하실 수 있어요.\\n\\n' +
      '그래도 궁금한 점이 있으시면 구체적인 상품명과 질문을 남겨주세요.\\n' +
      '담당자가 직접 확인 후 안내드릴게요!',
    Variables:  JSON.stringify(['ProductDetailGuide']),
    IsActive:   true,
    Priority:   9
  },

  // S10. 배송 지역 (제주/해외)
  {
    StoreID:          [storeRecordId],
    Category:         '배송지역',
    QuestionPatterns: JSON.stringify([
      '제주도 배송 되나요', '해외 배송 가능한가요',
      '도서산간 지역인데 추가 요금 있나요', '제주 배송', '해외 배송'
    ]),
    AnswerTemplate:
      '배송 가능 지역 안내드릴게요! 🗺️\\n\\n' +
      (jejuAvailable
        ? '✅ 제주도·도서산간 배송 가능\\n   추가 배송비: ' + jejuCost + '원'
        : '❌ 제주도·도서산간 지역은 배송이 어렵습니다.') + '\\n\\n' +
      (overseasAvail
        ? '🌏 해외 배송 가능합니다. 자세한 내용은 담당자에게 문의해 주세요.'
        : '🌏 현재 해외 배송은 지원하지 않습니다.'),
    Variables:  JSON.stringify(['JejuAvailable', 'JejuExtraCost', 'OverseasAvailable', 'OverseasCountries']),
    IsActive:   true,
    Priority:   10
  }
];

return faqs.map(function(faq) { return { json: faq }; });
`.trim();

// ============================================================
// 워크플로우 정의
// ============================================================

// Airtable 공통 스키마 헬퍼
function strSchema(id) {
  return { id, displayName: id, required: false, defaultMatch: false,
           canBeUsedToMatch: true, display: true, type: 'string',
           readOnly: false, removed: false };
}
function numSchema(id) {
  return { ...strSchema(id), type: 'number' };
}
function boolSchema(id) {
  return { ...strSchema(id), type: 'boolean' };
}
function arraySchema(id) {
  return { ...strSchema(id), type: 'array' };
}

const workflow = {
  name: "Onboarding Form",
  nodes: [

    // ── Sticky Note ──────────────────────────────────────────────
    {
      parameters: {
        content: [
          "## 📋 Onboarding Form",
          "",
          "새 스토어 5분 온보딩 워크플로우",
          "폼 제출 → Stores 생성 → FAQ 10개 자동 생성",
          "",
          "### Import 후 필수 설정",
          "1. **Airtable Credential** 매핑",
          "   - `Create Store` 노드",
          "   - `Create FAQ` 노드",
          "2. **Base ID** 변경 (YOUR_AIRTABLE_BASE_ID → 실제 값)",
          "",
          "### 폼 접속 URL",
          "워크플로우 Active 후:",
          "`https://YOUR_N8N/form/onboarding`",
          "",
          "### 테스트 흐름",
          "1. 폼 URL 접속",
          "2. 스토어 정보 입력 후 제출",
          "3. Airtable Stores + FAQs 10건 생성 확인",
          "4. CS봇으로 바로 테스트 가능"
        ].join("\n"),
        height: 360,
        width: 320,
        color: 4
      },
      id: "ob000001-0000-4000-8000-000000000001",
      name: "Setup Notes",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-220, 80]
    },

    // ── 1. Form Trigger ──────────────────────────────────────────
    {
      parameters: {
        formTitle: "ArumDri CS봇 — 스토어 정보 등록",
        formDescription: "아래 정보를 입력하시면 CS봇이 즉시 활성화됩니다. (약 5분 소요)",
        formFields: {
          values: [
            {
              fieldLabel: "스토어명",
              fieldName: "storeName",
              fieldType: "text",
              requiredField: true,
              placeholder: "예: 하루마루 생활용품"
            },
            {
              fieldLabel: "대표자명",
              fieldName: "ownerName",
              fieldType: "text",
              requiredField: true,
              placeholder: "예: 김민지"
            },
            {
              fieldLabel: "배송업체",
              fieldName: "shippingCarrier",
              fieldType: "dropdown",
              requiredField: true,
              fieldOptions: {
                values: [
                  { option: "CJ대한통운" },
                  { option: "로젠택배" },
                  { option: "한진택배" },
                  { option: "우체국택배" },
                  { option: "롯데택배" },
                  { option: "기타" }
                ]
              }
            },
            {
              fieldLabel: "평균 배송일 (영업일)",
              fieldName: "shippingDays",
              fieldType: "number",
              requiredField: true,
              placeholder: "예: 3"
            },
            {
              fieldLabel: "교환/반품 정책",
              fieldName: "returnPolicy",
              fieldType: "textarea",
              requiredField: false,
              placeholder: "수령 후 7일 이내 교환/반품 가능. 단순 변심 반품 시 배송비 3,000원 고객 부담."
            },
            {
              fieldLabel: "영업시간",
              fieldName: "businessHours",
              fieldType: "text",
              requiredField: false,
              placeholder: "09:00~18:00"
            },
            {
              fieldLabel: "고객센터 연락처",
              fieldName: "contactPhone",
              fieldType: "text",
              requiredField: false,
              placeholder: "010-0000-0000"
            },
            {
              fieldLabel: "특이사항",
              fieldName: "customNotes",
              fieldType: "textarea",
              requiredField: false,
              placeholder: "기타 안내사항이 있으면 입력해 주세요."
            }
          ]
        },
        responseMode: "lastNode",
        options: {
          respondWithOptions: {
            values: {
              respondWith: "redirect",
              redirectUrl: "http://localhost:5678/webhook/onboarding-complete"
            }
          }
        }
      },
      id: "ob000001-0000-4000-8000-000000000002",
      name: "Onboarding Form",
      type: "n8n-nodes-base.formTrigger",
      typeVersion: 2.5,
      position: [200, 300],
      webhookId: "onboarding-form-webhook"
    },

    // ── 2. Airtable: Create Store ────────────────────────────────
    {
      parameters: {
        operation: "create",
        base: {
          __rl: true,
          value: "YOUR_AIRTABLE_BASE_ID",
          mode: "id"
        },
        table: {
          __rl: true,
          value: "Stores",
          mode: "name"
        },
        columns: {
          mappingMode: "defineBelow",
          value: {
            StoreName:    "={{ $json['storeName'] }}",
            OwnerName:    "={{ $json['ownerName'] }}",
            ShippingCarrier: "={{ $json['shippingCarrier'] }}",
            ShippingDays: "={{ $json['shippingDays'] }}",
            ShipOutDays:  1,
            CutoffTime:   "오후 2시",
            ExchangePeriod: 7,
            ReturnPeriod: 7,
            ReturnShippingCost: 3000,
            RefundDays:   3,
            ReturnPolicy: "={{ $json['returnPolicy'] }}",
            BusinessHours: "={{ $json['businessHours'] || '09:00~18:00' }}",
            BusinessDays: "월~금",
            HolidayInfo:  "주말·공휴일 휴무",
            ResponseTime: "2시간 이내",
            ContactPhone: "={{ $json['contactPhone'] }}",
            CustomNotes:  "={{ $json['customNotes'] }}",
            PaymentMethods: "신용카드 / 네이버페이 / 무통장입금",
            InstallmentInfo: "5만원 이상 2~12개월 무이자",
            JejuAvailable: true,
            JejuExtraCost: 3000,
            OverseasAvailable: false,
            TaxInvoiceAvailable: false,
            IsActive:     true
          },
          matchingColumns: [],
          schema: [
            strSchema("StoreName"), strSchema("OwnerName"),
            strSchema("ShippingCarrier"), numSchema("ShippingDays"),
            numSchema("ShipOutDays"), strSchema("CutoffTime"),
            numSchema("ExchangePeriod"), numSchema("ReturnPeriod"),
            numSchema("ReturnShippingCost"), numSchema("RefundDays"),
            strSchema("ReturnPolicy"), strSchema("BusinessHours"),
            strSchema("BusinessDays"), strSchema("HolidayInfo"),
            strSchema("ResponseTime"), strSchema("ContactPhone"),
            strSchema("CustomNotes"), strSchema("PaymentMethods"),
            strSchema("InstallmentInfo"),
            boolSchema("JejuAvailable"), numSchema("JejuExtraCost"),
            boolSchema("OverseasAvailable"), boolSchema("TaxInvoiceAvailable"),
            boolSchema("IsActive")
          ],
          attemptToConvertTypes: false,
          convertFieldsToString: false
        },
        options: {}
      },
      id: "ob000001-0000-4000-8000-000000000003",
      name: "Create Store",
      type: "n8n-nodes-base.airtable",
      typeVersion: 2.1,
      position: [460, 300],
      credentials: {
        airtableTokenApi: {
          id: "YOUR_AIRTABLE_CREDENTIAL_ID",
          name: "Airtable"
        }
      },
      notes: "⚠️ Import 후 설정 필요:\n1. Airtable Credential 매핑\n2. Base ID를 실제 값으로 변경"
    },

    // ── 3. Code: Generate FAQ Items ──────────────────────────────
    {
      parameters: {
        jsCode: generateFaqsCode,
        mode: "runOnceForAllItems"
      },
      id: "ob000001-0000-4000-8000-000000000004",
      name: "Generate FAQs",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [700, 300]
    },

    // ── 4. Airtable: Create FAQ (10회 반복) ──────────────────────
    {
      parameters: {
        operation: "create",
        base: {
          __rl: true,
          value: "YOUR_AIRTABLE_BASE_ID",
          mode: "id"
        },
        table: {
          __rl: true,
          value: "FAQs",
          mode: "name"
        },
        columns: {
          mappingMode: "defineBelow",
          value: {
            StoreID:          "={{ $json.StoreID }}",
            Category:         "={{ $json.Category }}",
            QuestionPatterns: "={{ $json.QuestionPatterns }}",
            AnswerTemplate:   "={{ $json.AnswerTemplate }}",
            Variables:        "={{ $json.Variables }}",
            IsActive:         "={{ $json.IsActive }}",
            Priority:         "={{ $json.Priority }}"
          },
          matchingColumns: [],
          schema: [
            arraySchema("StoreID"),
            strSchema("Category"),
            strSchema("QuestionPatterns"),
            strSchema("AnswerTemplate"),
            strSchema("Variables"),
            boolSchema("IsActive"),
            numSchema("Priority")
          ],
          attemptToConvertTypes: false,
          convertFieldsToString: false
        },
        options: {}
      },
      id: "ob000001-0000-4000-8000-000000000005",
      name: "Create FAQ",
      type: "n8n-nodes-base.airtable",
      typeVersion: 2.1,
      position: [940, 300],
      credentials: {
        airtableTokenApi: {
          id: "YOUR_AIRTABLE_CREDENTIAL_ID",
          name: "Airtable"
        }
      },
      notes: "Generate FAQs 노드에서 10개 아이템이 입력되어 10회 실행됩니다."
    },

  ],

  connections: {
    "Onboarding Form": {
      main: [
        [{ node: "Create Store", type: "main", index: 0 }]
      ]
    },
    "Create Store": {
      main: [
        [{ node: "Generate FAQs", type: "main", index: 0 }]
      ]
    },
    "Generate FAQs": {
      main: [
        [{ node: "Create FAQ", type: "main", index: 0 }]
      ]
    },
  },

  settings: {
    executionOrder: "v1",
    binaryMode: "separate",
    availableInMCP: false
  }
};

const outPath = path.join(__dirname, 'onboarding-form.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log('✅ onboarding-form.json 생성 완료:', outPath);
console.log('   노드 수:', workflow.nodes.length);
