#!/usr/bin/env node
/**
 * 카카오 채널 테스트 워크플로우 JSON 생성 스크립트
 * 실행: node generate-test-kakao.js
 * 출력: test-kakao.json
 *
 * 카카오 스킬 요청 포맷으로 메시지를 감싸서 kakao-channel 웹훅에 POST,
 * 응답의 카카오 포맷(version: "2.0", template.outputs) 검증.
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Code 노드: 테스트 케이스 생성
// ============================================================
const generateTestCasesCode = `
// PRD 10개 시나리오 + 폴백 1건 = 11개 테스트 케이스
const testCases = [
  { id: 'S01', category: '배송조회', message: '택배 운송장 번호 알려주세요', keywords: ['배송', '조회', '운송장', 'CJ대한통운'] },
  { id: 'S02', category: '배송소요일', message: '배송 얼마나 걸려요?', keywords: ['출고', '영업일', '수령'] },
  { id: 'S03', category: '교환', message: '사이즈 교환 가능한가요?', keywords: ['교환', '7일'] },
  { id: 'S04', category: '반품환불', message: '환불은 어떻게 신청해요?', keywords: ['반품', '환불', '3000'] },
  { id: 'S05', category: '주문취소', message: '방금 주문했는데 취소할 수 있나요?', keywords: ['취소', '출고 전', '네이버'] },
  { id: 'S06', category: '재입고', message: '품절인데 언제 다시 들어오나요?', keywords: ['품절', '재입고', '알림'] },
  { id: 'S07', category: '영업시간', message: '고객센터 몇 시까지 운영해요?', keywords: ['운영시간', '09:00', '월~금'] },
  { id: 'S08', category: '결제', message: '세금계산서 발행 가능한가요?', keywords: ['세금계산서', '결제', '카드'] },
  { id: 'S09', category: '상품정보', message: '이 제품 소재가 뭔가요?', keywords: ['상세', '페이지', '상품'] },
  { id: 'S10', category: '배송지역', message: '제주도 배송 되나요?', keywords: ['제주', '3000'] },
  { id: 'F01', category: '폴백', message: '이 제품에 방부제가 들어있나요?', keywords: ['담당자', '전달'] }
];

return testCases.map(function(tc) {
  return {
    json: {
      test_id: tc.id,
      category: tc.category,
      message: tc.message,
      keywords: tc.keywords,
      // 카카오 스킬 요청 포맷으로 감싸기
      kakao_request: {
        intent: { id: 'test_intent', name: 'test' },
        userRequest: {
          timezone: 'Asia/Seoul',
          utterance: tc.message,
          user: { id: 'test_user_' + tc.id, type: 'botUserKey' }
        },
        bot: { id: 'test_bot', name: 'CS Bot Test' }
      }
    }
  };
});
`.trim();

// ============================================================
// Code 노드: 응답 검증
// ============================================================
const validateResponseCode = `
// 원본 테스트 데이터는 Generate Test Cases에서 가져옴
const testData = $('Generate Test Cases').item.json;
const testId = testData.test_id;
const category = testData.category;
const keywords = testData.keywords;

// HTTP Request 응답이 곧 카카오 응답 (별도 wrapper 없음)
const response = $input.item.json;

var status = 'FAIL';
var reason = '';
var responseText = '';

// 1. 카카오 포맷 검증
if (!response || !response.version) {
  reason = '응답 없음 또는 유효하지 않은 응답';
} else if (response.version !== '2.0') {
  reason = 'version이 2.0이 아님: ' + response.version;
} else if (!response.template || !response.template.outputs || !response.template.outputs[0]) {
  reason = 'template.outputs 구조 없음';
} else if (!response.template.outputs[0].simpleText || !response.template.outputs[0].simpleText.text) {
  reason = 'simpleText.text 없음';
} else {
  responseText = response.template.outputs[0].simpleText.text;

  // 2. 키워드 매칭 검증
  var matchCount = 0;
  for (var i = 0; i < keywords.length; i++) {
    if (responseText.includes(keywords[i])) matchCount++;
  }

  if (matchCount > 0) {
    status = 'PASS';
  } else {
    reason = '키워드 미매칭 (0/' + keywords.length + ')';
  }
}

return {
  test_id: testId,
  category: category,
  status: status,
  reason: reason,
  response_text: responseText.substring(0, 100),
  keyword_count: keywords.length
};
`.trim();

// ============================================================
// Code 노드: 결과 요약
// ============================================================
const summaryCode = `
const results = $input.all();
var total = results.length;
var passed = 0;
var failed = 0;
var details = [];

for (var i = 0; i < results.length; i++) {
  var r = results[i].json;
  if (r.status === 'PASS') {
    passed++;
    details.push('[PASS] ' + r.test_id + ' ' + r.category);
  } else {
    failed++;
    details.push('[FAIL] ' + r.test_id + ' ' + r.category + ' — ' + r.reason);
  }
}

var passRate = Math.round((passed / total) * 100);

return [{
  json: {
    summary: '카카오 채널 테스트 결과',
    total: total,
    passed: passed,
    failed: failed,
    pass_rate: passRate + '%',
    target: '90%',
    met_target: passRate >= 90,
    details: details.join('\\n')
  }
}];
`.trim();

// ============================================================
// 워크플로우 정의
// ============================================================
const workflow = {
  name: "Test Kakao Channel",
  nodes: [
    // ── 1. Manual Trigger ────────────────────────────────
    {
      parameters: {},
      id: "test-kakao-0001-4000-8000-000000000001",
      name: "Run Tests",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [250, 300]
    },

    // ── 2. Code: 테스트 케이스 생성 ─────────────────────
    {
      parameters: {
        jsCode: generateTestCasesCode,
        mode: "runOnceForAllItems"
      },
      id: "test-kakao-0001-4000-8000-000000000002",
      name: "Generate Test Cases",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [490, 300]
    },

    // ── 3. HTTP Request: 카카오 웹훅 호출 ─────────────────
    {
      parameters: {
        method: "POST",
        url: "http://localhost:5678/webhook-test/kakao",
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
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.kakao_request) }}",
        options: {
          timeout: 15000
        }
      },
      id: "test-kakao-0001-4000-8000-000000000003",
      name: "Call Kakao Webhook",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [720, 300],
      onError: "continueRegularOutput",
      notes: "webhook-test 경로 사용 (워크플로우 비활성 상태에서도 테스트 가능).\nProduction 테스트 시 /webhook/kakao로 변경."
    },

    // ── 4. Code: 응답 검증 ──────────────────────────────
    {
      parameters: {
        jsCode: validateResponseCode,
        mode: "runOnceForEachItem"
      },
      id: "test-kakao-0001-4000-8000-000000000004",
      name: "Validate Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [960, 300]
    },

    // ── 5. Code: 결과 요약 ──────────────────────────────
    {
      parameters: {
        jsCode: summaryCode,
        mode: "runOnceForAllItems"
      },
      id: "test-kakao-0001-4000-8000-000000000005",
      name: "Test Summary",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1200, 300]
    },

    // ── Sticky Note ──────────────────────────────────────
    {
      parameters: {
        content: "## 카카오 채널 테스트 워크플로우\n\n### 사용 방법\n1. Kakao Channel Chatbot 워크플로우가 import 되어 있어야 함\n2. Main CSBot 워크플로우가 활성(active) 상태여야 함\n3. 이 워크플로우를 Manual 실행\n\n### 테스트 케이스 (11건)\n- S01~S10: PRD 10개 시나리오\n- F01: 폴백 테스트 (FAQ에 없는 질문)\n\n### 검증 항목\n- 카카오 응답 포맷 (version: 2.0, simpleText)\n- 키워드 매칭 (1개 이상 hit → PASS)\n- 목표: Pass Rate 90% 이상",
        width: 400,
        height: 320
      },
      id: "test-kakao-0001-4000-8000-000000000099",
      name: "Test Notes",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-200, 120]
    }
  ],

  connections: {
    "Run Tests": {
      main: [
        [{ node: "Generate Test Cases", type: "main", index: 0 }]
      ]
    },
    "Generate Test Cases": {
      main: [
        [{ node: "Call Kakao Webhook", type: "main", index: 0 }]
      ]
    },
    "Call Kakao Webhook": {
      main: [
        [{ node: "Validate Response", type: "main", index: 0 }]
      ]
    },
    "Validate Response": {
      main: [
        [{ node: "Test Summary", type: "main", index: 0 }]
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
const outputPath = path.join(__dirname, 'test-kakao.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Generated: ' + outputPath);
console.log('Nodes: ' + workflow.nodes.length);
console.log('Connections: ' + Object.keys(workflow.connections).length + ' source nodes');
