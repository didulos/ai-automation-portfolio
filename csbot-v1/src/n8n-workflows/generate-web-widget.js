/**
 * generate-web-widget.js
 * Web Widget Handler n8n 워크플로우 생성 스크립트
 * 실행: node generate-web-widget.js
 */

const workflow = {
  name: "Web Widget Handler",
  nodes: [
    // ── Sticky Note ──────────────────────────────────────────────
    {
      parameters: {
        content: [
          "## 🌐 Web Widget Handler",
          "",
          "웹 채팅 위젯 ↔ Main CSBot 연결 워크플로우",
          "",
          "---",
          "",
          "### ✅ Import 후 필수 설정",
          "",
          "**1. Main CSBot URL 변경**",
          "`Call CSBot` 노드 > URL을 실제 n8n 호스트로 변경",
          "기본값: `http://localhost:5678/webhook/csbot/message`",
          "",
          "**2. CORS / OPTIONS 프리플라이트 처리 [필수]**",
          "",
          "브라우저는 cross-origin POST 전에 OPTIONS 요청을 먼저 보냅니다.",
          "n8n Webhook 노드는 OPTIONS 메서드를 지원하지 않으므로,",
          "**반드시 아래 중 하나**로 인프라 레벨에서 처리해야 합니다.",
          "",
          "방법 A — n8n 환경변수 (.env 또는 docker-compose):",
          "```",
          "N8N_CORS_ORIGIN=https://smartstore.naver.com",
          "# 개발/테스트: N8N_CORS_ORIGIN=*",
          "```",
          "n8n을 재시작하면 OPTIONS 요청에 자동 응답합니다.",
          "",
          "방법 B — Nginx 리버스 프록시:",
          "```nginx",
          "add_header Access-Control-Allow-Origin *;",
          "add_header Access-Control-Allow-Methods 'POST, OPTIONS';",
          "add_header Access-Control-Allow-Headers 'Content-Type';",
          "if ($request_method = OPTIONS) { return 204; }",
          "```",
          "",
          "※ POST 응답의 CORS 헤더는 이 워크플로우의",
          "  `Send Widget Response` 노드에 이미 설정되어 있습니다.",
          "",
          "---",
          "",
          "### 테스트 (curl)",
          "```bash",
          "curl -X POST https://YOUR_N8N/webhook/widget \\",
          "  -H 'Content-Type: application/json' \\",
          "  -d '{\"message\":\"배송 언제 와요?\",",
          "       \"session_id\":\"test_001\",",
          "       \"store_id\":\"1\",",
          "       \"channel\":\"web_widget\"}'",
          "```"
        ].join("\n"),
        height: 520,
        width: 400,
        color: 4
      },
      id: "ww000001-0000-4000-8000-000000000001",
      name: "Setup Notes",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-240, 100]
    },

    // ── 1. Webhook ────────────────────────────────────────────────
    {
      parameters: {
        httpMethod: "POST",
        path: "widget",
        responseMode: "responseNode",
        options: {}
      },
      id: "ww000001-0000-4000-8000-000000000002",
      name: "Receive Widget Request",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [200, 300],
      webhookId: "web-widget-webhook"
    },

    // ── 2. Code: Validate & Normalize ────────────────────────────
    {
      parameters: {
        jsCode: `
// 위젯 요청에서 필드 추출 및 검증
const body = $input.item.json.body || $input.item.json;

const message    = (body.message    || '').trim();
const session_id = (body.session_id || '').trim();
const store_id   = (body.store_id   || '1').toString().trim();
const channel    = 'web_widget';

// 필수 필드 검증
if (!message) {
  throw new Error('message 필드가 비어 있습니다.');
}
if (!session_id) {
  throw new Error('session_id 필드가 비어 있습니다.');
}

return {
  message,
  session_id,
  store_id,
  channel,
  received_at: new Date().toISOString()
};
`.trim()
      },
      id: "ww000001-0000-4000-8000-000000000003",
      name: "Validate & Extract",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [440, 300]
    },

    // ── 3. HTTP Request: Call Main CSBot ─────────────────────────
    {
      parameters: {
        method: "POST",
        url: "http://localhost:5678/webhook/csbot/message",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Content-Type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={
  "store_id":   "{{ $json.store_id }}",
  "session_id": "{{ $json.session_id }}",
  "channel":    "{{ $json.channel }}",
  "message":    "{{ $json.message }}"
}`,
        options: {
          timeout: 12000,
          response: {
            response: {
              fullResponse: false
            }
          }
        }
      },
      id: "ww000001-0000-4000-8000-000000000004",
      name: "Call CSBot",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [680, 300],
      notes: "⚠️ URL을 실제 n8n 호스트로 변경하세요.\n예: https://your-n8n.example.com/webhook/csbot/message",
      notesInFlow: false,
      onError: "continueErrorOutput"
    },

    // ── 4. Code: Format Widget Response (성공) ────────────────────
    {
      parameters: {
        jsCode: `
// Main CSBot 응답 → 위젯 응답 포맷으로 변환
const csbot = $input.item.json;

// Main CSBot은 { response: "..." } 또는 { message: "..." } 형태로 반환
const botText = csbot.response || csbot.message || '잠시 후 다시 시도해 주세요.';

return {
  message:    botText,
  session_id: $('Validate & Extract').first().json.session_id,
  timestamp:  new Date().toISOString()
};
`.trim()
      },
      id: "ww000001-0000-4000-8000-000000000005",
      name: "Format Widget Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [920, 220]
    },

    // ── 5. Code: Format Error Response ───────────────────────────
    {
      parameters: {
        jsCode: `
// CSBot 호출 실패 시 폴백 응답
return {
  message:    '일시적인 오류가 발생했습니다. 잠시 후 다시 문의해 주세요.',
  session_id: $('Validate & Extract').first().json.session_id,
  timestamp:  new Date().toISOString(),
  error:      true
};
`.trim()
      },
      id: "ww000001-0000-4000-8000-000000000006",
      name: "Format Error Response",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [920, 420]
    },

    // ── 6. Respond to Webhook ─────────────────────────────────────
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ $json }}",
        options: {
          responseHeaders: {
            entries: [
              {
                name: "Access-Control-Allow-Origin",
                value: "*"
              },
              {
                name: "Access-Control-Allow-Methods",
                value: "POST, OPTIONS"
              },
              {
                name: "Access-Control-Allow-Headers",
                value: "Content-Type"
              }
            ]
          }
        }
      },
      id: "ww000001-0000-4000-8000-000000000007",
      name: "Send Widget Response",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [1160, 300]
    }
  ],

  connections: {
    "Receive Widget Request": {
      main: [
        [{ node: "Validate & Extract", type: "main", index: 0 }]
      ]
    },
    "Validate & Extract": {
      main: [
        [{ node: "Call CSBot", type: "main", index: 0 }]
      ]
    },
    "Call CSBot": {
      main: [
        // index 0: 성공
        [{ node: "Format Widget Response", type: "main", index: 0 }],
        // index 1: 에러 (onError: continueErrorOutput)
        [{ node: "Format Error Response",  type: "main", index: 0 }]
      ]
    },
    "Format Widget Response": {
      main: [
        [{ node: "Send Widget Response", type: "main", index: 0 }]
      ]
    },
    "Format Error Response": {
      main: [
        [{ node: "Send Widget Response", type: "main", index: 0 }]
      ]
    }
  },

  settings: {
    executionOrder: "v1",
    binaryMode: "separate",
    availableInMCP: false
  },

  meta: {
    instanceId: "web-widget-handler-v1"
  }
};

const fs   = require('fs');
const path = require('path');

const outPath = path.join(__dirname, 'web-widget.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log('✅ web-widget.json 생성 완료:', outPath);
