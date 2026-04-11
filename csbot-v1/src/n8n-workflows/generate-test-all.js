/**
 * generate-test-all.js
 * CS봇 자동 테스트 워크플로우 생성 스크립트
 * 실행: node generate-test-all.js
 * 출력: test-all.json
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Code 노드: Define Test Cases
// ============================================================
const defineTestCasesCode = `
// runOnceForAllItems
const ts = Date.now();

const cases = [
  // FAQ 10개 — 각 카테고리 대표 메시지
  { test_id: 1,  category: '배송조회',   expected: 'FAQ_MATCH', message: '운송장 번호 알려주세요' },
  { test_id: 2,  category: '배송소요일', expected: 'FAQ_MATCH', message: '주문하면 며칠 만에 와요?' },
  { test_id: 3,  category: '교환',       expected: 'FAQ_MATCH', message: '사이즈를 잘못 주문했어요 교환 가능한가요?' },
  { test_id: 4,  category: '반품환불',   expected: 'FAQ_MATCH', message: '마음에 안 들어서 반품하고 싶어요' },
  { test_id: 5,  category: '주문취소',   expected: 'FAQ_MATCH', message: '방금 주문했는데 취소할 수 있나요?' },
  { test_id: 6,  category: '재입고',     expected: 'FAQ_MATCH', message: '품절인데 언제 다시 들어오나요?' },
  { test_id: 7,  category: '영업시간',   expected: 'FAQ_MATCH', message: '고객센터 몇 시까지 운영해요?' },
  { test_id: 8,  category: '결제',       expected: 'FAQ_MATCH', message: '무통장 입금 계좌 알려주세요' },
  { test_id: 9,  category: '상품정보',   expected: 'FAQ_MATCH', message: '이 제품 소재가 뭔가요?' },
  { test_id: 10, category: '배송지역',   expected: 'FAQ_MATCH', message: '제주도 배송 되나요?' },
  // 엣지케이스 5개
  { test_id: 11, category: 'EDGE_없는질문',   expected: 'FALLBACK', message: '이 제품 성분이 뭐에요?' },
  { test_id: 12, category: 'EDGE_인사잡담',   expected: 'FALLBACK', message: '안녕하세요~' },
  { test_id: 13, category: 'EDGE_짧은메시지', expected: 'FAQ_MATCH', message: '배송' },
  { test_id: 14, category: 'EDGE_긴불만메시지', expected: 'FAQ_MATCH', message: '어제 주문한 상품인데요 아직도 배송이 안 왔고 고객센터 전화도 안 받고 너무 화가 나서 이렇게 문의드립니다 환불도 하고 싶고 교환도 원하는데 어떻게 해야 하나요 제발 빨리 답변주세요' },
  { test_id: 15, category: 'EDGE_연속질문',   expected: 'FAQ_MATCH', message: '교환하려면요? 기간은요? 택배비는요?' }
];

return cases.map(function(c) {
  return {
    json: {
      test_id: c.test_id,
      category: c.category,
      expected: c.expected,
      message: c.message,
      store_id: '1',
      session_id: 'test_' + ts + '_' + c.test_id,
      channel: 'web_widget',
      start_time: Date.now()
    }
  };
});
`;

// ============================================================
// Code 노드: Evaluate Result (runOnceForEachItem)
// ============================================================
const evaluateResultCode = `
const item = $input.item.json;

// HTTP 응답 body만 오므로 원래 test case 데이터를 인덱스로 참조
const allCases = $('Define Test Cases').all();
const testCase = allCases[$itemIndex] ? allCases[$itemIndex].json : {};

var botResponse = '';
var resultType = 'ERROR';

// HTTP 응답 파싱
if (item.error) {
  botResponse = 'HTTP_ERROR: ' + JSON.stringify(item.error);
  resultType = 'ERROR';
} else {
  try {
    var body = item.body || item;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    botResponse = body.response || body.message || JSON.stringify(body);
  } catch (e) {
    botResponse = JSON.stringify(item);
  }

  if (botResponse.includes('담당자에게 전달')) {
    resultType = 'FALLBACK';
  } else if (botResponse.includes('오류') || botResponse.includes('error')) {
    resultType = 'ERROR';
  } else {
    resultType = 'FAQ_MATCH';
  }
}

// 기대값과 실제값 비교
const expected = testCase.expected || '';
const passed = resultType === expected;

return {
  test_id:          testCase.test_id || 0,
  category:         testCase.category || '',
  message:          testCase.message || '',
  expected:         expected,
  actual:           resultType,
  passed:           passed,
  bot_response:     botResponse.substring(0, 300),
  response_time_ms: Date.now() - (testCase.start_time || 0)
};
`;

// ============================================================
// Code 노드: Aggregate Results (runOnceForAllItems)
// ============================================================
const aggregateResultsCode = `
const results = $input.all().map(function(item) { return item.json; });
const total = results.length;

const faqMatched = results.filter(function(r) { return r.actual === 'FAQ_MATCH'; }).length;
const fallbacks  = results.filter(function(r) { return r.actual === 'FALLBACK'; }).length;
const errors     = results.filter(function(r) { return r.actual === 'ERROR'; }).length;
const passed     = results.filter(function(r) { return r.passed === true; }).length;

const passRate     = total > 0 ? Math.round((passed / total) * 100) : 0;
const faqRate      = total > 0 ? Math.round((faqMatched / total) * 100) : 0;
const fallbackRate = total > 0 ? Math.round((fallbacks / total) * 100) : 0;

const avgResponseMs = total > 0
  ? Math.round(results.reduce(function(sum, r) { return sum + (r.response_time_ms || 0); }, 0) / total)
  : 0;

const detailLines = results.map(function(r) {
  var icon = r.passed ? 'PASS' : 'FAIL';
  return '[' + icon + '] #' + r.test_id + ' ' + r.category
    + ' | expected=' + r.expected + ' actual=' + r.actual
    + ' | ' + (r.message || '').substring(0, 40);
});

const summary = [
  '=== CS봇 자동 테스트 결과 ===',
  '실행일시: ' + new Date().toLocaleString('ko-KR'),
  '',
  '총 케이스: ' + total + '개',
  'PASS: ' + passed + '개 (' + passRate + '%)',
  'FAQ 매칭: ' + faqMatched + '개 (' + faqRate + '%)',
  '폴백: ' + fallbacks + '개 (' + fallbackRate + '%)',
  '에러: ' + errors + '개',
  '평균 응답시간: ' + avgResponseMs + 'ms',
  '',
  '--- 케이스별 결과 ---',
  detailLines.join('\\n')
].join('\\n');

return [{
  json: {
    RunDate: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    TotalTests: total,
    PassCount: passed,
    PassRate: passRate,
    FAQMatched: faqMatched,
    FallbackCount: fallbacks,
    ErrorCount: errors,
    AvgResponseMs: avgResponseMs,
    Summary: summary,
    Details: JSON.stringify(results)
  }
}];
`;

// ============================================================
// 워크플로우 JSON 조립
// ============================================================
const workflow = {
  name: "CS봇 자동 테스트",
  nodes: [
    // ── Sticky Note ──────────────────────────────────────────────
    {
      parameters: {
        content: [
          "## CS봇 자동 테스트 워크플로우",
          "",
          "FAQ 10개 + 엣지케이스 5개 = 총 15개 시나리오 자동 실행",
          "",
          "---",
          "",
          "### 실행 방법",
          "1. Main CSBot 워크플로우가 **Active** 상태인지 확인",
          "2. 이 워크플로우 우상단 **Test workflow** 클릭",
          "3. `Manual Trigger` 노드의 ▶ 실행 버튼 클릭",
          "4. `Aggregate Results` 노드에서 Summary 텍스트 확인",
          "",
          "---",
          "",
          "### Import 후 설정",
          "- **Airtable Credential** 재연결 (Save Test Run 노드)",
          "- **Base ID** 변경: YOUR_AIRTABLE_BASE_ID → 실제 값",
          "- **CSBot URL** 확인: http://localhost:5678/webhook/csbot/message",
          "",
          "### TestResults 테이블 생성 필요",
          "Airtable에 TestResults 테이블을 직접 만들어야 합니다:",
          "- RunDate (Date)",
          "- TotalTests (Number)",
          "- PassCount (Number)",
          "- PassRate (Number)",
          "- FAQMatched (Number)",
          "- FallbackCount (Number)",
          "- ErrorCount (Number)",
          "- AvgResponseMs (Number)",
          "- Summary (Long Text)",
          "- Details (Long Text)"
        ].join("\n"),
        height: 680,
        width: 380
      },
      id: "ta000001-0000-4000-8000-000000000001",
      name: "Test Instructions",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [0, 0]
    },

    // ── 1. Manual Trigger ────────────────────────────────────────
    {
      parameters: {},
      id: "ta000001-0000-4000-8000-000000000002",
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [440, 320]
    },

    // ── 2. Code: Define Test Cases ───────────────────────────────
    {
      parameters: {
        mode: "runOnceForAllItems",
        jsCode: defineTestCasesCode.trim()
      },
      id: "ta000001-0000-4000-8000-000000000003",
      name: "Define Test Cases",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [680, 320]
    },

    // ── 3. HTTP Request: Call CSBot ──────────────────────────────
    {
      parameters: {
        method: "POST",
        url: "http://localhost:5678/webhook/csbot/message",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({ store_id: $json.store_id, session_id: $json.session_id, channel: $json.channel, message: $json.message }) }}",
        options: {
          timeout: 15000,
          batching: {
            batch: {
              batchSize: 1,
              batchInterval: 2000
            }
          }
        }
      },
      id: "ta000001-0000-4000-8000-000000000004",
      name: "Call CSBot",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [920, 320],
      onError: "continueErrorOutput",
      notes: "⚠️ URL을 실제 n8n 호스트로 변경하세요\n예: http://YOUR_N8N_HOST:5678/webhook/csbot/message"
    },

    // ── 4. Code: Evaluate Result (정상 응답) ─────────────────────
    {
      parameters: {
        mode: "runOnceForEachItem",
        jsCode: evaluateResultCode.trim()
      },
      id: "ta000001-0000-4000-8000-000000000005",
      name: "Evaluate Result",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1160, 220]
    },

    // ── 5. Code: Mark Error (에러 분기) ──────────────────────────
    {
      parameters: {
        mode: "runOnceForEachItem",
        jsCode: `
const item = $input.item.json;
return {
  test_id: item.test_id || 0,
  category: item.category || 'UNKNOWN',
  message: item.message || '',
  expected: item.expected || '',
  actual: 'ERROR',
  passed: false,
  bot_response: 'HTTP_REQUEST_FAILED',
  response_time_ms: 0
};
`.trim()
      },
      id: "ta000001-0000-4000-8000-000000000006",
      name: "Mark Error",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1160, 440]
    },

    // ── 6. Merge ─────────────────────────────────────────────────
    {
      parameters: {
        mode: "append",
        options: {}
      },
      id: "ta000001-0000-4000-8000-000000000007",
      name: "Merge Results",
      type: "n8n-nodes-base.merge",
      typeVersion: 3,
      position: [1400, 320]
    },

    // ── 7. Code: Aggregate Results ───────────────────────────────
    {
      parameters: {
        mode: "runOnceForAllItems",
        jsCode: aggregateResultsCode.trim()
      },
      id: "ta000001-0000-4000-8000-000000000008",
      name: "Aggregate Results",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1640, 320]
    },

    // ── 8. Airtable: Save Test Run ───────────────────────────────
    {
      parameters: {
        operation: "create",
        base: {
          "__rl": true,
          value: "YOUR_AIRTABLE_BASE_ID",
          mode: "id"
        },
        table: {
          "__rl": true,
          value: "TestResults",
          mode: "name"
        },
        columns: {
          mappingMode: "defineBelow",
          value: {
            RunDate:       "={{ $json.RunDate }}",
            TotalTests:    "={{ $json.TotalTests }}",
            PassCount:     "={{ $json.PassCount }}",
            PassRate:      "={{ $json.PassRate }}",
            FAQMatched:    "={{ $json.FAQMatched }}",
            FallbackCount: "={{ $json.FallbackCount }}",
            ErrorCount:    "={{ $json.ErrorCount }}",
            AvgResponseMs: "={{ $json.AvgResponseMs }}",
            Summary:       "={{ $json.Summary }}",
            Details:       "={{ $json.Details }}"
          },
          matchingColumns: [],
          schema: [
            { id: "RunDate",       displayName: "RunDate",       required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "string",  readOnly: false, removed: false },
            { id: "TotalTests",    displayName: "TotalTests",    required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "number", readOnly: false, removed: false },
            { id: "PassCount",     displayName: "PassCount",     required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "number", readOnly: false, removed: false },
            { id: "PassRate",      displayName: "PassRate",      required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "number", readOnly: false, removed: false },
            { id: "FAQMatched",    displayName: "FAQMatched",    required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "number", readOnly: false, removed: false },
            { id: "FallbackCount", displayName: "FallbackCount", required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "number", readOnly: false, removed: false },
            { id: "ErrorCount",    displayName: "ErrorCount",    required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "number", readOnly: false, removed: false },
            { id: "AvgResponseMs", displayName: "AvgResponseMs", required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "number", readOnly: false, removed: false },
            { id: "Summary",       displayName: "Summary",       required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "string",  readOnly: false, removed: false },
            { id: "Details",       displayName: "Details",       required: false, defaultMatch: false, canBeUsedToMatch: true, display: true, type: "string",  readOnly: false, removed: false }
          ],
          attemptToConvertTypes: false,
          convertFieldsToString: false
        },
        options: {}
      },
      id: "ta000001-0000-4000-8000-000000000009",
      name: "Save Test Run",
      type: "n8n-nodes-base.airtable",
      typeVersion: 2.1,
      position: [1880, 320],
      onError: "continueRegularOutput",
      credentials: {
        airtableTokenApi: {
          id: "YOUR_AIRTABLE_CREDENTIAL_ID",
          name: "Airtable"
        }
      },
      notes: "⚠️ Import 후 설정:\n1. Airtable Credential 재연결\n2. Base ID 변경\n3. Airtable에 TestResults 테이블 생성 필요"
    }
  ],

  pinData: {},

  connections: {
    "Manual Trigger": {
      main: [[{ node: "Define Test Cases", type: "main", index: 0 }]]
    },
    "Define Test Cases": {
      main: [[{ node: "Call CSBot", type: "main", index: 0 }]]
    },
    "Call CSBot": {
      main: [
        [{ node: "Evaluate Result", type: "main", index: 0 }],
        [{ node: "Mark Error",      type: "main", index: 0 }]
      ]
    },
    "Evaluate Result": {
      main: [[{ node: "Merge Results", type: "main", index: 0 }]]
    },
    "Mark Error": {
      main: [[{ node: "Merge Results", type: "main", index: 1 }]]
    },
    "Merge Results": {
      main: [[{ node: "Aggregate Results", type: "main", index: 0 }]]
    },
    "Aggregate Results": {
      main: [[{ node: "Save Test Run", type: "main", index: 0 }]]
    }
  },

  active: false,
  settings: {
    executionOrder: "v1",
    binaryMode: "separate",
    availableInMCP: false
  },
  versionId: "ta000001-0000-4000-8000-000000000099",
  meta: {
    instanceId: "ee47474067e98b2c6e6dc3fa8b47a61d99afb0655ded6fd3e34fb73643976e2b"
  },
  id: "TestAllWorkflow01",
  tags: []
};

// ============================================================
// JSON 파일 출력
// ============================================================
const outputPath = path.join(__dirname, 'test-all.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('✅ test-all.json 생성 완료:', outputPath);
console.log('   노드 수:', workflow.nodes.length);
console.log('   테스트 케이스: 15개 (FAQ 10 + 엣지케이스 5)');
