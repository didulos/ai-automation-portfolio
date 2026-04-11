#!/usr/bin/env node
/**
 * 테스트 트리거 워크플로우 JSON 생성
 * 실행: node generate-test-trigger.js
 * 출력: test-trigger.json
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Code 노드: Generate Test Cases
// ============================================================
const generateTestCasesCode = `
// PRD 10개 시나리오 + 폴백 1건 = 총 11건 테스트
const testCases = [
  {
    id: 'S01',
    category: '배송조회',
    message: '제 주문 언제 와요?',
    expect_keywords: ['배송', '조회', '운송장']
  },
  {
    id: 'S02',
    category: '배송소요일',
    message: '주문하면 며칠 만에 와요?',
    expect_keywords: ['출고', '영업일', '수령']
  },
  {
    id: 'S03',
    category: '교환',
    message: '사이즈를 잘못 주문했어요. 교환 가능한가요?',
    expect_keywords: ['교환', '일 이내']
  },
  {
    id: 'S04',
    category: '반품환불',
    message: '마음에 안 들어서 반품하고 싶어요',
    expect_keywords: ['반품', '환불', '배송비']
  },
  {
    id: 'S05',
    category: '주문취소',
    message: '방금 주문했는데 취소할 수 있나요?',
    expect_keywords: ['취소', '주문']
  },
  {
    id: 'S06',
    category: '재입고',
    message: '품절인데 언제 다시 들어오나요?',
    expect_keywords: ['재입고', '품절', '알림']
  },
  {
    id: 'S07',
    category: '영업시간',
    message: '고객센터 몇 시까지 운영해요?',
    expect_keywords: ['운영', '시간']
  },
  {
    id: 'S08',
    category: '결제',
    message: '무통장 입금 계좌 알려주세요',
    expect_keywords: ['결제', '계좌', '카드']
  },
  {
    id: 'S09',
    category: '상품정보',
    message: '이 제품 소재가 뭔가요?',
    expect_keywords: ['상품', '상세', '페이지']
  },
  {
    id: 'S10',
    category: '배송지역',
    message: '제주도 배송 되나요?',
    expect_keywords: ['제주', '배송']
  },
  {
    id: 'F01',
    category: '폴백',
    message: '사장님 전화번호 알려주세요',
    expect_keywords: ['담당자', '전달']
  }
];

return testCases.map(function(tc, idx) {
  return {
    json: {
      test_id: tc.id,
      test_category: tc.category,
      test_index: idx + 1,
      test_total: testCases.length,
      expect_keywords: tc.expect_keywords,
      request_body: {
        store_id: '1',
        session_id: 'test_' + tc.id + '_' + Date.now(),
        channel: 'web_widget',
        message: tc.message
      }
    }
  };
});
`.trim();

// ============================================================
// Code 노드: Evaluate Result
// ============================================================
const evaluateResultCode = `
const test = $('Generate Test Cases').item;
const response = $input.item.json;

var botResponse = '';
var passed = false;
var details = '';

try {
  // n8n HTTP Request v4.2는 JSON 응답을 직접 $json으로 반환
  botResponse = response.response || JSON.stringify(response);

  // 키워드 매칭 검증
  var keywords = test.json.expect_keywords || [];
  var matchedKeywords = [];
  var missedKeywords = [];

  keywords.forEach(function(kw) {
    if (botResponse.includes(kw)) {
      matchedKeywords.push(kw);
    } else {
      missedKeywords.push(kw);
    }
  });

  // 최소 1개 키워드 매칭 시 PASS
  passed = matchedKeywords.length > 0;
  details = 'Matched: [' + matchedKeywords.join(', ') + ']';
  if (missedKeywords.length > 0) {
    details += ' | Missed: [' + missedKeywords.join(', ') + ']';
  }
} catch(e) {
  botResponse = 'ERROR: ' + e.message;
  details = 'Response parse failed';
}

var status = passed ? 'PASS' : 'FAIL';
var emoji = passed ? '✅' : '❌';

return [{
  json: {
    result: emoji + ' [' + test.json.test_id + '] ' + test.json.test_category + ': ' + status,
    test_id: test.json.test_id,
    category: test.json.test_category,
    input_message: test.json.request_body.message,
    bot_response: botResponse,
    passed: passed,
    details: details,
    index: test.json.test_index + '/' + test.json.test_total
  }
}];
`.trim();

// ============================================================
// Code 노드: Summary
// ============================================================
const summaryCode = `
const results = $input.all();

var passCount = 0;
var failCount = 0;
var lines = ['===== CS봇 FAQ 테스트 결과 =====', ''];

results.forEach(function(r) {
  lines.push(r.json.result);
  if (r.json.passed) passCount++;
  else failCount++;
});

var total = passCount + failCount;
var rate = total > 0 ? Math.round((passCount / total) * 100) : 0;

lines.push('');
lines.push('─────────────────────────────');
lines.push('Total: ' + total + ' | Pass: ' + passCount + ' | Fail: ' + failCount);
lines.push('Pass Rate: ' + rate + '% (목표: 90%)');
lines.push(rate >= 90 ? '🎉 목표 달성!' : '⚠️ 목표 미달 — FAQ 데이터 또는 프롬프트 점검 필요');
lines.push('─────────────────────────────');

return [{
  json: {
    summary: lines.join('\\n'),
    pass_count: passCount,
    fail_count: failCount,
    total: total,
    pass_rate: rate
  }
}];
`.trim();

// ============================================================
// 워크플로우 정의
// ============================================================
const workflow = {
  name: "CSBot Test Trigger",
  nodes: [
    // ── 1. Manual Trigger ──────────────────────────────────
    {
      parameters: {},
      id: "b2c3d4e5-0001-4000-8000-000000000001",
      name: "Run Tests",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [250, 300]
    },

    // ── 2. Code: Generate Test Cases ───────────────────────
    {
      parameters: {
        jsCode: generateTestCasesCode,
        mode: "runOnceForAllItems"
      },
      id: "b2c3d4e5-0001-4000-8000-000000000002",
      name: "Generate Test Cases",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [490, 300]
    },

    // ── 3. HTTP Request: Call Main Webhook ──────────────────
    {
      parameters: {
        method: "POST",
        url: "http://localhost:5678/webhook/csbot/message",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "content-type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "string",
        body: "={{ JSON.stringify($json.request_body) }}",
        options: {
          timeout: 15000
        }
      },
      id: "b2c3d4e5-0001-4000-8000-000000000003",
      name: "Call CSBot Webhook",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [730, 300],
      onError: "continueRegularOutput",
      notes: "메인 워크플로우의 Webhook을 호출합니다.\nURL을 실제 n8n 환경에 맞게 수정하세요."
    },

    // ── 4. Code: Evaluate Result ────────────────────────────
    {
      parameters: {
        jsCode: evaluateResultCode,
        mode: "runOnceForEachItem"
      },
      id: "b2c3d4e5-0001-4000-8000-000000000004",
      name: "Evaluate Result",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [970, 300]
    },

    // ── 5. Code: Summary ───────────────────────────────────
    {
      parameters: {
        jsCode: summaryCode,
        mode: "runOnceForAllItems"
      },
      id: "b2c3d4e5-0001-4000-8000-000000000005",
      name: "Summary",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1210, 300]
    },

    // ── Sticky Note ────────────────────────────────────────
    {
      parameters: {
        content: "## CS봇 테스트 트리거\n\n### 사용법\n1. **메인 워크플로우를 먼저 활성화**하세요\n2. 이 워크플로우에서 [Execute Workflow] 클릭\n3. Summary 노드에서 결과 확인\n\n### 테스트 항목 (11건)\n- S01~S10: PRD 10개 FAQ 시나리오\n- F01: 폴백 테스트\n\n### 검증 방식\n각 시나리오별 기대 키워드가\n응답에 포함되어 있는지 확인\n(1개 이상 매칭 시 PASS)",
        width: 360,
        height: 330
      },
      id: "b2c3d4e5-0001-4000-8000-000000000099",
      name: "Test Info",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-150, 120]
    }
  ],

  connections: {
    "Run Tests": {
      main: [
        [
          { node: "Generate Test Cases", type: "main", index: 0 }
        ]
      ]
    },
    "Generate Test Cases": {
      main: [
        [
          { node: "Call CSBot Webhook", type: "main", index: 0 }
        ]
      ]
    },
    "Call CSBot Webhook": {
      main: [
        [
          { node: "Evaluate Result", type: "main", index: 0 }
        ]
      ]
    },
    "Evaluate Result": {
      main: [
        [
          { node: "Summary", type: "main", index: 0 }
        ]
      ]
    }
  },

  active: false,
  settings: {
    executionOrder: "v1"
  },
  tags: []
};

// JSON 생성 및 저장
const outputPath = path.join(__dirname, 'test-trigger.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Generated: ' + outputPath);
console.log('Nodes: ' + workflow.nodes.length);
console.log('Test cases: 11 (S01-S10 + F01 fallback)');
