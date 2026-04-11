#!/usr/bin/env node
/**
 * 카카오 채널 챗봇 워크플로우 JSON 생성 스크립트 (Callback + Direct 분기)
 * 실행: node generate-kakao-channel.js
 * 출력: kakao-channel.json
 *
 * 구조:
 *   카카오 스킬 요청 수신
 *   → 데이터 추출 (callbackUrl, utterance, session_id)
 *   → callbackUrl 존재 여부 분기
 *     [있음] → 즉시 {useCallback: true} 응답 → CSBot 호출 → callbackUrl로 전송
 *     [없음] → CSBot 호출 → 카카오 포맷으로 직접 응답 (봇테스트/스킬테스트용)
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Code 노드: 데이터 추출 (callbackUrl 없어도 에러 안 남)
// ============================================================
const extractDataCode = `
const body = $input.item.json.body;

const utterance = body.userRequest && body.userRequest.utterance
  ? body.userRequest.utterance.trim()
  : '';

const userId = body.userRequest && body.userRequest.user && body.userRequest.user.id
  ? body.userRequest.user.id
  : 'unknown';

const callbackUrl = body.userRequest && body.userRequest.callbackUrl
  ? body.userRequest.callbackUrl
  : '';

return {
  store_id: '1',
  session_id: 'kakao_' + userId,
  channel: 'kakao',
  message: utterance,
  callbackUrl: callbackUrl
};
`.trim();

// ============================================================
// Code 노드: Callback 응답 포맷 변환
// ============================================================
const formatCallbackCode = `
const input = $input.item.json;
const callbackUrl = $('Extract Data').first().json.callbackUrl;

var botResponse;
if (input.error || !input.response) {
  botResponse = '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 문의해 주세요.';
} else {
  botResponse = input.response;
}

return {
  callbackUrl: callbackUrl,
  payload: {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: botResponse } }]
    }
  }
};
`.trim();

// ============================================================
// Code 노드: Direct 응답 포맷 변환 (봇테스트/스킬테스트용)
// ============================================================
const formatDirectCode = `
const input = $input.item.json;

var botResponse;
if (input.error || !input.response) {
  botResponse = '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 문의해 주세요.';
} else {
  botResponse = input.response;
}

return {
  version: '2.0',
  template: {
    outputs: [{ simpleText: { text: botResponse } }]
  }
};
`.trim();

// ============================================================
// 워크플로우 정의
// ============================================================
const workflow = {
  name: "Kakao Channel Chatbot",
  nodes: [
    // ── 1. Webhook: 카카오 스킬 요청 수신 ──────────────────
    {
      parameters: {
        httpMethod: "POST",
        path: "kakao",
        responseMode: "responseNode",
        options: {}
      },
      id: "kakao-0001-4000-8000-000000000001",
      name: "Receive Kakao Request",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [250, 300],
      webhookId: "kakao-skill-webhook"
    },

    // ── 2. Code: 데이터 추출 ──────────────────────────────
    {
      parameters: {
        jsCode: extractDataCode,
        mode: "runOnceForEachItem"
      },
      id: "kakao-0001-4000-8000-000000000002",
      name: "Extract Data",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [490, 300]
    },

    // ── 3. IF: callbackUrl 존재 여부 ──────────────────────
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
              id: "kakao-cond-0001-4000-8000-000000000001",
              leftValue: "={{ $json.callbackUrl }}",
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
      id: "kakao-0001-4000-8000-000000000003",
      name: "Has Callback URL?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.3,
      position: [720, 300]
    },

    // ════════════════════════════════════════════════════════
    // TRUE 분기: Callback 패턴 (실제 카카오톡)
    // ════════════════════════════════════════════════════════

    // ── 4. Respond to Webhook: 즉시 useCallback 응답 ──────
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ {useCallback: true} }}",
        options: {}
      },
      id: "kakao-0001-4000-8000-000000000004",
      name: "Send Callback Ack",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [960, 200]
    },

    // ── 5. HTTP Request: 메인 CSBot 호출 (Callback) ───────
    {
      parameters: {
        method: "POST",
        url: "http://localhost:5678/webhook/csbot/message",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({store_id: $('Extract Data').first().json.store_id, session_id: $('Extract Data').first().json.session_id, channel: $('Extract Data').first().json.channel, message: $('Extract Data').first().json.message}) }}",
        options: { timeout: 50000 }
      },
      id: "kakao-0001-4000-8000-000000000005",
      name: "Call CSBot (Callback)",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1200, 200],
      onError: "continueRegularOutput"
    },

    // ── 6. Code: Callback 응답 포맷 변환 ──────────────────
    {
      parameters: {
        jsCode: formatCallbackCode,
        mode: "runOnceForEachItem"
      },
      id: "kakao-0001-4000-8000-000000000006",
      name: "Format Callback Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1440, 200]
    },

    // ── 7. HTTP Request: callbackUrl로 최종 응답 전송 ──────
    {
      parameters: {
        method: "POST",
        url: "={{ $json.callbackUrl }}",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.payload) }}",
        options: { timeout: 10000 }
      },
      id: "kakao-0001-4000-8000-000000000007",
      name: "Send to Callback URL",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1680, 200],
      onError: "continueRegularOutput"
    },

    // ════════════════════════════════════════════════════════
    // FALSE 분기: Direct 응답 (봇테스트/스킬테스트/curl)
    // ════════════════════════════════════════════════════════

    // ── 8. HTTP Request: 메인 CSBot 호출 (Direct) ─────────
    {
      parameters: {
        method: "POST",
        url: "http://localhost:5678/webhook/csbot/message",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({store_id: $('Extract Data').first().json.store_id, session_id: $('Extract Data').first().json.session_id, channel: $('Extract Data').first().json.channel, message: $('Extract Data').first().json.message}) }}",
        options: { timeout: 50000 }
      },
      id: "kakao-0001-4000-8000-000000000008",
      name: "Call CSBot (Direct)",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [960, 440],
      onError: "continueRegularOutput"
    },

    // ── 9. Code: Direct 응답 포맷 변환 ────────────────────
    {
      parameters: {
        jsCode: formatDirectCode,
        mode: "runOnceForEachItem"
      },
      id: "kakao-0001-4000-8000-000000000009",
      name: "Format Direct Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1200, 440]
    },

    // ── 10. Respond to Webhook: 직접 응답 ─────────────────
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}",
        options: {}
      },
      id: "kakao-0001-4000-8000-000000000010",
      name: "Send Direct Response",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [1440, 440]
    },

    // ── Sticky Note ──────────────────────────────────────
    {
      parameters: {
        content: "## 카카오 채널 챗봇 (Callback + Direct 분기)\n\n### callbackUrl 있음 (실제 카카오톡)\n수신 → 추출 → IF → 즉시 useCallback 응답 → CSBot → 포맷 → callbackUrl POST\n\n### callbackUrl 없음 (봇테스트/스킬테스트/curl)\n수신 → 추출 → IF → CSBot → 포맷 → 직접 응답\n\n### Callback 제약\n- callbackUrl 유효시간: 60초\n- callbackUrl 사용횟수: 1회\n- AI 챗봇 ON이어야 callbackUrl 포함됨",
        width: 460,
        height: 300
      },
      id: "kakao-0001-4000-8000-000000000099",
      name: "Setup Notes",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-250, 120]
    }
  ],

  connections: {
    "Receive Kakao Request": {
      main: [
        [{ node: "Extract Data", type: "main", index: 0 }]
      ]
    },
    "Extract Data": {
      main: [
        [{ node: "Has Callback URL?", type: "main", index: 0 }]
      ]
    },
    // IF: main[0] = true (callbackUrl 있음), main[1] = false (없음)
    "Has Callback URL?": {
      main: [
        [{ node: "Send Callback Ack", type: "main", index: 0 }],
        [{ node: "Call CSBot (Direct)", type: "main", index: 0 }]
      ]
    },
    // TRUE 분기
    "Send Callback Ack": {
      main: [
        [{ node: "Call CSBot (Callback)", type: "main", index: 0 }]
      ]
    },
    "Call CSBot (Callback)": {
      main: [
        [{ node: "Format Callback Response", type: "main", index: 0 }]
      ]
    },
    "Format Callback Response": {
      main: [
        [{ node: "Send to Callback URL", type: "main", index: 0 }]
      ]
    },
    // FALSE 분기
    "Call CSBot (Direct)": {
      main: [
        [{ node: "Format Direct Response", type: "main", index: 0 }]
      ]
    },
    "Format Direct Response": {
      main: [
        [{ node: "Send Direct Response", type: "main", index: 0 }]
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
const outputPath = path.join(__dirname, 'kakao-channel.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Generated: ' + outputPath);
console.log('Nodes: ' + workflow.nodes.length);
console.log('Connections: ' + Object.keys(workflow.connections).length + ' source nodes');
