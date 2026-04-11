#!/usr/bin/env node
/**
 * n8n 워크플로우 JSON 생성 스크립트
 * 실행: node generate-workflow.js
 * 출력: main-csbot.json
 *
 * Code 노드의 JavaScript를 JSON 문자열로 안전하게 인코딩하기 위해
 * 직접 JSON을 작성하지 않고 이 스크립트로 생성합니다.
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Code 노드: Build Prompt
// ============================================================
const buildPromptCode = `
// Webhook 데이터 추출
const webhookData = $('Receive Message').first().json.body;
const store = $('Get Store Config').first().json;
const faqItems = $('Get FAQs').all();
const convItems = $('Get Recent Conversations').all();

// store_info 직렬화
const storeInfo = [
  '스토어명: ' + (store.StoreName || ''),
  '배송사: ' + (store.ShippingCarrier || ''),
  '출고 소요일: ' + (store.ShipOutDays || '') + '영업일',
  '배송 소요일: ' + (store.ShippingDays || '') + '영업일',
  '당일 출고 마감: ' + (store.CutoffTime || ''),
  '교환 가능 기간: 수령 후 ' + (store.ExchangePeriod || '') + '일',
  '반품 가능 기간: 수령 후 ' + (store.ReturnPeriod || '') + '일',
  '단순 변심 반품 배송비: ' + (store.ReturnShippingCost || '') + '원',
  '환불 처리 소요일: ' + (store.RefundDays || '') + '영업일',
  '영업시간: ' + (store.BusinessHours || '') + ' (' + (store.BusinessDays || '') + ')',
  '휴무: ' + (store.HolidayInfo || ''),
  '평균 응답 시간: ' + (store.ResponseTime || ''),
  '택배 조회 링크: ' + (store.TrackingUrl || ''),
  '제주/도서산간 배송: ' + (store.JejuAvailable ? '가능 (추가 배송비 ' + store.JejuExtraCost + '원)' : '불가'),
  '해외 배송: ' + (store.OverseasAvailable ? '가능 (' + (store.OverseasCountries || '') + ')' : '불가'),
  '세금계산서 발행: ' + (store.TaxInvoiceAvailable ? '가능 (' + (store.TaxInvoiceContact || '') + ')' : '불가'),
  '결제 수단: ' + (store.PaymentMethods || ''),
  '할부 안내: ' + (store.InstallmentInfo || ''),
  '재입고 정보: ' + (store.RestockInfo || '정보 없음'),
  '상품 상세 안내: ' + (store.ProductDetailGuide || '')
].join('\\n');

// faq_data JSON 직렬화
const faqData = JSON.stringify(faqItems
  .filter(function(f) { return f.json.Category; })
  .map(function(f) {
    var patterns = f.json.QuestionPatterns;
    var vars = f.json.Variables;
    if (typeof patterns === 'string') {
      try { patterns = JSON.parse(patterns); } catch(e) { patterns = [patterns]; }
    }
    if (typeof vars === 'string') {
      try { vars = JSON.parse(vars); } catch(e) { vars = []; }
    }
    return {
      category: f.json.Category,
      question_patterns: patterns || [],
      answer_template: f.json.AnswerTemplate || '',
      variables: vars || []
    };
  }), null, 2);

// 대화 이력 조립
const conversations = convItems
  .filter(function(c) { return c.json.CustomerMessage; })
  .reverse()
  .map(function(c) {
    return '[Customer]: ' + c.json.CustomerMessage + '\\n[Bot]: ' + c.json.BotResponse;
  })
  .join('\\n');

// 시스템 프롬프트 조립
const storeName = store.StoreName || '스토어';
const systemPrompt = [
  '당신은 ' + storeName + '의 고객 서비스 상담원입니다.',
  '',
  '## 역할',
  '고객의 문의에 FAQ 데이터를 기반으로 정확하고 친절하게 답변합니다.',
  '절대 FAQ 데이터 외의 내용을 추측하거나 임의로 답변하지 않습니다.',
  '',
  '## 말투 규칙',
  '- 항상 존댓말을 사용합니다.',
  '- 따뜻하고 전문적인 어조를 유지합니다.',
  '- 이모지는 응답당 최대 1개만 사용합니다.',
  '- 응답은 3문장 이내로 간결하게 작성합니다.',
  '',
  '## 스토어 기본 정보',
  storeInfo,
  '',
  '## FAQ 데이터',
  '아래 FAQ 목록만을 근거로 답변합니다. 이 목록에 없는 내용은 절대 답변하지 않습니다.',
  '',
  faqData,
  '',
  '## 답변 규칙',
  '1. FAQ 매칭 시: FAQ의 AnswerTemplate을 기반으로 스토어 정보 변수를 채워 자연스럽게 답변합니다.',
  '2. FAQ 미매칭 시: 아래 폴백 문구를 그대로 사용합니다.',
  '   > "문의 주신 내용을 담당자에게 전달하겠습니다. 영업시간 내 순차적으로 확인 후 연락드리겠습니다."',
  '3. 복합 문의 시: 가장 핵심적인 질문 하나에만 답변하고, 나머지는 추가 문의를 유도합니다.',
  '',
  '## 절대 금지 사항',
  '- 가격 할인이나 추가 혜택 약속',
  '- 환불·교환의 즉시 처리 약속',
  '- 배송 날짜를 구체적 날짜로 확정하여 약속',
  '- 주민등록번호, 계좌번호 등 민감한 개인정보 요청',
  '- FAQ에 없는 정책·정보를 추측하여 안내',
  '- 타 쇼핑몰이나 경쟁사 언급'
].join('\\n');

// 유저 메시지 조립
var userMessage = '';
if (conversations) {
  userMessage = '## 대화 이력 (최근 5턴)\\n' + conversations + '\\n\\n## 고객 문의\\n' + webhookData.message;
} else {
  userMessage = '## 고객 문의\\n' + webhookData.message;
}

// Claude API 요청 본문
const requestBody = JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 500,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }]
});

return [{
  json: {
    system_prompt: systemPrompt,
    user_message: userMessage,
    request_body: requestBody,
    store_id: webhookData.store_id,
    session_id: webhookData.session_id,
    channel: webhookData.channel,
    message: webhookData.message,
    store_record_id: store.id || '',
    store_name: storeName,
    start_time: Date.now()
  }
}];
`.trim();

// ============================================================
// Code 노드: Parse Response
// ============================================================
const parseResponseCode = `
const input = $input.item.json;
const prevData = $('Build Prompt').first().json;
const startTime = prevData.start_time;

var botResponse;
var wasFallback = false;
var matchedCategory = '';

// Claude API 에러 체크
if (input.error || !input.content || !input.content[0]) {
  botResponse = '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  wasFallback = true;
} else {
  botResponse = input.content[0].text;
  wasFallback = botResponse.includes('담당자에게 전달');

  // 카테고리 매칭 (키워드 기반 휴리스틱)
  if (!wasFallback) {
    var text = botResponse;
    if (text.includes('출고') && text.includes('영업일')) matchedCategory = '배송소요일';
    else if (text.includes('운송장') || (text.includes('배송') && text.includes('조회'))) matchedCategory = '배송조회';
    else if (text.includes('교환')) matchedCategory = '교환';
    else if (text.includes('반품') || text.includes('환불')) matchedCategory = '반품환불';
    else if (text.includes('취소')) matchedCategory = '주문취소';
    else if (text.includes('재입고') || text.includes('품절')) matchedCategory = '재입고';
    else if (text.includes('운영시간') || text.includes('영업시간')) matchedCategory = '영업시간';
    else if (text.includes('결제') || text.includes('세금계산서')) matchedCategory = '결제';
    else if (text.includes('상세') && text.includes('페이지')) matchedCategory = '상품정보';
    else if (text.includes('제주') || text.includes('도서산간') || text.includes('해외')) matchedCategory = '배송지역';
  }
}

var responseTimeMs = Date.now() - startTime;

return {
  StoreID: prevData.store_record_id ? [prevData.store_record_id] : [],
  SessionID: prevData.session_id,
  Channel: prevData.channel,
  CustomerMessage: prevData.message,
  BotResponse: botResponse,
  MatchedCategory: matchedCategory,
  WasFallback: wasFallback,
  ResponseTimeMs: responseTimeMs
};
`.trim();

// ============================================================
// 워크플로우 정의
// ============================================================
const workflow = {
  name: "Main CSBot",
  nodes: [
    // ── 1. Webhook ──────────────────────────────────────────
    {
      parameters: {
        httpMethod: "POST",
        path: "csbot/message",
        responseMode: "responseNode",
        options: {}
      },
      id: "a1b2c3d4-0001-4000-8000-000000000001",
      name: "Receive Message",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [250, 300],
      webhookId: "csbot-message-webhook"
    },

    // ── 2. Airtable: Get Store Config ───────────────────────
    {
      parameters: {
        operation: "search",
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
        filterByFormula: "{StoreID}={{ $json.body.store_id }}",
        options: {}
      },
      id: "a1b2c3d4-0001-4000-8000-000000000002",
      name: "Get Store Config",
      type: "n8n-nodes-base.airtable",
      typeVersion: 2.1,
      position: [490, 300],
      credentials: {
        airtableTokenApi: {
          id: "YOUR_AIRTABLE_CREDENTIAL_ID",
          name: "Airtable"
        }
      },
      onError: "continueRegularOutput",
      notes: "⚠️ Import 후 설정 필요:\n1. Airtable Credential 매핑\n2. Base ID를 실제 값으로 변경 (appXXXXXX)\n3. 테이블명 확인",
      notesInFlow: false
    },

    // ── 3. IF: Store Exists? ────────────────────────────────
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 3
          },
          conditions: [
            {
              id: "a1b2c3d4-cond-4000-8000-000000000001",
              leftValue: "={{ $json.id }}",
              rightValue: "",
              operator: {
                type: "string",
                operation: "notEmpty",
                singleValue: true
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      id: "a1b2c3d4-0001-4000-8000-000000000003",
      name: "Store Exists?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.3,
      position: [720, 300]
    },

    // ── 4. Airtable: Get FAQs ───────────────────────────────
    {
      parameters: {
        operation: "search",
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
        filterByFormula: "{IsActive}=TRUE()",
        options: {}
      },
      id: "a1b2c3d4-0001-4000-8000-000000000004",
      name: "Get FAQs",
      type: "n8n-nodes-base.airtable",
      typeVersion: 2.1,
      position: [960, 300],
      credentials: {
        airtableTokenApi: {
          id: "YOUR_AIRTABLE_CREDENTIAL_ID",
          name: "Airtable"
        }
      },
      onError: "continueRegularOutput",
      notes: "MVP: 단일 스토어이므로 IsActive만 필터링.\n멀티스토어 시 StoreID 필터 추가 필요."
    },

    // ── 5. Airtable: Get Recent Conversations ───────────────
    {
      parameters: {
        operation: "search",
        base: {
          __rl: true,
          value: "YOUR_AIRTABLE_BASE_ID",
          mode: "id"
        },
        table: {
          __rl: true,
          value: "Conversations",
          mode: "name"
        },
        filterByFormula: "={{ \"{SessionID}='\" + $('Receive Message').first().json.body.session_id + \"'\" }}",
        returnAll: false,
        limit: 5,
        options: {
          sort: {
            property: [
              {
                field: "CreatedAt",
                direction: "desc"
              }
            ]
          }
        }
      },
      id: "a1b2c3d4-0001-4000-8000-000000000005",
      name: "Get Recent Conversations",
      type: "n8n-nodes-base.airtable",
      typeVersion: 2.1,
      position: [1200, 300],
      credentials: {
        airtableTokenApi: {
          id: "YOUR_AIRTABLE_CREDENTIAL_ID",
          name: "Airtable"
        }
      },
      onError: "continueRegularOutput"
    },

    // ── 6. Code: Build Prompt ───────────────────────────────
    {
      parameters: {
        jsCode: buildPromptCode,
        mode: "runOnceForAllItems"
      },
      id: "a1b2c3d4-0001-4000-8000-000000000006",
      name: "Build Prompt",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1440, 300]
    },

    // ── 7. HTTP Request: Call Claude API ─────────────────────
    {
      parameters: {
        method: "POST",
        url: "https://api.anthropic.com/v1/messages",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "anthropic-version",
              value: "2023-06-01"
            },
            {
              name: "content-type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "string",
        body: "={{ $json.request_body }}",
        options: {
          timeout: 60000
        }
      },
      id: "a1b2c3d4-0001-4000-8000-000000000007",
      name: "Call Claude API",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1680, 300],
      credentials: {
        httpHeaderAuth: {
          id: "YOUR_CLAUDE_CREDENTIAL_ID",
          name: "Claude API"
        }
      },
      onError: "continueErrorOutput",
      notes: "⚠️ Import 후 설정 필요:\nHeader Auth Credential 매핑\n- Header Name: x-api-key\n- Header Value: sk-ant-..."
    },

    // ── 8. Code: Parse Response ─────────────────────────────
    {
      parameters: {
        jsCode: parseResponseCode,
        mode: "runOnceForEachItem"
      },
      id: "a1b2c3d4-0001-4000-8000-000000000008",
      name: "Parse Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1920, 300]
    },

    // ── 9. Airtable: Save Conversation ──────────────────────
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
          value: "Conversations",
          mode: "name"
        },
        columns: {
          mappingMode: "autoMapInputData",
          matchingColumns: []
        },
        options: {}
      },
      id: "a1b2c3d4-0001-4000-8000-000000000009",
      name: "Save Conversation",
      type: "n8n-nodes-base.airtable",
      typeVersion: 2.1,
      position: [2160, 300],
      credentials: {
        airtableTokenApi: {
          id: "YOUR_AIRTABLE_CREDENTIAL_ID",
          name: "Airtable"
        }
      },
      onError: "continueRegularOutput",
      notes: "autoMapInputData: Parse Response의 PascalCase 필드가\nAirtable 컬럼명과 자동 매핑됩니다.\n소문자 필드(bot_response 등)는 무시됩니다."
    },

    // ── 10. Respond to Webhook: Send Response ───────────────
    {
      parameters: {
        respondWith: "text",
        responseBody: "={{ JSON.stringify({ response: $('Parse Response').first().json.BotResponse }) }}",
        options: {
          responseHeaders: {
            entries: [
              {
                name: "content-type",
                value: "application/json"
              }
            ]
          }
        }
      },
      id: "a1b2c3d4-0001-4000-8000-000000000010",
      name: "Send Response",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [2400, 300]
    },

    // ── 11. Respond to Webhook: Send Error Response ─────────
    {
      parameters: {
        respondWith: "text",
        responseBody: '={{ JSON.stringify({ response: "서비스 설정 중입니다. 잠시 후 다시 문의해 주세요.", error: true }) }}',
        options: {
          responseCode: "200",
          responseHeaders: {
            entries: [
              {
                name: "content-type",
                value: "application/json"
              }
            ]
          }
        }
      },
      id: "a1b2c3d4-0001-4000-8000-000000000011",
      name: "Send Error Response",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [960, 520]
    },

    // ── Sticky Note: Setup Instructions ─────────────────────
    {
      parameters: {
        content: "## ArumDri CS봇 워크플로우\n\n### Import 후 필수 설정\n\n1. **Airtable Credential** 매핑\n   - 모든 Airtable 노드에서 Credential 재연결\n   - Base ID를 실제 값으로 변경 (appXXXXXX)\n\n2. **Claude API Credential** 매핑\n   - Call Claude API 노드에서 Header Auth 재연결\n   - Header Name: `x-api-key`\n   - Header Value: `sk-ant-...`\n\n3. **테스트**\n   - Webhook URL: `POST /webhook/csbot/message`\n   - Body: `{\"store_id\": \"1\", \"session_id\": \"test_001\", \"channel\": \"web_widget\", \"message\": \"배송 얼마나 걸려요?\"}`",
        width: 420,
        height: 380
      },
      id: "a1b2c3d4-0001-4000-8000-000000000099",
      name: "Setup Instructions",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-200, 120]
    }
  ],

  connections: {
    "Receive Message": {
      main: [
        [
          { node: "Get Store Config", type: "main", index: 0 }
        ]
      ]
    },
    "Get Store Config": {
      main: [
        [
          { node: "Store Exists?", type: "main", index: 0 }
        ]
      ]
    },
    "Store Exists?": {
      main: [
        // Output 0: TRUE (store found)
        [
          { node: "Get FAQs", type: "main", index: 0 }
        ],
        // Output 1: FALSE (store not found)
        [
          { node: "Send Error Response", type: "main", index: 0 }
        ]
      ]
    },
    "Get FAQs": {
      main: [
        [
          { node: "Get Recent Conversations", type: "main", index: 0 }
        ]
      ]
    },
    "Get Recent Conversations": {
      main: [
        [
          { node: "Build Prompt", type: "main", index: 0 }
        ]
      ]
    },
    "Build Prompt": {
      main: [
        [
          { node: "Call Claude API", type: "main", index: 0 }
        ]
      ]
    },
    "Call Claude API": {
      main: [
        // index 0: 성공
        [{ node: "Parse Response", type: "main", index: 0 }],
        // index 1: 에러 (continueErrorOutput) → Parse Response가 error 체크 후 폴백 반환
        [{ node: "Parse Response", type: "main", index: 0 }]
      ]
    },
    "Parse Response": {
      main: [
        [
          { node: "Save Conversation", type: "main", index: 0 }
        ]
      ]
    },
    "Save Conversation": {
      main: [
        [
          { node: "Send Response", type: "main", index: 0 }
        ]
      ]
    }
  },

  active: false,
  settings: {
    executionOrder: "v1",
    binaryMode: "separate",
    availableInMCP: false
  },
  tags: []
};

// JSON 생성 및 저장
const outputPath = path.join(__dirname, 'main-csbot.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Generated: ' + outputPath);
console.log('Nodes: ' + workflow.nodes.length);
console.log('Connections: ' + Object.keys(workflow.connections).length + ' source nodes');
